import type {
  AvailabilityEvent,
  EmbeddedAvailabilityEvent,
  WalletState,
} from './types';

const emptyState: WalletState = {
  isAvailable: false,
  isReady: false,
  isOrderConsumed: false,
  isInteractionEnabled: true,
};

export function toAvailabilityEvent(payload: {
  isAvailable?: boolean;
  isReady?: boolean;
  isOrderConsumed?: boolean;
  isInteractionEnabled?: boolean;
}): AvailabilityEvent {
  return {
    type: 'availability',
    ...parseWalletState(payload),
  };
}

export function toEmbeddedAvailabilityEvent(payload: {
  isOrderConsumed?: boolean;
  isInteractionEnabled?: boolean;
}): EmbeddedAvailabilityEvent {
  return {
    type: 'availability',
    isOrderConsumed: payload.isOrderConsumed === true,
    isInteractionEnabled: payload.isInteractionEnabled !== false,
  };
}

export function parseWalletState(raw: unknown): WalletState {
  if (raw == null || typeof raw !== 'object') {
    return { ...emptyState };
  }
  const map = raw as Record<string, unknown>;
  return {
    isAvailable: map.isAvailable === true,
    isReady: map.isReady === true,
    isOrderConsumed: map.isOrderConsumed === true,
    isInteractionEnabled: map.isInteractionEnabled !== false,
  };
}
