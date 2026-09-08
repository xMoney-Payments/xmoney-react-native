import {useEffect, useState, type ReactNode} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type {PaymentResult} from '@xmoney/react-native';
import {useExampleTheme} from '../theme/ExampleTheme';
import {ExampleColors, ExampleRadii} from '../theme/ExampleColors';
import {TestCardsAction} from './TestCards';
import {
  ExampleWordmark,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconMinus,
  IconMoon,
  IconPlus,
  IconSun,
} from './ExampleIcons';

export function ExampleCard({
  children,
  padding = 20,
}: {
  children: ReactNode;
  padding?: number;
}) {
  const {colors} = useExampleTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.hairline,
          padding,
        },
      ]}>
      {children}
    </View>
  );
}

export function ExampleButton({
  label,
  onPress,
  loading = false,
  enabled = true,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  enabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const {colors} = useExampleTheme();
  const primary = variant === 'primary';
  const disabled = !enabled || loading;
  const content = primary ? colors.onAccent : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: primary ? colors.accent : colors.card,
          borderColor: primary ? 'transparent' : colors.hairline,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      {loading ? (
        <View style={styles.buttonRow}>
          <ActivityIndicator color={content} />
          <Text style={[styles.buttonLabel, {color: content}]}>Processing…</Text>
        </View>
      ) : (
        <Text style={[styles.buttonLabel, {color: content}]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function ExampleStatusChip({
  text,
  kind = 'neutral',
}: {
  text: string;
  kind?: 'neutral' | 'error' | 'success';
}) {
  const {colors} = useExampleTheme();
  const container =
    kind === 'error'
      ? colors.dangerSoft
      : kind === 'success'
        ? colors.successSoft
        : colors.elevated;
  const tint =
    kind === 'error'
      ? colors.error
      : kind === 'success'
        ? colors.success
        : colors.muted;
  return (
    <View style={[styles.chip, {backgroundColor: container}]}>
      <Text style={[styles.chipText, {color: tint}]}>{text}</Text>
    </View>
  );
}

function resultHero(result: PaymentResult) {
  if (result.status === 'complete') {
    return {
      title: 'Payment complete',
      subtitle: 'Your payment went through.',
      icon: 'check' as const,
      iconTint: ExampleColors.purple,
      iconBg: 'rgba(124, 77, 255, 0.12)',
    };
  }
  if (result.status === 'failed') {
    return {
      title: 'Payment didn’t go through',
      subtitle: 'Something went wrong. You can try again.',
      icon: 'close' as const,
      iconTint: ExampleColors.error,
      iconBg: 'rgba(255, 71, 87, 0.12)',
    };
  }
  return {
    title: 'Payment canceled',
    subtitle: 'You closed checkout before finishing.',
    icon: 'minus' as const,
    iconTint: undefined as string | undefined,
    iconBg: undefined as string | undefined,
  };
}

function formatResultAmount(amount?: string, currency?: string): string | null {
  const raw = amount?.trim();
  if (!raw) {
    return null;
  }
  const cur = (currency ?? '').toUpperCase();
  if (cur === 'EUR') {
    return `€${raw}`;
  }
  if (cur === 'USD') {
    return `$${raw}`;
  }
  if (cur === 'GBP') {
    return `£${raw}`;
  }
  return cur ? `${raw} ${cur}` : raw;
}

function resultRows(result: PaymentResult): {label: string; value: string}[] {
  if (result.status === 'complete') {
    const tx = result.transaction;
    const customer = tx.customerData;
    const name = [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(' ');
    const rows: {label: string; value: string}[] = [
      {label: 'Status', value: tx.status?.trim() || 'Complete'},
    ];
    const amount = formatResultAmount(tx.amount, tx.currencyKey);
    if (amount) {
      rows.push({label: 'Amount', value: amount});
    }
    if (tx.amountInEuro?.trim()) {
      rows.push({label: 'Amount in EUR', value: `€${tx.amountInEuro}`});
    }
    if (tx.id?.trim()) {
      rows.push({label: 'Transaction', value: tx.id});
    }
    if (tx.externalOrderId?.trim()) {
      rows.push({label: 'External order', value: tx.externalOrderId});
    }
    if (tx.description?.trim()) {
      rows.push({label: 'Description', value: tx.description});
    }
    if (name) {
      rows.push({label: 'Customer', value: name});
    }
    if (customer?.email?.trim()) {
      rows.push({label: 'Email', value: customer.email});
    }
    return rows;
  }
  if (result.status === 'failed') {
    return [
      {label: 'Status', value: 'Failed'},
      {label: 'Error code', value: result.error.code},
      {label: 'Message', value: result.error.message},
    ];
  }
  return [
    {label: 'Status', value: 'Canceled'},
    {label: 'Message', value: 'No charge was made.'},
  ];
}

export function ExampleResultPanel({result}: {result: PaymentResult}) {
  const {colors} = useExampleTheme();
  const hero = resultHero(result);
  const iconTint = hero.iconTint ?? colors.muted;
  const iconBg = hero.iconBg ?? colors.elevated;
  const Icon =
    hero.icon === 'check'
      ? IconCheck
      : hero.icon === 'close'
        ? IconClose
        : IconMinus;
  const rows = resultRows(result);
  return (
    <View style={styles.result}>
      <View
        style={[
          styles.resultIcon,
          {backgroundColor: iconBg, alignSelf: 'center'},
        ]}>
        <Icon color={iconTint} size={32} />
      </View>
      <Text
        style={[styles.resultTitle, {color: colors.text, alignSelf: 'center'}]}>
        {hero.title}
      </Text>
      <Text
        style={[
          styles.resultSubtitle,
          {color: colors.muted, alignSelf: 'center'},
        ]}>
        {hero.subtitle}
      </Text>
      <View style={styles.resultCard}>
        <ExampleCard padding={8}>
          {rows.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? (
                <View
                  style={[styles.divider, {backgroundColor: colors.hairline}]}
                />
              ) : null}
              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, {color: colors.muted}]}>
                  {row.label}
                </Text>
                <Text style={[styles.kvValue, {color: colors.text}]}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </ExampleCard>
      </View>
    </View>
  );
}

export function ExampleLoader({message}: {message: string}) {
  const {colors} = useExampleTheme();
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[styles.loaderText, {color: colors.muted}]}>{message}</Text>
    </View>
  );
}

/**
 * Merchant loading chrome for the **initial** bind. Always keeps `children`
 * mounted so PaymentElement / wallet buttons can emit `ready`. After the first
 * Ready the surface stays visible — `updateOrder` must not hide it.
 */
export function MerchantReadyGate({
  ready,
  message,
  children,
  minHeight = 160,
}: {
  ready: boolean;
  message: string;
  children: ReactNode;
  minHeight?: number;
}) {
  const {colors} = useExampleTheme();
  const [hasBound, setHasBound] = useState(ready);
  useEffect(() => {
    if (ready) {
      setHasBound(true);
    }
  }, [ready]);
  return (
    <View style={[styles.gate, {minHeight}]}>
      <View
        collapsable={false}
        pointerEvents={hasBound ? 'auto' : 'none'}
        style={styles.gateSurface}>
        {children}
      </View>
      {!hasBound ? (
        <View
          pointerEvents="none"
          style={[styles.gateOverlay, {backgroundColor: colors.bg}]}>
          <ExampleLoader message={message} />
        </View>
      ) : null}
    </View>
  );
}

export function SampleOrderCard({
  title,
  amount,
}: {
  title?: string;
  amount?: string;
}) {
  const {colors} = useExampleTheme();
  return (
    <ExampleCard>
      <Text style={[styles.kicker, {color: colors.muted}]}>ORDER</Text>
      <Text style={[styles.title, {color: colors.text}]}>
        {title ?? 'Checkout item'}
      </Text>
      {amount ? (
        <Text style={[styles.amount, {color: colors.text}]}>{amount}</Text>
      ) : null}
    </ExampleCard>
  );
}

export function ExampleThemeToggle() {
  const {colors, dark, toggle} = useExampleTheme();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        dark ? 'Switch to light theme' : 'Switch to dark theme'
      }
      style={styles.iconButton}>
      {dark ? (
        <IconMoon color={colors.text} size={22} cutout={colors.bg} />
      ) : (
        <IconSun color={colors.text} size={22} />
      )}
    </Pressable>
  );
}

export function ExampleSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  const {colors} = useExampleTheme();
  return (
    <ExampleCard padding={0}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>{title}</Text>
        {caption ? (
          <Text style={[styles.sectionCaption, {color: colors.muted}]}>
            {caption}
          </Text>
        ) : null}
      </View>
      {children}
    </ExampleCard>
  );
}

export function ExampleSwitchRow({
  title,
  subtitle,
  value,
  onChange,
  enabled = true,
  showDivider = false,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  enabled?: boolean;
  showDivider?: boolean;
}) {
  const {colors} = useExampleTheme();
  const faded = enabled ? 1 : 0.38;
  return (
    <View>
      {showDivider ? (
        <View style={[styles.rowDivider, {backgroundColor: colors.hairline}]} />
      ) : null}
      <View style={[styles.switchRow, {opacity: faded}]}>
        <View style={{flex: 1, gap: 2}}>
          <Text style={[styles.rowTitle, {color: colors.text}]}>{title}</Text>
          <Text style={[styles.sectionCaption, {color: colors.muted}]}>
            {subtitle}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={!enabled}
          trackColor={{true: ExampleColors.purple}}
        />
      </View>
    </View>
  );
}

export function ExampleOptionRow<T extends string>({
  title,
  caption,
  options,
  value,
  onChange,
  showDivider = false,
}: {
  title: string;
  caption?: string;
  options: {label: string; value: T}[];
  value: {label: string; value: T};
  onChange: (value: {label: string; value: T}) => void;
  showDivider?: boolean;
}) {
  const {colors} = useExampleTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      {showDivider ? (
        <View style={[styles.rowDivider, {backgroundColor: colors.hairline}]} />
      ) : null}
      <Pressable onPress={() => setOpen(true)} style={styles.optionRow}>
        <View style={{flex: 1, gap: 2}}>
          <Text style={[styles.rowTitle, {color: colors.text}]}>{title}</Text>
          {caption ? (
            <Text style={[styles.sectionCaption, {color: colors.muted}]}>
              {caption}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.optionValue, {color: colors.muted}]}>
          {value.label}
        </Text>
        <IconChevronRight color={colors.muted} size={18} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetScrim} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, {backgroundColor: colors.card}]}
            onPress={() => undefined}>
            <Text style={[styles.sheetTitle, {color: colors.text}]}>{title}</Text>
            <ScrollView>
              {options.map((option) => {
                const selected = option.value === value.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    style={styles.sheetRow}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: selected ? '700' : '500',
                        fontSize: 16,
                      }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function ExampleSegmentedRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: {label: string; value: T}[];
  value: T;
  onChange: (value: T) => void;
}) {
  const {colors} = useExampleTheme();
  return (
    <View style={[styles.segment, {backgroundColor: colors.elevated}]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segmentItem,
              selected ? {backgroundColor: colors.card} : null,
            ]}>
            <Text
              style={{
                color: selected ? colors.text : colors.muted,
                fontWeight: '600',
                fontSize: 13,
                textAlign: 'center',
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ExampleStepperRow({
  title,
  caption,
  valueLabel,
  onMinus,
  onPlus,
  minusEnabled = true,
  plusEnabled = true,
}: {
  title: string;
  caption?: string;
  valueLabel: string;
  onMinus: () => void;
  onPlus: () => void;
  minusEnabled?: boolean;
  plusEnabled?: boolean;
}) {
  const {colors} = useExampleTheme();
  return (
    <View style={styles.optionRow}>
      <View style={{flex: 1, gap: 2}}>
        <Text style={[styles.rowTitle, {color: colors.text}]}>{title}</Text>
        {caption ? (
          <Text style={[styles.sectionCaption, {color: colors.muted}]}>
            {caption}
          </Text>
        ) : null}
      </View>
      <View style={[styles.stepper, {borderColor: colors.hairline}]}>
        <Pressable
          onPress={onMinus}
          disabled={!minusEnabled}
          style={[styles.step, {opacity: minusEnabled ? 1 : 0.35}]}>
          <IconMinus color={colors.text} size={16} />
        </Pressable>
        <Text style={[styles.stepValue, {color: colors.text}]}>{valueLabel}</Text>
        <Pressable
          onPress={onPlus}
          disabled={!plusEnabled}
          style={[styles.step, {opacity: plusEnabled ? 1 : 0.35}]}>
          <IconPlus color={colors.text} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

export function ExampleTopBar({
  title,
  subtitle,
  onBack,
  showThemeToggle = true,
  showTestCards = false,
  showWordmark = false,
  nameCheckHint = false,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showThemeToggle?: boolean;
  showTestCards?: boolean;
  showWordmark?: boolean;
  nameCheckHint?: boolean;
  actions?: ReactNode;
}) {
  const {colors} = useExampleTheme();
  return (
    <View style={styles.topBar}>
      {showWordmark ? <ExampleWordmark color={colors.text} /> : null}
      <View style={styles.topBarRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.iconButton}>
            <IconChevronLeft color={colors.text} size={22} />
          </Pressable>
        ) : null}
        <Text
          style={[styles.pageTitle, {color: colors.text}]}
          numberOfLines={1}>
          {title}
        </Text>
        {showTestCards ? (
          <TestCardsAction nameCheckHint={nameCheckHint} />
        ) : null}
        {actions}
        {showThemeToggle ? <ExampleThemeToggle /> : null}
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, {color: colors.muted}]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function SampleScaffold({
  title,
  subtitle,
  onBack,
  children,
  showTestCards = false,
  nameCheckHint = false,
  showThemeToggle = true,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  showTestCards?: boolean;
  nameCheckHint?: boolean;
  showThemeToggle?: boolean;
}) {
  const {colors} = useExampleTheme();
  return (
    <View style={[styles.scaffold, {backgroundColor: colors.bg}]}>
      <ExampleTopBar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        showTestCards={showTestCards}
        nameCheckHint={nameCheckHint}
        showThemeToggle={showThemeToggle}
      />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaffold: {flex: 1},
  body: {flex: 1, gap: 16, paddingHorizontal: 20, paddingBottom: 24},
  card: {
    borderRadius: ExampleRadii.card,
    borderWidth: 1,
    gap: 12,
  },
  button: {
    height: 52,
    borderRadius: ExampleRadii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  buttonLabel: {fontSize: 16, fontWeight: '600'},
  chip: {
    borderRadius: ExampleRadii.inner,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipText: {fontSize: 14, fontWeight: '500'},
  loader: {alignItems: 'center', gap: 12, paddingVertical: 24},
  loaderText: {fontSize: 14},
  kicker: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8},
  title: {fontSize: 20, fontWeight: '700'},
  amount: {fontSize: 24, fontWeight: '700'},
  topBar: {gap: 8, paddingHorizontal: 20, paddingVertical: 12},
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {flex: 1, fontSize: 22, fontWeight: '700'},
  subtitle: {fontSize: 15, lineHeight: 20},
  result: {alignItems: 'stretch', gap: 8, width: '100%', alignSelf: 'stretch'},
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: {fontSize: 22, fontWeight: '700', textAlign: 'center'},
  resultSubtitle: {fontSize: 15, textAlign: 'center', marginBottom: 12},
  resultCard: {alignSelf: 'stretch', width: '100%'},
  divider: {height: StyleSheet.hairlineWidth},
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  kvLabel: {fontSize: 14, flexShrink: 0, maxWidth: '42%'},
  kvValue: {flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'right'},
  gate: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  gateSurface: {width: '100%', overflow: 'visible'},
  gateOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  sectionHeader: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 4},
  sectionTitle: {fontSize: 17, fontWeight: '600'},
  sectionCaption: {fontSize: 14, lineHeight: 18},
  rowTitle: {fontSize: 16, fontWeight: '600'},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionValue: {fontSize: 15, fontWeight: '500'},
  rowDivider: {height: StyleSheet.hairlineWidth, marginLeft: 20},
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: ExampleRadii.pill,
    overflow: 'hidden',
  },
  step: {paddingHorizontal: 10, paddingVertical: 6},
  stepValue: {fontSize: 14, fontWeight: '600', minWidth: 36, textAlign: 'center'},
  sheetScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sheetRow: {paddingHorizontal: 20, paddingVertical: 14},
});
