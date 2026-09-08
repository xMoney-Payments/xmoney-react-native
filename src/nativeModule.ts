import { NativeEventEmitter, Platform } from 'react-native';
import NativeXMoneyPaymentSheet from './specs/NativeXMoneyPaymentSheet';
import { XMoneyPaymentError } from './errors';
import type { PaymentSheetEvent } from './types';

const LINKING_ERROR =
  `The package '@xmoney/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

export const EVENT_NAME = 'XMoneyPaymentSheetEvent';

export interface NativeEventPayload {
  requestId: string;
  type: 'onReady' | 'onProcessing';
  isProcessing?: boolean;
}

let requestCounter = 0;
let emitter: NativeEventEmitter | null | undefined;

export function nextRequestId(prefix = 'xmoney'): string {
  requestCounter += 1;
  return `${prefix}-${Date.now()}-${requestCounter}`;
}

export function getModule() {
  if (!NativeXMoneyPaymentSheet) {
    throw new XMoneyPaymentError('NOT_LINKED', LINKING_ERROR);
  }
  return NativeXMoneyPaymentSheet;
}

export function getEmitter(): NativeEventEmitter | null {
  if (emitter !== undefined) {
    return emitter;
  }
  const nativeModule = NativeXMoneyPaymentSheet;
  emitter = nativeModule
    ? new NativeEventEmitter(nativeModule as never)
    : null;
  return emitter;
}

export function toPaymentSheetEvent(
  event: NativeEventPayload
): PaymentSheetEvent | null {
  switch (event.type) {
    case 'onReady':
      return { type: 'ready' };
    case 'onProcessing':
      return { type: 'processing', isProcessing: event.isProcessing ?? false };
    default:
      return null;
  }
}

export function subscribeNativeEvents(
  requestId: string,
  onEvent?: (event: PaymentSheetEvent) => void
) {
  return getEmitter()?.addListener(
    EVENT_NAME,
    (event: NativeEventPayload) => {
      if (event.requestId !== requestId) {
        return;
      }
      const mapped = toPaymentSheetEvent(event);
      if (mapped) {
        onEvent?.(mapped);
      }
    }
  );
}
