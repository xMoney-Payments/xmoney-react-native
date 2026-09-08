import type { Spec } from '../specs/NativeXMoneyPaymentSheet';

jest.mock('../specs/NativeXMoneyPaymentSheet', () => ({
  __esModule: true,
  default: {
    initPaymentSheet: jest.fn(),
    presentPaymentSheet: jest.fn(),
    dismiss: jest.fn(),
    initApplePay: jest.fn(),
    presentApplePay: jest.fn(),
    dismissApplePay: jest.fn(),
    initGooglePay: jest.fn(),
    presentGooglePay: jest.fn(),
    dismissGooglePay: jest.fn(),
    getApplePayState: jest.fn(),
    getGooglePayState: jest.fn(),
    updateApplePayOrder: jest.fn(),
    updateGooglePayOrder: jest.fn(),
    answerCardHolderVerification: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

import NativeXMoneyPaymentSheet from '../specs/NativeXMoneyPaymentSheet';
import { PaymentSheet, resetPaymentSheetState, markPaymentSheetProcessing } from '../PaymentSheet';

const native = NativeXMoneyPaymentSheet as Spec;
const initPaymentSheet = native.initPaymentSheet as jest.Mock;
const presentPaymentSheet = native.presentPaymentSheet as jest.Mock;
const dismiss = native.dismiss as jest.Mock;

const config = { publicKey: 'pk_test_x' };
const intent = { orderPayload: 'payload', orderChecksum: 'checksum' };

describe('PaymentSheet', () => {
  beforeEach(() => {
    resetPaymentSheetState();
    initPaymentSheet.mockReset();
    presentPaymentSheet.mockReset();
    dismiss.mockReset();
  });

  it('returns failed when native is not initialized', async () => {
    presentPaymentSheet.mockRejectedValue({
      code: 'NOT_INITIALIZED',
      message: 'Call init before present.',
    });
    await expect(PaymentSheet.present(intent)).resolves.toEqual({
      status: 'failed',
      error: {
        code: 'NOT_INITIALIZED',
        message: 'Call init before present.',
      },
    });
    expect(presentPaymentSheet).toHaveBeenCalled();
  });

  it('inits then presents and allowlists the native result', async () => {
    presentPaymentSheet.mockResolvedValue({
      status: 'complete',
      pan: '4111',
      transaction: { id: '1', pan: '4111' },
    });
    await PaymentSheet.init(config);
    await expect(PaymentSheet.present(intent)).resolves.toEqual({
      status: 'complete',
      transaction: { id: '1' },
    });
    expect(initPaymentSheet).toHaveBeenCalledWith(config);
  });

  it('strips the CHV callback and injects chvId on init', async () => {
    await PaymentSheet.init({
      publicKey: 'pk_test_x',
      card: {
        cardHolderVerification: {
          name: { firstName: 'Jane', lastName: 'Doe' },
          onCardHolderVerification: () => true,
        },
      },
    });
    expect(initPaymentSheet).toHaveBeenCalledWith({
      publicKey: 'pk_test_x',
      card: {
        cardHolderVerification: {
          name: { firstName: 'Jane', middleName: '', lastName: 'Doe' },
          chvId: 'chv_sheet',
        },
      },
    });
  });

  it('inits even when publicKey is empty (native bind fails later)', async () => {
    await PaymentSheet.init({ publicKey: '' });
    expect(initPaymentSheet).toHaveBeenCalledWith({ publicKey: '' });
  });

  it('presents even when intent secrets are empty', async () => {
    presentPaymentSheet.mockResolvedValue({
      status: 'failed',
      error: { code: 'SESSION_ERROR', message: 'Missing session token' },
    });
    await PaymentSheet.init(config);
    await expect(
      PaymentSheet.present({ orderPayload: '', orderChecksum: 'c' })
    ).resolves.toEqual({
      status: 'failed',
      error: {
        code: 'SESSION_ERROR',
        message: 'Missing session token',
      },
    });
    expect(presentPaymentSheet).toHaveBeenCalled();
  });

  it('replaces an idle in-flight present', async () => {
    const resolvers: Array<(value: { status: string }) => void> = [];
    presentPaymentSheet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        })
    );
    await PaymentSheet.init(config);

    const first = PaymentSheet.present(intent);
    const second = PaymentSheet.present(intent);
    expect(presentPaymentSheet).toHaveBeenCalledTimes(2);
    expect(dismiss).not.toHaveBeenCalled();
    expect(resolvers).toHaveLength(2);
    resolvers[0]!({ status: 'canceled' });
    resolvers[1]!({ status: 'complete' });
    await expect(first).resolves.toEqual({ status: 'canceled' });
    await expect(second).resolves.toEqual({
      status: 'complete',
      transaction: {},
    });
  });

  it('cancels a second present while processing without calling native', async () => {
    presentPaymentSheet.mockImplementation(() => new Promise(() => {}));
    await PaymentSheet.init(config);
    const first = PaymentSheet.present(intent);
    markPaymentSheetProcessing();
    await expect(PaymentSheet.present(intent)).resolves.toEqual({
      status: 'canceled',
    });
    expect(presentPaymentSheet).toHaveBeenCalledTimes(1);
    expect(dismiss).not.toHaveBeenCalled();
    void first;
  });
});
