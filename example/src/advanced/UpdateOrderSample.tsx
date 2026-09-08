import {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {
  PaymentElement,
  type PaymentElementRef,
  type PaymentIntent,
  type PaymentResult,
} from '@xmoney/react-native';
import {
  DemoCheckoutBackend,
  SAMPLE_AMOUNT_MINOR,
} from '../backend/DemoCheckoutBackend';
import {
  bindFailureMessage,
  defaultPaymentConfig,
  formatMoney,
  isNativeBoundEvent,
} from '../SampleHelpers';
import {secrets} from '../secrets';
import {useExampleTheme} from '../theme/ExampleTheme';
import {ExampleRadii} from '../theme/ExampleColors';
import {
  ExampleButton,
  ExampleCard,
  ExampleLoader,
  ExampleResultPanel,
  ExampleStatusChip,
  MerchantReadyGate,
  SampleScaffold,
} from '../ui/ExampleComponents';
import {IconMinus, IconPlus} from '../ui/ExampleIcons';

const STEP = 500;
const MIN = 500;

export function UpdateOrderSample({onBack}: {onBack: () => void}) {
  const {dark, colors} = useExampleTheme();
  const elementRef = useRef<PaymentElementRef>(null);
  const [amountMinor, setAmountMinor] = useState(SAMPLE_AMOUNT_MINOR);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [canPay, setCanPay] = useState(true);
  const [consumed, setConsumed] = useState(false);
  const configuration = useMemo(() => defaultPaymentConfig({dark}), [dark]);

  useEffect(() => {
    if (consumed) {
      return;
    }
    let cancelled = false;
    const initial = intent == null;
    const handle = setTimeout(
      () => {
        void (async () => {
          if (initial) {
            setLoading(true);
          }
          setError(null);
          try {
            const next = await DemoCheckoutBackend.createPaymentIntent({
              amountMinor,
            });
            if (cancelled) {
              return;
            }
            if (elementRef.current && intent) {
              await elementRef.current.updateOrder(next);
            }
            setIntent(next);
          } catch (e) {
            if (!cancelled) {
              setError(e instanceof Error ? e.message : 'Could not create order');
            }
          } finally {
            if (initial && !cancelled) {
              setLoading(false);
            }
          }
        })();
      },
      initial ? 0 : 300
    );
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // Re-run when amount changes; intent identity is handled inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountMinor, consumed]);

  return (
    <SampleScaffold
      title="Update order"
      subtitle="updateOrder() a new PaymentIntent — Pay locked until Ready."
      onBack={onBack}
      showTestCards>
      <ScrollView contentContainerStyle={{gap: 16, paddingBottom: 32}}>
        <ExampleCard>
          <Text style={[styles.kicker, {color: colors.muted}]}>ORDER</Text>
          <Text style={[styles.title, {color: colors.text}]}>
            {secrets.DESCRIPTION}
          </Text>
          <View style={styles.row}>
            <Text style={[styles.amount, {color: colors.text}]}>
              {formatMoney(amountMinor)}
            </Text>
            <View
              style={[
                styles.stepper,
                {borderColor: colors.hairline},
              ]}>
              <Pressable
                onPress={() =>
                  setAmountMinor((value) => Math.max(MIN, value - STEP))
                }
                disabled={consumed || !canPay || amountMinor <= MIN}
                accessibilityLabel="Decrease amount"
                style={styles.step}>
                <IconMinus color={colors.text} size={16} />
              </Pressable>
              <Text style={{color: colors.text, fontWeight: '600'}}>
                {formatMoney(STEP)}
              </Text>
              <Pressable
                onPress={() => setAmountMinor((value) => value + STEP)}
                disabled={consumed || !canPay}
                accessibilityLabel="Increase amount"
                style={styles.step}>
                <IconPlus color={colors.text} size={16} />
              </Pressable>
            </View>
          </View>
        </ExampleCard>
        {consumed && lastResult ? (
          <>
            <ExampleResultPanel result={lastResult} />
            <ExampleButton
              label="New payment"
              variant="secondary"
              onPress={() => {
                setLastResult(null);
                setIntent(null);
                setReady(false);
                setConsumed(false);
                setAmountMinor(SAMPLE_AMOUNT_MINOR);
              }}
            />
          </>
        ) : loading && !intent ? (
          <ExampleLoader message="Preparing checkout…" />
        ) : intent ? (
          <MerchantReadyGate ready={ready} message="Preparing checkout…">
            <PaymentElement
              ref={elementRef}
              configuration={configuration}
              intent={intent}
              onEvent={(event) => {
                if (isNativeBoundEvent(event)) {
                  setReady(true);
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
        ) : null}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
      </ScrollView>
    </SampleScaffold>
  );
}

const styles = StyleSheet.create({
  kicker: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8},
  title: {fontSize: 20, fontWeight: '700'},
  amount: {fontSize: 28, fontWeight: '700'},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: ExampleRadii.pill,
    overflow: 'hidden',
  },
  step: {paddingHorizontal: 12, paddingVertical: 8},
});
