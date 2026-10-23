import { Platform } from 'react-native';
import { parseWalletState } from './availability';
import {
  GOOGLE_PAY_CHV_ID,
  toNativeConfiguration,
} from './cardHolderVerification';
import {
  paymentResultFromUnknown,
  sanitizePaymentError,
  XMoneyPaymentError,
} from './errors';
import {
  createImperativeOrderUpdater,
  type OrderUpdater,
} from './components/orderUpdater';
import { getModule, nextRequestId, subscribeNativeEvents } from './nativeModule';
import { parsePaymentResult } from './parseResult';
import { PresentSession } from './presentSession';
import type {
  GooglePayEvent,
  PaymentConfig,
  PaymentIntent,
  PaymentResult,
  UpdateOrderContext,
  WalletState,
} from './types';

const session = new PresentSession();
let orders: OrderUpdater | null = null;

function orderUpdater(): OrderUpdater {
  if (!orders) {
    orders = createImperativeOrderUpdater({
      updateIntent: (intent) => getModule().updateGooglePayOrder(intent),
      begin: (requestId) => getModule().beginGooglePayUpdateOrder(requestId),
      resolve: (orderPayload, orderChecksum, requestId) => {
        getModule().resolveGooglePayOrder(
          requestId,
          orderPayload,
          orderChecksum
        );
      },
      reject: (requestId) => {
        getModule().rejectGooglePayOrder(requestId);
      },
    });
  }
  return orders;
}

function unsupported(): PaymentResult {
  return {
    status: 'failed',
    error: sanitizePaymentError(
      'GOOGLE_PAY',
      'Google Pay is only available on Android.'
    ),
  };
}

/**
 * Imperative Google Pay. Native `GooglePay(configuration)` then `present(intent)`.
 * One active session per process; a second `present` while in flight returns
 * `{ status: 'canceled' }`. Call `dismiss()` then `present()` to replace.
 * Pre-auth wallet dismiss resolves `{ status: 'canceled' }` and does not consume;
 * present the same intent again.
 *
 * `updateOrder(intent)` rebinds the open host. `updateOrder(createOrder)` locks
 * the wallet when the native call runs. Call after `present`, while the
 * overlay is still open. The callback receives `{ isCurrent, signal }`.
 *
 * `getState(intent?)` probes native availability. Pass `intent` or call after
 * `present`. After `init` only, flags stay `false`. `isAvailable` is site/config;
 * `isReady` is Play Wallet `isReadyToPay`. Unlike Apple Pay, those two flags are
 * not the same probe.
 */
export const GooglePay = {
  async init(configuration: PaymentConfig): Promise<void> {
    const nativeModule = getModule();
    nativeModule.initGooglePay(
      toNativeConfiguration(configuration, GOOGLE_PAY_CHV_ID)
    );
  },

  async present(
    intent: PaymentIntent,
    onEvent?: (event: GooglePayEvent) => void
  ): Promise<PaymentResult> {
    getModule();
    if (Platform.OS !== 'android') {
      return unsupported();
    }
    if (session.begin({ assumeProcessing: true }) === 'canceled') {
      return { status: 'canceled' };
    }
    const generation = session.generation;
    const requestId = nextRequestId('xmoney-gp');
    const subscription = subscribeNativeEvents(
      requestId,
      session.track(generation, onEvent)
    );
    try {
      const raw = await getModule().presentGooglePay({ ...intent, requestId });
      return parsePaymentResult(raw);
    } catch (error) {
      return paymentResultFromUnknown(error);
    } finally {
      session.finish(generation);
      subscription?.remove();
    }
  },

  /**
   * `updateOrder(intent)` rebinds a signed order. `updateOrder(createOrder)`
   * locks the wallet when native receives the call and returns the bound
   * intent. Call after `present`, while the overlay is open.
   */
  updateOrder: (async (intentOrCreate) => {
    getModule();
    if (Platform.OS !== 'android') {
      throw new XMoneyPaymentError(
        'GOOGLE_PAY',
        'Google Pay is only available on Android.'
      );
    }
    if (typeof intentOrCreate === 'function' && !session.inFlight) {
      throw new XMoneyPaymentError('GOOGLE_PAY', 'Google Pay is not presented');
    }
    return orderUpdater().updateOrder(intentOrCreate);
  }) as {
    (intent: PaymentIntent): Promise<void>;
    (createOrder: (ctx: UpdateOrderContext) => Promise<PaymentIntent>): Promise<PaymentIntent>;
  },

  dismiss(): void {
    getModule().dismissGooglePay();
  },

  /**
   * Probe site `isAvailable` vs Play `isReady`. Requires `init` plus an `intent`
   * (or a prior `present`); otherwise returns cached availability (`false` after init).
   */
  async getState(intent?: PaymentIntent): Promise<WalletState> {
    return parseWalletState(await getModule().getGooglePayState(intent ?? {}));
  },
};

/** Clears in-flight present state. Used by unit tests. */
export function resetGooglePayState(): void {
  session.reset();
  orders?.detach();
  orders = null;
}
