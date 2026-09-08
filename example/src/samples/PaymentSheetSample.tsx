import {useCallback, useMemo, useState} from 'react';
import {ScrollView} from 'react-native';
import {usePaymentSheet, type PaymentIntent, type PaymentResult} from '@xmoney/react-native';
import {DemoCheckoutBackend} from '../backend/DemoCheckoutBackend';
import {
  defaultPaymentConfig,
  formatMoney,
  orderConsumed,
  SAMPLE_AMOUNT_MINOR,
} from '../SampleHelpers';
import {secrets} from '../secrets';
import {useExampleTheme} from '../theme/ExampleTheme';
import {
  ExampleButton,
  ExampleResultPanel,
  ExampleStatusChip,
  SampleOrderCard,
  SampleScaffold,
} from '../ui/ExampleComponents';

export function PaymentSheetSample({onBack}: {onBack: () => void}) {
  const {dark} = useExampleTheme();
  const sheet = usePaymentSheet();
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [heldIntent, setHeldIntent] = useState<PaymentIntent | null>(null);
  const [consumed, setConsumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configuration = useMemo(() => defaultPaymentConfig({dark}), [dark]);

  const present = useCallback(
    async (intent: PaymentIntent) => {
      let processed = false;
      setHeldIntent(intent);
      await sheet.init(configuration);
      const result = await sheet.present(intent, (event) => {
        if (event.type === 'ready') {
          setLoading(false);
        }
        if (event.type === 'processing' && event.isProcessing) {
          processed = true;
        }
      });
      setLastResult(result);
      setLoading(false);
      const reallyConsumed = orderConsumed(result, processed);
      setConsumed(reallyConsumed);
      if (reallyConsumed) {
        setHeldIntent(null);
      }
    },
    [configuration, sheet]
  );

  const onPay = async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const intent = heldIntent ?? (await DemoCheckoutBackend.createPaymentIntent());
      await present(intent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
      setLoading(false);
    }
  };

  return (
    <SampleScaffold
      title="Payment Sheet"
      subtitle="SDK owns the full checkout UI."
      onBack={onBack}
      showTestCards>
      <ScrollView contentContainerStyle={{gap: 16, paddingBottom: 32}}>
        {!consumed ? (
          <>
            <SampleOrderCard
              title={secrets.DESCRIPTION}
              amount={formatMoney(SAMPLE_AMOUNT_MINOR)}
            />
            <ExampleButton
              label={lastResult?.status === 'canceled' ? 'Continue' : 'Pay'}
              loading={loading}
              onPress={onPay}
            />
            {lastResult?.status === 'canceled' ? (
              <ExampleStatusChip text="You closed checkout before finishing." />
            ) : null}
          </>
        ) : null}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
        {consumed && lastResult ? (
          <>
            <ExampleResultPanel result={lastResult} />
            <ExampleButton
              label="New payment"
              variant="secondary"
              onPress={() => {
                setLastResult(null);
                setHeldIntent(null);
                setConsumed(false);
              }}
            />
          </>
        ) : null}
      </ScrollView>
    </SampleScaffold>
  );
}
