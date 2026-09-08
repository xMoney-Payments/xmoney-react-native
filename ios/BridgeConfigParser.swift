import Foundation
import XMoneyPaymentSheet

/// Parses a JS config object into native SDK types, overlaying only keys that
/// are present so native `PaymentConfig` defaults apply.
enum BridgeConfigParser {
    static func parseConfig(_ dict: [String: Any]) -> PaymentConfig {
        PaymentConfig(
            publicKey: dict["publicKey"] as? String ?? "",
            card: parseCard(BridgeMaps.stringMap(dict["card"])),
            paymentMethods: parsePaymentMethods(BridgeMaps.stringMap(dict["paymentMethods"])),
            options: parseOptions(BridgeMaps.stringMap(dict["options"]))
        )
    }

    static func parseIntent(orderPayload: String, orderChecksum: String) -> PaymentIntent {
        PaymentIntent(
            orderPayload: OrderPayload(orderPayload),
            orderChecksum: OrderChecksum(orderChecksum)
        )
    }

    static func parse(
        _ config: [String: Any],
        orderPayload: String,
        orderChecksum: String
    ) -> (PaymentConfig, PaymentIntent) {
        (parseConfig(config), parseIntent(orderPayload: orderPayload, orderChecksum: orderChecksum))
    }

    private static func parseCard(_ dict: [String: Any]?) -> PaymentConfig.CardConfig {
        var card = PaymentConfig.CardConfig()
        guard let dict else { return card }

        if let saved = BridgeMaps.stringMap(dict["savedCards"]) {
            var savedCards = PaymentConfig.SavedCardsConfig()
            if saved["enabled"] != nil {
                savedCards.enabled = BridgeMaps.bool(saved["enabled"], default: savedCards.enabled)
            }
            if saved["optInVisible"] != nil {
                savedCards.optInVisible = BridgeMaps.bool(
                    saved["optInVisible"],
                    default: savedCards.optInVisible
                )
            }
            card.savedCards = savedCards
        }

        card.cardHolderVerification = parseCardHolderVerification(
            BridgeMaps.stringMap(dict["cardHolderVerification"])
        )

        if let inputs = BridgeMaps.stringMap(dict["inputs"]),
           let groupingRaw = inputs["grouping"] as? String,
           let grouping = PaymentConfig.CardGrouping(rawValue: groupingRaw)
        {
            card.inputs = .init(grouping: grouping)
        }

        if let validationRaw = dict["validationMode"] as? String,
           let mode = PaymentConfig.ValidationMode(rawValue: validationRaw)
        {
            card.validationMode = mode
        }

        if let submit = BridgeMaps.stringMap(dict["submitButton"]) {
            var submitButton = PaymentConfig.SubmitButtonConfig()
            if submit["visible"] != nil {
                submitButton.visible = BridgeMaps.bool(submit["visible"], default: submitButton.visible)
            }
            if let typeRaw = submit["type"] as? String,
               let type = PaymentConfig.SubmitButtonType(rawValue: typeRaw)
            {
                submitButton.type = type
            }
            card.submitButton = submitButton
        }

        return card
    }

    private static func parseCardHolderVerification(
        _ dict: [String: Any]?
    ) -> CardHolderVerification? {
        guard let dict,
              let name = BridgeMaps.stringMap(dict["name"]),
              let firstName = name["firstName"] as? String,
              let lastName = name["lastName"] as? String
        else {
            return nil
        }
        let chvId = dict["chvId"] as? String ?? ""
        return CardHolderVerification(
            name: CardHolderName(
                firstName: firstName,
                middleName: name["middleName"] as? String ?? "",
                lastName: lastName
            ),
            onCardHolderVerification: { result in
                CardHolderVerificationBridge.ask(chvId: chvId, result: result)
            }
        )
    }

    private static func parsePaymentMethods(
        _ dict: [String: Any]?
    ) -> PaymentConfig.PaymentMethodsConfig {
        var methods = PaymentConfig.PaymentMethodsConfig()
        guard let dict else { return methods }
        let applePay = BridgeMaps.stringMap(dict["applePay"])
        var apple = PaymentConfig.ApplePayConfig()
        if applePay?["enabled"] != nil {
            apple.enabled = BridgeMaps.bool(applePay?["enabled"], default: apple.enabled)
        }
        apple.appearance = parseWalletAppearance(BridgeMaps.stringMap(applePay?["appearance"]))
        methods.applePay = apple
        return methods
    }

    static func parseWalletAppearance(
        _ dict: [String: Any]?
    ) -> PaymentConfig.WalletAppearance {
        guard let dict else { return .init() }
        return PaymentConfig.WalletAppearance(
            color: PaymentConfig.WalletButtonColor.from(dict["color"] as? String),
            radius: BridgeMaps.double(dict["radius"]),
            type: PaymentConfig.WalletButtonType.from(dict["type"] as? String)
        )
    }

    private static func parseOptions(_ dict: [String: Any]?) -> PaymentConfig.OptionsConfig {
        var options = PaymentConfig.OptionsConfig()
        guard let dict else { return options }
        if let locale = dict["locale"] as? String {
            options.locale = locale
        }
        if let styleRaw = dict["style"] as? String,
           let style = PaymentConfig.UserInterfaceStyle(rawValue: styleRaw)
        {
            options.style = style
        }
        options.appearance = PaymentConfig.AppearanceConfig.from(
            BridgeMaps.stringMap(dict["appearance"])
        )
        return options
    }
}
