import {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, ScrollView} from 'react-native';
import {
  ApplePayButton,
  GooglePayButton,
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

export function WalletPaySample({
  onBack,
  onPayWithCard,
}: {
  onBack: () => void;
  onPayWithCard: () => void;
}) {
  const {dark} = useExampleTheme();
  const ios = Platform.OS === 'ios';
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(true);
  const [consumed, setConsumed] = useState(false);
  const configuration = useMemo(
    () =>
      defaultPaymentConfig({
        dark,
        savedCardsEnabled: false,
      }),
    [dark]
  );
  const Button = ios ? ApplePayButton : GooglePayButton;
  const preparing = ios ? 'Preparing Apple Pay…' : 'Preparing Google Pay…';

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
      title={ios ? 'Apple Pay' : 'Google Pay'}
      subtitle="Standalone wallet button in your screen."
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
          <ExampleLoader message={preparing} />
        ) : intent ? (
          <>
            <MerchantReadyGate
              ready={ready}
              message={preparing}
              minHeight={48}>
              <Button
                configuration={configuration}
                intent={intent}
                style={{height: 48}}
                onEvent={(event) => {
                  if (isNativeBoundEvent(event)) {
                    setReady(true);
                  }
                  if (event.type === 'availability') {
                    setAvailable(event.isAvailable && event.isReady);
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
            {lastResult?.status === 'canceled' && !consumed ? (
              <ExampleStatusChip
                text={
                  ios
                    ? 'You closed Apple Pay before finishing.'
                    : 'You closed Google Pay before finishing.'
                }
              />
            ) : null}
            {ready && !available ? (
              <>
                <ExampleStatusChip
                  text={
                    ios
                      ? 'Apple Pay isn’t available on this device.'
                      : 'Google Pay isn’t available on this device.'
                  }
                />
                <ExampleButton
                  label="Pay with card"
                  variant="secondary"
                  onPress={onPayWithCard}
                />
              </>
            ) : null}
          </>
        ) : null}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
      </ScrollView>
    </SampleScaffold>
  );
}
