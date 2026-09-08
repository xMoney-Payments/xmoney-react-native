import { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentSheet } from '../PaymentSheet';
import type {
  PaymentConfig,
  PaymentIntent,
  PaymentResult,
  PaymentSheetEvent,
} from '../types';

export interface UsePaymentSheet {
  init: (configuration: PaymentConfig) => Promise<void>;
  present: (
    intent: PaymentIntent,
    onEvent?: (event: PaymentSheetEvent) => void
  ) => Promise<PaymentResult>;
  dismiss: () => void;
  loading: boolean;
}

/**
 * Native-shaped hook: `init` then `present`.
 * Unmount dismisses only if this instance still has a sheet in flight.
 */
export function usePaymentSheet(): UsePaymentSheet {
  const pending = useRef(0);
  const presentedByThisInstance = useRef(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (presentedByThisInstance.current) {
        presentedByThisInstance.current = false;
        PaymentSheet.dismiss();
      }
    };
  }, []);

  const track = useCallback(async <T,>(work: () => Promise<T>): Promise<T> => {
    pending.current += 1;
    setLoading(true);
    try {
      return await work();
    } finally {
      pending.current = Math.max(0, pending.current - 1);
      setLoading(pending.current > 0);
    }
  }, []);

  const init = useCallback(
    (configuration: PaymentConfig): Promise<void> => {
      return track(() => PaymentSheet.init(configuration));
    },
    [track]
  );

  const present = useCallback(
    (
      intent: PaymentIntent,
      onEvent?: (event: PaymentSheetEvent) => void
    ): Promise<PaymentResult> => {
      return track(async () => {
        presentedByThisInstance.current = true;
        try {
          return await PaymentSheet.present(intent, onEvent);
        } finally {
          presentedByThisInstance.current = false;
        }
      });
    },
    [track]
  );

  const dismiss = useCallback(() => {
    presentedByThisInstance.current = false;
    PaymentSheet.dismiss();
  }, []);

  return { init, present, dismiss, loading };
}
