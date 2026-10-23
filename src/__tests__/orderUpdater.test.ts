import { STABLE_MESSAGES, XMoneyPaymentError } from '../errors';
import {
  createOrderUpdater,
  type OrderCommands,
  type OrderUpdater,
} from '../components/orderUpdater';
import type { PaymentIntent } from '../types';

const intentA: PaymentIntent = { orderPayload: 'a', orderChecksum: '1' };
const intentB: PaymentIntent = { orderPayload: 'b', orderChecksum: '2' };

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function harness(attached = true) {
  const calls: string[] = [];
  let updater: OrderUpdater;
  const bound: PaymentIntent[] = [];
  const commands: OrderCommands = {
    updateOrder: () => {
      calls.push('updateOrder');
    },
    beginUpdateOrder: (requestId) => {
      calls.push('beginUpdateOrder');
      calls.push(`begin:${requestId}`);
    },
    resolveOrder: (_payload, _checksum, requestId) => {
      calls.push('resolveOrder');
      updater.settle({ requestId, success: true });
    },
    rejectOrder: (requestId) => {
      calls.push('rejectOrder');
      updater.settle({
        requestId,
        success: false,
        error: 'ORDER_CREATION_FAILED',
      });
    },
  };
  updater = createOrderUpdater({
    attached: () => attached,
    commands,
    onBound: (intent) => {
      bound.push(intent);
    },
  });
  return { calls, updater, bound };
}

describe('createOrderUpdater', () => {
  it('updateOrder resolves after createOrder', async () => {
    const { calls, updater, bound } = harness();
    let current = false;
    const result = await updater.updateOrder(async ({ isCurrent }) => {
      current = isCurrent();
      return intentA;
    });
    expect(result).toEqual(intentA);
    expect(current).toBe(true);
    expect(calls.filter((call) => !call.startsWith('begin:'))).toEqual([
      'beginUpdateOrder',
      'resolveOrder',
    ]);
    expect(bound).toEqual([intentA]);
  });

  it('updateOrder rejects when createOrder throws', async () => {
    const { calls, updater, bound } = harness();
    await expect(
      updater.updateOrder(async () => {
        throw new Error('nope');
      })
    ).rejects.toThrow('nope');
    expect(calls).toContain('beginUpdateOrder');
    expect(calls).toContain('rejectOrder');
    expect(calls).not.toContain('resolveOrder');
    expect(bound).toEqual([]);
  });

  it('begin failure during createOrder is one caught error', async () => {
    const calls: string[] = [];
    let updater: OrderUpdater;
    updater = createOrderUpdater({
      attached: () => true,
      commands: {
        updateOrder: () => undefined,
        beginUpdateOrder: (requestId) => {
          calls.push('beginUpdateOrder');
          Promise.resolve().then(() => {
            updater.settle({
              requestId,
              success: false,
              error: 'SUPERSEDED_UPDATE_ORDER',
            });
          });
        },
        resolveOrder: () => {
          calls.push('resolveOrder');
        },
        rejectOrder: () => {
          calls.push('rejectOrder');
        },
      },
    });
    let created = false;
    await expect(
      updater.updateOrder(async ({ isCurrent }) => {
        await Promise.resolve();
        await Promise.resolve();
        if (!isCurrent()) {
          throw new Error('superseded');
        }
        created = true;
        return intentA;
      })
    ).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
      message: STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER,
    });
    expect(created).toBe(false);
    expect(calls).not.toContain('resolveOrder');
  });

  it('a charge in progress is PAYMENT_IN_PROGRESS, not superseded', async () => {
    const calls: string[] = [];
    let updater: OrderUpdater;
    updater = createOrderUpdater({
      attached: () => true,
      commands: {
        updateOrder: () => undefined,
        beginUpdateOrder: (requestId) => {
          calls.push('beginUpdateOrder');
          Promise.resolve().then(() => {
            updater.settle({
              requestId,
              success: false,
              error: 'PAYMENT_IN_PROGRESS',
            });
          });
        },
        resolveOrder: () => {
          calls.push('resolveOrder');
        },
        rejectOrder: () => {
          calls.push('rejectOrder');
        },
      },
    });
    let created = false;
    let sawStale = false;
    await expect(
      updater.updateOrder(async ({ isCurrent }) => {
        await Promise.resolve();
        await Promise.resolve();
        sawStale = !isCurrent();
        if (sawStale) {
          throw new Error('superseded');
        }
        created = true;
        return intentA;
      })
    ).rejects.toMatchObject({
      code: 'PAYMENT_IN_PROGRESS',
      message: STABLE_MESSAGES.PAYMENT_IN_PROGRESS,
    });
    expect(sawStale).toBe(true);
    expect(created).toBe(false);
    expect(calls).not.toContain('resolveOrder');
  });

  it('a newer updateOrder supersedes before the server call', async () => {
    const { calls, updater } = harness();
    const gate = deferred();
    let created = false;
    let sawStale = false;
    const first = updater.updateOrder(async ({ isCurrent }) => {
      await gate.promise;
      sawStale = !isCurrent();
      if (!isCurrent()) {
        throw new Error('superseded');
      }
      created = true;
      return intentA;
    });
    const second = updater.updateOrder(async () => intentB);
    gate.resolve();
    await expect(second).resolves.toEqual(intentB);
    await expect(first).rejects.toBeInstanceOf(XMoneyPaymentError);
    await expect(first).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
    expect(created).toBe(false);
    expect(sawStale).toBe(true);
    expect(calls.filter((call) => call === 'resolveOrder')).toEqual([
      'resolveOrder',
    ]);
  });

  it('rejects the first intent when native never reports it', async () => {
    const requestIds: string[] = [];
    let updater: OrderUpdater;
    updater = createOrderUpdater({
      attached: () => true,
      commands: {
        updateOrder: (_payload, _checksum, requestId) => {
          requestIds.push(requestId);
        },
        beginUpdateOrder: () => undefined,
        resolveOrder: () => undefined,
        rejectOrder: () => undefined,
      },
    });
    const first = updater.updateOrder(intentA);
    const second = updater.updateOrder(intentB);
    await expect(first).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
      message: STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER,
    });
    const secondId = requestIds[1];
    expect(secondId).toBeDefined();
    updater.settle({ requestId: secondId as string, success: true });
    await expect(second).resolves.toBeUndefined();
    expect(requestIds).toHaveLength(2);
  });

  it('rejects createOrder when a later intent is never answered for the first id', async () => {
    const gate = deferred();
    let began = '';
    let intentId = '';
    let updater: OrderUpdater;
    updater = createOrderUpdater({
      attached: () => true,
      commands: {
        updateOrder: (_payload, _checksum, requestId) => {
          intentId = requestId;
        },
        beginUpdateOrder: (requestId) => {
          began = requestId;
        },
        resolveOrder: () => undefined,
        rejectOrder: () => undefined,
      },
    });
    const first = updater.updateOrder(async () => {
      await gate.promise;
      return intentA;
    });
    const second = updater.updateOrder(intentB);
    gate.resolve();
    await expect(first).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
    updater.settle({ requestId: intentId, success: true });
    await expect(second).resolves.toBeUndefined();
    expect(began.startsWith('bw_')).toBe(true);
  });

  it('aborts the signal when a newer update starts', async () => {
    const { updater } = harness();
    const gate = deferred();
    let signal: AbortSignal | undefined;
    const first = updater.updateOrder(async (ctx) => {
      signal = ctx.signal;
      await gate.promise;
      return intentA;
    });
    const second = updater.updateOrder(async () => intentB);
    expect(signal?.aborted).toBe(true);
    gate.resolve();
    await expect(first).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
    await expect(second).resolves.toEqual(intentB);
  });

  it('a callback that throws after it was superseded still rejects SUPERSEDED', async () => {
    const { updater } = harness();
    const gate = deferred();
    const first = updater.updateOrder(async ({ isCurrent }) => {
      await gate.promise;
      if (!isCurrent()) {
        throw new Error('late failure');
      }
      return intentA;
    });
    const second = updater.updateOrder(async () => intentB);
    gate.resolve();
    await expect(first).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
      message: STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER,
    });
    await expect(second).resolves.toEqual(intentB);
  });

  it('rejects an empty intent without binding it', async () => {
    const { calls, updater, bound } = harness();
    await expect(
      updater.updateOrder(async () => ({
        orderPayload: '',
        orderChecksum: '',
      }))
    ).rejects.toMatchObject({
      code: 'ORDER_CREATION_FAILED',
      message: STABLE_MESSAGES.ORDER_CREATION_FAILED,
    });
    expect(calls).toContain('rejectOrder');
    expect(calls).not.toContain('resolveOrder');
    expect(bound).toEqual([]);
  });

  it('supersede settles an in-flight createOrder and a waiting intent', async () => {
    const { updater } = harness();
    const waiting = updater.updateOrder(intentA);
    const creating = updater.updateOrder(async ({ signal }) => {
      await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
      return intentB;
    });
    updater.supersede();
    await expect(waiting).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
    await expect(creating).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
  });

  it('detach during createOrder rejects the call', async () => {
    const { updater } = harness();
    const pending = updater.updateOrder(async ({ signal }) => {
      await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
      return intentA;
    });
    updater.detach();
    await expect(pending).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
  });

  it('detach during the bind phase rejects the call', async () => {
    let updater: OrderUpdater;
    let sawResolve = false;
    updater = createOrderUpdater({
      attached: () => true,
      commands: {
        updateOrder: () => undefined,
        beginUpdateOrder: () => undefined,
        resolveOrder: () => {
          sawResolve = true;
        },
        rejectOrder: () => undefined,
      },
    });
    const pending = updater.updateOrder(async () => intentA);
    await Promise.resolve();
    expect(sawResolve).toBe(true);
    updater.detach();
    await expect(pending).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
    });
  });

  it('throws NOT_INITIALIZED when the view is gone', async () => {
    const { calls, updater } = harness(false);
    await expect(updater.updateOrder(async () => intentA)).rejects.toMatchObject({
      code: 'NOT_INITIALIZED',
    });
    expect(calls).toEqual([]);
  });

  it('updateOrder resolves when native reports success', async () => {
    const bound: PaymentIntent[] = [];
    let updater: OrderUpdater;
    updater = createOrderUpdater({
      attached: () => true,
      commands: {
        updateOrder: (_payload, _checksum, requestId) => {
          Promise.resolve().then(() => {
            updater.settle({ requestId, success: true });
          });
        },
        beginUpdateOrder: () => undefined,
        resolveOrder: () => undefined,
        rejectOrder: () => undefined,
      },
      onBound: (intent) => {
        bound.push(intent);
      },
    });
    await expect(updater.updateOrder(intentB)).resolves.toBeUndefined();
    expect(bound).toEqual([intentB]);
  });
});
