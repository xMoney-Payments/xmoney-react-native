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
    const result = await updater.updateOrder(async () => intentA);
    expect(result).toEqual(intentA);
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

  it('is true outside an updateOrder callback', () => {
    const { updater } = harness();
    expect(updater.isUpdateCurrent()).toBe(true);
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
      updater.updateOrder(async () => {
        await Promise.resolve();
        await Promise.resolve();
        if (!updater.isUpdateCurrent()) {
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
      updater.updateOrder(async () => {
        await Promise.resolve();
        await Promise.resolve();
        sawStale = !updater.isUpdateCurrent();
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
    const first = updater.updateOrder(async () => {
      await gate.promise;
      sawStale = !updater.isUpdateCurrent();
      if (!updater.isUpdateCurrent()) {
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
