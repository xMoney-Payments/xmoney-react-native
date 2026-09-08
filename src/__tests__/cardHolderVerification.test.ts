const mockListeners: Array<(event: unknown) => void> = [];
const mockAnswerCardHolderVerification = jest.fn();

jest.mock('../nativeModule', () => ({
  EVENT_NAME: 'XMoneyPaymentSheetEvent',
  getEmitter: () => ({
    addListener: (_name: string, cb: (event: unknown) => void) => {
      mockListeners.push(cb);
      return { remove: jest.fn() };
    },
  }),
  getModule: () => ({
    answerCardHolderVerification: mockAnswerCardHolderVerification,
  }),
}));

import {
  createChvHandle,
  registerCardHolderVerification,
  toNativeConfiguration,
} from '../cardHolderVerification';

function emitChv(event: unknown) {
  const listener = mockListeners[0];
  if (!listener) {
    throw new Error('CHV listener was not registered');
  }
  listener(event);
}

describe('cardHolderVerification', () => {
  beforeEach(() => {
    mockAnswerCardHolderVerification.mockReset();
  });

  it('strips the JS callback and injects chvId', () => {
    const native = toNativeConfiguration(
      {
        publicKey: 'pk_test_x',
        card: {
          cardHolderVerification: {
            name: { firstName: 'Jane', lastName: 'Doe' },
            onCardHolderVerification: () => true,
          },
        },
      },
      'chv_1'
    );
    expect(native).toEqual({
      publicKey: 'pk_test_x',
      card: {
        cardHolderVerification: {
          name: { firstName: 'Jane', middleName: '', lastName: 'Doe' },
          chvId: 'chv_1',
        },
      },
    });
  });

  it('clones config when cardHolderVerification is omitted', () => {
    expect(
      toNativeConfiguration({ publicKey: 'pk_test_x' }, 'chv_1')
    ).toEqual({ publicKey: 'pk_test_x' });
  });

  it('answers true when the registered callback accepts', () => {
    registerCardHolderVerification('chv_1', () => true);
    emitChv({
      type: 'onCardHolderVerification',
      requestId: 'req-1',
      chvId: 'chv_1',
      status: 'Matched',
    });
    expect(mockAnswerCardHolderVerification).toHaveBeenCalledWith('req-1', true);
  });

  it('answers false when no callback is registered', () => {
    registerCardHolderVerification('chv_missing');
    emitChv({
      type: 'onCardHolderVerification',
      requestId: 'req-2',
      chvId: 'chv_missing',
      status: 'Matched',
    });
    expect(mockAnswerCardHolderVerification).toHaveBeenCalledWith(
      'req-2',
      false
    );
  });

  it('answers false when the callback throws', () => {
    registerCardHolderVerification('chv_throw', () => {
      throw new Error('merchant bug');
    });
    emitChv({
      type: 'onCardHolderVerification',
      requestId: 'req-3',
      chvId: 'chv_throw',
      status: 'NotMatched',
    });
    expect(mockAnswerCardHolderVerification).toHaveBeenCalledWith(
      'req-3',
      false
    );
  });

  it('allocates unique chv handles', () => {
    expect(createChvHandle()).not.toBe(createChvHandle());
  });
});
