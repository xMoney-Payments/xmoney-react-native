import { getEmitter, getModule, EVENT_NAME } from './nativeModule';
import type {
  CardHolderMatchStatus,
  CardHolderVerificationResult,
  PaymentConfig,
} from './types';

const STATUSES: ReadonlySet<string> = new Set([
  'Matched',
  'NotMatched',
  'NotVerified',
  'PartialMatched',
  'NotSupported',
]);

const callbacks = new Map<
  string,
  (result: CardHolderVerificationResult) => boolean
>();

let nextHandle = 0;
let listening = false;

type ChvEvent = {
  type?: string;
  requestId?: string;
  chvId?: string;
  status?: string;
  firstNameStatus?: string;
  middleNameStatus?: string;
  lastNameStatus?: string;
};

function asStatus(value: string | undefined): CardHolderMatchStatus | undefined {
  if (value && STATUSES.has(value)) {
    return value as CardHolderMatchStatus;
  }
  return undefined;
}

function resultFromEvent(event: ChvEvent): CardHolderVerificationResult {
  return {
    status: asStatus(event.status) ?? 'NotVerified',
    firstNameStatus: asStatus(event.firstNameStatus),
    middleNameStatus: asStatus(event.middleNameStatus),
    lastNameStatus: asStatus(event.lastNameStatus),
  };
}

function ensureListener() {
  if (listening) {
    return;
  }
  listening = true;
  getEmitter()?.addListener(EVENT_NAME, (event: ChvEvent) => {
    if (event.type !== 'onCardHolderVerification') {
      return;
    }
    const requestId = event.requestId;
    if (!requestId) {
      return;
    }
    const callback = event.chvId ? callbacks.get(event.chvId) : undefined;
    let accepted = false;
    if (callback) {
      try {
        accepted = callback(resultFromEvent(event)) === true;
      } catch {
        accepted = false;
      }
    }
    getModule().answerCardHolderVerification(requestId, accepted);
  });
}

/** Stable id so native config does not remount when only the JS callback identity changes. */
export function createChvHandle(): string {
  nextHandle += 1;
  return `chv_${nextHandle}`;
}

export function registerCardHolderVerification(
  chvId: string,
  callback?: (result: CardHolderVerificationResult) => boolean
): void {
  ensureListener();
  if (callback) {
    callbacks.set(chvId, callback);
    return;
  }
  callbacks.delete(chvId);
}

/**
 * JSON-safe config for the native bridge. Functions are stripped; `chvId`
 * identifies the JS `onCardHolderVerification` callback.
 */
export function toNativeConfiguration(
  configuration: PaymentConfig,
  chvId: string
): Record<string, unknown> {
  const verification = configuration.card?.cardHolderVerification;
  registerCardHolderVerification(
    chvId,
    verification?.onCardHolderVerification
  );
  const cloned = JSON.parse(JSON.stringify(configuration)) as Record<
    string,
    unknown
  >;
  if (!verification) {
    return cloned;
  }
  const card = (cloned.card as Record<string, unknown> | undefined) ?? {};
  card.cardHolderVerification = {
    name: {
      firstName: verification.name.firstName,
      middleName: verification.name.middleName ?? '',
      lastName: verification.name.lastName,
    },
    chvId,
  };
  cloned.card = card;
  return cloned;
}

export const SHEET_CHV_ID = 'chv_sheet';
export const APPLE_PAY_CHV_ID = 'chv_apple';
export const GOOGLE_PAY_CHV_ID = 'chv_google';
