import { Platform } from 'react-native';
import { parseWalletState } from './availability';
import {
  APPLE_PAY_CHV_ID,
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
  ApplePayEvent,
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
      updateIntent: (intent) => getModule().updateApplePayOrder(intent),
      begin: (requestId) => getModule().beginApplePayUpdateOrder(requestId),
      resolve: (orderPayload, orderChecksum, requestId) => {
        getModule().resolveApplePayOrder(requestId, orderPayload, orderChecksum);
      },
      reject: (requestId) => {
        getModule().rejectApplePayOrder(requestId);
      },
    });
  }
  return orders;
}

function unsupported(): PaymentResult {
  return {
    status: 'failed',
    error: sanitizePaymentError(
      'APPLE_PAY',
      'Apple Pay is only available on iOS.'
    ),
  };
}

/**
 * Imperative Apple Pay. Native `ApplePay(configuration)` then `present(intent)`.
 * One active session per process; a second `present` while in flight returns
 * `{ status: 'canceled' }`. Call `dismiss()` then `present()` to replace.
 * Pre-auth PassKit dismiss resolves `{ status: 'canceled' }` and does not consume.
 *
 * `updateOrder(intent)` may run before `present` (native stores the next payable
 * intent). `updateOrder(createOrder)` locks Pay when the native call runs.
 * The callback receives `{ isCurrent, signal }`.
 *
 * `getState()` reads PassKit `canMakePayments()` for both `isAvailable` and
 * `isReady` (no intent). That is not a site-vs-device split.
 */
export const ApplePay = {
  async init(configuration: PaymentConfig): Promise<void> {
    const nativeModule = getModule();
    nativeModule.initApplePay(
      toNativeConfiguration(configuration, APPLE_PAY_CHV_ID)
    );
  },

  async present(
    intent: PaymentIntent,
    onEvent?: (event: ApplePayEvent) => void
  ): Promise<PaymentResult> {
    getModule();
    if (Platform.OS !== 'ios') {
      return unsupported();
    }
    if (session.begin({ assumeProcessing: true }) === 'canceled') {
      return { status: 'canceled' };
    }
    const generation = session.generation;
    const requestId = nextRequestId('xmoney-ap');
    const subscription = subscribeNativeEvents(
      requestId,
      session.track(generation, (event) => {
        if (event.type !== 'updateFailed') {
          onEvent?.(event);
        }
      })
    );
    try {
      const raw = await getModule().presentApplePay({ ...intent, requestId });
      return parsePaymentResult(raw);
    } catch (error) {
      return paymentResultFromUnknown(error);
    } finally {
      session.finish(generation);
      subscription?.remove();
    }
  },

  /**
   * `updateOrder(intent)` binds a signed intent. Pay stays enabled until the
   * bind starts. `updateOrder(createOrder)` locks Pay when native receives the
   * call and returns the bound intent. May be called before `present`.
   */
  updateOrder: (async (intentOrCreate) => {
    getModule();
    if (Platform.OS !== 'ios') {
      throw new XMoneyPaymentError(
        'APPLE_PAY',
        'Apple Pay is only available on iOS.'
      );
    }
    return orderUpdater().updateOrder(intentOrCreate);
  }) as {
    (intent: PaymentIntent): Promise<void>;
    (
      createOrder: (ctx: UpdateOrderContext) => Promise<PaymentIntent>
    ): Promise<PaymentIntent>;
  },

  dismiss(): void {
    getModule().dismissApplePay();
  },

  /**
   * PassKit `canMakePayments()` for both `isAvailable` and `isReady`. No intent.
   * Those flags are not a site-vs-device split (unlike Google Pay).
   */
  async getState(): Promise<WalletState> {
    return parseWalletState(await getModule().getApplePayState());
  },
};

/** Clears in-flight present state. Used by unit tests. */
export function resetApplePayState(): void {
  session.reset();
  orders?.detach();
  orders = null;
}
