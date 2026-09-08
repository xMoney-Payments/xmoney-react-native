import type { PaymentError, PaymentResult } from './types';

export const STABLE_MESSAGES: Readonly<Record<string, string>> = {
  NOT_LINKED: "The package '@xmoney/react-native' is not linked.",
  NOT_INITIALIZED: 'Call init before present.',
  INVALID_PUBLIC_KEY: 'publicKey must include test or live.',
  NO_PRESENTER: 'Unable to present from the current screen.',
  PRESENT_ERROR: 'Failed to present',
  LOAD_ERROR: 'Failed to load',
  SUPERSEDED_UPDATE_ORDER: 'Superseded by a newer updateOrder call',
  APPLE_PAY: 'Apple Pay is only available on iOS.',
  GOOGLE_PAY: 'Google Pay is only available on Android.',
};

const CODE_TOKEN = /^[A-Z][A-Z0-9_]{0,63}$/;
const UNSAFE_MESSAGE = /orderPayload|orderChecksum|\bpan\b|\{/i;

function isSafeMerchantMessage(message: string): boolean {
  return message.length > 0 && message.length <= 200 && !UNSAFE_MESSAGE.test(message);
}

/** Allowlisted bridge messages, or a short merchant-facing native error. */
export function sanitizePaymentError(
  code: string | undefined,
  message: string | undefined
): PaymentError {
  if (code && code in STABLE_MESSAGES) {
    return { code, message: STABLE_MESSAGES[code] ?? 'Payment failed' };
  }
  const safeCode = code && CODE_TOKEN.test(code) ? code : 'UNKNOWN';
  const safeMessage =
    message && isSafeMerchantMessage(message) ? message : 'Payment failed';
  return { code: safeCode, message: safeMessage };
}

/**
 * Thrown by `getModule()` (unlinked native) and imperative `updateOrder`.
 * `init()` no longer pre-validates `publicKey` — native bind fails instead.
 * `present()` and native views resolve `{ status: 'failed' }` instead of throwing.
 */
export class XMoneyPaymentError extends Error implements PaymentError {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'XMoneyPaymentError';
    this.code = code;
  }

  static from(value: unknown): XMoneyPaymentError {
    if (value instanceof XMoneyPaymentError) {
      return value;
    }
    let code: string | undefined;
    let message: string | undefined;
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.code === 'string') {
        code = obj.code;
      }
      if (typeof obj.message === 'string') {
        message = obj.message;
      }
    }
    const sanitized = sanitizePaymentError(code, message);
    return new XMoneyPaymentError(sanitized.code, sanitized.message);
  }
}

/** Maps a thrown/rejected bridge error to a merchant `PaymentResult`. */
export function paymentResultFromUnknown(value: unknown): PaymentResult {
  const error = XMoneyPaymentError.from(value);
  return { status: 'failed', error: { code: error.code, message: error.message } };
}
