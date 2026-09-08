import {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView} from 'react-native';
import {
  PaymentElement,
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

export function PaymentElementSample({onBack}: {onBack: () => void}) {
  const {dark} = useExampleTheme();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const configuration = useMemo(() => defaultPaymentConfig({dark}), [dark]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    setReady(false);
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
      title="Embedded Element"
      subtitle="Payment form lives in your layout."
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
          <MerchantReadyGate ready={ready} message="Preparing checkout…">
            <PaymentElement
              configuration={configuration}
              intent={intent}
              onEvent={(event) => {
                if (isNativeBoundEvent(event)) {
                  setReady(true);
                }
                if (event.type === 'availability' && event.isOrderConsumed) {
                  setConsumed(true);
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
        ) : null}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
      </ScrollView>
    </SampleScaffold>
  );
}
