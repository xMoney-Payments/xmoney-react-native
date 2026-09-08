import Foundation
import XMoneyPaymentSheet

enum BridgeResults {
    static func resultBody(_ result: PaymentResult) -> [String: Any] {
        switch result {
        case let .complete(transaction):
            return [
                "status": "complete",
                "transaction": transaction.bridgeDictionary,
            ]
        case let .failed(error):
            let facing = error.merchantFacing()
            return [
                "status": "failed",
                "error": ["code": facing.code, "message": facing.message],
            ]
        case .canceled:
            return ["status": "canceled"]
        }
    }

    static func resultJSON(_ result: PaymentResult) -> String {
        jsonString(resultBody(result))
    }

    static func failedJSON(code: String, message: String) -> String {
        jsonString(failedBody(code: code, message: message))
    }

    static func failedBody(code: String, message: String) -> [String: Any] {
        [
            "status": "failed",
            "error": ["code": code, "message": message],
        ]
    }

    static func walletStateBody(
        isAvailable: Bool,
        isReady: Bool,
        isOrderConsumed: Bool,
        isInteractionEnabled: Bool
    ) -> [String: Any] {
        [
            "isAvailable": isAvailable,
            "isReady": isReady,
            "isOrderConsumed": isOrderConsumed,
            "isInteractionEnabled": isInteractionEnabled,
        ]
    }

    static func jsonString(_ object: [String: Any]) -> String {
        guard JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object),
              let string = String(data: data, encoding: .utf8)
        else {
            return #"{"status":"failed","error":{"code":"UNKNOWN","message":"Failed to serialize result"}}"#
        }
        return string
    }
}

extension Transaction {
    var bridgeDictionary: [String: Any] {
        var dict: [String: Any] = [:]
        if let id { dict["id"] = id }
        if let status { dict["status"] = status }
        if let amount { dict["amount"] = amount }
        if let currencyKey { dict["currencyKey"] = currencyKey }
        if let amountInEuro { dict["amountInEuro"] = amountInEuro }
        if let externalOrderId { dict["externalOrderId"] = externalOrderId }
        if let description { dict["description"] = description }
        if let customerData { dict["customerData"] = customerData.bridgeDictionary }
        return dict
    }
}

extension TransactionCustomer {
    var bridgeDictionary: [String: Any] {
        var dict: [String: Any] = [:]
        if let id { dict["id"] = id }
        if let siteId { dict["siteId"] = siteId }
        if let identifier { dict["identifier"] = identifier }
        if let firstName { dict["firstName"] = firstName }
        if let lastName { dict["lastName"] = lastName }
        if let country { dict["country"] = country }
        if let state { dict["state"] = state }
        if let city { dict["city"] = city }
        if let zipCode { dict["zipCode"] = zipCode }
        if let address { dict["address"] = address }
        if let phone { dict["phone"] = phone }
        if let email { dict["email"] = email }
        dict["isWhitelisted"] = isWhitelisted
        if let isWhitelistedUntil { dict["isWhitelistedUntil"] = isWhitelistedUntil }
        if let creationDate { dict["creationDate"] = creationDate }
        if let creationTimestamp { dict["creationTimestamp"] = NSNumber(value: creationTimestamp) }
        return dict
    }
}
