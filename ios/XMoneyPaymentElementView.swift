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
    @objc public var onUpdateFailed: (([AnyHashable: Any]) -> Void)?

    private var element: PaymentElement?
    private var payment: EmbeddedPayment?
    private var orderPayload = ""
    private var orderChecksum = ""
    private var boundPayload = ""
    private var boundChecksum = ""
    /// The order the last prepare or update asked for, which may still be binding.
    private var requestedPayload = ""
    private var requestedChecksum = ""
    private var boundConfig: [String: Any] = [:]
    private var hasPrepared = false
    private var prepareTask: Task<Void, Never>?
    private var pendingIntent: PaymentIntent?
    private var lastReportedHeight: CGFloat = -1
    /// `onReady` is sent once per mount. A failed first load is `onResult`.
    private var didSendReady = false
    private let orders = PendingOrders()

    public override init(frame: CGRect) {
        super.init(frame: frame)
    }

    public required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    public override func layoutSubviews() {
        super.layoutSubviews()
        reportHeight()
    }

    deinit {
        orders.cancelAll()
        prepareTask?.cancel()
    }

    @objc(prepareWithOrderPayload:orderChecksum:)
    public func prepare(orderPayload: NSString, orderChecksum: NSString) {
        let nextPayload = orderPayload as String
        let nextChecksum = orderChecksum as String
        let nextConfig = BridgeMaps.stringMap(configuration) ?? [:]
        let sameOrder = hasPrepared
            && nextPayload == boundPayload
            && nextChecksum == boundChecksum
            && NSDictionary(dictionary: nextConfig).isEqual(NSDictionary(dictionary: boundConfig))
        if sameOrder && (element != nil || prepareTask != nil) {
            return
        }
        self.orderPayload = nextPayload
        self.orderChecksum = nextChecksum
        self.boundPayload = nextPayload
        self.boundChecksum = nextChecksum
        self.requestedPayload = nextPayload
        self.requestedChecksum = nextChecksum
        self.boundConfig = nextConfig
        self.hasPrepared = true
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

    @objc(beginUpdateOrderWithRequestId:)
    public func beginUpdateOrder(requestId: NSString) {
        beginUpdateOrder(requestId: requestId as String)
    }

    @objc(resolveOrderWithOrderPayload:orderChecksum:requestId:)
    public func resolveOrder(
        orderPayload: NSString,
        orderChecksum: NSString,
        requestId: NSString
    ) {
        let intent = BridgeConfigParser.parseIntent(
            orderPayload: orderPayload as String,
            orderChecksum: orderChecksum as String
        )
        orders.settle(requestId: requestId as String, result: .success(intent))
    }

    @objc(rejectOrderWithRequestId:)
    public func rejectOrder(requestId: NSString) {
        orders.settle(requestId: requestId as String, result: .failure(OrderCreationRejected()))
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
        pendingIntent = nil
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
        // An imperative call is newer than a deferred prop change.
        if !requestId.isEmpty {
            pendingIntent = nil
        }
        if requestId.isEmpty,
           intent.orderPayload == requestedPayload,
           intent.orderChecksum == requestedChecksum {
            return
        }
        requestedPayload = intent.orderPayload
        requestedChecksum = intent.orderChecksum
        prepareTask?.cancel()
        prepareTask = Task { @MainActor [weak self] in
            guard let self else { return }
            guard !Task.isCancelled else {
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
                return
            }
            do {
                try await element.updateOrder(intent: intent)
                self.orderPayload = intent.orderPayload
                self.orderChecksum = intent.orderChecksum
                self.boundPayload = intent.orderPayload
                self.boundChecksum = intent.orderChecksum
                self.pendingIntent = nil
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
                if requestId.isEmpty,
                   let payment = error as? PaymentError,
                   payment == .paymentInProgress {
                    self.pendingIntent = intent
                    return
                }
                let mapped = BridgeCatch.codeMessage(error)
                self.reportLoadFailureIfNeeded(code: mapped.code, message: mapped.message)
                self.emitOrderUpdated(requestId: requestId, success: false, error: mapped.code)
            }
        }
    }

    private func beginUpdateOrder(requestId: String) {
        if orders.isFinished(requestId) {
            emitOrderUpdated(
                requestId: requestId,
                success: false,
                error: "SUPERSEDED_UPDATE_ORDER"
            )
            return
        }
        let gate = orders.begin(requestId)
        guard let element else {
            orders.close(requestId)
            emitOrderUpdated(requestId: requestId, success: false, error: "NOT_INITIALIZED")
            return
        }
        pendingIntent = nil
        prepareTask?.cancel()
        prepareTask = Task { @MainActor [weak self] in
            guard let self else { return }
            defer { self.orders.close(requestId) }
            guard !Task.isCancelled else {
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
                return
            }
            do {
                let bound = try await element.updateOrder { [weak self] in
                    guard let self else { throw CancellationError() }
                    self.emitAvailability()
                    return try await gate.awaitIntent()
                }
                guard !Task.isCancelled else {
                    self.emitOrderUpdated(
                        requestId: requestId,
                        success: false,
                        error: "SUPERSEDED_UPDATE_ORDER"
                    )
                    return
                }
                self.orderPayload = bound.orderPayload
                self.orderChecksum = bound.orderChecksum
                self.boundPayload = bound.orderPayload
                self.boundChecksum = bound.orderChecksum
                self.requestedPayload = bound.orderPayload
                self.requestedChecksum = bound.orderChecksum
                self.reportHeight()
                self.emitAvailability()
                self.emitOrderUpdated(requestId: requestId, success: true, error: nil)
                self.retryPendingIntent()
            } catch is CancellationError {
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
            } catch is OrderCreationRejected {
                self.emitAvailability()
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "ORDER_CREATION_FAILED"
                )
                self.retryPendingIntent()
            } catch {
                let mapped = BridgeCatch.codeMessage(error)
                self.reportLoadFailureIfNeeded(code: mapped.code, message: mapped.message)
                self.emitOrderUpdated(requestId: requestId, success: false, error: mapped.code)
                self.retryPendingIntent()
            }
        }
    }

    /// A failed update that cancelled the first load would otherwise leave the
    /// merchant spinner up: Ready is not sent, and a first-bind failure is not
    /// `onUpdateFailed`.
    private func reportLoadFailureIfNeeded(code: String, message: String) {
        guard !didSendReady else { return }
        emitFailed(code: code, message: message)
    }

    /// A prop-driven update that arrived during a charge is retried once Pay unlocks.
    private func retryPendingIntent() {
        guard let pendingIntent, let element else { return }
        self.pendingIntent = nil
        prepareTask?.cancel()
        prepareTask = Task { @MainActor [weak self] in
            guard let self, !Task.isCancelled else { return }
            do {
                try await element.updateOrder(intent: pendingIntent)
                self.orderPayload = pendingIntent.orderPayload
                self.orderChecksum = pendingIntent.orderChecksum
                self.boundPayload = pendingIntent.orderPayload
                self.boundChecksum = pendingIntent.orderChecksum
                self.reportHeight()
                self.emitAvailability()
            } catch is CancellationError {
                return
            } catch {
                if let payment = error as? PaymentError, payment == .paymentInProgress {
                    self.pendingIntent = pendingIntent
                    return
                }
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
        didSendReady = false
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
                self?.didSendReady = true
                self?.onReady?([:])
                self?.reportHeight()
                self?.emitAvailability()
            case let .processing(isProcessing):
                self?.onProcessing?(["isProcessing": isProcessing])
                self?.emitAvailability()
                if !isProcessing {
                    self?.retryPendingIntent()
                }
            case let .updateFailed(error):
                let mapped = BridgeCatch.codeMessage(error)
                self?.onUpdateFailed?([
                    "code": mapped.code,
                    "message": mapped.message,
                ])
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

        prepareTask = Task { @MainActor [weak self] in
            guard !Task.isCancelled else { return }
            do {
                try await view.prepare(intent: intent)
                self?.reportHeight()
                self?.emitAvailability()
                self?.emitOrderUpdated(requestId: requestId, success: true, error: nil)
            } catch is CancellationError {
                return
            } catch {
                let mapped = BridgeCatch.codeMessage(error)
                self?.emitFailed(code: mapped.code, message: mapped.message)
                self?.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: mapped.code
                )
            }
        }
    }

    private func emitAvailability() {
        // The form is still showing its loader until ready. Later calls report
        // the pay lock and whether the order was consumed.
        guard didSendReady else { return }
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
