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
    @objc public var onUpdateFailed: (([AnyHashable: Any]) -> Void)?

    private let button = ApplePayButton()
    private var applePay: ApplePay?
    private var paymentConfig: PaymentConfig?
    private var intent: PaymentIntent?
    private var orderPayload = ""
    private var orderChecksum = ""
    private var boundPayload = ""
    private var boundChecksum = ""
    private var boundConfig: [String: Any] = [:]
    private var hasPrepared = false
    private var didSendReady = false
    /// True after the button has drawn. Ready waits for this and a bound order.
    private var buttonDrawn = false
    /// True after an order has been bound. A later bind failure emits
    /// `onUpdateFailed` instead of a payment result.
    private var hasBoundOrder = false
    private var lastReportedHeight: CGFloat = -1
    private var updateTask: Task<Void, Never>?
    private var pendingIntent: PaymentIntent?
    /// True while `updateOrder(createOrder)` holds the native lock.
    private var creatingOrder = false
    private var createToken = 0
    /// Binds the mount order. Cancelled when a JS update replaces it.
    private var mountTask: Task<Void, Never>?
    private let orders = PendingOrders()

    public override init(frame: CGRect) {
        super.init(frame: frame)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.onTap = { [weak self] in self?.presentApplePay() }
        button.onFirstDraw = { [weak self] in
            Task { @MainActor in
                self?.buttonDrawn = true
                self?.publishButtonReady()
            }
        }
        addSubview(button)
        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: topAnchor),
            button.leadingAnchor.constraint(equalTo: leadingAnchor),
            button.trailingAnchor.constraint(equalTo: trailingAnchor),
            button.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    public required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    deinit {
        orders.cancelAll()
        updateTask?.cancel()
        mountTask?.cancel()
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            reportHeight()
        }
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
        if sameOrder && (applePay != nil || mountTask != nil) {
            return
        }
        self.orderPayload = nextPayload
        self.orderChecksum = nextChecksum
        self.boundPayload = nextPayload
        self.boundChecksum = nextChecksum
        self.boundConfig = nextConfig
        self.hasPrepared = true
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
            didSendReady = false
            hasBoundOrder = false
            paymentConfig = parsed.0
            intent = parsed.1
            let wallet = appearance != nil
                ? BridgeConfigParser.parseWalletAppearance(BridgeMaps.stringMap(appearance))
                : parsed.0.paymentMethods.applePay.appearance
            button.apply(appearance: wallet)
            rebuildSession()
            // Locked until the mount order is bound, matching the native samples.
            syncEnabled()
            reportHeight()
            mountTask?.cancel()
            mountTask = Task { @MainActor [weak self] in
                guard let self, let applePay = self.applePay, let intent = self.intent else {
                    return
                }
                guard !Task.isCancelled else { return }
                do {
                    try await applePay.updateOrder(intent: intent)
                    guard !Task.isCancelled else { return }
                    self.hasBoundOrder = true
                    self.syncEnabled()
                    self.emitAvailability()
                    self.publishButtonReady()
                } catch is CancellationError {
                    // A JS update replaced this bind.
                } catch {
                    let mapped = BridgeCatch.codeMessage(error)
                    guard mapped.code != "PAYMENT_IN_PROGRESS" else { return }
                    self.reportUpdateFailure(code: mapped.code, message: mapped.message)
                }
            }
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
        if requestId.isEmpty, creatingOrder {
            pendingIntent = nextIntent
            return
        }
        updateTask?.cancel()
        mountTask?.cancel()
        button.isEnabled = false
        emitAvailability()
        updateTask = Task { @MainActor [weak self] in
            guard let self, !Task.isCancelled else { return }
            do {
                try await applePay.updateOrder(intent: nextIntent)
                self.intent = nextIntent
                self.boundPayload = nextIntent.orderPayload
                self.boundChecksum = nextIntent.orderChecksum
                self.hasBoundOrder = true
                self.syncEnabled()
                self.emitAvailability()
                self.emitOrderUpdated(requestId: requestId, success: true, error: nil)
            } catch is CancellationError {
                self.syncEnabled()
                self.emitAvailability()
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
            } catch {
                self.syncEnabled()
                self.emitAvailability()
                let mapped = BridgeCatch.codeMessage(error)
                self.reportUpdateFailure(code: mapped.code, message: mapped.message)
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
        guard let applePay else {
            orders.close(requestId)
            emitOrderUpdated(requestId: requestId, success: false, error: "NOT_INITIALIZED")
            return
        }
        createToken += 1
        let token = createToken
        creatingOrder = true
        updateTask?.cancel()
        mountTask?.cancel()
        button.isEnabled = false
        emitAvailability()
        updateTask = Task { @MainActor [weak self] in
            guard let self else { return }
            defer {
                self.orders.close(requestId)
                if self.createToken == token {
                    self.creatingOrder = false
                }
            }
            guard !Task.isCancelled else {
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
                return
            }
            do {
                let bound = try await applePay.updateOrder { [weak self] in
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
                self.intent = bound
                self.orderPayload = bound.orderPayload
                self.orderChecksum = bound.orderChecksum
                self.boundPayload = bound.orderPayload
                self.boundChecksum = bound.orderChecksum
                self.hasBoundOrder = true
                self.syncEnabled()
                self.emitAvailability()
                self.publishButtonReady()
                self.emitOrderUpdated(requestId: requestId, success: true, error: nil)
                self.applyPendingIntent()
            } catch is CancellationError {
                self.syncEnabled()
                self.emitAvailability()
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "SUPERSEDED_UPDATE_ORDER"
                )
            } catch is OrderCreationRejected {
                self.syncEnabled()
                self.emitAvailability()
                self.emitOrderUpdated(
                    requestId: requestId,
                    success: false,
                    error: "ORDER_CREATION_FAILED"
                )
                self.applyPendingIntent()
            } catch {
                self.syncEnabled()
                self.emitAvailability()
                let mapped = BridgeCatch.codeMessage(error)
                self.reportUpdateFailure(code: mapped.code, message: mapped.message)
                self.emitOrderUpdated(requestId: requestId, success: false, error: mapped.code)
                self.applyPendingIntent()
            }
        }
    }

    /// Applies a prop-driven intent that arrived while `updateOrder(createOrder)` held the lock.
    private func applyPendingIntent() {
        guard let pendingIntent else { return }
        creatingOrder = false
        self.pendingIntent = nil
        orderPayload = pendingIntent.orderPayload
        orderChecksum = pendingIntent.orderChecksum
        runUpdateOrder(requestId: "")
    }

    /// A charge in progress is neither. The first bind is a payment result,
    /// and a later bind is `onUpdateFailed`.
    private func reportUpdateFailure(code: String, message: String) {
        guard code != "PAYMENT_IN_PROGRESS" else { return }
        if hasBoundOrder {
            onUpdateFailed?([
                "code": code,
                "message": message,
            ])
        } else {
            emitFailed(code: code, message: message)
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
    }

    /// Tells JS the button is ready. Once, after the mount order is bound and
    /// the PassKit button has drawn.
    private func publishButtonReady() {
        guard hasBoundOrder, buttonDrawn, !didSendReady else { return }
        didSendReady = true
        onReady?([:])
        emitAvailability()
    }

    private func presentApplePay() {
        guard !disabled, hasBoundOrder, let applePay, let intent, applePay.isInteractionEnabled else {
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
                    break
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
        // The button has not drawn until ready. Later calls report the pay lock.
        guard didSendReady else { return }
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
