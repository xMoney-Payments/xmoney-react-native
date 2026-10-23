import { toPaymentSheetEvent } from '../nativeModule';

describe('toPaymentSheetEvent', () => {
  it('maps onUpdateFailed to a sanitized updateFailed event', () => {
    expect(
      toPaymentSheetEvent({
        requestId: 'req',
        type: 'onUpdateFailed',
        code: 'LOAD_ERROR',
        message: 'orderPayload=secret',
      })
    ).toEqual({
      type: 'updateFailed',
      error: { code: 'LOAD_ERROR', message: 'Failed to load' },
    });
  });

  it('maps PAYMENT_IN_PROGRESS from a native update failure', () => {
    expect(
      toPaymentSheetEvent({
        requestId: 'req',
        type: 'onUpdateFailed',
        code: 'PAYMENT_IN_PROGRESS',
        message: 'Payment in progress',
      })
    ).toEqual({
      type: 'updateFailed',
      error: {
        code: 'PAYMENT_IN_PROGRESS',
        message: 'Payment in progress',
      },
    });
  });

  it('keeps ready and processing', () => {
    expect(
      toPaymentSheetEvent({ requestId: 'req', type: 'onReady' })
    ).toEqual({ type: 'ready' });
    expect(
      toPaymentSheetEvent({
        requestId: 'req',
        type: 'onProcessing',
        isProcessing: true,
      })
    ).toEqual({ type: 'processing', isProcessing: true });
  });
});
