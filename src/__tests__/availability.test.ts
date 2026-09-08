import { parseWalletState, toAvailabilityEvent, toEmbeddedAvailabilityEvent } from '../availability';

describe('availability', () => {
  it('parses wallet state with defaults', () => {
    expect(parseWalletState(null)).toEqual({
      isAvailable: false,
      isReady: false,
      isOrderConsumed: false,
      isInteractionEnabled: true,
    });
    expect(
      parseWalletState({
        isAvailable: true,
        isReady: true,
        isOrderConsumed: true,
        isInteractionEnabled: false,
      })
    ).toEqual({
      isAvailable: true,
      isReady: true,
      isOrderConsumed: true,
      isInteractionEnabled: false,
    });
  });

    it('maps a native payload to an availability event', () => {
      expect(
        toAvailabilityEvent({
          isAvailable: true,
          isReady: false,
          isOrderConsumed: false,
          isInteractionEnabled: true,
        })
      ).toEqual({
        type: 'availability',
        isAvailable: true,
        isReady: false,
        isOrderConsumed: false,
        isInteractionEnabled: true,
      });
    });

    it('maps PaymentElement flags without wallet isAvailable/isReady', () => {
      expect(
        toEmbeddedAvailabilityEvent({
          isOrderConsumed: true,
          isInteractionEnabled: false,
        })
      ).toEqual({
        type: 'availability',
        isOrderConsumed: true,
        isInteractionEnabled: false,
      });
    });
});
