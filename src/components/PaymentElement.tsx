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
  StyleSheet,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { toEmbeddedAvailabilityEvent } from '../availability';
import NativePaymentElement, {
  Commands,
} from '../specs/NativePaymentElement';
import { sanitizePaymentError } from '../errors';
import { parsePaymentResult } from '../parseResult';
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
 *
 * `updateOrder(createOrder)` locks Pay before `createOrder` runs. Check
 * `isUpdateCurrent` after a debounce so a superseded callback does not create
 * an order.
 */
export type PaymentElementRef = {
  confirm: () => void;
  updateOrder: {
    (intent: PaymentIntent): Promise<void>;
    (createOrder: () => Promise<PaymentIntent>): Promise<PaymentIntent>;
  };
  isUpdateCurrent: () => boolean;
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
  const chvId = useRef(createChvHandle()).current;
  const nativeConfiguration = useMemo(
    () => toNativeConfiguration(configuration, chvId),
    [configuration, chvId]
  );
  const commands = useMemo(
    () => ({
      prepare: (
        node: ElementRef<typeof NativePaymentElement>,
        orderPayload: string,
        orderChecksum: string
      ) => {
        updater.supersede();
        Commands.prepare(node, orderPayload, orderChecksum);
      },
      updateOrder: Commands.updateOrder,
      updateAppearance: Commands.updateAppearance,
      updateLocale: Commands.updateLocale,
      updateStyle: Commands.updateStyle,
      updateWalletAppearance: Commands.updateWalletAppearance,
    }),
    [updater]
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
    updateOrder: ((intentOrCreate: PaymentIntent | (() => Promise<PaymentIntent>)) => {
      if (typeof intentOrCreate !== 'function') {
        liveKeys.current.intent = intentSnapshot(intentOrCreate);
      }
      return updater.updateOrder(intentOrCreate);
    }) as PaymentElementRef['updateOrder'],
    isUpdateCurrent: () => updater.isUpdateCurrent(),
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
