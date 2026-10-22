import { STABLE_MESSAGES, XMoneyPaymentError } from '../errors';
import type { PaymentIntent, UpdateOrderContext } from '../types';

export type OrderUpdatedEvent = {
  requestId: string;
  success: boolean;
  error?: string;
};

/** Native `updateOrder` overloads: a signed intent, or a callback that creates one. */
export type UpdateOrder = {
  (intent: PaymentIntent): Promise<void>;
  (
    createOrder: (ctx: UpdateOrderContext) => Promise<PaymentIntent>
  ): Promise<PaymentIntent>;
};

export type CreateOrder = (ctx: UpdateOrderContext) => Promise<PaymentIntent>;

export function isCreateOrder(
  value: PaymentIntent | CreateOrder
): value is CreateOrder {
  return typeof value === 'function';
}

export type OrderCommands = {
  updateOrder: (
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  beginUpdateOrder: (requestId: string) => void;
  resolveOrder: (
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  rejectOrder: (requestId: string) => void;
};

type Waiter = {
  resolve: () => void;
  reject: (error: XMoneyPaymentError) => void;
};

let nextRequest = 0;

function supersededError(): XMoneyPaymentError {
  return new XMoneyPaymentError(
    'SUPERSEDED_UPDATE_ORDER',
    STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER ??
      'Superseded by a newer updateOrder call'
  );
}

function orderCreationFailed(): XMoneyPaymentError {
  return new XMoneyPaymentError(
    'ORDER_CREATION_FAILED',
    STABLE_MESSAGES.ORDER_CREATION_FAILED ?? 'Order creation failed'
  );
}

function isUsableIntent(value: PaymentIntent | undefined): value is PaymentIntent {
  return (
    !!value &&
    typeof value.orderPayload === 'string' &&
    value.orderPayload.length > 0 &&
    typeof value.orderChecksum === 'string' &&
    value.orderChecksum.length > 0
  );
}

/**
 * Shared order rebinding for the payment element and the wallet buttons.
 *
 * The native SDKs lock Pay before the server creates the next order. The
 * callback receives [UpdateOrderContext] so it can tell that a newer update
 * replaced it, without patching `Promise`.
 */
export function createOrderUpdater(options: {
  attached: () => boolean;
  commands: OrderCommands;
  onBound?: (intent: PaymentIntent) => void;
}) {
  const pending = new Map<string, Waiter>();
  const lostLock = new Set<number>();
  const aborts = new Map<number, AbortController>();
  let updateSeq = 0;

  function ensureAttached() {
    if (!options.attached()) {
      throw new XMoneyPaymentError(
        'NOT_INITIALIZED',
        STABLE_MESSAGES.NOT_INITIALIZED ?? 'Call init before present.'
      );
    }
  }

  function wait(requestId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
    });
  }

  function isSeqCurrent(seq: number): boolean {
    return seq === updateSeq && !lostLock.has(seq);
  }

  function abortOlder(seq: number) {
    for (const [older, controller] of aborts) {
      if (older !== seq) {
        controller.abort();
        aborts.delete(older);
      }
    }
  }

  function abortAll() {
    for (const controller of aborts.values()) {
      controller.abort();
    }
    aborts.clear();
  }

  /** Rejects in-flight waiters so a dropped native id cannot hang the promise. */
  function supersedePending() {
    const error = supersededError();
    const waiters = [...pending.values()];
    pending.clear();
    waiters.forEach((waiter) => waiter.reject(error));
  }

  function remember(intent: PaymentIntent) {
    options.onBound?.(intent);
  }

  function rejectQuietly(requestId: string) {
    try {
      ensureAttached();
      options.commands.rejectOrder(requestId);
    } catch {
      // The caller throws the merchant error or SUPERSEDED_UPDATE_ORDER.
    }
  }

  async function updateIntent(intent: PaymentIntent): Promise<void> {
    ensureAttached();
    const seq = ++updateSeq;
    abortOlder(seq);
    supersedePending();
    const requestId = `uo_${++nextRequest}`;
    const result = wait(requestId);
    options.commands.updateOrder(
      intent.orderPayload,
      intent.orderChecksum,
      requestId
    );
    await result;
    if (seq === updateSeq) {
      remember(intent);
    }
  }

  /**
   * Locks Pay, creates the next order, binds it, and returns it.
   *
   * Pay is a no-op from the native call until the new order is bound, including
   * while [createOrder] talks to the server. If [createOrder] throws, the
   * previous order stays payable and that error is rethrown. A newer update
   * supersedes this one (`SUPERSEDED_UPDATE_ORDER`).
   */
  async function updateCreating(createOrder: CreateOrder): Promise<PaymentIntent> {
    ensureAttached();
    const seq = ++updateSeq;
    const abort = new AbortController();
    aborts.set(seq, abort);
    abortOlder(seq);
    supersedePending();
    const requestId = `bw_${++nextRequest}`;
    const beginPromise = wait(requestId);
    const beginOutcome = beginPromise.then(
      () => null as XMoneyPaymentError | null,
      (error: unknown) => {
        lostLock.add(seq);
        abort.abort();
        return XMoneyPaymentError.from(error);
      }
    );
    options.commands.beginUpdateOrder(requestId);

    let intent: PaymentIntent | undefined;
    let createError: unknown;
    try {
      intent = await createOrder({
        isCurrent: () => isSeqCurrent(seq),
        signal: abort.signal,
      });
      if (!isUsableIntent(intent)) {
        intent = undefined;
        createError = orderCreationFailed();
      }
    } catch (error) {
      createError = error;
    }

    try {
      if (seq !== updateSeq) {
        rejectQuietly(requestId);
        await beginOutcome;
        throw supersededError();
      }
      if (lostLock.has(seq)) {
        rejectQuietly(requestId);
        throw (await beginOutcome) ?? supersededError();
      }
      if (createError !== undefined) {
        rejectQuietly(requestId);
        await beginOutcome;
        throw createError;
      }
      const bound = intent as PaymentIntent;
      ensureAttached();
      options.commands.resolveOrder(
        bound.orderPayload,
        bound.orderChecksum,
        requestId
      );
      const beginError = await beginOutcome;
      if (beginError) {
        throw beginError;
      }
      if (!isSeqCurrent(seq)) {
        throw supersededError();
      }
      remember(bound);
      return bound;
    } finally {
      lostLock.delete(seq);
      aborts.delete(seq);
    }
  }

  return {
    /** Drops in-flight updates. A structural prepare uses this. */
    supersede() {
      updateSeq += 1;
      abortAll();
      supersedePending();
    },

    detach() {
      updateSeq += 1;
      abortAll();
      lostLock.clear();
      supersedePending();
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

    /**
     * `updateOrder(intent)` rebinds a signed intent.
     * `updateOrder(createOrder)` locks Pay, runs the callback, binds the
     * intent it returns, and returns that intent.
     */
    updateOrder(
      intentOrCreate: PaymentIntent | CreateOrder
    ): Promise<void | PaymentIntent> {
      if (isCreateOrder(intentOrCreate)) {
        return updateCreating(intentOrCreate);
      }
      return updateIntent(intentOrCreate);
    },
  };
}

export type OrderUpdater = ReturnType<typeof createOrderUpdater>;

function settleNative(
  updater: OrderUpdater,
  requestId: string,
  result: Promise<void>
) {
  result.then(
    () => {
      updater.settle({ requestId, success: true });
    },
    (error: unknown) => {
      updater.settle({
        requestId,
        success: false,
        error: XMoneyPaymentError.from(error).code,
      });
    }
  );
}

/**
 * Imperative Apple Pay / Google Pay. The native module returns promises, so
 * those promises settle the same waiter the element bridge settles from events.
 */
export function createImperativeOrderUpdater(commands: {
  updateIntent: (intent: PaymentIntent) => Promise<void>;
  begin: (requestId: string) => Promise<void>;
  resolve: (
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  reject: (requestId: string) => void;
}): OrderUpdater {
  let updater!: OrderUpdater;
  updater = createOrderUpdater({
    attached: () => true,
    commands: {
      updateOrder: (orderPayload, orderChecksum, requestId) => {
        settleNative(
          updater,
          requestId,
          commands.updateIntent({
            orderPayload,
            orderChecksum,
          })
        );
      },
      beginUpdateOrder: (requestId) => {
        settleNative(updater, requestId, commands.begin(requestId));
      },
      resolveOrder: commands.resolve,
      rejectOrder: commands.reject,
    },
  });
  return updater;
}
