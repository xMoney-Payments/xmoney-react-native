import { STABLE_MESSAGES, XMoneyPaymentError } from '../errors';

export type OrderUpdatedEvent = {
  requestId: string;
  success: boolean;
  error?: string;
};

type Waiter = {
  resolve: () => void;
  reject: (error: XMoneyPaymentError) => void;
};

let nextRequestId = 0;

/** Promise queue for native `updateOrder` (view commands cannot return values). */
export function createOrderUpdateQueue() {
  const pending = new Map<string, Waiter>();

  function rejectAll(error: XMoneyPaymentError) {
    const waiters = [...pending.values()];
    pending.clear();
    waiters.forEach((waiter) => waiter.reject(error));
  }

  return {
    start(run: (requestId: string) => void): Promise<void> {
      const requestId = `uo_${++nextRequestId}`;
      rejectAll(
        new XMoneyPaymentError(
          'SUPERSEDED_UPDATE_ORDER',
          STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER ??
            'Superseded by a newer updateOrder call'
        )
      );
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        run(requestId);
      });
    },
    settle(event: OrderUpdatedEvent) {
      const waiter = pending.get(event.requestId);
      if (!waiter) {
        return;
      }
      pending.delete(event.requestId);
      if (event.success) {
        waiter.resolve();
        return;
      }
      waiter.reject(
        XMoneyPaymentError.from({
          code: event.error ?? 'LOAD_ERROR',
          message: event.error,
        })
      );
    },
  };
}
