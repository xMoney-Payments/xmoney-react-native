import { STABLE_MESSAGES, XMoneyPaymentError } from '../errors';
import type { PaymentIntent } from '../types';

export type OrderUpdatedEvent = {
  requestId: string;
  success: boolean;
  error?: string;
};

/** Native `updateOrder` overloads: a signed intent, or a callback that creates one. */
export type UpdateOrder = {
  (intent: PaymentIntent): Promise<void>;
  (createOrder: () => Promise<PaymentIntent>): Promise<PaymentIntent>;
};

export function isCreateOrder(
  value: PaymentIntent | (() => Promise<PaymentIntent>)
): value is () => Promise<PaymentIntent> {
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

type Frame = {
  token: object;
  seq: number;
};

let nextRequest = 0;
let activeFrame: Frame | null = null;
let framePropagationInstalled = false;

/**
 * Keeps [activeFrame] on the async callback that started inside
 * `updateOrder(createOrder)`, including after `await`. React Native has no zones, so
 * continuations capture the frame when `Promise.then` is registered.
 */
function installFramePropagation(): void {
  if (framePropagationInstalled) {
    return;
  }
  // Async callbacks have no zone in React Native. Continuations capture the
  // active update so `isUpdateCurrent` stays tied to the callback that awaited.
  framePropagationInstalled = true;
  const original = Promise.prototype.then;
  function propagate<T>(
    frame: Frame,
    fn: ((value: T) => unknown) | null | undefined
  ) {
    if (typeof fn !== 'function') {
      return fn;
    }
    return (value: T) => {
      const previous = activeFrame;
      activeFrame = frame;
      try {
        return fn(value);
      } finally {
        activeFrame = previous;
      }
    };
  }
  // eslint-disable-next-line no-extend-native
  Promise.prototype.then = function (
    this: Promise<unknown>,
    onFulfilled,
    onRejected
  ) {
    const frame = activeFrame;
    if (frame == null) {
      return original.call(this, onFulfilled, onRejected);
    }
    return original.call(
      this,
      propagate(frame, onFulfilled),
      propagate(frame, onRejected)
    );
  } as typeof Promise.prototype.then;
}

function runWithFrame<T>(frame: Frame, fn: () => T): T {
  installFramePropagation();
  const previous = activeFrame;
  activeFrame = frame;
  try {
    return fn();
  } finally {
    activeFrame = previous;
  }
}

function supersededError(): XMoneyPaymentError {
  return new XMoneyPaymentError(
    'SUPERSEDED_UPDATE_ORDER',
    STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER ??
      'Superseded by a newer updateOrder call'
  );
}

/**
 * Shared order rebinding for the payment element and the wallet buttons.
 *
 * The native SDKs lock Pay before the server creates the next order. JS
 * promises cannot be cancelled, so [isUpdateCurrent] tells the callback when
 * a newer update has replaced it.
 */
export function createOrderUpdater(options: {
  attached: () => boolean;
  commands: OrderCommands;
  onBound?: (intent: PaymentIntent) => void;
}) {
  const token = {};
  const pending = new Map<string, Waiter>();
  const lostLock = new Set<number>();
  let updateSeq = 0;
  let pendingPayload: string | null = null;
  let pendingChecksum: string | null = null;

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

  function remember(intent: PaymentIntent) {
    if (
      pendingPayload === intent.orderPayload &&
      pendingChecksum === intent.orderChecksum
    ) {
      pendingPayload = null;
      pendingChecksum = null;
    }
    options.onBound?.(intent);
  }

  function holdPending(intent: PaymentIntent) {
    pendingPayload = intent.orderPayload;
    pendingChecksum = intent.orderChecksum;
  }

  function dropPending(intent: PaymentIntent, seq: number) {
    if (
      seq === updateSeq &&
      pendingPayload === intent.orderPayload &&
      pendingChecksum === intent.orderChecksum
    ) {
      pendingPayload = null;
      pendingChecksum = null;
    }
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
    const seq = ++updateSeq;
    holdPending(intent);
    const requestId = `uo_${++nextRequest}`;
    try {
      ensureAttached();
      const result = wait(requestId);
      options.commands.updateOrder(
        intent.orderPayload,
        intent.orderChecksum,
        requestId
      );
      await result;
    } catch (error) {
      dropPending(intent, seq);
      throw error;
    }
    if (seq === updateSeq) {
      remember(intent);
    }
  }

  /**
   * Locks Pay, creates the next order, binds it, and returns it.
   *
   * Pay is a no-op from this call until the new order is bound, including
   * while [createOrder] talks to the server. If [createOrder] throws, the
   * previous order stays payable and that error is rethrown. A newer update
   * supersedes this one (`SUPERSEDED_UPDATE_ORDER`).
   */
  async function updateCreating(
    createOrder: () => Promise<PaymentIntent>
  ): Promise<PaymentIntent> {
    ensureAttached();
    const seq = ++updateSeq;
    const requestId = `bw_${++nextRequest}`;
    const beginPromise = wait(requestId);
    const beginOutcome = beginPromise.then(
      () => null as XMoneyPaymentError | null,
      (error: unknown) => {
        lostLock.add(seq);
        return XMoneyPaymentError.from(error);
      }
    );
    options.commands.beginUpdateOrder(requestId);

    let intent: PaymentIntent | undefined;
    let createError: unknown;
    try {
      intent = await runWithFrame({ token, seq }, () => createOrder());
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
      holdPending(bound);
      try {
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
      } catch (error) {
        if (
          pendingPayload === bound.orderPayload &&
          pendingChecksum === bound.orderChecksum
        ) {
          pendingPayload = null;
          pendingChecksum = null;
        }
        throw error;
      }
      remember(bound);
      return bound;
    } finally {
      lostLock.delete(seq);
    }
  }

  return {
    /**
     * False once a newer update starts or the native lock for this call ends.
     * True outside an `updateOrder(createOrder)` callback.
     */
    isUpdateCurrent(): boolean {
      const frame = activeFrame;
      if (frame == null || frame.token !== token) {
        return true;
      }
      return isSeqCurrent(frame.seq);
    },

    /** Drops remembered intents and supersedes in-flight updates. */
    supersede() {
      updateSeq += 1;
      pendingPayload = null;
      pendingChecksum = null;
    },

    detach() {
      updateSeq += 1;
      pendingPayload = null;
      pendingChecksum = null;
      lostLock.clear();
      const waiters = [...pending.values()];
      pending.clear();
      waiters.forEach((waiter) => waiter.reject(supersededError()));
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
      intentOrCreate: PaymentIntent | (() => Promise<PaymentIntent>)
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
