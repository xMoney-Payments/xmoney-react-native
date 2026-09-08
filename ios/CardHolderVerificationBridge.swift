import Foundation
import XMoneyPaymentSheet

/// Asks JS `onCardHolderVerification` and waits until JS answers
/// (native callback is synchronous).
enum CardHolderVerificationBridge {
    private static let lock = NSLock()
    private static var pending: [String: DispatchSemaphore] = [:]
    private static var answers: [String: Bool] = [:]

    static func ask(
        chvId: String,
        result: CardHolderVerificationResult
    ) -> Bool {
        let requestId = UUID().uuidString
        let semaphore = DispatchSemaphore(value: 0)
        lock.lock()
        pending[requestId] = semaphore
        lock.unlock()

        var body: [String: Any] = [
            "type": "onCardHolderVerification",
            "requestId": requestId,
            "chvId": chvId,
            "status": result.status.rawValue,
        ]
        if let status = result.firstNameStatus {
            body["firstNameStatus"] = status.rawValue
        }
        if let status = result.middleNameStatus {
            body["middleNameStatus"] = status.rawValue
        }
        if let status = result.lastNameStatus {
            body["lastNameStatus"] = status.rawValue
        }

        if Thread.isMainThread {
            XMoneyPaymentSheetHost.shared.eventSink?(body as NSDictionary)
        } else {
            DispatchQueue.main.sync {
                XMoneyPaymentSheetHost.shared.eventSink?(body as NSDictionary)
            }
        }

        semaphore.wait()
        lock.lock()
        pending.removeValue(forKey: requestId)
        let accepted = answers.removeValue(forKey: requestId) ?? false
        lock.unlock()
        return accepted
    }

    static func answer(requestId: String, accepted: Bool) {
        lock.lock()
        answers[requestId] = accepted
        let semaphore = pending[requestId]
        lock.unlock()
        semaphore?.signal()
    }
}
