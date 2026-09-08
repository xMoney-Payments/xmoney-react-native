import { parsePaymentResult } from '../parseResult';

describe('parsePaymentResult', () => {
  it('allowlists complete transaction fields', () => {
    const result = parsePaymentResult({
      status: 'complete',
      extra: 'drop-me',
      transaction: {
        id: 'tx-1',
        status: 'approved',
        amount: '10.00',
        pan: '4111111111111111',
        customerData: {
          email: 'a@b.c',
          secret: 'nope',
          isWhitelisted: true,
          creationTimestamp: 1,
        },
      },
    });

    expect(result).toEqual({
      status: 'complete',
      transaction: {
        id: 'tx-1',
        status: 'approved',
        amount: '10.00',
        customerData: {
          email: 'a@b.c',
          isWhitelisted: true,
          creationTimestamp: 1,
        },
      },
    });
  });

  it('does not put raw payload into error.message', () => {
    const result = parsePaymentResult('not-json {{{');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error.code).toBe('UNKNOWN');
      expect(result.error.message).toBe('Invalid payment result');
      expect(result.error.message).not.toContain('{');
    }
  });

  it('parses JSON strings from native view events', () => {
    const result = parsePaymentResult(
      JSON.stringify({
        status: 'canceled',
        leaked: true,
      })
    );
    expect(result).toEqual({ status: 'canceled' });
  });

  it('defaults unknown status to failed', () => {
    const result = parsePaymentResult({ status: 'nope' });
    expect(result).toEqual({
      status: 'failed',
      error: { code: 'UNKNOWN', message: 'Payment failed' },
    });
  });

  it('does not copy payload text from a failed native error', () => {
    const result = parsePaymentResult({
      status: 'failed',
      error: {
        code: 'NETWORK_ERROR',
        message: 'orderPayload=secret {pan:4111}',
      },
    });
    expect(result).toEqual({
      status: 'failed',
      error: { code: 'NETWORK_ERROR', message: 'Payment failed' },
    });
  });
});
