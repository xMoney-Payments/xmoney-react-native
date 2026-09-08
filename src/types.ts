/**
 * Public configuration and result types. Mirrors native `PaymentConfig`,
 * `PaymentIntent`, and `PaymentResult` from xmoney-ios / xmoney-android.
 */

/**
 * When card-field errors become visible. Native default is `'onTouched'`.
 *
 * - `'onTouched'`: no error while first typing a field; show on that field’s blur; then live
 * - `'onChange'`: live from the first keystroke
 * - `'onBlur'`: show on that field’s blur; frozen until the next blur (or Pay)
 * - `'onSubmit'`: no field errors until Pay; then live
 */
export type ValidationMode = 'onSubmit' | 'onChange' | 'onBlur' | 'onTouched';

export type SubmitButtonType =
  | 'book'
  | 'buy'
  | 'checkout'
  | 'donate'
  | 'order'
  | 'pay'
  | 'subscribe'
  | 'topUp'
  | 'deposit';

export type UserInterfaceStyle = 'automatic' | 'alwaysLight' | 'alwaysDark';

export type CardGrouping = 'condensed' | 'spaced';

/** Native `CardHolderMatchStatus` raw values. */
export type CardHolderMatchStatus =
  | 'Matched'
  | 'NotMatched'
  | 'NotVerified'
  | 'PartialMatched'
  | 'NotSupported';

/** Native `CardHolderVerificationResult`. */
export interface CardHolderVerificationResult {
  status: CardHolderMatchStatus;
  firstNameStatus?: CardHolderMatchStatus;
  middleNameStatus?: CardHolderMatchStatus;
  lastNameStatus?: CardHolderMatchStatus;
}

/** Shared wallet button colors (`PKPaymentButton` / Google `PayButton`). */
export type WalletButtonColor = 'white' | 'black';

/** Apple Pay also supports `PKPaymentButtonStyle.whiteOutline`. */
export type ApplePayButtonColor = WalletButtonColor | 'white-outline';

export type GooglePayButtonColor = WalletButtonColor;

/** Labels shared by Apple Pay and Google Pay buttons. */
export type WalletButtonType =
  | 'plain'
  | 'pay'
  | 'buy'
  | 'book'
  | 'checkout'
  | 'donate'
  | 'order'
  | 'subscribe';

/** Apple Pay also supports `PKPaymentButtonType.topUp`. */
export type ApplePayButtonType = WalletButtonType | 'topUp';

export type GooglePayButtonType = WalletButtonType;

/** Native `PaymentSheetEvent`. */
export type PaymentSheetEvent =
  | { type: 'ready' }
  | { type: 'processing'; isProcessing: boolean };

/** Native `ApplePayEvent` / `GooglePayEvent` — ready / processing only. */
export type ApplePayEvent = PaymentSheetEvent;
export type GooglePayEvent = PaymentSheetEvent;

export type AvailabilityEvent = {
  type: 'availability';
  isAvailable: boolean;
  isReady: boolean;
  isOrderConsumed: boolean;
  isInteractionEnabled: boolean;
};

/** Native property snapshot (`isOrderConsumed`, wallet readiness). */
export type WalletState = Omit<AvailabilityEvent, 'type'>;

/**
 * Payment Element consume / interact flags. Not PassKit or Play Wallet —
 * do not hide the card form on these.
 */
export type EmbeddedAvailabilityEvent = {
  type: 'availability';
  isOrderConsumed: boolean;
  isInteractionEnabled: boolean;
};

/** Embedded native `EmbeddedEvent` plus RN `availability` for property flags. */
export type EmbeddedEvent = PaymentSheetEvent | EmbeddedAvailabilityEvent;
export type WalletPayEvent = PaymentSheetEvent | AvailabilityEvent;

export interface AppearanceColors {
  primary?: string;
  background?: string;
  componentBackground?: string;
  componentBorder?: string;
  componentDivider?: string;
  primaryText?: string;
  secondaryText?: string;
  componentText?: string;
  placeholderText?: string;
  icon?: string;
  error?: string;
  /** Payment-method list / chip outline. Use `"none"` or `"transparent"` to hide. */
  containerBorder?: string;
}

export interface PrimaryButtonColors {
  background?: string;
  text?: string;
  border?: string;
}

export type PrimaryButtonConfig = {
  /** Pay label. Falls back to `appearance.font.family`. */
  font?: { family?: string };
  colors?: PrimaryButtonColors;
  colorsLight?: PrimaryButtonColors;
  colorsDark?: PrimaryButtonColors;
  shapes?: {
    /** Native default 9999 (pill). Pass 12 for a squircle. */
    borderRadius?: number;
    borderWidth?: number;
  };
};

/**
 * JS appearance bag. Native `AppearanceConfig.from` reads nested `font` / `shapes`.
 */
export interface AppearanceConfig {
  font?: { family?: string; scale?: number };
  colors?: AppearanceColors;
  colorsLight?: AppearanceColors;
  colorsDark?: AppearanceColors;
  shapes?: { borderRadius?: number; borderWidth?: number };
  primaryButton?: PrimaryButtonConfig;
}

export interface SavedCardsConfig {
  enabled?: boolean;
  optInVisible?: boolean;
}

export interface CardHolderName {
  firstName: string;
  middleName?: string;
  lastName: string;
}

/** Native `CardHolderVerification` — name plus a synchronous accept callback. */
export interface CardHolderVerification {
  name: CardHolderName;
  /** Native `(result) -> Bool`. RN waits until this returns. Default when omitted is reject (`false`). */
  onCardHolderVerification: (
    result: CardHolderVerificationResult
  ) => boolean;
}

export interface CardInputsConfig {
  grouping?: CardGrouping;
}

export interface SubmitButtonConfig {
  /** Embedded only. Payment Sheet always shows the SDK Pay button. */
  visible?: boolean;
  type?: SubmitButtonType;
}

export interface CardConfig {
  savedCards?: SavedCardsConfig;
  cardHolderVerification?: CardHolderVerification;
  inputs?: CardInputsConfig;
  /** Native default `'onTouched'`. See {@link ValidationMode}. */
  validationMode?: ValidationMode;
  submitButton?: SubmitButtonConfig;
}

/** Shared wallet-button fields used by both native buttons. */
export interface WalletAppearance {
  color?: WalletButtonColor;
  radius?: number;
  type?: WalletButtonType;
}

export interface ApplePayAppearance {
  color?: ApplePayButtonColor;
  radius?: number;
  type?: ApplePayButtonType;
}

export interface GooglePayAppearance {
  color?: GooglePayButtonColor;
  radius?: number;
  type?: GooglePayButtonType;
}

export interface ApplePayConfig {
  enabled?: boolean;
  appearance?: ApplePayAppearance;
}

export interface GooglePayConfig {
  enabled?: boolean;
  appearance?: GooglePayAppearance;
}

export interface PaymentMethodsConfig {
  applePay?: ApplePayConfig;
  googlePay?: GooglePayConfig;
}

export interface OptionsConfig {
  locale?: string;
  style?: UserInterfaceStyle;
  appearance?: AppearanceConfig;
}

/** Native `PaymentConfig`. Environment is inferred from `publicKey`. */
export interface PaymentConfig {
  publicKey: string;
  card?: CardConfig;
  paymentMethods?: PaymentMethodsConfig;
  options?: OptionsConfig;
}

/** Native `PaymentIntent`. Produced by the merchant backend. */
export interface PaymentIntent {
  orderPayload: string;
  orderChecksum: string;
}

export interface TransactionCustomer {
  id?: string;
  siteId?: string;
  identifier?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  isWhitelisted?: boolean;
  isWhitelistedUntil?: string;
  creationDate?: string;
  creationTimestamp?: number;
}

export interface Transaction {
  id?: string;
  status?: string;
  amount?: string;
  currencyKey?: string;
  amountInEuro?: string;
  externalOrderId?: string;
  description?: string;
  customerData?: TransactionCustomer;
}

export type PaymentStatus = 'complete' | 'failed' | 'canceled';

export interface PaymentError {
  code: string;
  message: string;
}

/** Native sealed `PaymentResult` as a JS discriminated union. */
export type PaymentResult =
  | { status: 'complete'; transaction: Transaction }
  | { status: 'failed'; error: PaymentError }
  | { status: 'canceled' };
