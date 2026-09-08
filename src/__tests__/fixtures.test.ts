import paymentConfig from '../__fixtures__/paymentConfig.json';
import paymentIntent from '../__fixtures__/paymentIntent.json';

describe('native fixtures', () => {
  it('describes PaymentConfig separately from PaymentIntent', () => {
    expect(paymentConfig.publicKey).toBe('pk_test_abc');
    expect(paymentConfig.card?.savedCards?.enabled).toBe(true);
    expect(paymentConfig.paymentMethods?.googlePay?.enabled).toBe(true);
    expect(paymentIntent.orderPayload).toBe('payload');
    expect(paymentIntent.orderChecksum).toBe('checksum');
  });

  it('uses native enum raw values', () => {
    expect(paymentConfig.card?.inputs?.grouping).toBe('spaced');
    expect(paymentConfig.card?.validationMode).toBe('onBlur');
    expect(paymentConfig.card?.submitButton?.type).toBe('pay');
    expect(paymentConfig.options?.style).toBe('alwaysLight');
  });
});
