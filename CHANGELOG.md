# Changelog

All notable changes to the xMoney React Native SDK are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-10-16

Pins native SDKs to CocoaPods `XMoneyPaymentSheet` **1.1.0** and Maven `com.xmoney:*` **1.1.0**.

### Added

- `updateFailed` on Payment Element, wallet buttons, and imperative Google Pay when binding a new order fails after one was already bound. Pay stays locked on the previous order until a later bind succeeds.
- `PAYMENT_IN_PROGRESS` when `updateOrder` asks for a different order during a charge.
- `updateOrder(createOrder)` on Payment Element, wallet button refs, and imperative `ApplePay` / `GooglePay`. Pay locks before your server creates the next order, including during a debounce. If creation throws, the previous order stays payable. A newer call rejects the previous one with `SUPERSEDED_UPDATE_ORDER`. `isUpdateCurrent()` reports whether that callback is still the latest update.
- Android keeps a single in-flight order update per surface, and a missing activity settles `updateOrder` with `NOT_INITIALIZED` instead of leaving the promise pending.
- Imperative Apple Pay maps a cancelled `updateOrder` to `SUPERSEDED_UPDATE_ORDER`.

### Changed

- `ready` fires once per mounted surface, after the form or wallet button first draws. A failed first load no longer emits `ready`, and `updateOrder` does not emit it.
- A later bind failure is `updateFailed`. It does not call `onResult`.
- Wallet `updateOrder` no longer emits `processing`. Gate controls with `isInteractionEnabled`.
- The native form is prepared once, after the host view has a width, so the checkout loader does not restart when layout arrives.
- Apple Pay `ready` waits until the mount order is bound and the button has drawn. A failed mount bind is a `failed` result. A later bind failure is `updateFailed`.

### Migration

- End merchant loading on a `failed` result as well as `ready`.
- Handle `updateFailed` by telling the shopper and calling `updateOrder` again.
- Keep order-creation endpoints idempotent. A newer `updateOrder` cancels the previous one.

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
