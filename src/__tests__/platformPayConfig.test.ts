import { platformPayMethods } from '../platformPayConfig';
import type { ApplePayAppearance, GooglePayAppearance } from '../types';

describe('platformPayMethods', () => {
  it('enables Apple Pay only on iOS', () => {
    expect(platformPayMethods({ radius: 8 }, 'ios')).toEqual({
      applePay: { enabled: true, appearance: { radius: 8 } },
    });
  });

  it('enables Google Pay only on Android', () => {
    expect(platformPayMethods(undefined, 'android')).toEqual({
      googlePay: { enabled: true, appearance: undefined },
    });
  });

  it('forwards Apple Pay-only color and type on iOS', () => {
    const appearance: ApplePayAppearance = {
      color: 'white-outline',
      type: 'topUp',
      radius: 8,
    };
    expect(platformPayMethods(appearance, 'ios')).toEqual({
      applePay: { enabled: true, appearance },
    });
  });

  it('forwards Google Pay appearance on Android', () => {
    const appearance: GooglePayAppearance = {
      color: 'black',
      type: 'buy',
      radius: 8,
    };
    expect(platformPayMethods(appearance, 'android')).toEqual({
      googlePay: { enabled: true, appearance },
    });
  });
});

function assertGooglePayAppearance(_appearance: GooglePayAppearance): void {}

// @ts-expect-error white-outline is Apple Pay only
assertGooglePayAppearance({ color: 'white-outline' });
// @ts-expect-error topUp is Apple Pay only
assertGooglePayAppearance({ type: 'topUp' });
