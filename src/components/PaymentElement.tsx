import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ElementRef,
} from 'react';
import {
  StyleSheet,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { toEmbeddedAvailabilityEvent } from '../availability';
import NativePaymentElement, {
  Commands,
} from '../specs/NativePaymentElement';
import { parsePaymentResult } from '../parseResult';
import { createOrderUpdateQueue } from './orderUpdates';
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
  AppearanceConfig,
  ApplePayAppearance,
  EmbeddedEvent,
  GooglePayAppearance,
  PaymentConfig,
  PaymentIntent,
  PaymentResult,
  UserInterfaceStyle,
  WalletAppearance,
} from '../types';

export type PaymentElementProps = {
  configuration: PaymentConfig;
  intent: PaymentIntent;
  onEvent?: (event: EmbeddedEvent) => void;
  onResult?: (result: PaymentResult) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * `confirm()` submits the selected method when `card.submitButton.visible` is false.
 * Await `updateOrder` (or `availability.isInteractionEnabled`) before `confirm()`.
 */
export type PaymentElementRef = {
  confirm: () => void;
  updateOrder: (intent: PaymentIntent) => Promise<void>;
  updateAppearance: (appearance: AppearanceConfig) => void;
  updateLocale: (locale: string) => void;
  updateStyle: (style: UserInterfaceStyle) => void;
  updateWalletAppearance: (appearance: {
    applePay?: ApplePayAppearance | WalletAppearance;
    googlePay?: GooglePayAppearance | WalletAppearance;
  }) => void;
};

/**
 * Native Payment Element. Pass native `PaymentConfig` + `PaymentIntent`.
 * After a terminal result the native SDK consumes the order — pass a new intent.
 */
export const PaymentElement = forwardRef<
  PaymentElementRef,
  PaymentElementProps
>(function PaymentElement(
  { configuration, intent, onEvent, onResult, style },
  ref
): JSX.Element {
  const viewRef = useRef<ElementRef<typeof NativePaymentElement> | null>(null);
  const [minHeight, setMinHeight] = useState(160);
  const [layoutReady, setLayoutReady] = useState(false);
  const liveKeys = useRef<NativePrepareLiveKeys>({
    intent: '',
    appearance: '',
    locale: '',
    style: '',
    walletAppearance: '',
    structural: '',
    prepared: false,
    acked: false,
  });
  const orderQueue = useMemo(() => createOrderUpdateQueue(), []);
  const chvId = useRef(createChvHandle()).current;
  const nativeConfiguration = useMemo(
    () => toNativeConfiguration(configuration, chvId),
    [configuration, chvId]
  );
  const commands = useMemo(
    () => ({
      prepare: Commands.prepare,
      updateOrder: Commands.updateOrder,
      updateAppearance: Commands.updateAppearance,
      updateLocale: Commands.updateLocale,
      updateStyle: Commands.updateStyle,
      updateWalletAppearance: Commands.updateWalletAppearance,
    }),
    []
  );
  useNativePrepare(
    viewRef,
    commands,
    configuration,
    intent,
    onResult,
    { liveKeys, layoutReady, ignoreMethodAppearance: true }
  );

  useImperativeHandle(ref, () => ({
    confirm: () => {
      const node = viewRef.current;
      if (node) {
        Commands.confirm(node);
      }
    },
    updateOrder: (nextIntent) => {
      liveKeys.current.intent = intentSnapshot(nextIntent);
      const node = viewRef.current;
      if (!node) {
        return Promise.reject(
          new Error('PaymentElement is not mounted')
        );
      }
      return orderQueue.start((requestId) => {
        Commands.updateOrder(
          node,
          nextIntent.orderPayload,
          nextIntent.orderChecksum,
          requestId
        );
      });
    },
    updateAppearance: (appearance) => {
      liveKeys.current.appearance = appearanceSnapshot(
        configuration,
        appearance
      );
      const node = viewRef.current;
      if (node) {
        Commands.updateAppearance(node, JSON.stringify(appearance ?? null));
      }
    },
    updateLocale: (locale) => {
      liveKeys.current.locale = locale;
      const node = viewRef.current;
      if (node) {
        Commands.updateLocale(node, locale);
      }
    },
    updateStyle: (style) => {
      liveKeys.current.style = style;
      const node = viewRef.current;
      if (node) {
        Commands.updateStyle(node, style);
      }
    },
    updateWalletAppearance: (appearance) => {
      liveKeys.current.walletAppearance = JSON.stringify({
        applePay: appearance.applePay ?? null,
        googlePay: appearance.googlePay ?? null,
      });
      const node = viewRef.current;
      if (node) {
        Commands.updateWalletAppearance(
          node,
          liveKeys.current.walletAppearance
        );
      }
    },
  }));

  return (
    <NativePaymentElement
      ref={viewRef}
      configuration={nativeConfiguration}
      style={[styles.default, { minHeight, height: minHeight }, style]}
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
      onResult={(event: NativeSyntheticEvent<{ resultJson: string }>) =>
        onResult?.(parsePaymentResult(event.nativeEvent.resultJson))
      }
      onOrderUpdated={(
        event: NativeSyntheticEvent<{
          requestId: string;
          success: boolean;
          error?: string;
        }>
      ) => orderQueue.settle(event.nativeEvent)}
      onAvailability={(
        event: NativeSyntheticEvent<{
          isOrderConsumed: boolean;
          isInteractionEnabled: boolean;
        }>
      ) => {
        markNativePrepareAcked(liveKeys);
        onEvent?.(toEmbeddedAvailabilityEvent(event.nativeEvent));
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
    alignSelf: 'stretch',
    overflow: 'visible',
  },
});
