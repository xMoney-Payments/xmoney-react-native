import React from 'react';
import { Platform } from 'react-native';
import { act, create } from 'react-test-renderer';
import { PaymentElement, type PaymentElementRef } from '../components/PaymentElement';
import { Commands } from '../specs/NativePaymentElement';
import type { UpdateOrderContext } from '../types';

jest.mock('../specs/NativePaymentElement', () => {
  const mockReact = require('react');
  const Native = mockReact.forwardRef(
    (
      props: {
        onLayout?: (event: {
          nativeEvent: { layout: { width: number } };
        }) => void;
      },
      ref: React.Ref<object>
    ) => {
      mockReact.useImperativeHandle(ref, () => ({}));
      mockReact.useEffect(() => {
        props.onLayout?.({ nativeEvent: { layout: { width: 320 } } });
        // The host reports its width once, on mount.
      }, []);
      return null;
    }
  );
  return {
    __esModule: true,
    default: Native,
    Commands: {
      prepare: jest.fn(),
      updateOrder: jest.fn(),
      beginUpdateOrder: jest.fn(),
      resolveOrder: jest.fn(),
      rejectOrder: jest.fn(),
      confirm: jest.fn(),
      updateAppearance: jest.fn(),
      updateLocale: jest.fn(),
      updateStyle: jest.fn(),
      updateWalletAppearance: jest.fn(),
    },
  };
});

describe('PaymentElement Android prepare retry', () => {
  const previous = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'android';
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = previous;
  });

  it('a retry tick does not abort an in-flight updateOrder(createOrder)', async () => {
    const ref = React.createRef<PaymentElementRef>();
    let root: ReturnType<typeof create> | undefined;
    await act(async () => {
      root = create(
        <PaymentElement
          ref={ref}
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'a', orderChecksum: 'ca' }}
        />
      );
    });
    expect(Commands.prepare).toHaveBeenCalledTimes(1);

    // The view has not acked yet, so the first retry still fires.
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(Commands.prepare).toHaveBeenCalledTimes(2);

    let ctx: UpdateOrderContext | undefined;
    const pending = ref.current!.updateOrder(async (context) => {
      ctx = context;
      await new Promise((resolve) => setTimeout(() => resolve(undefined), 5000));
      return { orderPayload: 'b', orderChecksum: 'cb' };
    });
    pending.catch(() => undefined);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // No further retry once the update started, so nothing supersedes it.
    expect(Commands.prepare).toHaveBeenCalledTimes(2);
    expect(ctx).toBeDefined();
    expect(ctx!.signal.aborted).toBe(false);
    expect(ctx!.isCurrent()).toBe(true);

    await act(async () => {
      root?.unmount();
    });
  });
});
