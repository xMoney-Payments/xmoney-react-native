import Foundation
import XMoneyPaymentSheet

struct OrderCreationRejected: Error {}

/// Gates for JS `updateOrder(createOrder)` calls in flight on one surface.
///
/// A resolve or reject that arrives before `beginUpdateOrder` is kept until
/// that call creates the gate. Finished request ids are capped so a long
/// checkout cannot grow the set. Call from the main thread.
final class PendingOrders {
    private var gates: [String: PendingOrderGate] = [:]
    private var early: [String: Result<PaymentIntent, Error>] = [:]
    private var finished = Set<String>()
    private var finishedOrder: [String] = []

    func isFinished(_ requestId: String) -> Bool {
        finished.contains(requestId)
    }

    /// The gate for `requestId`, applying any result that arrived early.
    func begin(_ requestId: String) -> PendingOrderGate {
        let gate = gates[requestId] ?? PendingOrderGate()
        gates[requestId] = gate
        if let result = early.removeValue(forKey: requestId) {
            gate.finish(result)
        }
        return gate
    }

    /// Applies a JS resolve or reject.
    func settle(requestId: String, result: Result<PaymentIntent, Error>) {
        if finished.contains(requestId) { return }
        if let gate = gates[requestId] {
            gate.finish(result)
        } else {
            early[requestId] = result
        }
    }

    func close(_ requestId: String) {
        gates[requestId] = nil
        early[requestId] = nil
        guard finished.insert(requestId).inserted else { return }
        finishedOrder.append(requestId)
        if finishedOrder.count > 32 {
            finished.remove(finishedOrder.removeFirst())
        }
    }

    /// Resumes gates still waiting so a disposed view does not leak them.
    func cancelAll() {
        let waiting = gates
        gates.removeAll()
        early.removeAll()
        waiting.values.forEach { $0.finish(.failure(CancellationError())) }
    }
}

/// Holds the intent JS creates while native `updateOrder(createOrder:)` is locked.
final class PendingOrderGate {
    private var continuation: CheckedContinuation<PaymentIntent, Error>?
    private var result: Result<PaymentIntent, Error>?
    private var finished = false

    func awaitIntent() async throws -> PaymentIntent {
        if let result {
            return try result.get()
        }
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                if let result {
                    continuation.resume(with: result)
                    return
                }
                self.continuation = continuation
            }
        } onCancel: {
            DispatchQueue.main.async {
                self.finish(.failure(CancellationError()))
            }
        }
    }

    func finish(_ result: Result<PaymentIntent, Error>) {
        guard !finished else { return }
        finished = true
        self.result = result
        if let continuation {
            self.continuation = nil
            continuation.resume(with: result)
        }
    }
}
