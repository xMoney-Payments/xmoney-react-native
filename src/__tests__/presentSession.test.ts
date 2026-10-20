import { PresentSession } from '../presentSession';

describe('PresentSession', () => {
  it('cancels a second present while processing', () => {
    const session = new PresentSession();
    expect(session.begin({ assumeProcessing: true })).toBe('go');
    expect(session.begin()).toBe('canceled');
    expect(session.generation).toBe(1);
  });

  it('wallet assumeProcessing blocks replace after processing false', () => {
    const session = new PresentSession();
    expect(session.begin({ assumeProcessing: true })).toBe('go');
    session.track(session.generation)({ type: 'processing', isProcessing: false });
    expect(session.isProcessing).toBe(false);
    expect(session.begin({ assumeProcessing: true })).toBe('canceled');
    expect(session.generation).toBe(1);
  });

  it('replaces an idle in-flight present with a new generation', () => {
    const session = new PresentSession();
    expect(session.begin()).toBe('go');
    const first = session.generation;
    expect(session.begin()).toBe('go');
    expect(session.generation).toBe(first + 1);
    session.finish(first);
    expect(session.inFlight).toBe(true);
    session.finish(session.generation);
    expect(session.inFlight).toBe(false);
  });

  it('forwards updateFailed without changing processing', () => {
    const session = new PresentSession();
    session.begin({ assumeProcessing: true });
    const events: Array<{ type: string }> = [];
    session.track(session.generation, (event) => events.push(event))({
      type: 'updateFailed',
      error: { code: 'LOAD_ERROR', message: 'Failed to load' },
    });
    expect(session.isProcessing).toBe(true);
    expect(events).toEqual([
      {
        type: 'updateFailed',
        error: { code: 'LOAD_ERROR', message: 'Failed to load' },
      },
    ]);
  });

  it('tracks processing only for the current generation', () => {
    const session = new PresentSession();
    session.begin();
    const first = session.generation;
    const firstTrack = session.track(first);
    session.begin();
    firstTrack({ type: 'processing', isProcessing: true });
    expect(session.isProcessing).toBe(false);
    session.track(session.generation)({ type: 'processing', isProcessing: true });
    expect(session.isProcessing).toBe(true);
  });
});
