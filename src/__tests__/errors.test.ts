import { STABLE_MESSAGES, XMoneyPaymentError } from '../errors';

describe('XMoneyPaymentError.from', () => {
  it('returns XMoneyPaymentError instances unchanged', () => {
    const original = new XMoneyPaymentError('NOT_INITIALIZED', 'Call init before present.');
    expect(XMoneyPaymentError.from(original)).toBe(original);
  });

  it('maps allowlisted native codes to stable messages', () => {
    const error = XMoneyPaymentError.from({
      code: 'PRESENT_ERROR',
      message: 'orderPayload=secret pan=4111',
    });
    expect(error).toBeInstanceOf(XMoneyPaymentError);
    expect(error.code).toBe('PRESENT_ERROR');
    expect(error.message).toBe('Failed to present');
    expect(error.message).not.toContain('pan');
  });

  it('keeps short native codes and safe merchant messages', () => {
    expect(
      XMoneyPaymentError.from({
        code: 'CARD_DECLINED',
        message: 'Your card was declined.',
      })
    ).toMatchObject({
      code: 'CARD_DECLINED',
      message: 'Your card was declined.',
    });
  });

  it('drops unknown codes and raw strings', () => {
    expect(
      XMoneyPaymentError.from({
        code: 'LEAK',
        message: 'orderPayload=secret pan=4111',
      })
    ).toMatchObject({
      code: 'LEAK',
      message: 'Payment failed',
    });
    expect(XMoneyPaymentError.from('orderPayload=secret')).toMatchObject({
      code: 'UNKNOWN',
      message: 'Payment failed',
    });
  });
});

describe('STABLE_MESSAGES', () => {
  it('does not keep unused ALREADY_PRESENTED, UNSUPPORTED, MISSING_PUBLIC_KEY, or MISSING_SECRETS', () => {
    expect(STABLE_MESSAGES).not.toHaveProperty('ALREADY_PRESENTED');
    expect(STABLE_MESSAGES).not.toHaveProperty('UNSUPPORTED');
    expect(STABLE_MESSAGES).not.toHaveProperty('MISSING_PUBLIC_KEY');
    expect(STABLE_MESSAGES).not.toHaveProperty('MISSING_SECRETS');
    expect(STABLE_MESSAGES.SUPERSEDED_UPDATE_ORDER).toBe(
      'Superseded by a newer updateOrder call'
    );
  });
});
