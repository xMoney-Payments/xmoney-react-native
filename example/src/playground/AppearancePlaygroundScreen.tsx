import {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {
  PaymentElement,
  type AppearanceColors,
  type AppearanceConfig,
  type PaymentElementRef,
  type PaymentIntent,
  type PaymentResult,
  type PrimaryButtonColors,
  type PrimaryButtonConfig,
} from '@xmoney/react-native';
import {DemoCheckoutBackend} from '../backend/DemoCheckoutBackend';
import {
  bindFailureMessage,
  exampleForcedStyle,
  isNativeBoundEvent,
} from '../SampleHelpers';
import {secrets} from '../secrets';
import {useExampleTheme} from '../theme/ExampleTheme';
import {
  ExampleButton,
  ExampleLoader,
  ExampleOptionRow,
  ExampleSection,
  ExampleStatusChip,
  ExampleStepperRow,
  ExampleSwitchRow,
  ExampleTopBar,
  MerchantReadyGate,
} from '../ui/ExampleComponents';
import {
  appearanceColorFields,
  appearancePresets,
  playgroundFontFamilyOptions,
  type AppearancePreset,
} from './PlaygroundModels';

function hexOf(value: string | undefined): string {
  return (value ?? '').replace('#', '').toUpperCase();
}

function withHash(value: string): string | undefined {
  const cleaned = value.replace('#', '').trim();
  return cleaned ? `#${cleaned}` : undefined;
}

function usesSplitColors(appearance: AppearanceConfig): boolean {
  return appearance.colorsLight != null || appearance.colorsDark != null;
}

function editingColors(
  appearance: AppearanceConfig,
  dark: boolean
): AppearanceColors {
  if (usesSplitColors(appearance)) {
    return dark
      ? (appearance.colorsDark ?? appearance.colors ?? {})
      : (appearance.colorsLight ?? appearance.colors ?? {});
  }
  return appearance.colors ?? {};
}

function setColor(
  appearance: AppearanceConfig,
  dark: boolean,
  key: keyof AppearanceColors,
  hex: string | undefined
): AppearanceConfig {
  if (usesSplitColors(appearance)) {
    if (dark) {
      return {
        ...appearance,
        colorsDark: {...(appearance.colorsDark ?? appearance.colors), [key]: hex},
      };
    }
    return {
      ...appearance,
      colorsLight: {...(appearance.colorsLight ?? appearance.colors), [key]: hex},
    };
  }
  return {
    ...appearance,
    colors: {...appearance.colors, [key]: hex},
  };
}

function usesSplitPayColors(button: PrimaryButtonConfig | undefined): boolean {
  return button?.colorsLight != null || button?.colorsDark != null;
}

function editingPayColors(
  button: PrimaryButtonConfig | undefined,
  dark: boolean
): PrimaryButtonColors {
  if (usesSplitPayColors(button)) {
    return dark
      ? (button?.colorsDark ?? button?.colors ?? {})
      : (button?.colorsLight ?? button?.colors ?? {});
  }
  return button?.colors ?? {};
}

function setPayColor(
  appearance: AppearanceConfig,
  dark: boolean,
  key: keyof PrimaryButtonColors,
  hex: string | undefined
): AppearanceConfig {
  const button = appearance.primaryButton ?? {};
  if (usesSplitPayColors(button)) {
    if (dark) {
      return {
        ...appearance,
        primaryButton: {
          ...button,
          colorsDark: {...(button.colorsDark ?? button.colors), [key]: hex},
        },
      };
    }
    return {
      ...appearance,
      primaryButton: {
        ...button,
        colorsLight: {...(button.colorsLight ?? button.colors), [key]: hex},
      },
    };
  }
  return {
    ...appearance,
    primaryButton: {
      ...button,
      colors: {...button.colors, [key]: hex},
    },
  };
}

export function AppearancePlaygroundScreen({
  appearance,
  fontFamily,
  onBack,
  onApply,
}: {
  appearance: AppearanceConfig;
  fontFamily: string;
  onBack: () => void;
  onApply: (appearance: AppearanceConfig, fontFamily: string) => void;
}) {
  const {colors, dark} = useExampleTheme();
  const [draft, setDraft] = useState<AppearanceConfig>(appearance);
  const [draftFont, setDraftFont] = useState(fontFamily);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<PaymentElementRef>(null);

  const palette = editingColors(draft, dark);
  const pay = draft.primaryButton ?? {};
  const payColors = editingPayColors(pay, dark);
  const shapes = draft.shapes ?? {};
  const fontScale = draft.font?.scale ?? 1;
  const payRadius = pay.shapes?.borderRadius ?? 16;
  const isPill = payRadius >= 100;

  const appearanceWithFont = useMemo<AppearanceConfig>(
    () =>
      draftFont
        ? {...draft, font: {...draft.font, family: draftFont}}
        : draft,
    [draft, draftFont]
  );

  const previewConfig = useMemo(
    () => ({
      publicKey: secrets.PUBLIC_KEY,
      paymentMethods: {
        applePay: {enabled: false},
        googlePay: {enabled: false},
      },
      card: {
        savedCards: {enabled: false},
      },
      options: {
        appearance: appearanceWithFont,
        style: exampleForcedStyle(dark),
      },
    }),
    [appearanceWithFont, dark]
  );

  useEffect(() => {
    DemoCheckoutBackend.createPaymentIntent()
      .then(setIntent)
      .catch(() => {
        setIntent(null);
      });
  }, []);

  useEffect(() => {
    elementRef.current?.updateAppearance(appearanceWithFont);
  }, [appearanceWithFont]);

  const applyPreset = (preset: AppearancePreset) => {
    setDraft(preset.appearance);
  };

  return (
    <View style={[styles.fill, {backgroundColor: colors.bg}]}>
      <ExampleTopBar
        title="Appearance"
        subtitle="Colors, shapes, and a live Embedded preview."
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ExampleSection title="Presets" caption="Start from a native playground look.">
          {appearancePresets.map((preset, index) => (
            <Pressable
              key={preset.id}
              onPress={() => applyPreset(preset)}
              style={[
                styles.presetRow,
                index < appearancePresets.length - 1
                  ? {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.hairline,
                    }
                  : null,
              ]}>
              <Text style={[styles.presetTitle, {color: colors.text}]}>
                {preset.label}
              </Text>
              <Text style={[styles.presetCaption, {color: colors.muted}]}>
                {preset.description}
              </Text>
            </Pressable>
          ))}
        </ExampleSection>

        <ExampleSection
          title="Colors"
          caption={
            usesSplitColors(draft)
              ? `Editing ${dark ? 'dark' : 'light'} tokens for this preset.`
              : 'Appearance.colors · 6-digit hex.'
          }>
          {appearanceColorFields.map((field, index) => (
            <HexField
              key={field.key}
              title={field.label}
              caption={field.caption}
              value={hexOf(palette[field.key])}
              onChange={(hex) =>
                setDraft((prev) => setColor(prev, dark, field.key, withHash(hex)))
              }
              showDivider={index < appearanceColorFields.length - 1}
            />
          ))}
        </ExampleSection>

        <ExampleSection title="Pay button" caption="Appearance.primaryButton">
          <HexField
            title="Background"
            caption="primaryButton.colors.background"
            value={hexOf(payColors.background)}
            onChange={(hex) =>
              setDraft((prev) => setPayColor(prev, dark, 'background', withHash(hex)))
            }
          />
          <HexField
            title="Text"
            caption="primaryButton.colors.text"
            value={hexOf(payColors.text)}
            onChange={(hex) =>
              setDraft((prev) => setPayColor(prev, dark, 'text', withHash(hex)))
            }
            showDivider
          />
          <ExampleSwitchRow
            title="Pill"
            subtitle="primaryButton.shapes.borderRadius 9999"
            value={isPill}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                primaryButton: {
                  ...prev.primaryButton,
                  shapes: {
                    ...prev.primaryButton?.shapes,
                    borderRadius: value ? 9999 : 16,
                  },
                },
              }))
            }
            showDivider
          />
          {isPill ? null : (
            <ExampleStepperRow
              title="Corner radius"
              caption="primaryButton.shapes.borderRadius"
              valueLabel={String(Math.round(payRadius))}
              onMinus={() =>
                setDraft((prev) => ({
                  ...prev,
                  primaryButton: {
                    ...prev.primaryButton,
                    shapes: {
                      ...prev.primaryButton?.shapes,
                      borderRadius: Math.max(
                        0,
                        (prev.primaryButton?.shapes?.borderRadius ?? 16) - 1
                      ),
                    },
                  },
                }))
              }
              onPlus={() =>
                setDraft((prev) => ({
                  ...prev,
                  primaryButton: {
                    ...prev.primaryButton,
                    shapes: {
                      ...prev.primaryButton?.shapes,
                      borderRadius: Math.min(
                        32,
                        (prev.primaryButton?.shapes?.borderRadius ?? 16) + 1
                      ),
                    },
                  },
                }))
              }
              minusEnabled={payRadius > 0}
              plusEnabled={payRadius < 32}
            />
          )}
        </ExampleSection>

        <ExampleSection title="Shapes" caption="Appearance.shapes">
          <ExampleStepperRow
            title="Border radius"
            caption="shapes.borderRadius — default 16 pt on fields"
            valueLabel={String(shapes.borderRadius ?? 16)}
            onMinus={() =>
              setDraft((prev) => ({
                ...prev,
                shapes: {
                  ...prev.shapes,
                  borderRadius: Math.max(0, (prev.shapes?.borderRadius ?? 16) - 1),
                },
              }))
            }
            onPlus={() =>
              setDraft((prev) => ({
                ...prev,
                shapes: {
                  ...prev.shapes,
                  borderRadius: Math.min(32, (prev.shapes?.borderRadius ?? 16) + 1),
                },
              }))
            }
            minusEnabled={(shapes.borderRadius ?? 16) > 0}
            plusEnabled={(shapes.borderRadius ?? 16) < 32}
          />
          <ExampleStepperRow
            title="Border width"
            caption="shapes.borderWidth"
            valueLabel={String(shapes.borderWidth ?? 1)}
            onMinus={() =>
              setDraft((prev) => ({
                ...prev,
                shapes: {
                  ...prev.shapes,
                  borderWidth: Math.max(
                    0,
                    Number(((prev.shapes?.borderWidth ?? 1) - 0.5).toFixed(1))
                  ),
                },
              }))
            }
            onPlus={() =>
              setDraft((prev) => ({
                ...prev,
                shapes: {
                  ...prev.shapes,
                  borderWidth: Math.min(
                    3,
                    Number(((prev.shapes?.borderWidth ?? 1) + 0.5).toFixed(1))
                  ),
                },
              }))
            }
            minusEnabled={(shapes.borderWidth ?? 1) > 0}
            plusEnabled={(shapes.borderWidth ?? 1) < 3}
          />
        </ExampleSection>

        <ExampleSection title="Typography" caption="Appearance.font">
          <ExampleOptionRow
            title="Font family"
            caption="Empty uses the SDK default"
            options={playgroundFontFamilyOptions}
            value={
              playgroundFontFamilyOptions.find(
                (option) => option.value === draftFont
              ) ?? playgroundFontFamilyOptions[0]!
            }
            onChange={(option) => setDraftFont(option.value)}
          />
          <ExampleStepperRow
            title="Scale"
            caption="font.scale"
            valueLabel={`${fontScale.toFixed(1)}×`}
            onMinus={() =>
              setDraft((prev) => ({
                ...prev,
                font: {
                  ...prev.font,
                  scale: Math.max(
                    0.8,
                    Number(((prev.font?.scale ?? 1) - 0.1).toFixed(1))
                  ),
                },
              }))
            }
            onPlus={() =>
              setDraft((prev) => ({
                ...prev,
                font: {
                  ...prev.font,
                  scale: Math.min(
                    1.4,
                    Number(((prev.font?.scale ?? 1) + 0.1).toFixed(1))
                  ),
                },
              }))
            }
            minusEnabled={fontScale > 0.8}
            plusEnabled={fontScale < 1.4}
          />
        </ExampleSection>

        <ExampleSection title="Live preview" caption="Embedded Payment Element.">
          <View style={styles.previewPad}>
            {!intent ? (
              <ExampleLoader message="Preparing preview…" />
            ) : (
              <MerchantReadyGate ready={ready} message="Preparing preview…">
                <PaymentElement
                  ref={elementRef}
                  configuration={previewConfig}
                  intent={intent}
                  onEvent={(event) => {
                    if (isNativeBoundEvent(event)) {
                      setReady(true);
                    }
                  }}
                  onResult={(result: PaymentResult) => {
                    const bindError = bindFailureMessage(result);
                    if (bindError) {
                      setError(bindError);
                      setReady(true);
                    }
                  }}
                />
              </MerchantReadyGate>
            )}
          </View>
        </ExampleSection>
        {error ? <ExampleStatusChip text={error} kind="error" /> : null}

        <ExampleButton
          label="Reset to Default"
          variant="secondary"
          onPress={() => {
            setDraft({});
            setDraftFont('');
          }}
        />
        <ExampleButton
          label="Apply to checkout"
          onPress={() => onApply(draft, draftFont)}
        />
      </ScrollView>
    </View>
  );
}

function HexField({
  title,
  caption,
  value,
  onChange,
  showDivider,
}: {
  title: string;
  caption: string;
  value: string;
  onChange: (hex: string) => void;
  showDivider?: boolean;
}) {
  const {colors} = useExampleTheme();
  return (
    <View
      style={[
        styles.hexRow,
        showDivider
          ? {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.hairline,
            }
          : null,
      ]}>
      <View style={styles.hexCopy}>
        <Text style={[styles.hexTitle, {color: colors.text}]}>{title}</Text>
        <Text style={[styles.hexCaption, {color: colors.muted}]}>{caption}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={(text) =>
          onChange(text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 8))
        }
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="RRGGBB"
        placeholderTextColor={colors.muted}
        style={[
          styles.hexInput,
          {
            color: colors.text,
            borderColor: colors.hairline,
            backgroundColor: colors.elevated,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  scroll: {paddingHorizontal: 20, paddingBottom: 40, gap: 16},
  presetRow: {paddingHorizontal: 20, paddingVertical: 12, gap: 2},
  presetTitle: {fontSize: 16, fontWeight: '600'},
  presetCaption: {fontSize: 13, lineHeight: 18},
  previewPad: {padding: 12},
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hexCopy: {flex: 1, gap: 2},
  hexTitle: {fontSize: 16, fontWeight: '600'},
  hexCaption: {fontSize: 12},
  hexInput: {
    width: 108,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
