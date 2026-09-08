import { useLayoutEffect, useRef, type RefObject } from 'react';
import type {
  PaymentConfig,
  PaymentIntent,
  PaymentMethodsConfig,
} from '../types';

export type NativeViewCommands<T> = {
  prepare: (viewRef: T, orderPayload: string, orderChecksum: string) => void;
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
  intent: string;
  appearance: string;
  locale: string;
  style: string;
  walletAppearance: string;
  structural: string;
  prepared: boolean;
  /** Native view confirmed bind (`onReady` / `onAvailability`). */
  acked: boolean;
};

export type NativePrepareOptions = {
  appearance?: unknown;
  localeIsStructural?: boolean;
  ignoreMethodAppearance?: boolean;
  liveKeys?: RefObject<NativePrepareLiveKeys>;
  /** True after the host reports a non-zero width. Retries prepare until acked. */
  layoutReady?: boolean;
};

export function markNativePrepareAcked(
  live: RefObject<NativePrepareLiveKeys>
): void {
  live.current.acked = true;
}

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
    appearance: '',
    locale: '',
    style: '',
    walletAppearance: '',
    structural: '',
    prepared: false,
    acked: false,
  };
}

function appliedLiveKeys(
  nextIntent: string,
  nextAppearance: string,
  nextLocale: string,
  nextStyle: string,
  nextWalletAppearance: string,
  structural: string,
  acked: boolean
): NativePrepareLiveKeys {
  return {
    intent: nextIntent,
    appearance: nextAppearance,
    locale: nextLocale,
    style: nextStyle,
    walletAppearance: nextWalletAppearance,
    structural,
    prepared: true,
    acked,
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
    if (!node) {
      return;
    }

    const applied = live.current;
    const needsPrepare =
      !applied.prepared ||
      applied.structural !== structural ||
      (layoutReady && !applied.acked);
    if (needsPrepare) {
      commands.prepare(node, intent.orderPayload, intent.orderChecksum);
      live.current = appliedLiveKeys(
        nextIntent,
        nextAppearance,
        nextLocale,
        nextStyle,
        nextWalletAppearance,
        structural,
        false
      );
      return;
    }

    if (applied.intent !== nextIntent) {
      commands.updateOrder(node, intent.orderPayload, intent.orderChecksum, '');
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
      nextIntent,
      nextAppearance,
      nextLocale,
      nextStyle,
      nextWalletAppearance,
      structural,
      applied.acked
    );
    // Snapshots are the dependency; liveKeys is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, commands, viewRef]);
}
