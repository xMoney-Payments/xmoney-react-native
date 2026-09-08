import {useCallback, useMemo, useState} from 'react';
import {ScrollView, Text} from 'react-native';
import {
  usePaymentSheet,
  type PaymentIntent,
  type PaymentResult,
} from '@xmoney/react-native';
import {DemoCheckoutBackend} from '../backend/DemoCheckoutBackend';
import {defaultPaymentConfig, orderConsumed} from '../SampleHelpers';
import {useExampleTheme} from '../theme/ExampleTheme';
import {
  ExampleButton,
  ExampleCard,
  ExampleResultPanel,
  ExampleStatusChip,
  SampleScaffold,
} from '../ui/ExampleComponents';

export function CardHolderVerificationSample({onBack}: {onBack: () => void}) {
  const {dark, colors} = useExampleTheme();
  const sheet = usePaymentSheet();
  const [lastMatch, setLastMatch] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [heldIntent, setHeldIntent] = useState<PaymentIntent | null>(null);
  const [consumed, setConsumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configuration = useMemo(
    () => ({
      ...defaultPaymentConfig({dark}),
      card: {
        savedCards: {enabled: true},
        cardHolderVerification: {
          name: {firstName: 'John', lastName: 'Doe'},
          onCardHolderVerification: (result: {status: string}) => {
            setLastMatch(result.status);
            return result.status === 'Matched';
          },
        },
      },
    }),
    [dark]
  );

  const onPay = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    setLastMatch(null);
    try {
      const intent =
        heldIntent ?? (await DemoCheckoutBackend.createPaymentIntent());
      setHeldIntent(intent);
      await sheet.init(configuration);
      const result = await sheet.present(intent, (event) => {
        if (event.type === 'ready') {
          setLoading(false);
        }
      });
      setLastResult(result);
      setLoading(false);
      const reallyConsumed = orderConsumed(result, result.status !== 'canceled');
      setConsumed(reallyConsumed);
      if (reallyConsumed) {
        setHeldIntent(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
      setLoading(false);
    }
  }, [configuration, heldIntent, sheet]);

  return (
    <SampleScaffold
      title="Name check"
      subtitle="Pays only when the cardholder name matches John Doe."
      onBack={onBack}
      showTestCards
      nameCheckHint>
      <ScrollView contentContainerStyle={{gap: 16, paddingBottom: 32}}>
        <ExampleCard>
          <Text style={{color: colors.muted, fontSize: 12, fontWeight: '700'}}>
            Expected name
          </Text>
          <Text style={{color: colors.text, fontSize: 22, fontWeight: '700'}}>
            John Doe
          </Text>
          <Text style={{color: colors.muted}}>
            Use a test card whose account-validation result matches that name,
            or the SDK will block pay.
          </Text>
        </ExampleCard>
        {!consumed ? (
          <>
            <ExampleButton
              label={lastResult?.status === 'canceled' ? 'Continue' : 'Pay'}
              loading={loading}
              onPress={() => void onPay()}
            />
            {lastResult?.status === 'canceled' ? (
              <ExampleStatusChip text="You closed checkout before finishing." />
            ) : null}
          </>
        ) : null}
        {lastMatch ? (
          <ExampleStatusChip text={`Verification: ${lastMatch}`} />
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
                setLastMatch(null);
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
