import { STABLE_MESSAGES } from '../errors';
import { createOrderUpdateQueue } from '../components/orderUpdates';

describe('createOrderUpdateQueue', () => {
  it('resolves when the matching native event succeeds', async () => {
    const queue = createOrderUpdateQueue();
    const run = jest.fn();
    const pending = queue.start(run);
    const requestId = run.mock.calls[0][0] as string;
    queue.settle({ requestId, success: true });
    await expect(pending).resolves.toBeUndefined();
  });

  it('rejects when the matching native event fails', async () => {
    const queue = createOrderUpdateQueue();
    const run = jest.fn();
    const pending = queue.start(run);
    const requestId = run.mock.calls[0][0] as string;
    queue.settle({ requestId, success: false, error: 'LOAD_ERROR' });
    await expect(pending).rejects.toMatchObject({
      code: 'LOAD_ERROR',
      message: STABLE_MESSAGES.LOAD_ERROR,
    });
  });

  it('rejects the first call as superseded when a second starts', async () => {
    const queue = createOrderUpdateQueue();
    const run = jest.fn();
    const first = queue.start(() => {});
    const second = queue.start(run);
    await expect(first).rejects.toMatchObject({
      code: 'SUPERSEDED_UPDATE_ORDER',
      message: STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER,
    });
    const requestId = run.mock.calls[0][0] as string;
    queue.settle({ requestId, success: true });
    await expect(second).resolves.toBeUndefined();
  });
});
