import type {
  AppearanceColors,
  AppearanceConfig,
  PaymentConfig,
  PaymentResult,
  UserInterfaceStyle,
  WalletAppearance,
} from '@xmoney/react-native';
import {AppearanceHex, ExampleColors} from './theme/ExampleColors';
import {secrets} from './secrets';

export const SAMPLE_AMOUNT_MINOR = 1999;

export function exampleForcedStyle(dark: boolean): UserInterfaceStyle {
  return dark ? 'alwaysDark' : 'alwaysLight';
}

export function exampleWalletAppearance(dark: boolean): WalletAppearance {
  return {color: dark ? 'white' : 'black'};
}

function appearanceColors(
  primary: string,
  background: string,
  component: string,
  text: string,
  muted: string,
  hairline: string
): AppearanceColors {
  return {
    primary,
    background,
    componentBackground: component,
    componentBorder: hairline,
    componentDivider: hairline,
    primaryText: text,
    secondaryText: muted,
    componentText: text,
    placeholderText: muted,
    icon: muted,
    error: ExampleColors.error,
    containerBorder: hairline,
  };
}

export function exampleAppearance(options?: {
  primary?: string;
  primaryDark?: string;
  buttonBackground?: string;
  buttonText?: string;
}): AppearanceConfig {
  const primary = options?.primary ?? ExampleColors.purple;
  const primaryDark = options?.primaryDark ?? primary;
  const buttonBackground = options?.buttonBackground ?? primary;
  const buttonText = options?.buttonText ?? '#FFFFFF';
  const pay = {background: buttonBackground, text: buttonText};
  return {
    colorsLight: appearanceColors(
      primary,
      ExampleColors.lightBg,
      ExampleColors.lightCard,
      ExampleColors.lightText,
      AppearanceHex.lightMuted,
      AppearanceHex.lightHairline
    ),
    colorsDark: appearanceColors(
      primaryDark,
      ExampleColors.darkBg,
      ExampleColors.darkCard,
      ExampleColors.darkText,
      ExampleColors.darkMuted,
      AppearanceHex.darkHairline
    ),
    shapes: {borderRadius: 24},
    primaryButton: {
      colorsLight: pay,
      colorsDark: pay,
      shapes: {borderRadius: 9999, borderWidth: 0},
    },
  };
}

export function defaultPaymentConfig(options?: {
  dark: boolean;
  appearance?: AppearanceConfig;
  applePayEnabled?: boolean;
  googlePayEnabled?: boolean;
  savedCardsEnabled?: boolean;
}): PaymentConfig {
  const dark = options?.dark ?? false;
  const wallet = exampleWalletAppearance(dark);
  return {
    publicKey: secrets.PUBLIC_KEY,
    paymentMethods: {
      applePay: {
        enabled: options?.applePayEnabled ?? true,
        appearance: wallet,
      },
      googlePay: {
        enabled: options?.googlePayEnabled ?? true,
        appearance: wallet,
      },
    },
    card: {
      savedCards: {enabled: options?.savedCardsEnabled ?? true},
    },
    options: {
      style: exampleForcedStyle(dark),
      appearance: options?.appearance ?? exampleAppearance(),
    },
  };
}

export function formatMoney(amountMinor: number, currency = secrets.CURRENCY): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Native checkout has bound — dismiss the preparing overlay. */
export function isNativeBoundEvent(event: {type: string}): boolean {
  return event.type === 'ready' || event.type === 'availability';
}

export function bindFailureMessage(result: PaymentResult): string | null {
  if (result.status !== 'failed') {
    return null;
  }
  return result.error.message || result.error.code || 'Checkout failed';
}

/** Complete/Failed always consume. Canceled consumes only after pay started. */
export function orderConsumed(
  result: PaymentResult,
  didProcess: boolean
): boolean {
  if (result.status === 'complete' || result.status === 'failed') {
    return true;
  }
  return didProcess;
}

export function resultMessage(result: PaymentResult): string {
  if (result.status === 'complete') {
    return result.transaction.id
      ? `Paid · ${result.transaction.id}`
      : 'Payment complete';
  }
  if (result.status === 'failed') {
    return result.error.message || result.error.code;
  }
  return 'Canceled';
}
