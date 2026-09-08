import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView} from 'react-native';
import {
  PaymentElement,
  type PaymentElementRef,
  type PaymentIntent,
  type PaymentResult,
} from '@xmoney/react-native';
import {DemoCheckoutBackend} from '../backend/DemoCheckoutBackend';
import {
  bindFailureMessage,
  defaultPaymentConfig,
  formatMoney,
  isNativeBoundEvent,
  SAMPLE_AMOUNT_MINOR,
} from '../SampleHelpers';
import {secrets} from '../secrets';
import {useExampleTheme} from '../theme/ExampleTheme';
import {
  ExampleButton,
  ExampleLoader,
  ExampleResultPanel,
  ExampleStatusChip,
  MerchantReadyGate,
  SampleOrderCard,
  SampleScaffold,
} from '../ui/ExampleComponents';

export function MerchantPaySample({onBack}: {onBack: () => void}) {
  const {dark} = useExampleTheme();
  const elementRef = useRef<PaymentElementRef>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [canPay, setCanPay] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const configuration = useMemo(() => {
    const base = defaultPaymentConfig({dark});
    return {
      ...base,
      card: {
        ...base.card,
        savedCards: {enabled: true},
        submitButton: {visible: false},
      },
    };
  }, [dark]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    setReady(false);
    setProcessing(false);
    setCanPay(false);
    setConsumed(false);
    setIntent(null);
    try {
      setIntent(await DemoCheckoutBackend.createPaymentIntent());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  return (
    <SampleScaffold
      title="Merchant Pay button"
      subtitle="SDK form, your CTA. confirm() after Ready."
      onBack={onBack}
      showTestCards>
      <ScrollView contentContainerStyle={{gap: 16, paddingBottom: 32}}>
        <SampleOrderCard
          title={secrets.DESCRIPTION}
          amount={formatMoney(SAMPLE_AMOUNT_MINOR)}
        />
        {consumed && lastResult ? (
          <>
            <ExampleResultPanel result={lastResult} />
            <ExampleButton
              label="New payment"
              variant="secondary"
              onPress={() => void loadOrder()}
            />
          </>
        ) : loading && !intent ? (
          <ExampleLoader message="Preparing checkout…" />
        ) : intent ? (
          <>
            <MerchantReadyGate ready={ready} message="Preparing checkout…">
              <PaymentElement
                ref={elementRef}
                configuration={configuration}
                intent={intent}
                onEvent={(event) => {
                  if (isNativeBoundEvent(event)) {
                    setReady(true);
                  }
                  if (event.type === 'processing') {
                    setProcessing(event.isProcessing);
                  }
                  if (event.type === 'availability') {
                    setCanPay(event.isInteractionEnabled);
                    if (event.isOrderConsumed) {
                      setConsumed(true);
                    }
                  }
                }}
                onResult={(result) => {
                  const bindError = bindFailureMessage(result);
                  if (bindError) {
                    setError(bindError);
                    setReady(true);
                  }
                  setLastResult(result);
                  if (result.status !== 'canceled') {
                    setConsumed(true);
                  }
                }}
              />
            </MerchantReadyGate>
            {ready ? (
              <ExampleButton
                label="Pay"
                loading={processing}
                enabled={canPay}
                onPress={() => elementRef.current?.confirm()}
              />
            ) : null}
          </>
        ) : null}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
      </ScrollView>
    </SampleScaffold>
  );
}
