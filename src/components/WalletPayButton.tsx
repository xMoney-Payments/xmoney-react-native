import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ElementRef,
} from 'react';
import {
  Platform,
  StyleSheet,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { toAvailabilityEvent } from '../availability';
import { sanitizePaymentError } from '../errors';
import NativePlatformPayButton, {
  Commands,
} from '../specs/NativePlatformPayButton';
import { parsePaymentResult } from '../parseResult';
import { platformPayMethods } from '../platformPayConfig';
import { createOrderUpdater } from './orderUpdater';
import {
  appearanceSnapshot,
  intentSnapshot,
  markNativePrepareAcked,
  useNativePrepare,
  type NativePrepareLiveKeys,
} from './useNativePrepare';
import {
  createChvHandle,
  toNativeConfiguration,
} from '../cardHolderVerification';
import type {
  ApplePayAppearance,
  GooglePayAppearance,
  PaymentConfig,
  PaymentIntent,
  PaymentResult,
  UpdateOrderContext,
  WalletPayEvent,
} from '../types';

export type WalletPayButtonProps = {
  configuration: PaymentConfig;
  intent: PaymentIntent;
  appearance?: ApplePayAppearance | GooglePayAppearance;
  isEnabled?: boolean;
  onEvent?: (event: WalletPayEvent) => void;
  onResult?: (result: PaymentResult) => void;
  style?: StyleProp<ViewStyle>;
};

export type WalletPayButtonRef = {
  updateOrder: {
    (intent: PaymentIntent): Promise<void>;
    (
      createOrder: (ctx: UpdateOrderContext) => Promise<PaymentIntent>
    ): Promise<PaymentIntent>;
  };
  updateAppearance: (
    appearance: ApplePayAppearance | GooglePayAppearance
  ) => void;
};

/**
 * Shared native Apple Pay / Google Pay button. Not a public export.
 */
export const WalletPayButton = forwardRef<
  WalletPayButtonRef,
  WalletPayButtonProps
>(function WalletPayButton(
  {
    configuration,
    intent,
    appearance,
    isEnabled = true,
    onEvent,
    onResult,
    style,
  },
  ref
): JSX.Element {
  const viewRef = useRef<ElementRef<typeof NativePlatformPayButton> | null>(
    null
  );
  const [minHeight, setMinHeight] = useState(56);
  const [layoutReady, setLayoutReady] = useState(false);
  const liveKeys = useRef<NativePrepareLiveKeys>({
    intent: '',
    propIntent: '',
    appearance: '',
    locale: '',
    style: '',
    walletAppearance: '',
    structural: '',
    prepared: false,
    acked: false,
    updateStarted: false,
  });
  const updater = useMemo(
    () =>
      createOrderUpdater({
        attached: () => viewRef.current != null,
        commands: {
          updateOrder: (orderPayload, orderChecksum, requestId) => {
            const node = viewRef.current;
            if (node) {
              Commands.updateOrder(node, orderPayload, orderChecksum, requestId);
            }
          },
          beginUpdateOrder: (requestId) => {
            const node = viewRef.current;
            if (node) {
              Commands.beginUpdateOrder(node, requestId);
            }
          },
          resolveOrder: (orderPayload, orderChecksum, requestId) => {
            const node = viewRef.current;
            if (node) {
              Commands.resolveOrder(
                node,
                orderPayload,
                orderChecksum,
                requestId
              );
            }
          },
          rejectOrder: (requestId) => {
            const node = viewRef.current;
            if (node) {
              Commands.rejectOrder(node, requestId);
            }
          },
        },
        onBound: (bound) => {
          liveKeys.current.intent = intentSnapshot(bound);
        },
      }),
    []
  );
  useEffect(() => () => updater.detach(), [updater]);
  const paymentMethods = useMemo(
    () => configuration.paymentMethods ?? platformPayMethods(appearance),
    [appearance, configuration.paymentMethods]
  );
  const chvId = useRef(createChvHandle()).current;
  const resolvedConfiguration = useMemo(
    () => ({ ...configuration, paymentMethods }),
    [configuration, paymentMethods]
  );
  const nativeConfiguration = useMemo(
    () => toNativeConfiguration(resolvedConfiguration, chvId),
    [resolvedConfiguration, chvId]
  );
  const commands = useMemo(
    () => ({
      prepare: (
        node: ElementRef<typeof NativePlatformPayButton>,
        orderPayload: string,
        orderChecksum: string
      ) => {
        updater.supersede();
        Commands.prepare(node, orderPayload, orderChecksum);
      },
      // The Android retry must not supersede an in-flight update.
      retryPrepare: Commands.prepare,
      updateOrder: Commands.updateOrder,
      updateAppearance: Commands.updateAppearance,
    }),
    [updater]
  );
  useNativePrepare(
    viewRef,
    commands,
    resolvedConfiguration,
    intent,
    onResult,
    {
      appearance,
      localeIsStructural: true,
      ignoreMethodAppearance: true,
      liveKeys,
      layoutReady,
    }
  );

  useImperativeHandle(ref, () => ({
    updateOrder: ((
      intentOrCreate:
        | PaymentIntent
        | ((ctx: UpdateOrderContext) => Promise<PaymentIntent>)
    ) => {
      liveKeys.current.updateStarted = true;
      if (typeof intentOrCreate !== 'function') {
        liveKeys.current.intent = intentSnapshot(intentOrCreate);
      }
      return updater.updateOrder(intentOrCreate);
    }) as WalletPayButtonRef['updateOrder'],
    updateAppearance: (nextAppearance) => {
      liveKeys.current.appearance = appearanceSnapshot(
        resolvedConfiguration,
        nextAppearance
      );
      const node = viewRef.current;
      if (node) {
        Commands.updateAppearance(
          node,
          JSON.stringify(nextAppearance ?? null)
        );
      }
    },
  }));

  return (
    <NativePlatformPayButton
      ref={viewRef}
      configuration={nativeConfiguration}
      appearance={appearance}
      disabled={!isEnabled}
      style={[styles.default, { minHeight }, style]}
      onLayout={(event) => {
        if (event.nativeEvent.layout.width > 0) {
          setLayoutReady(true);
        }
      }}
      onReady={() => {
        markNativePrepareAcked(liveKeys);
        onEvent?.({ type: 'ready' });
      }}
      onProcessing={(event: NativeSyntheticEvent<{ isProcessing: boolean }>) =>
        onEvent?.({
          type: 'processing',
          isProcessing: event.nativeEvent.isProcessing,
        })
      }
      onResult={(event: NativeSyntheticEvent<{ resultJson: string }>) => {
        const result = parsePaymentResult(event.nativeEvent.resultJson);
        if (result.status === 'failed') {
          markNativePrepareAcked(liveKeys);
        }
        onResult?.(result);
      }}
      onOrderUpdated={(
        event: NativeSyntheticEvent<{
          requestId: string;
          success: boolean;
          error?: string;
        }>
      ) => updater.settle(event.nativeEvent)}
      onUpdateFailed={(
        event: NativeSyntheticEvent<{ code: string; message: string }>
      ) =>
        onEvent?.({
          type: 'updateFailed',
          error: sanitizePaymentError(
            event.nativeEvent.code,
            event.nativeEvent.message
          ),
        })
      }
      onAvailability={(
        event: NativeSyntheticEvent<{
          isAvailable: boolean;
          isReady: boolean;
          isOrderConsumed: boolean;
          isInteractionEnabled: boolean;
        }>
      ) => {
        onEvent?.(toAvailabilityEvent(event.nativeEvent));
      }}
      onHeightChange={(event: NativeSyntheticEvent<{ height: number }>) => {
        const next = event.nativeEvent.height;
        if (next > 0) {
          setMinHeight((current) =>
            Math.abs(next - current) > 1 ? next : current
          );
        }
      }}
    />
  );
});

const styles = StyleSheet.create({
  default: {
    width: '100%',
    overflow: 'hidden',
  },
});

export type ApplePayButtonProps = Omit<
  WalletPayButtonProps,
  'onEvent' | 'appearance'
> & {
  appearance?: ApplePayAppearance;
  onEvent?: (event: WalletPayEvent) => void;
};

export type ApplePayButtonRef = WalletPayButtonRef;

/** Native Apple Pay button. Renders nothing on Android. */
export const ApplePayButton = forwardRef<
  ApplePayButtonRef,
  ApplePayButtonProps
>(function ApplePayButton(props, ref): JSX.Element | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  return <WalletPayButton {...props} ref={ref} />;
});

export type GooglePayButtonProps = Omit<
  WalletPayButtonProps,
  'onEvent' | 'appearance'
> & {
  appearance?: GooglePayAppearance;
  onEvent?: (event: WalletPayEvent) => void;
};

export type GooglePayButtonRef = WalletPayButtonRef;

/** Native Google Pay button. Renders nothing on iOS. */
export const GooglePayButton = forwardRef<
  GooglePayButtonRef,
  GooglePayButtonProps
>(function GooglePayButton(props, ref): JSX.Element | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  return <WalletPayButton {...props} ref={ref} />;
});
