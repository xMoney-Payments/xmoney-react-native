import Foundation
import PassKit
import React
import UIKit
import XMoneyPaymentSheet

/// Holds native `PaymentConfig` from JS `PaymentSheet.init` and presents with `PaymentIntent`.
@objc(XMoneyPaymentSheetHost)
public final class XMoneyPaymentSheetHost: NSObject {
    @objc(shared)
    public static let shared = XMoneyPaymentSheetHost()

    private var configuration: PaymentConfig?
    private var sheet: PaymentSheet?
    private var applePayConfig: PaymentConfig?
    private var applePay: ApplePay?
    private var applePayResolve: ((NSDictionary) -> Void)?
    private var applePayUpdateTask: Task<Void, Never>?
    private var applePayUpdateGeneration = 0
    private let applePayUpdateLock = NSLock()
    private let applePayOrders = PendingOrders()
    private var googlePayConfig: PaymentConfig?
    private var presentGeneration = 0

    @objc public var eventSink: ((NSDictionary) -> Void)?

    @objc(initPaymentSheet:)
    public func initPaymentSheet(_ config: NSDictionary) {
        let dict = BridgeMaps.stringMap(config) ?? [:]
        configuration = BridgeConfigParser.parseConfig(dict)
        sheet = nil
    }

    @objc(presentPaymentSheet:onEvent:onResolve:onReject:)
    public func presentPaymentSheet(
        _ intentMap: NSDictionary,
        onEvent: @escaping (NSDictionary) -> Void,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        let dict = BridgeMaps.stringMap(intentMap) ?? [:]
        let requestId = dict["requestId"] as? String ?? ""
        let payload = dict["orderPayload"] as? String ?? ""
        let checksum = dict["orderChecksum"] as? String ?? ""

        Task { @MainActor [weak self] in
            guard let self else { return }
            guard let configuration = self.configuration else {
                onReject("NOT_INITIALIZED", "Call init before present.")
                return
            }

            BridgeCatch.run {
                let intent = BridgeConfigParser.parseIntent(
                    orderPayload: payload,
                    orderChecksum: checksum
                )
                let replacing = self.sheet != nil
                self.presentGeneration += 1
                let generation = self.presentGeneration
                let start = {
                    guard let presenter = BridgePresenter.topViewController() else {
                        onReject("NO_PRESENTER", "Unable to present from the current screen.")
                        return
                    }
                    let sheet = PaymentSheet(configuration: configuration)
                    self.sheet = sheet
                    sheet.present(
                        from: presenter,
                        intent: intent,
                        onEvent: { event in
                            onEvent(Self.eventBody(event, requestId: requestId) as NSDictionary)
                        },
                        completion: { [weak self] result in
                            if self?.presentGeneration == generation {
                                self?.sheet = nil
                            }
                            onResolve(BridgeResults.resultBody(result) as NSDictionary)
                        }
                    )
                }
                if replacing {
                    self.sheet?.dismiss()
                    self.sheet = nil
                    DispatchQueue.main.async(execute: start)
                } else {
                    start()
                }
            } onError: { error in
                let mapped = BridgeCatch.codeMessage(error)
                onReject(mapped.code as NSString, mapped.message as NSString)
            }
        }
    }

    @objc(dismiss)
    public func dismiss() {
        Task { @MainActor [weak self] in
            self?.sheet?.dismiss()
        }
    }

    @objc(initApplePay:)
    public func initApplePay(_ config: NSDictionary) {
        let dict = BridgeMaps.stringMap(config) ?? [:]
        applePayConfig = BridgeConfigParser.parseConfig(dict)
        applePayResolve = nil
        Task { @MainActor [weak self] in
            guard let self else { return }
            if let configuration = self.applePayConfig {
                self.applePay = ApplePay(configuration: configuration) { [weak self] result in
                    self?.applePayResolve?(BridgeResults.resultBody(result) as NSDictionary)
                    self?.applePayResolve = nil
                }
            } else {
                self.applePay = nil
            }
        }
    }

    @objc(presentApplePay:onEvent:onResolve:onReject:)
    public func presentApplePay(
        _ intentMap: NSDictionary,
        onEvent: @escaping (NSDictionary) -> Void,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        let dict = BridgeMaps.stringMap(intentMap) ?? [:]
        let requestId = dict["requestId"] as? String ?? ""
        let payload = dict["orderPayload"] as? String ?? ""
        let checksum = dict["orderChecksum"] as? String ?? ""

        Task { @MainActor [weak self] in
            guard let self else { return }
            guard let configuration = self.applePayConfig else {
                onReject("NOT_INITIALIZED", "Call init before present.")
                return
            }
            guard let presenter = BridgePresenter.topViewController() else {
                onReject("NO_PRESENTER", "Unable to present from the current screen.")
                return
            }

            BridgeCatch.run {
                let intent = BridgeConfigParser.parseIntent(
                    orderPayload: payload,
                    orderChecksum: checksum
                )
                ApplePay.register()
                let session = self.applePay ?? ApplePay(configuration: configuration) { result in
                    self.applePayResolve?(BridgeResults.resultBody(result) as NSDictionary)
                    self.applePayResolve = nil
                }
                self.applePay = session
                self.applePayResolve = onResolve
                session.present(from: presenter, intent: intent) { event in
                    onEvent(Self.applePayEventBody(event, requestId: requestId) as NSDictionary)
                }
            } onError: { error in
                let mapped = BridgeCatch.codeMessage(error)
                onReject(mapped.code as NSString, mapped.message as NSString)
            }
        }
    }

    @objc(updateApplePayOrder:onResolve:onReject:)
    public func updateApplePayOrder(
        _ intentMap: NSDictionary,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        let dict = BridgeMaps.stringMap(intentMap) ?? [:]
        let payload = dict["orderPayload"] as? String ?? ""
        let checksum = dict["orderChecksum"] as? String ?? ""
        let generation = bumpApplePayUpdateGeneration()
        Task { @MainActor [weak self] in
            guard let self else { return }
            guard self.isCurrentApplePayUpdate(generation) else {
                onReject(
                    "SUPERSEDED_UPDATE_ORDER",
                    "Superseded by a newer updateOrder call"
                )
                return
            }
            guard let applePay = self.applePay else {
                onReject("NOT_INITIALIZED", "Call init before present.")
                return
            }
            let intent = BridgeConfigParser.parseIntent(
                orderPayload: payload,
                orderChecksum: checksum
            )
            guard self.isCurrentApplePayUpdate(generation) else {
                onReject(
                    "SUPERSEDED_UPDATE_ORDER",
                    "Superseded by a newer updateOrder call"
                )
                return
            }
            self.applePayUpdateTask?.cancel()
            self.applePayUpdateTask = Task { @MainActor [weak self] in
                guard let self else { return }
                guard self.isCurrentApplePayUpdate(generation), !Task.isCancelled else {
                    onReject(
                        "SUPERSEDED_UPDATE_ORDER",
                        "Superseded by a newer updateOrder call"
                    )
                    return
                }
                do {
                    try await applePay.updateOrder(intent: intent)
                    guard self.isCurrentApplePayUpdate(generation), !Task.isCancelled else {
                        onReject(
                            "SUPERSEDED_UPDATE_ORDER",
                            "Superseded by a newer updateOrder call"
                        )
                        return
                    }
                    onResolve([:] as NSDictionary)
                } catch is CancellationError {
                    onReject(
                        "SUPERSEDED_UPDATE_ORDER",
                        "Superseded by a newer updateOrder call"
                    )
                } catch {
                    let mapped = BridgeCatch.codeMessage(error)
                    onReject(mapped.code as NSString, mapped.message as NSString)
                }
            }
        }
    }

    @objc(beginApplePayUpdateOrder:onResolve:onReject:)
    public func beginApplePayUpdateOrder(
        _ requestId: NSString,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        let id = requestId as String
        let generation = bumpApplePayUpdateGeneration()
        Task { @MainActor [weak self] in
            guard let self else { return }
            guard self.isCurrentApplePayUpdate(generation) else {
                onReject(
                    "SUPERSEDED_UPDATE_ORDER",
                    "Superseded by a newer updateOrder call"
                )
                return
            }
            if self.applePayOrders.isFinished(id) {
                onReject(
                    "SUPERSEDED_UPDATE_ORDER",
                    "Superseded by a newer updateOrder call"
                )
                return
            }
            guard let applePay = self.applePay else {
                self.applePayOrders.close(id)
                onReject("NOT_INITIALIZED", "Call init before present.")
                return
            }
            let gate = self.applePayOrders.begin(id)
            guard self.isCurrentApplePayUpdate(generation) else {
                self.applePayOrders.close(id)
                onReject(
                    "SUPERSEDED_UPDATE_ORDER",
                    "Superseded by a newer updateOrder call"
                )
                return
            }
            self.applePayUpdateTask?.cancel()
            self.applePayUpdateTask = Task { @MainActor [weak self] in
                guard let self else { return }
                defer { self.applePayOrders.close(id) }
                guard self.isCurrentApplePayUpdate(generation), !Task.isCancelled else {
                    onReject(
                        "SUPERSEDED_UPDATE_ORDER",
                        "Superseded by a newer updateOrder call"
                    )
                    return
                }
                do {
                    _ = try await applePay.updateOrder {
                        try await gate.awaitIntent()
                    }
                    guard self.isCurrentApplePayUpdate(generation), !Task.isCancelled else {
                        onReject(
                            "SUPERSEDED_UPDATE_ORDER",
                            "Superseded by a newer updateOrder call"
                        )
                        return
                    }
                    onResolve([:] as NSDictionary)
                } catch is CancellationError {
                    onReject(
                        "SUPERSEDED_UPDATE_ORDER",
                        "Superseded by a newer updateOrder call"
                    )
                } catch is OrderCreationRejected {
                    onReject("ORDER_CREATION_FAILED", "Order creation failed")
                } catch {
                    let mapped = BridgeCatch.codeMessage(error)
                    onReject(mapped.code as NSString, mapped.message as NSString)
                }
            }
        }
    }

    @objc(resolveApplePayOrder:orderPayload:orderChecksum:)
    public func resolveApplePayOrder(
        _ requestId: NSString,
        orderPayload: NSString,
        orderChecksum: NSString
    ) {
        let intent = BridgeConfigParser.parseIntent(
            orderPayload: orderPayload as String,
            orderChecksum: orderChecksum as String
        )
        Task { @MainActor [weak self] in
            self?.applePayOrders.settle(
                requestId: requestId as String,
                result: .success(intent)
            )
        }
    }

    @objc(rejectApplePayOrder:)
    public func rejectApplePayOrder(_ requestId: NSString) {
        Task { @MainActor [weak self] in
            self?.applePayOrders.settle(
                requestId: requestId as String,
                result: .failure(OrderCreationRejected())
            )
        }
    }

    @objc(dismissApplePay)
    public func dismissApplePay() {
        Task { @MainActor [weak self] in
            self?.applePay?.dismiss()
        }
    }

    @objc(applePayState)
    public func applePayState() -> NSDictionary {
        if Thread.isMainThread {
            return MainActor.assumeIsolated { applePayStateBody() } as NSDictionary
        }
        var body: [String: Any] = [:]
        DispatchQueue.main.sync {
            body = self.applePayStateBody()
        }
        return body as NSDictionary
    }

    @objc(googlePayState)
    public func googlePayState() -> NSDictionary {
        BridgeResults.walletStateBody(
            isAvailable: false,
            isReady: false,
            isOrderConsumed: false,
            isInteractionEnabled: true
        ) as NSDictionary
    }

    @objc(dismissGooglePay)
    public func dismissGooglePay() {}

    @objc(initGooglePay:)
    public func initGooglePay(_ config: NSDictionary) {
        let dict = BridgeMaps.stringMap(config) ?? [:]
        googlePayConfig = BridgeConfigParser.parseConfig(dict)
    }

    @objc(presentGooglePay:onEvent:onResolve:onReject:)
    public func presentGooglePay(
        _ intentMap: NSDictionary,
        onEvent: @escaping (NSDictionary) -> Void,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        _ = intentMap
        _ = onEvent
        _ = onReject
        onResolve(
            BridgeResults.failedBody(
                code: "GOOGLE_PAY",
                message: "Google Pay is only available on Android."
            ) as NSDictionary
        )
    }

    @objc(updateGooglePayOrder:onResolve:onReject:)
    public func updateGooglePayOrder(
        _ intentMap: NSDictionary,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        _ = intentMap
        _ = onResolve
        onReject("GOOGLE_PAY", "Google Pay is only available on Android.")
    }

    @objc(beginGooglePayUpdateOrder:onResolve:onReject:)
    public func beginGooglePayUpdateOrder(
        _ requestId: NSString,
        onResolve: @escaping (NSDictionary) -> Void,
        onReject: @escaping (NSString, NSString) -> Void
    ) {
        _ = requestId
        _ = onResolve
        onReject("GOOGLE_PAY", "Google Pay is only available on Android.")
    }

    @objc(resolveGooglePayOrder:orderPayload:orderChecksum:)
    public func resolveGooglePayOrder(
        _ requestId: NSString,
        orderPayload: NSString,
        orderChecksum: NSString
    ) {
        _ = requestId
        _ = orderPayload
        _ = orderChecksum
    }

    @objc(rejectGooglePayOrder:)
    public func rejectGooglePayOrder(_ requestId: NSString) {
        _ = requestId
    }

    @objc(answerCardHolderVerification:accepted:)
    public func answerCardHolderVerification(_ requestId: NSString, accepted: Bool) {
        CardHolderVerificationBridge.answer(
            requestId: requestId as String,
            accepted: accepted
        )
    }

    /// Called on the module queue, in JS call order. The task itself is only
    /// read and written on the main actor.
    private func bumpApplePayUpdateGeneration() -> Int {
        applePayUpdateLock.lock()
        applePayUpdateGeneration += 1
        let generation = applePayUpdateGeneration
        applePayUpdateLock.unlock()
        return generation
    }

    private func isCurrentApplePayUpdate(_ generation: Int) -> Bool {
        applePayUpdateLock.lock()
        let current = generation == applePayUpdateGeneration
        applePayUpdateLock.unlock()
        return current
    }

    @MainActor
    private func applePayStateBody() -> [String: Any] {
        let canPay = PKPaymentAuthorizationController.canMakePayments()
        return BridgeResults.walletStateBody(
            isAvailable: canPay,
            isReady: canPay,
            isOrderConsumed: applePay?.isOrderConsumed ?? false,
            isInteractionEnabled: applePay?.isInteractionEnabled ?? true
        )
    }

    private static func eventBody(_ event: PaymentSheetEvent, requestId: String) -> [String: Any] {
        var body: [String: Any] = ["requestId": requestId]
        switch event {
        case .ready:
            body["type"] = "onReady"
        case let .processing(isProcessing):
            body["type"] = "onProcessing"
            body["isProcessing"] = isProcessing
        }
        return body
    }

    private static func applePayEventBody(_ event: ApplePayEvent, requestId: String) -> [String: Any] {
        var body: [String: Any] = ["requestId": requestId]
        switch event {
        case .ready:
            body["type"] = "onReady"
        case let .processing(isProcessing):
            body["type"] = "onProcessing"
            body["isProcessing"] = isProcessing
        }
        return body
    }
}
