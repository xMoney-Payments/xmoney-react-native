import Foundation
import XMoneyPaymentSheet

/// Typed as `throws` so unexpected Swift errors from native SDK calls are caught.
enum BridgeCatch {
    static func run(_ work: () throws -> Void, onError: (Error) -> Void) {
        do {
            try work()
        } catch {
            onError(error)
        }
    }

    static func codeMessage(_ error: Error) -> (code: String, message: String) {
        if let payment = error as? PaymentError {
            let facing = payment.merchantFacing()
            return (facing.code, facing.message)
        }
        return ("PRESENT_ERROR", "Failed to present")
    }
}
