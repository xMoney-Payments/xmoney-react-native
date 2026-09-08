import React
import UIKit
import PassKit
import XMoneyPaymentSheet

@objc(XMoneyPlatformPayButtonView)
public final class XMoneyPlatformPayButtonView: UIView {
    @objc public var configuration: NSDictionary?
    @objc public var appearance: NSDictionary?

    @objc public var disabled: Bool = false {
        didSet { syncEnabled() }
    }

    @objc public var onReady: (([AnyHashable: Any]) -> Void)?
    @objc public var onProcessing: (([AnyHashable: Any]) -> Void)?
    @objc public var onResult: (([AnyHashable: Any]) -> Void)?
    @objc public var onHeightChange: (([AnyHashable: Any]) -> Void)?
    @objc public var onAvailability: (([AnyHashable: Any]) -> Void)?
    @objc public var onOrderUpdated: (([AnyHashable: Any]) -> Void)?

    private let button = ApplePayButton()
    private var applePay: ApplePay?
    private var paymentConfig: PaymentConfig?
    private var intent: PaymentIntent?
    private var orderPayload = ""
    private var orderChecksum = ""
    private var didReady = false
    private var lastReportedHeight: CGFloat = -1
    private var updateTask: Task<Void, Never>?

    public override init(frame: CGRect) {
        super.init(frame: frame)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.onTap = { [weak self] in self?.presentApplePay() }
        addSubview(button)
        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: topAnchor),
            button.leadingAnchor.constraint(equalTo: leadingAnchor),
            button.trailingAnchor.constraint(equalTo: trailingAnchor),
            button.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    public required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            reportHeight()
            if !didReady, paymentConfig != nil {
                didReady = true
                onReady?([:])
            }
        }
    }

    @objc(prepareWithOrderPayload:orderChecksum:)
    public func prepare(orderPayload: NSString, orderChecksum: NSString) {
        self.orderPayload = orderPayload as String
        self.orderChecksum = orderChecksum as String
        bind()
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
        let dict = Self.jsonObject(appearanceJson as String)
        button.apply(appearance: BridgeConfigParser.parseWalletAppearance(dict))
        reportHeight()
    }

    private func bind() {
        let config = BridgeMaps.stringMap(configuration) ?? [:]
        BridgeCatch.run {
            let parsed = BridgeConfigParser.parse(
                config,
                orderPayload: orderPayload,
                orderChecksum: orderChecksum
            )
            paymentConfig = parsed.0
            intent = parsed.1
            let wallet = appearance != nil
                ? BridgeConfigParser.parseWalletAppearance(BridgeMaps.stringMap(appearance))
                : parsed.0.paymentMethods.applePay.appearance
            button.apply(appearance: wallet)
            syncEnabled()
            rebuildSession()
            reportHeight()
            emitAvailability()
        } onError: { error in
            let mapped = BridgeCatch.codeMessage(error)
            emitFailed(code: mapped.code, message: mapped.message)
        }
    }

    private func runUpdateOrder(requestId: String) {
        guard let applePay else {
            emitOrderUpdated(requestId: requestId, success: false, error: "NOT_INITIALIZED")
            return
        }
        let nextIntent = BridgeConfigParser.parseIntent(
            orderPayload: orderPayload,
            orderChecksum: orderChecksum
        )
        updateTask?.cancel()
        button.isEnabled = false
        onProcessing?(["isProcessing": true])
        emitAvailability()
        updateTask = Task { @MainActor [weak self] in
            guard let self, !Task.isCancelled else { return }
            do {
                try await applePay.updateOrder(intent: nextIntent)
                self.intent = nextIntent
                self.syncEnabled()
                self.onProcessing?(["isProcessing": false])
                self.emitAvailability()
                self.emitOrderUpdated(requestId: requestId, success: true, error: nil)
            } catch is CancellationError {
                self.syncEnabled()
                self.onProcessing?(["isProcessing": false])
                self.emitAvailability()
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
            } catch {
                self.syncEnabled()
                self.onProcessing?(["isProcessing": false])
                self.emitAvailability()
                let mapped = BridgeCatch.codeMessage(error)
                self.emitFailed(code: mapped.code, message: mapped.message)
                self.emitOrderUpdated(requestId: requestId, success: false, error: mapped.code)
            }
        }
    }

    private func syncEnabled() {
        button.isEnabled = !disabled && (applePay?.isInteractionEnabled ?? true)
    }

    private func emitFailed(code: String, message: String) {
        onResult?(["resultJson": BridgeResults.failedJSON(code: code, message: message)])
    }

    private func rebuildSession() {
        guard let paymentConfig else { return }
        applePay = ApplePay(configuration: paymentConfig) { [weak self] result in
            self?.onResult?(["resultJson": BridgeResults.resultJSON(result)])
            self?.emitAvailability()
        }
        if window != nil, !didReady {
            didReady = true
            onReady?([:])
        }
    }

    private func presentApplePay() {
        guard !disabled, let applePay, let intent, applePay.isInteractionEnabled else {
            return
        }
        guard let presenter = BridgePresenter.topViewController() else {
            emitFailed(
                code: "NO_PRESENTER",
                message: "Unable to present from the current screen."
            )
            return
        }
        BridgeCatch.run {
            applePay.present(from: presenter, intent: intent) { [weak self] event in
                switch event {
                case .ready:
                    self?.onReady?([:])
                case let .processing(isProcessing):
                    self?.onProcessing?(["isProcessing": isProcessing])
                }
                self?.emitAvailability()
            }
        } onError: { error in
            let mapped = BridgeCatch.codeMessage(error)
            emitFailed(code: mapped.code, message: mapped.message)
        }
    }

    private func reportHeight() {
        let height = button.buttonHeight
        guard abs(height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = height
        onHeightChange?(["height": height])
    }

    private func emitAvailability() {
        let canPay = PKPaymentAuthorizationController.canMakePayments()
        onAvailability?([
            "isAvailable": canPay,
            "isReady": canPay,
            "isOrderConsumed": applePay?.isOrderConsumed ?? false,
            "isInteractionEnabled": (applePay?.isInteractionEnabled ?? true) && !disabled,
        ])
    }

    private func emitOrderUpdated(requestId: String, success: Bool, error: String?) {
        guard !requestId.isEmpty else { return }
        var payload: [String: Any] = ["requestId": requestId, "success": success]
        if let error {
            payload["error"] = error
        }
        onOrderUpdated?(payload)
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
