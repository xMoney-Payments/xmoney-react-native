import React
import UIKit
import XMoneyPaymentSheet

@objc(XMoneyPaymentElementView)
public final class XMoneyPaymentElementView: UIView {
    @objc public var configuration: NSDictionary?

    @objc public var onReady: (([AnyHashable: Any]) -> Void)?
    @objc public var onProcessing: (([AnyHashable: Any]) -> Void)?
    @objc public var onResult: (([AnyHashable: Any]) -> Void)?
    @objc public var onHeightChange: (([AnyHashable: Any]) -> Void)?
    @objc public var onAvailability: (([AnyHashable: Any]) -> Void)?
    @objc public var onOrderUpdated: (([AnyHashable: Any]) -> Void)?

    private var element: PaymentElement?
    private var payment: EmbeddedPayment?
    private var orderPayload = ""
    private var orderChecksum = ""
    private var prepareTask: Task<Void, Never>?
    private var lastReportedHeight: CGFloat = -1

    public override init(frame: CGRect) {
        super.init(frame: frame)
    }

    public required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    public override func layoutSubviews() {
        super.layoutSubviews()
        reportHeight()
    }

    deinit {
        prepareTask?.cancel()
    }

    @objc(prepareWithOrderPayload:orderChecksum:)
    public func prepare(orderPayload: NSString, orderChecksum: NSString) {
        self.orderPayload = orderPayload as String
        self.orderChecksum = orderChecksum as String
        bind(requestId: "")
    }

    @objc(updateOrderWithOrderPayload:orderChecksum:requestId:)
    public func updateOrder(
        orderPayload: NSString,
        orderChecksum: NSString,
        requestId: NSString
    ) {
        self.orderPayload = orderPayload as String
        self.orderChecksum = orderChecksum as String
        runUpdateOrder(requestId: requestId as String)
    }

    @objc(updateAppearanceWithAppearanceJson:)
    public func updateAppearance(appearanceJson: NSString) {
        guard element != nil else { return }
        let dict = Self.jsonObject(appearanceJson as String) ?? [:]
        BridgeCatch.run {
            let appearance = PaymentConfig.AppearanceConfig.from(dict)
            element?.updateAppearance(appearance)
            reportHeight()
        } onError: { error in
            let mapped = BridgeCatch.codeMessage(error)
            emitFailed(code: mapped.code, message: mapped.message)
        }
    }

    @objc(updateLocaleWithLocale:)
    public func updateLocale(locale: NSString) {
        guard element != nil else { return }
        element?.updateLocale(locale as String)
        reportHeight()
    }

    @objc(updateStyleWithStyle:)
    public func updateStyle(style: NSString) {
        guard element != nil else { return }
        let raw = (style as String).isEmpty ? "automatic" : (style as String)
        guard let parsed = PaymentConfig.UserInterfaceStyle(rawValue: raw) else { return }
        element?.updateStyle(parsed)
        reportHeight()
    }

    @objc(updateWalletAppearanceWithAppearanceJson:)
    public func updateWalletAppearance(appearanceJson: NSString) {
        guard element != nil else { return }
        let object = Self.jsonObject(appearanceJson as String) ?? [:]
        let apple = BridgeMaps.stringMap(object["applePay"]) ?? object
        element?.updateWalletAppearance(BridgeConfigParser.parseWalletAppearance(apple))
        reportHeight()
    }

    @objc(confirm)
    public func confirm() {
        Task { @MainActor [weak self] in
            self?.element?.confirm()
        }
    }

    private func bind(requestId: String) {
        let config = BridgeMaps.stringMap(configuration) ?? [:]
        BridgeCatch.run {
            let (nativeConfig, intent) = BridgeConfigParser.parse(
                config,
                orderPayload: orderPayload,
                orderChecksum: orderChecksum
            )
            if nativeConfig.paymentMethods.applePay.enabled {
                ApplePay.register()
            }
            rebuild(configuration: nativeConfig, intent: intent, requestId: requestId)
        } onError: { error in
            let mapped = BridgeCatch.codeMessage(error)
            emitFailed(code: mapped.code, message: mapped.message)
            emitOrderUpdated(requestId: requestId, success: false, error: mapped.code)
        }
    }

    private func runUpdateOrder(requestId: String) {
        guard let element else {
            emitOrderUpdated(requestId: requestId, success: false, error: "NOT_INITIALIZED")
            return
        }
        let intent = BridgeConfigParser.parseIntent(
            orderPayload: orderPayload,
            orderChecksum: orderChecksum
        )
        prepareTask?.cancel()
        prepareTask = Task { @MainActor [weak self] in
            guard let self, !Task.isCancelled else { return }
            do {
                try await element.updateOrder(intent: intent)
                self.reportHeight()
                self.emitAvailability()
                self.emitOrderUpdated(requestId: requestId, success: true, error: nil)
            } catch is CancellationError {
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
            } catch {
                let mapped = BridgeCatch.codeMessage(error)
                self.emitOrderUpdated(requestId: requestId, success: false, error: mapped.code)
            }
        }
    }

    private func emitFailed(code: String, message: String) {
        onResult?(["resultJson": BridgeResults.failedJSON(code: code, message: message)])
    }

    private func emitOrderUpdated(requestId: String, success: Bool, error: String?) {
        guard !requestId.isEmpty else { return }
        var payload: [String: Any] = ["requestId": requestId, "success": success]
        if let error {
            payload["error"] = error
        }
        onOrderUpdated?(payload)
    }

    private func rebuild(
        configuration: PaymentConfig,
        intent: PaymentIntent,
        requestId: String
    ) {
        prepareTask?.cancel()
        element?.removeFromSuperview()
        element = nil
        payment = nil

        let payment = EmbeddedPayment(configuration: configuration) { [weak self] result in
            self?.onResult?(["resultJson": BridgeResults.resultJSON(result)])
            self?.emitAvailability()
        }
        self.payment = payment
        let view = PaymentElement(payment: payment) { [weak self] event in
            switch event {
            case .ready:
                self?.onReady?([:])
                self?.reportHeight()
                self?.emitAvailability()
            case let .processing(isProcessing):
                self?.onProcessing?(["isProcessing": isProcessing])
                self?.emitAvailability()
            }
        }
        view.translatesAutoresizingMaskIntoConstraints = false
        view.onContentSizeChange = { [weak self] in
            self?.reportHeight()
        }
        addSubview(view)
        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: topAnchor),
            view.leadingAnchor.constraint(equalTo: leadingAnchor),
            view.trailingAnchor.constraint(equalTo: trailingAnchor),
            view.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
        element = view
        reportHeight()
        emitAvailability()

        prepareTask = Task { @MainActor [weak self] in
            guard !Task.isCancelled else { return }
            do {
                try await view.prepare(intent: intent)
                self?.reportHeight()
                self?.emitAvailability()
                self?.emitOrderUpdated(requestId: requestId, success: true, error: nil)
            } catch {
                self?.onResult?([
                    "resultJson": BridgeResults.failedJSON(
                        code: BridgeCatch.codeMessage(error).code,
                        message: BridgeCatch.codeMessage(error).message
                    ),
                ])
                self?.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: BridgeCatch.codeMessage(error).code
                )
            }
        }
    }

    private func emitAvailability() {
        onAvailability?([
            "isOrderConsumed": payment?.isOrderConsumed ?? element?.isOrderConsumed ?? false,
            "isInteractionEnabled": payment?.isInteractionEnabled ?? true,
        ])
    }

    /// Same as native `PaymentElementHost.publishHeight`: use the form’s cached
    /// intrinsic height. Do not `systemLayoutSizeFitting` this view while it is
    /// pinned to the RN frame — that returns the compressed size and clips the
    /// card fields when “Use other card” expands.
    private func reportHeight() {
        layoutIfNeeded()
        let height = max(element?.intrinsicContentSize.height ?? 160, 160)
        guard abs(height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = height
        onHeightChange?(["height": height])
    }

    private static func jsonObject(_ json: String) -> [String: Any]? {
        guard let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return nil
        }
        return object
    }
}
