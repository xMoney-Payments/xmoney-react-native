import { sanitizePaymentError } from './errors';
import type {
  PaymentError,
  PaymentResult,
  Transaction,
  TransactionCustomer,
} from './types';

const STATUSES: ReadonlySet<string> = new Set([
  'complete',
  'failed',
  'canceled',
]);

const TRANSACTION_KEYS = [
  'id',
  'status',
  'amount',
  'currencyKey',
  'amountInEuro',
  'externalOrderId',
  'description',
] as const;

const CUSTOMER_STRING_KEYS = [
  'id',
  'siteId',
  'identifier',
  'firstName',
  'lastName',
  'country',
  'state',
  'city',
  'zipCode',
  'address',
  'phone',
  'email',
  'isWhitelistedUntil',
  'creationDate',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function pickCustomer(value: unknown): TransactionCustomer | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const customer: TransactionCustomer = {};
  for (const key of CUSTOMER_STRING_KEYS) {
    const picked = pickString(record, key);
    if (picked !== undefined) {
      customer[key] = picked;
    }
  }
  if (typeof record.isWhitelisted === 'boolean') {
    customer.isWhitelisted = record.isWhitelisted;
  }
  if (typeof record.creationTimestamp === 'number') {
    customer.creationTimestamp = record.creationTimestamp;
  }
  return customer;
}

function pickTransaction(value: unknown): Transaction | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const transaction: Transaction = {};
  for (const key of TRANSACTION_KEYS) {
    const picked = pickString(record, key);
    if (picked !== undefined) {
      transaction[key] = picked;
    }
  }
  const customer = pickCustomer(record.customerData);
  if (customer) {
    transaction.customerData = customer;
  }
  return transaction;
}

function pickError(value: unknown): PaymentError | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  return sanitizePaymentError(
    pickString(record, 'code'),
    pickString(record, 'message')
  );
}

/**
 * Copies only known {@link PaymentResult} fields. Extra native keys are dropped.
 * Never puts a raw payload into `error.message`.
 */
export function parsePaymentResult(value: unknown): PaymentResult {
  let payload: unknown = value;
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value);
    } catch {
      return {
        status: 'failed',
        error: { code: 'UNKNOWN', message: 'Invalid payment result' },
      };
    }
  }

  const record = asRecord(payload);
  if (!record) {
    return {
      status: 'failed',
      error: { code: 'UNKNOWN', message: 'Invalid payment result' },
    };
  }

  const statusRaw = pickString(record, 'status');
  const status = STATUSES.has(statusRaw ?? '') ? statusRaw : 'failed';

  if (status === 'canceled') {
    return { status: 'canceled' };
  }
  if (status === 'complete') {
    return {
      status: 'complete',
      transaction: pickTransaction(record.transaction) ?? {},
    };
  }
  return {
    status: 'failed',
    error: pickError(record.error) ?? {
      code: 'UNKNOWN',
      message: 'Payment failed',
    },
  };
}
