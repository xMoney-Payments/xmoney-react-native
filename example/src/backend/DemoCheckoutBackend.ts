import type {PaymentIntent} from '@xmoney/react-native';
import {secrets} from '../secrets';

/**
 * Demo-only checkout backend.
 *
 * Do **not** copy this into a merchant app. This client sends `API_KEY` because
 * the public demo server (`demo.xmoney.com`) is a stand-in for *your* backend.
 *
 * In production the app holds only `publicKey`. Your server creates the order
 * and returns `payload` + `checksum`.
 */
export const DemoCheckoutBackend = {
  secretsError(): string | null {
    if (
      !secrets.PUBLIC_KEY ||
      secrets.PUBLIC_KEY.includes('replace') ||
      secrets.PUBLIC_KEY.includes('xxxxx')
    ) {
      return 'Set PUBLIC_KEY in example/secrets.json';
    }
    if (!secrets.API_KEY || secrets.API_KEY.includes('your_api_key')) {
      return 'Set API_KEY in example/secrets.json';
    }
    return null;
  },

  async createPaymentIntent(options?: {
    amountMinor?: number;
    currency?: string;
    description?: string;
  }): Promise<PaymentIntent> {
    const blocked = DemoCheckoutBackend.secretsError();
    if (blocked) {
      throw new Error(blocked);
    }
    const amountMinor = options?.amountMinor ?? SAMPLE_AMOUNT_MINOR;
    const currency = options?.currency ?? secrets.CURRENCY;
    const description = options?.description ?? secrets.DESCRIPTION;
    const amount = amountMinor / 100;
    const base = secrets.API_BASE.replace(/\/$/, '');
    const response = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        amount,
        currency,
        description,
        publicKey: secrets.PUBLIC_KEY,
        apiKey: secrets.API_KEY,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      payload?: string;
      checksum?: string;
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(
        json.error || json.message || `HTTP ${response.status}`
      );
    }
    if (!json.payload || !json.checksum) {
      throw new Error('Missing payload or checksum in API response');
    }
    return {
      orderPayload: json.payload,
      orderChecksum: json.checksum,
    };
  },
};

export const SAMPLE_AMOUNT_MINOR = 1999;
