import {
  SHEET_CHV_ID,
  toNativeConfiguration,
} from './cardHolderVerification';
import { paymentResultFromUnknown } from './errors';
import { getModule, nextRequestId, subscribeNativeEvents } from './nativeModule';
import { parsePaymentResult } from './parseResult';
import { PresentSession } from './presentSession';
import type {
  PaymentConfig,
  PaymentIntent,
  PaymentResult,
  PaymentSheetEvent,
} from './types';

const session = new PresentSession();

/**
 * Imperative Payment Sheet. Native `PaymentSheet.init(configuration)` then
 * `present(intent)`; TurboModule methods stay `initPaymentSheet` /
 * `presentPaymentSheet` because Objective-C reserves `init`.
 *
 * One active sheet per process. An idle second `present` replaces the open
 * sheet; a second `present` while processing returns `{ status: 'canceled' }`.
 */
export const PaymentSheet = {
  async init(configuration: PaymentConfig): Promise<void> {
    const nativeModule = getModule();
    nativeModule.initPaymentSheet(
      toNativeConfiguration(configuration, SHEET_CHV_ID)
    );
  },

  async present(
    intent: PaymentIntent,
    onEvent?: (event: PaymentSheetEvent) => void
  ): Promise<PaymentResult> {
    const nativeModule = getModule();
    if (session.inFlight && session.isProcessing) {
      return { status: 'canceled' };
    }

    if (session.begin() === 'canceled') {
      return { status: 'canceled' };
    }
    const generation = session.generation;
    const requestId = nextRequestId();
    const subscription = subscribeNativeEvents(
      requestId,
      session.track(generation, onEvent)
    );

    try {
      const raw = await nativeModule.presentPaymentSheet({
        ...intent,
        requestId,
      });
      return parsePaymentResult(raw);
    } catch (error) {
      return paymentResultFromUnknown(error);
    } finally {
      session.finish(generation);
      subscription?.remove();
    }
  },

  dismiss(): void {
    getModule().dismiss();
  },
};

/** Clears in-flight present state. Used by unit tests. */
export function resetPaymentSheetState(): void {
  session.reset();
}

/** Marks the current present as processing. Used by unit tests. */
export function markPaymentSheetProcessing(): void {
  session.isProcessing = true;
}
