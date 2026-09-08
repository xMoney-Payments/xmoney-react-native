/**
 * @xmoney/react-native
 *
 * Thin wrapper over xmoney-ios / xmoney-android:
 *  - `PaymentSheet.init` / `present`
 *  - `ApplePay` / `GooglePay` init / present / dismiss
 *  - `<PaymentElement />`
 *  - `<ApplePayButton />` / `<GooglePayButton />`
 *  - `usePaymentSheet()`
 */

export { PaymentSheet } from './PaymentSheet';
export { ApplePay } from './ApplePay';
export { GooglePay } from './GooglePay';
export { usePaymentSheet } from './hooks/usePaymentSheet';
export type { UsePaymentSheet } from './hooks/usePaymentSheet';
export { PaymentElement } from './components/PaymentElement';
export type {
  PaymentElementProps,
  PaymentElementRef,
} from './components/PaymentElement';
export {
  ApplePayButton,
  GooglePayButton,
} from './components/WalletPayButton';
export type {
  ApplePayButtonProps,
  ApplePayButtonRef,
  GooglePayButtonProps,
  GooglePayButtonRef,
  WalletPayButtonRef,
} from './components/WalletPayButton';
export { XMoneyPaymentError } from './errors';

export type {
  AppearanceColors,
  AppearanceConfig,
  ApplePayConfig,
  ApplePayEvent,
  AvailabilityEvent,
  CardConfig,
  CardGrouping,
  CardHolderName,
  CardHolderVerification,
  CardHolderVerificationResult,
  CardHolderMatchStatus,
  CardInputsConfig,
  EmbeddedAvailabilityEvent,
  EmbeddedEvent,
  GooglePayConfig,
  GooglePayEvent,
  OptionsConfig,
  PaymentConfig,
  PaymentError,
  PaymentIntent,
  PaymentMethodsConfig,
  PaymentResult,
  PaymentSheetEvent,
  PaymentStatus,
  WalletPayEvent,
  PrimaryButtonColors,
  PrimaryButtonConfig,
  SavedCardsConfig,
  SubmitButtonConfig,
  SubmitButtonType,
  Transaction,
  TransactionCustomer,
  UserInterfaceStyle,
  ValidationMode,
  ApplePayAppearance,
  ApplePayButtonColor,
  ApplePayButtonType,
  GooglePayAppearance,
  GooglePayButtonColor,
  GooglePayButtonType,
  WalletAppearance,
  WalletButtonColor,
  WalletButtonType,
  WalletState,
} from './types';
