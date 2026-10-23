import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';
import type {
  PaymentConfig,
  PaymentIntent,
  PaymentMethodsConfig,
} from '../types';

export type NativeViewCommands<T> = {
  prepare: (viewRef: T, orderPayload: string, orderChecksum: string) => void;
  /**
   * Raw prepare for the Android retry. It must not supersede in-flight
   * updates, which `prepare` does. Without it the retry does nothing.
   */
  retryPrepare?: (
    viewRef: T,
    orderPayload: string,
    orderChecksum: string
  ) => void;
  updateOrder: (
    viewRef: T,
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  updateAppearance?: (viewRef: T, appearanceJson: string) => void;
  updateLocale?: (viewRef: T, locale: string) => void;
  updateStyle?: (viewRef: T, style: string) => void;
  updateWalletAppearance?: (viewRef: T, appearanceJson: string) => void;
};

export type NativePrepareLiveKeys = {
  /** Last intent bound or sent to native. */
  intent: string;
  /** Last `intent` prop. A prop that still matches this is not sent again. */
  propIntent: string;
  appearance: string;
  locale: string;
  style: string;
  walletAppearance: string;
  structural: string;
  prepared: boolean;
  /** Native view confirmed the first bind (`onReady` or a failed first result). */
  acked: boolean;
  /** An `updateOrder` started since the last structural prepare. Stops the retry. */
  updateStarted: boolean;
};

/** The first Android command can be dropped. Retry prepare until the view acks. */
const PREPARE_RETRY_MS = 400;
const PREPARE_RETRY_LIMIT = 8;

export function markNativePrepareAcked(
  live: RefObject<NativePrepareLiveKeys>
): void {
  live.current.acked = true;
}

export type NativePrepareOptions = {
  appearance?: unknown;
  localeIsStructural?: boolean;
  ignoreMethodAppearance?: boolean;
  liveKeys?: RefObject<NativePrepareLiveKeys>;
  /**
   * True after the host reports a non-zero width. The first prepare waits for
   * this so a later layout pass does not bind the native view twice.
   */
  layoutReady?: boolean;
};

function methodsSignature(
  methods: PaymentMethodsConfig | undefined,
  ignoreAppearance: boolean
): unknown {
  if (!ignoreAppearance) {
    return methods;
  }
  if (!methods) {
    return methods;
  }
  return {
    applePay: methods.applePay
      ? { enabled: methods.applePay.enabled }
      : undefined,
    googlePay: methods.googlePay
      ? { enabled: methods.googlePay.enabled }
      : undefined,
  };
}

export function structuralSnapshot(
  configuration: PaymentConfig,
  options?: { localeIsStructural?: boolean; ignoreMethodAppearance?: boolean }
): string {
  return JSON.stringify({
    publicKey: configuration.publicKey,
    card: configuration.card,
    paymentMethods: methodsSignature(
      configuration.paymentMethods,
      options?.ignoreMethodAppearance === true
    ),
    locale: options?.localeIsStructural
      ? configuration.options?.locale
      : undefined,
  });
}

export function intentSnapshot(intent: PaymentIntent): string {
  return JSON.stringify({
    orderPayload: intent.orderPayload,
    orderChecksum: intent.orderChecksum,
  });
}

export function appearanceSnapshot(
  configuration: PaymentConfig,
  appearance?: unknown
): string {
  return JSON.stringify(
    appearance ?? configuration.options?.appearance ?? null
  );
}

export function localeSnapshot(configuration: PaymentConfig): string {
  return configuration.options?.locale ?? '';
}

export function styleSnapshot(configuration: PaymentConfig): string {
  return configuration.options?.style ?? '';
}

export function walletAppearanceSnapshot(
  configuration: PaymentConfig
): string {
  return JSON.stringify({
    applePay: configuration.paymentMethods?.applePay?.appearance ?? null,
    googlePay: configuration.paymentMethods?.googlePay?.appearance ?? null,
  });
}

function emptyLiveKeys(): NativePrepareLiveKeys {
  return {
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
  };
}

function appliedLiveKeys(
  boundIntent: string,
  propIntent: string,
  nextAppearance: string,
  nextLocale: string,
  nextStyle: string,
  nextWalletAppearance: string,
  structural: string,
  acked: boolean,
  updateStarted: boolean
): NativePrepareLiveKeys {
  return {
    intent: boundIntent,
    propIntent,
    appearance: nextAppearance,
    locale: nextLocale,
    style: nextStyle,
    walletAppearance: nextWalletAppearance,
    structural,
    prepared: true,
    acked,
    updateStarted,
  };
}

/** Dispatches prepare / in-place native updates. */
export function useNativePrepare<T>(
  viewRef: RefObject<T | null>,
  commands: NativeViewCommands<T>,
  configuration: PaymentConfig,
  intent: PaymentIntent,
  _onResult?: unknown,
  options?: NativePrepareOptions
): void {
  const fallbackLive = useRef<NativePrepareLiveKeys>(emptyLiveKeys());
  const live = options?.liveKeys ?? fallbackLive;

  const localeIsStructural = options?.localeIsStructural === true;
  const ignoreMethodAppearance = options?.ignoreMethodAppearance === true;
  const layoutReady = options?.layoutReady === true;
  const structural = structuralSnapshot(configuration, {
    localeIsStructural,
    ignoreMethodAppearance,
  });
  const nextIntent = intentSnapshot(intent);
  const nextAppearance = appearanceSnapshot(configuration, options?.appearance);
  const nextLocale = localeSnapshot(configuration);
  const nextStyle = styleSnapshot(configuration);
  const nextWalletAppearance = walletAppearanceSnapshot(configuration);
  const key = `${structural}|${nextIntent}|${nextAppearance}|${nextLocale}|${nextStyle}|${nextWalletAppearance}|${layoutReady}`;

  useLayoutEffect(() => {
    const node = viewRef.current;
    if (!node || !layoutReady) {
      return;
    }

    const applied = live.current;
    const needsPrepare =
      !applied.prepared || applied.structural !== structural;
    if (needsPrepare) {
      commands.prepare(node, intent.orderPayload, intent.orderChecksum);
      live.current = appliedLiveKeys(
        nextIntent,
        nextIntent,
        nextAppearance,
        nextLocale,
        nextStyle,
        nextWalletAppearance,
        structural,
        false,
        false
      );
      return;
    }

    // `intent` is the last bound order. `onBound` moves it ahead of the prop.
    // Rebind only when the prop itself changes and is not already bound.
    let boundIntent = applied.intent;
    if (applied.propIntent !== nextIntent && applied.intent !== nextIntent) {
      commands.updateOrder(node, intent.orderPayload, intent.orderChecksum, '');
      boundIntent = nextIntent;
    }
    if (
      applied.appearance !== nextAppearance &&
      commands.updateAppearance
    ) {
      commands.updateAppearance(node, nextAppearance);
    }
    if (
      !localeIsStructural &&
      applied.locale !== nextLocale &&
      commands.updateLocale
    ) {
      commands.updateLocale(node, nextLocale || 'en-US');
    }
    if (applied.style !== nextStyle && commands.updateStyle) {
      commands.updateStyle(node, nextStyle || 'automatic');
    }
    if (
      applied.walletAppearance !== nextWalletAppearance &&
      commands.updateWalletAppearance
    ) {
      commands.updateWalletAppearance(node, nextWalletAppearance);
    }

    live.current = appliedLiveKeys(
      boundIntent,
      nextIntent,
      nextAppearance,
      nextLocale,
      nextStyle,
      nextWalletAppearance,
      structural,
      applied.acked,
      applied.updateStarted
    );
    // Snapshots are the dependency; liveKeys is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, commands, viewRef]);

  // The first Android prepare can be dropped, on any architecture. Retry that
  // command only, and never through `commands.prepare`, which supersedes
  // in-flight updates. A later prop change still goes through updateOrder
  // above. The retry stops once the view acks, an update starts, or an update
  // binds a newer order (a prepare with the prop would rebind the old one).
  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !layoutReady ||
      !commands.retryPrepare
    ) {
      return;
    }
    const retryPrepare = commands.retryPrepare;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const node = viewRef.current;
      if (
        !node ||
        live.current.acked ||
        live.current.updateStarted ||
        live.current.intent !== nextIntent ||
        attempts >= PREPARE_RETRY_LIMIT
      ) {
        return;
      }
      attempts += 1;
      retryPrepare(node, intent.orderPayload, intent.orderChecksum);
      timer = setTimeout(tick, PREPARE_RETRY_MS);
    };
    timer = setTimeout(tick, PREPARE_RETRY_MS);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    layoutReady,
    commands,
    intent.orderPayload,
    intent.orderChecksum,
    nextIntent,
    structural,
    viewRef,
    live,
  ]);
}
