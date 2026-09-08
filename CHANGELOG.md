# Changelog

All notable changes to the xMoney React Native SDK are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-08

First stable release (`@xmoney/react-native` on npm).

Pins native SDKs to CocoaPods `XMoneyPaymentSheet` **1.0.0** and Maven `com.xmoney:*` **1.0.0**.

### Changed

- Example app Android/iOS bundle IDs use `com.xmoney.reactnative.example` so it can install alongside native SDK demos.

## [0.0.1] - 2026-09-02

First public release (`@xmoney/react-native` on npm).

Thin wrapper over CocoaPods `XMoneyPaymentSheet` **0.0.3** and Maven `com.xmoney:*` **0.0.3**. React Native New Architecture only (`react-native` >= 0.76).

### Added

- `PaymentSheet.init` / `present` / `dismiss` and `usePaymentSheet`
- `<PaymentElement />` with ref `confirm`, `updateOrder`, `updateAppearance`, `updateLocale`, `updateStyle`, and `updateWalletAppearance`
- `<ApplePayButton />` / `<GooglePayButton />` and imperative `ApplePay` / `GooglePay` (`init`, `present`, `dismiss`, `updateOrder`, `getState`)
- `card.cardHolderVerification` with JS `onCardHolderVerification` over the event bridge
- Expo config plugin (Apple Pay merchant ID, Google Pay meta-data)
- In-repo example app (Integrations, Lumen / Hearth / Pulse, Advanced, Playground)
