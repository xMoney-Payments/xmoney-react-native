import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApplePayButton,
  GooglePayButton,
  PaymentElement,
  usePaymentSheet,
  type AppearanceConfig,
  type ApplePayAppearance,
  type GooglePayAppearance,
  type PaymentConfig,
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
  exampleForcedStyle,
  formatMoney,
  isNativeBoundEvent,
  orderConsumed,
} from '../SampleHelpers';
import {secrets} from '../secrets';
import {useExampleTheme} from '../theme/ExampleTheme';
import {
  ExampleButton,
  ExampleLoader,
  ExampleOptionRow,
  ExampleResultPanel,
  ExampleSection,
  ExampleSegmentedRow,
  ExampleStatusChip,
  ExampleStepperRow,
  ExampleSwitchRow,
  ExampleTopBar,
  MerchantReadyGate,
} from '../ui/ExampleComponents';
import {IconMinus, IconPlus} from '../ui/ExampleIcons';
import {AppearancePlaygroundScreen} from './AppearancePlaygroundScreen';
import {
  appearancePresets,
  playgroundButtonTypeOptions,
  playgroundGroupingOptions,
  playgroundLocaleOptions,
  playgroundStyleOptions,
  playgroundValidationOptions,
  playgroundWalletColorOptions,
  playgroundWalletTypeOptions,
  type IntegrationMode,
} from './PlaygroundModels';

const AMOUNT_STEP = 500;
const AMOUNT_MIN = 500;

export function PlaygroundScreen({onBack}: {onBack: () => void}) {
  const [screen, setScreen] = useState<'checkout' | 'appearance'>('checkout');
  const [appearance, setAppearance] = useState<AppearanceConfig>(
    () => appearancePresets[0]!.appearance
  );
  const [fontFamily, setFontFamily] = useState('');

  if (screen === 'appearance') {
    return (
      <AppearancePlaygroundScreen
        appearance={appearance}
        fontFamily={fontFamily}
        onBack={() => setScreen('checkout')}
        onApply={(next, nextFont) => {
          setAppearance(next);
          setFontFamily(nextFont);
          setScreen('checkout');
        }}
      />
    );
  }

  return (
    <PlaygroundCheckout
      appearance={appearance}
      fontFamily={fontFamily}
      onBack={onBack}
      onOpenAppearance={() => setScreen('appearance')}
    />
  );
}

function PlaygroundCheckout({
  appearance,
  fontFamily,
  onBack,
  onOpenAppearance,
}: {
  appearance: AppearanceConfig;
  fontFamily: string;
  onBack: () => void;
  onOpenAppearance: () => void;
}) {
  const {colors, dark} = useExampleTheme();
  const sheet = usePaymentSheet();
  const elementRef = useRef<PaymentElementRef>(null);
  const [locale, setLocale] = useState(playgroundLocaleOptions[0]!);
  const [style, setStyle] = useState(playgroundStyleOptions[0]!);
  const [buttonType, setButtonType] = useState(playgroundButtonTypeOptions[0]!);
  const [validation, setValidation] = useState(playgroundValidationOptions[0]!);
  const [grouping, setGrouping] = useState(playgroundGroupingOptions[0]!);
  const [submitVisible, setSubmitVisible] = useState(true);
  const [walletEnabled, setWalletEnabled] = useState(true);
  const [savedCards, setSavedCards] = useState(true);
  const [optInVisible, setOptInVisible] = useState(true);
  const [nameCheck, setNameCheck] = useState(false);
  const [walletColor, setWalletColor] = useState(
    playgroundWalletColorOptions[0]!
  );
  const [walletType, setWalletType] = useState(playgroundWalletTypeOptions[0]!);
  const [walletRadius, setWalletRadius] = useState(28);
  const [mode, setMode] = useState<IntegrationMode>('sheet');
  const [amountMinor, setAmountMinor] = useState(SAMPLE_AMOUNT_MINOR);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const [didProcess, setDidProcess] = useState(false);
  const [session, setSession] = useState(0);

  const resolvedStyle =
    style.value === 'automatic' ? exampleForcedStyle(dark) : style.value;

  const appearanceWithFont = useMemo<AppearanceConfig>(() => {
    if (!fontFamily) {
      return appearance;
    }
    return {
      ...appearance,
      font: {...appearance.font, family: fontFamily},
    };
  }, [appearance, fontFamily]);

  const applePayAppearance: ApplePayAppearance = useMemo(
    () => ({
      color: walletColor.value === 'auto' ? undefined : walletColor.value,
      type: walletType.value,
      radius: walletRadius,
    }),
    [walletColor.value, walletType.value, walletRadius]
  );

  const googlePayAppearance: GooglePayAppearance = useMemo(
    () => ({
      color:
        walletColor.value === 'black' || walletColor.value === 'white'
          ? walletColor.value
          : walletColor.value === 'white-outline'
            ? 'white'
            : undefined,
      type: walletType.value,
      radius: walletRadius,
    }),
    [walletColor.value, walletType.value, walletRadius]
  );

  const configuration: PaymentConfig = useMemo(
    () => ({
      publicKey: secrets.PUBLIC_KEY,
      paymentMethods: {
        applePay: {
          enabled: walletEnabled,
          appearance: applePayAppearance,
        },
        googlePay: {
          enabled: walletEnabled,
          appearance: googlePayAppearance,
        },
      },
      card: {
        savedCards: {enabled: savedCards, optInVisible},
        cardHolderVerification: nameCheck
          ? {
              name: {firstName: 'John', lastName: 'Doe'},
              onCardHolderVerification: (result) => result.status === 'Matched',
            }
          : undefined,
        inputs: {grouping: grouping.value},
        validationMode: validation.value,
        submitButton: {visible: submitVisible, type: buttonType.value},
      },
      options: {
        locale: locale.value,
        style: resolvedStyle,
        appearance: appearanceWithFont,
      },
    }),
    [
      appearanceWithFont,
      applePayAppearance,
      buttonType.value,
      googlePayAppearance,
      grouping.value,
      locale.value,
      nameCheck,
      optInVisible,
      resolvedStyle,
      savedCards,
      submitVisible,
      validation.value,
      walletEnabled,
    ]
  );

  const structuralKey = [
    walletEnabled,
    savedCards,
    optInVisible,
    grouping.value,
    nameCheck,
    buttonType.value,
    validation.value,
    submitVisible,
  ].join('|');

  const resetInline = useCallback(() => {
    setLastResult(null);
    setConsumed(false);
    setReady(false);
    setDidProcess(false);
    setError(null);
    setIntent(null);
  }, []);

  useEffect(() => {
    if (mode === 'sheet') {
      return;
    }
    let cancelled = false;
    resetInline();
    (async () => {
      try {
        const next = await DemoCheckoutBackend.createPaymentIntent({
          amountMinor,
        });
        if (!cancelled) {
          setIntent(next);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not create order');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // amountMinor is applied in-place below so the Element is not remounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, structuralKey, session]);

  useEffect(() => {
    if (mode === 'sheet' || !intent || consumed) {
      return;
    }
    const handle = setTimeout(() => {
      (async () => {
        try {
          const next = await DemoCheckoutBackend.createPaymentIntent({
            amountMinor,
          });
          if (elementRef.current) {
            await elementRef.current.updateOrder(next);
          }
          setIntent(next);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not create order');
        }
      })();
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountMinor]);

  useEffect(() => {
    elementRef.current?.updateAppearance(appearanceWithFont);
  }, [appearanceWithFont]);

  useEffect(() => {
    elementRef.current?.updateLocale(locale.value);
  }, [locale.value]);

  const onPresentSheet = async () => {
    setLoading(true);
    setError(null);
    setDidProcess(false);
    try {
      const next =
        intent ??
        (await DemoCheckoutBackend.createPaymentIntent({amountMinor}));
      setIntent(next);
      await sheet.init(configuration);
      let processed = false;
      const result = await sheet.present(next, (event) => {
        if (event.type === 'ready') {
          setLoading(false);
        }
        if (event.type === 'processing' && event.isProcessing) {
          processed = true;
          setDidProcess(true);
        }
      });
      setLastResult(result);
      setLoading(false);
      const reallyConsumed = orderConsumed(result, processed);
      setConsumed(reallyConsumed);
      if (reallyConsumed) {
        setIntent(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
      setLoading(false);
    }
  };

  const walletLabel = Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';
  const sheetConsumed =
    lastResult != null && orderConsumed(lastResult, didProcess);
  const showResult =
    (mode === 'sheet' && sheetConsumed) || (mode !== 'sheet' && consumed);
  const preparingMessage =
    mode === 'wallet' ? `Preparing ${walletLabel}…` : 'Preparing checkout…';

  const onInlineEvent = (event: {
    type: string;
    isOrderConsumed?: boolean;
  }) => {
    if (isNativeBoundEvent(event)) {
      setReady(true);
    }
    if (event.type === 'availability' && event.isOrderConsumed) {
      setConsumed(true);
    }
  };

  const onInlineResult = (result: PaymentResult) => {
    const bindError = bindFailureMessage(result);
    if (bindError) {
      setError(bindError);
      setReady(true);
    }
    setLastResult(result);
    if (result.status !== 'canceled') {
      setConsumed(true);
    }
  };

  return (
    <View style={[styles.fill, {backgroundColor: colors.bg}]}>
      <ExampleTopBar
        title="Playground"
        subtitle="Toggle every option — SDK development."
        onBack={onBack}
        actions={
          <Pressable onPress={onOpenAppearance} hitSlop={8}>
            <Text style={[styles.appearanceAction, {color: colors.accent}]}>
              Appearance
            </Text>
          </Pressable>
        }
      />
      <View style={styles.segmentPad}>
        <ExampleSegmentedRow
          options={[
            {label: 'Sheet', value: 'sheet'},
            {label: walletLabel, value: 'wallet'},
            {label: 'Embedded', value: 'embedded'},
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ExampleSection title="Order" caption="Demo order · live API">
          <View style={styles.padded}>
            <Text style={[styles.orderTitle, {color: colors.text}]}>
              {secrets.DESCRIPTION || 'Checkout item'}
            </Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amount, {color: colors.text}]}>
                {formatMoney(amountMinor)}
              </Text>
              <View style={[styles.amountStepper, {borderColor: colors.hairline}]}>
                <Pressable
                  onPress={() =>
                    setAmountMinor((value) =>
                      Math.max(AMOUNT_MIN, value - AMOUNT_STEP)
                    )
                  }
                  disabled={consumed || amountMinor <= AMOUNT_MIN}
                  style={[
                    styles.amountStep,
                    consumed || amountMinor <= AMOUNT_MIN
                      ? styles.stepDisabled
                      : null,
                  ]}>
                  <IconMinus color={colors.text} size={16} />
                </Pressable>
                <Text style={[styles.stepHint, {color: colors.muted}]}>
                  {formatMoney(AMOUNT_STEP)}
                </Text>
                <Pressable
                  onPress={() => setAmountMinor((value) => value + AMOUNT_STEP)}
                  disabled={consumed}
                  style={[
                    styles.amountStep,
                    consumed ? styles.stepDisabled : null,
                  ]}>
                  <IconPlus color={colors.text} size={16} />
                </Pressable>
              </View>
            </View>
          </View>
        </ExampleSection>

        <ExampleSection
          title="Options"
          caption="Locale and UI style for the payment form.">
          <ExampleOptionRow
            title="Language"
            caption={`options.locale · ${locale.value}`}
            options={playgroundLocaleOptions}
            value={locale}
            onChange={setLocale}
          />
          <ExampleOptionRow
            title="Style"
            caption="Auto follows the example theme toggle."
            options={playgroundStyleOptions}
            value={style}
            onChange={setStyle}
            showDivider
          />
        </ExampleSection>

        <ExampleSection
          title="Card"
          caption="Card form layout, validation, Pay button, and saved cards.">
          <ExampleOptionRow
            title="Inputs"
            caption="card.inputs.grouping"
            options={playgroundGroupingOptions}
            value={grouping}
            onChange={setGrouping}
          />
          <ExampleOptionRow
            title="Validation"
            caption="card.validationMode"
            options={playgroundValidationOptions}
            value={validation}
            onChange={setValidation}
            showDivider
          />
          <ExampleOptionRow
            title="Submit button"
            caption="card.submitButton.type"
            options={playgroundButtonTypeOptions}
            value={buttonType}
            onChange={setButtonType}
            showDivider
          />
          <ExampleSwitchRow
            title="Show Pay button"
            subtitle={
              mode === 'embedded'
                ? 'card.submitButton.visible · Embedded only.'
                : 'Sheet always shows the SDK Pay button.'
            }
            value={mode === 'embedded' ? submitVisible : true}
            onChange={setSubmitVisible}
            enabled={mode === 'embedded'}
            showDivider
          />
          <ExampleSwitchRow
            title="Saved cards"
            subtitle="card.savedCards.enabled · load and offer stored cards"
            value={savedCards}
            onChange={setSavedCards}
            showDivider
          />
          <ExampleSwitchRow
            title="Save card opt-in"
            subtitle="card.savedCards.optInVisible · checkbox to save a new card"
            value={optInVisible}
            onChange={setOptInVisible}
            enabled={savedCards}
            showDivider
          />
          <ExampleSwitchRow
            title="Name check"
            subtitle="John Doe must match"
            value={nameCheck}
            onChange={setNameCheck}
            showDivider
          />
        </ExampleSection>

        <ExampleSection
          title="Wallet"
          caption={`${walletLabel} button appearance.`}>
          <ExampleSwitchRow
            title={walletLabel}
            subtitle="Wallet in Sheet / Element / standalone"
            value={walletEnabled}
            onChange={setWalletEnabled}
          />
          <ExampleOptionRow
            title="Wallet color"
            options={playgroundWalletColorOptions}
            value={walletColor}
            onChange={setWalletColor}
            showDivider
          />
          <ExampleOptionRow
            title="Wallet type"
            options={playgroundWalletTypeOptions}
            value={walletType}
            onChange={setWalletType}
            showDivider
          />
          <ExampleStepperRow
            title="Wallet radius"
            caption={`${walletRadius} pt`}
            valueLabel={String(walletRadius)}
            onMinus={() => setWalletRadius((value) => Math.max(0, value - 1))}
            onPlus={() => setWalletRadius((value) => Math.min(28, value + 1))}
            minusEnabled={walletRadius > 0}
            plusEnabled={walletRadius < 28}
          />
        </ExampleSection>

        {showResult && lastResult ? (
          <>
            <ExampleResultPanel result={lastResult} />
            <ExampleButton
              label="New payment"
              variant="secondary"
              onPress={() => {
                resetInline();
                setSession((value) => value + 1);
              }}
            />
          </>
        ) : mode === 'sheet' ? (
          <ExampleButton
            label={
              lastResult?.status === 'canceled' && !sheetConsumed
                ? 'Continue'
                : 'Pay'
            }
            loading={loading}
            onPress={() => {
              onPresentSheet().catch(() => undefined);
            }}
          />
        ) : !intent ? (
          <ExampleLoader message={preparingMessage} />
        ) : mode === 'wallet' ? (
          <MerchantReadyGate
            key={`${mode}|${structuralKey}|${session}`}
            ready={ready}
            message={preparingMessage}
            minHeight={48}>
            {Platform.OS === 'ios' ? (
              <ApplePayButton
                configuration={configuration}
                intent={intent}
                appearance={applePayAppearance}
                style={styles.walletButton}
                onEvent={onInlineEvent}
                onResult={onInlineResult}
              />
            ) : (
              <GooglePayButton
                configuration={configuration}
                intent={intent}
                appearance={googlePayAppearance}
                style={styles.walletButton}
                onEvent={onInlineEvent}
                onResult={onInlineResult}
              />
            )}
          </MerchantReadyGate>
        ) : (
          <MerchantReadyGate
            key={`${mode}|${structuralKey}|${session}`}
            ready={ready}
            message={preparingMessage}>
            <PaymentElement
              ref={elementRef}
              configuration={configuration}
              intent={intent}
              onEvent={onInlineEvent}
              onResult={onInlineResult}
            />
          </MerchantReadyGate>
        )}
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}
        {mode === 'wallet' && Platform.OS === 'ios' ? (
          <ExampleStatusChip text="Apple Pay needs a physical device." />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  segmentPad: {paddingHorizontal: 20, paddingBottom: 8},
  scroll: {paddingHorizontal: 20, paddingBottom: 40, gap: 16},
  appearanceAction: {fontSize: 16, fontWeight: '600', paddingHorizontal: 8},
  padded: {paddingHorizontal: 20, paddingBottom: 16, gap: 8},
  orderTitle: {fontSize: 18, fontWeight: '600'},
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  amount: {fontSize: 24, fontWeight: '700', flex: 1},
  amountStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  amountStep: {paddingHorizontal: 10, paddingVertical: 8},
  stepDisabled: {opacity: 0.35},
  stepHint: {fontSize: 13, fontWeight: '600', minWidth: 44, textAlign: 'center'},
  walletButton: {height: 48},
});
