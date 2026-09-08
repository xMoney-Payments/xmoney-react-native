# xMoney Payments — React Native SDK

React Native SDK for [xMoney](https://xmoney.com) checkout. Three surfaces, one `PaymentConfig`, one `PaymentResult`. Card data never crosses the JavaScript bridge.

| Surface           | API                                              | Use when                                                |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **Payment Sheet** | `PaymentSheet`, `usePaymentSheet`                | Drop-in bottom sheet. SDK owns the UI and the Pay button. |
| **Payment Element** | `<PaymentElement />`                           | Card, saved cards, and wallet **in your layout**.       |
| **Apple Pay**     | `ApplePay`, `<ApplePayButton />` (iOS)           | Standalone wallet button or `present()`.                |
| **Google Pay**    | `GooglePay`, `<GooglePayButton />` (Android)     | Standalone wallet button or `present()`.                |

## Requirements

- React Native New Architecture (`react-native` >= 0.76)
- iOS 15.0+
- Android `minSdk` 23

## Installation

Latest release: **`0.0.1`**

```bash
npm install @xmoney/react-native
```

**iOS** — autolinking installs native dependencies. Then:

```bash
cd ios && pod install
```

**Android** — autolinking registers the native module. Rebuild the app after install.

Put only a **publishable** `publicKey` (`pk_test_…` / `pk_live_…`) in the app. Create orders on **your server**. Never ship a secret API key.

### Expo

Add the config plugin in `app.json`:

```json
{
  "plugins": [
    [
      "@xmoney/react-native",
      {
        "merchantIdentifier": "merchant.com.example",
        "enableGooglePay": true
      }
    ]
  ]
}
```

## Checkout flow

1. Your backend creates an order and returns `payload` + `checksum`.
2. The app builds a `PaymentIntent` from those two values.
3. You present Sheet, mount Element, or show a wallet button.
4. The SDK fetches the session token, collects payment, and runs 3DS if needed.
5. You handle `PaymentResult`. Session tokens are never passed by the merchant.

```ts
const intent = {
  orderPayload: payloadFromYourServer,
  orderChecksum: checksumFromYourServer,
};
```

## Payment result

Every surface delivers the same shape:

```ts
type PaymentResult =
  | { status: 'complete'; transaction: Transaction }
  | { status: 'failed'; error: { code: string; message: string } }
  | { status: 'canceled' };
```

`failed` messages are SDK-authored. Do not display raw server bodies.

Interim events (`ready`, `processing`) are optional and do not replace the result callback. Use `ready` to hide merchant loading until the surface is bound. `processing` is an in-flight charge only — `updateOrder` does not emit it.

## Order lifecycle

Order checksums are **one-shot**. After a consumed result the bound order cannot be charged again.

| Outcome                                              | Consumes order? | What you do                               |
| ---------------------------------------------------- | --------------- | ----------------------------------------- |
| `complete`                                           | Yes             | New `PaymentIntent` for another payment   |
| `failed`                                             | Yes             | New `PaymentIntent`                       |
| `canceled` **after** pay / 3DS started               | Yes             | New `PaymentIntent`                       |
| Sheet closed **before** pay (header, drag, scrim)    | No              | Present the **same** intent again         |
| Wallet dismissed **before** authorization            | No              | Present / tap again with the **same** intent |

Embedded and wallet buttons stay mounted after a consumed result; Pay / wallet disable (`isOrderConsumed`). Unmount them, or pass a **new** `intent`.

Payment Sheet dismisses on terminal results (including post-submit cancel). Present again with a new intent.

Use `onEvent` `processing` (or `isOrderConsumed` on Element / wallet buttons) to tell pre-pay cancel apart from post-submit cancel.

## Payment Sheet

SDK owns the full checkout UI, including the Pay button (`card.submitButton.visible` is ignored).

**Hook**

```tsx
import { usePaymentSheet } from '@xmoney/react-native';

function CheckoutButton() {
  const { init, present, loading } = usePaymentSheet();

  const onPay = async () => {
    await init({
      publicKey: 'pk_test_…',
      paymentMethods: { applePay: { enabled: true }, googlePay: { enabled: true } },
      card: { savedCards: { enabled: true } },
    });

    const result = await present(
      intent,
      (event) => {
        if (event.type === 'ready') { /* hide merchant loading */ }
      },
    );

    if (result.status === 'complete') {
      console.log(result.transaction);
    }
  };

  return <Button title="Pay" onPress={onPay} disabled={loading} />;
}
```

**Imperative**

```ts
import { PaymentSheet } from '@xmoney/react-native';

await PaymentSheet.init({ publicKey: 'pk_test_…' });
const result = await PaymentSheet.present(intent);
PaymentSheet.dismiss(); // optional; idle close still cancels
```

While idle, the sheet can be dragged closed. Drag, X, and scrim lock while a charge is in flight. A second `present()` while idle replaces the open sheet (the first promise resolves `{ status: 'canceled' }`); while a charge is in flight the second `present()` returns `{ status: 'canceled' }` without opening another sheet.

Copy-paste sample: [`PaymentSheetSample.tsx`](example/src/samples/PaymentSheetSample.tsx)

## Payment Element

Same form as the sheet, without the bottom-sheet chrome. Mount it in your layout. Embedded does not add outer content padding or a page fill — the host background shows through; supply your own page spacing. Keep merchant loading until `onEvent` `ready`.

```tsx
import { PaymentElement } from '@xmoney/react-native';

<PaymentElement
  configuration={{
    publicKey: 'pk_test_…',
    paymentMethods: { applePay: { enabled: true }, googlePay: { enabled: true } },
  }}
  intent={intent}
  onEvent={(event) => {
    if (event.type === 'ready') { /* hide merchant loading */ }
    if (event.type === 'availability') {
      /* isOrderConsumed / isInteractionEnabled */
    }
  }}
  onResult={(result) => {
    if (result.status === 'complete') console.log(result.transaction);
  }}
/>
```

After `complete` / `failed` / post-submit `canceled`, hide the element (or pass a new `intent`). Pre-pay cancel does not consume — keep it mounted.

### Update the order

`ref.updateOrder` (or changing the `intent` prop) rebinds a new signed `PaymentIntent` on the mounted Element. Pay, `confirm()`, and wallet buttons are disabled until bind finishes (`isInteractionEnabled` is false). A newer `updateOrder` cancels the in-flight one. The Pay button keeps its current title; it does not show “Processing...”.

```tsx
await elementRef.current?.updateOrder(nextIntent);
```

Keep the surface mounted; do not unmount the form for a loader. Gate a merchant-owned Pay button with `isInteractionEnabled`.

Copy-paste sample: [`UpdateOrderSample.tsx`](example/src/advanced/UpdateOrderSample.tsx)

### Live appearance

Call `updateAppearance` / `updateLocale` / `updateStyle` / `updateWalletAppearance` on the ref instead of recreating `configuration` for style-only changes. Changing `publicKey`, `card`, `paymentMethods`, or `options.style` remounts the native view.

Payment Sheet snapshots config at `present()` — pass appearance on `PaymentConfig` and present again to replace an idle sheet.

### Merchant-owned Pay button

Embedded only. Hide the SDK button and call `confirm()` after `ready`:

```tsx
import { PaymentElement, type PaymentElementRef } from '@xmoney/react-native';

const elementRef = useRef<PaymentElementRef>(null);

<PaymentElement
  ref={elementRef}
  configuration={{
    publicKey: 'pk_test_…',
    card: { submitButton: { visible: false } },
  }}
  intent={intent}
  onEvent={(event) => {
    if (event.type === 'ready') { /* enable your Pay button */ }
  }}
  onResult={(result) => { /* PaymentResult */ }}
/>

<Button
  title="Pay"
  onPress={() => elementRef.current?.confirm()}
/>
```

`confirm()` submits the currently selected method (new card or saved card). Wallet buttons still use the native wallet UI. `isInteractionEnabled` is false during `updateOrder` and while a charge is in flight.

Copy-paste sample: [`PaymentElementSample.tsx`](example/src/samples/PaymentElementSample.tsx) · Merchant CTA: [`MerchantPaySample.tsx`](example/src/advanced/MerchantPaySample.tsx)

## Apple Pay

**iOS only.** `ApplePayButton` renders nothing on Android.

```tsx
import { ApplePay, ApplePayButton } from '@xmoney/react-native';

await ApplePay.init({ publicKey: 'pk_test_…' });

const state = await ApplePay.getState();
if (state.isAvailable && state.isReady) {
  const result = await ApplePay.present(intent);
}

ApplePay.dismiss(); // closes PassKit before authorize; no-op during token submit / 3DS

<ApplePayButton
  configuration={{ publicKey: 'pk_test_…' }}
  intent={intent}
  appearance={{ color: 'black', type: 'buy' }}
  onResult={(result) => { /* PaymentResult */ }}
/>
```

`ApplePay.updateOrder` may run **before** `present` to bind the next payable intent. After `getState` or wallet-button `onEvent` `availability`, gate your own chrome with `isAvailable`, `isReady`, `isOrderConsumed`, and `isInteractionEnabled`.

Pre-auth dismiss delivers `{ status: 'canceled' }` and does **not** consume. Present or tap again with the same intent.

### Setup

1. Enable Apple Pay: `paymentMethods.applePay.enabled: true`.
2. Create a Merchant ID in [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/merchant).
3. In Xcode: app target → **Signing & Capabilities** → **Apple Pay** → add that Merchant ID (or use the Expo plugin above).
4. The Merchant ID must match xMoney wallet params.
5. Test on a **physical device** with a card in Wallet.

Copy-paste sample: [`WalletPaySample.tsx`](example/src/samples/WalletPaySample.tsx)

## Google Pay

**Android only.** `GooglePayButton` renders nothing on iOS.

```tsx
import { GooglePay, GooglePayButton } from '@xmoney/react-native';

await GooglePay.init({ publicKey: 'pk_test_…' });

const state = await GooglePay.getState(intent);
if (state.isAvailable && state.isReady) {
  const present = GooglePay.present(intent);
  await GooglePay.updateOrder(nextIntent); // while overlay is open
  const result = await present;
}

<GooglePayButton
  configuration={{ publicKey: 'pk_test_…' }}
  intent={intent}
  appearance={{ color: 'black', type: 'buy' }}
  onResult={(result) => { /* PaymentResult */ }}
/>
```

`GooglePay.updateOrder` rebinds the open host — call **after** `present`, while the overlay is still open. Throws if no host is open. A second `present()` while one is in flight returns `{ status: 'canceled' }` — `dismiss()` then `present()` to replace.

Pre-auth dismiss delivers `{ status: 'canceled' }` and does **not** consume. Present or tap again with the same intent.

Copy-paste sample: [`WalletPaySample.tsx`](example/src/samples/WalletPaySample.tsx)

## Configuration

```ts
{
  publicKey: 'pk_test_…',
  paymentMethods: {
    applePay: {
      enabled: true,
      appearance: { color: 'black', radius: 12, type: 'pay' }, // iOS: white-outline, topUp
    },
    googlePay: {
      enabled: true,
      appearance: { color: 'black', radius: 12, type: 'pay' },
    },
  },
  card: {
    savedCards: { enabled: true, optInVisible: true },
    validationMode: 'onTouched',
    inputs: { grouping: 'condensed' },
    submitButton: {
      visible: true, // Embedded only
      type: 'pay',   // book, buy, checkout, donate, …
    },
  },
  options: {
    locale: 'en-US', // UI language + pay-button amount punctuation
    style: 'automatic',
    appearance: {
      colors: { primary: '#7c4dff', background: '#ffffff' },
      colorsLight: { primaryText: '#16141a' },
      colorsDark: { primaryText: '#f7f6f9' },
      shapes: { borderRadius: 12, borderWidth: 1 },
      primaryButton: {
        colors: { background: '#7c4dff', text: '#ffffff' },
        shapes: { borderRadius: 12 },
      },
    },
  },
}
```

**Card validation** (`card.validationMode`, default `onTouched`):

| Mode        | When errors show                                                     |
| ----------- | -------------------------------------------------------------------- |
| `onTouched` | None while first typing; on blur; then live. After Pay, always live. |
| `onChange`  | Live from the first keystroke                                        |
| `onBlur`    | On blur; frozen until the next blur (live after Pay)                 |
| `onSubmit`  | On Pay (then live)                                                   |

Pay uses current field validity. Cardholder name is always collected.

**Appearance** — pass `colorsLight` / `colorsDark` so the form matches your chrome. Card fields use `appearance.shapes.borderRadius` (default 16) and `colors.componentBorder`. Pay button radius comes from `appearance.primaryButton.shapes.borderRadius` (default a pill, `9999`). Pass `12` for a squircle. On a mounted Element, call ref `updateAppearance` / `updateStyle` / `updateWalletAppearance`. See [`exampleAppearance()`](example/src/SampleHelpers.ts) for a copy-paste palette.

**Locale** — `options.locale` sets UI copy and pay-button amount punctuation. Supported languages: `en`, `el`, `ro`, `bg`, `hu`, `pl`. Region tags (`en-US`, `pl-PL`) work; unknown languages fall back to English.

## Card holder verification

Optional pre-pay name check. Requires the site to have name-check validation enabled.

```ts
card: {
  cardHolderVerification: {
    name: { firstName: 'John', lastName: 'Doe' },
    onCardHolderVerification: (result) => result.status === 'Matched',
  },
},
```

Return `true` to continue pay, `false` to block. Sample: [`CardHolderVerificationSample.tsx`](example/src/advanced/CardHolderVerificationSample.tsx)

## Public API

Use only these merchant-facing exports from `@xmoney/react-native`:

| Surface         | Types                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Config / models | `PaymentConfig` and nested options, `PaymentIntent`, `PaymentResult`, `PaymentError`, `Transaction`, `CardHolderVerificationResult` |
| Payment Sheet   | `PaymentSheet`, `usePaymentSheet`, `PaymentSheetEvent`                |
| Payment Element | `PaymentElement`, `PaymentElementRef` (`confirm`, `updateOrder`, `updateAppearance`, `updateLocale`, `updateStyle`, `updateWalletAppearance`), `EmbeddedEvent` |
| Apple Pay       | `ApplePay` (`init`, `present`, `updateOrder`, `dismiss`, `getState`), `ApplePayButton`, `ApplePayButtonRef`, `WalletPayEvent` |
| Google Pay      | `GooglePay` (`init`, `present`, `updateOrder`, `dismiss`, `getState`), `GooglePayButton`, `GooglePayButtonRef`, `WalletPayEvent` |
| Errors          | `XMoneyPaymentError` (`NOT_LINKED` when the native module is missing) |

## PCI scope

Card fields live entirely inside the native SDKs. This wrapper never receives raw PAN / CVV. Merchants should follow xMoney integration guidance and the SAQ attestation provided with native SDK certification.

## Example app

In-repo demo: copy-paste Integrations (Sheet / Element / Apple Pay or Google Pay), Lumen / Hearth / Pulse stores, merchant CTA / `updateOrder` / name-check, and an internal playground. See [`example/README.md`](example/README.md) for how to run it and consumption notes.

The example talks to a demo backend with `API_KEY` in the app. **Do not ship that pattern.** Production apps hold only `publicKey`; your server returns `payload` + `checksum`.

## Support

- Releases: [CHANGELOG.md](CHANGELOG.md)
- Security: [SECURITY.md](SECURITY.md) — report vulnerabilities to **support@xmoney.com**, not a public issue
- License: [MIT](LICENSE)
