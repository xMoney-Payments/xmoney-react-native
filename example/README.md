# xMoney React Native example app

In-repo demo for the SDK. One React Native app, a launcher, copy-paste samples, three merchant scenarios, and an internal playground.

Sun/moon toggle for **light / dark** (saved across Integrations, Advanced, and Playground). Scenario stores hide it and use their own accent. Samples pass a matching `AppearanceConfig` (`colorsLight` / `colorsDark`) so the SDK form sits on the merchant page instead of the library defaults.

## Run

```bash
cp example/secrets.json.example example/secrets.json
# Fill PUBLIC_KEY, API_KEY, API_BASE, CURRENCY, DESCRIPTION

cd example
npm install
bundle install
cd ios && bundle exec pod install && cd ..
npx react-native run-ios
# or
npx react-native run-android
```

Requires React Native New Architecture (0.76+).

Apple Pay only authorizes on a **physical device**. Add the Merchant ID under Signing & Capabilities; it must match xMoney wallet params.

## Launcher

| Section | Screen | What it is |
|---|---|---|
| Integrations | Payment Sheet | Drop-in sheet — copy this first. |
| Integrations | Embedded Payment Element | Form in your layout. |
| Integrations | Apple Pay / Google Pay | Standalone wallet button (platform). |
| Example app | Lumen shop | Lifestyle catalog → cart → Payment Sheet |
| Example app | Hearth Café | Café menu → cart → Embedded Element |
| Example app | Pulse Studio | Memberships → cart → Embedded Element |
| Advanced | Merchant Pay button | Embedded form, your CTA via `confirm()` |
| Advanced | Update order | `updateOrder` a new `PaymentIntent` on a mounted Element |
| Advanced | Card holder verification | Pre-pay name check |
| Internal | Playground | Every `PaymentConfig` option — SDK development |

Integrations and name-check include a **Test cards** sheet with the four xMoney simulator PANs (copy PAN / expiry / CVV / 3DS, success and fail). Playground **Appearance** is the live `AppearanceConfig` editor — presets plus colors, radii, Pay button, and font. Integration samples stay on `exampleAppearance()` so copy-paste still matches merchant chrome.

## Backend warning

[`DemoCheckoutBackend`](src/backend/DemoCheckoutBackend.ts) sends `API_KEY` to the public demo server so this app can create orders without a merchant backend.

**Do not copy that into production.** The React Native app should hold only `publicKey`. Your server creates the order and returns `payload` + `checksum`. The samples build `PaymentIntent` from those two values.

## Copy-paste notes

- Integrations samples **inline** `PaymentConfig` (`publicKey`, wallets, saved cards, optional `options.appearance`). Do not copy `defaultPaymentConfig()` — that helper is for the stores and playground.
- After `complete`, `failed`, or post-submit `canceled`, the order checksum is **consumed**. Create a new intent before paying again.
- Closing Payment Sheet **before** pay does not consume; present the same intent (**Continue**).
- Embedded / wallet: keep merchant loading until `onEvent` `ready`. Branch on `isOrderConsumed` after that. Pre-auth wallet dismiss delivers `canceled` and does not consume — present or tap again with the same intent.
- Payment Sheet: keep the merchant Pay button loading until `ready`. Samples use `onEvent` `processing` to tell pre-pay cancel apart from post-submit cancel.
- After a consumed result, samples hide the payment UI and show **New payment**.
- To change the amount on a mounted Element, `updateOrder` with a new `PaymentIntent`. Do **not** unmount the form. Hearth, Pulse, and Update order do this. Pay stays locked (`isInteractionEnabled`) with its current title — `processing` is an in-flight charge only. The form stays on screen.
- Call `updateAppearance` / `updateLocale` / `updateStyle` / `updateWalletAppearance` when you restyle a live Element. Playground Appearance writes `AppearanceConfig` and the live Element picks it up.
- [`exampleAppearance()`](src/SampleHelpers.ts) is the appearance copy-paste — restyle Sheet / Element / wallets to match your chrome. `shapes.borderRadius` is the card field and payment-methods container radius.
- Cart amounts are **minor units** (cents). The demo backend converts to a decimal only at the HTTP boundary.
