import { Platform } from 'react-native';
import type {
  ApplePayAppearance,
  GooglePayAppearance,
  PaymentMethodsConfig,
} from './types';

/** Wallet config for the current platform only. */
export function platformPayMethods(
  appearance?: ApplePayAppearance | GooglePayAppearance,
  os: typeof Platform.OS = Platform.OS
): PaymentMethodsConfig {
  if (os === 'ios') {
    return {
      applePay: {
        enabled: true,
        appearance: appearance as ApplePayAppearance | undefined,
      },
    };
  }
  return {
    googlePay: {
      enabled: true,
      appearance: appearance as GooglePayAppearance | undefined,
    },
  };
}
