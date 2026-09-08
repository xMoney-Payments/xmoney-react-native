import {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useExampleTheme} from '../theme/ExampleTheme';
import {ExampleCard} from './ExampleComponents';
import {IconClose, IconCopy} from './ExampleIcons';
import {copyToClipboard} from './clipboard';

type DemoTestCard = {
  pan: string;
  expiry: string;
  cvv: string;
  threeDS: string;
  success: boolean;
  status: string;
};

const CARDS: DemoTestCard[] = [
  {
    pan: '5555 5555 5555 5599',
    expiry: '12/34',
    cvv: '123',
    threeDS: '00000',
    success: true,
    status: 'Success (3DS2)',
  },
  {
    pan: '4111 1111 1111 1111',
    expiry: '12/26',
    cvv: '123',
    threeDS: '00000',
    success: true,
    status: 'Success (3DS2 Frictionless)',
  },
  {
    pan: '5168 4948 9505 5780',
    expiry: '12/26',
    cvv: '123',
    threeDS: '00000',
    success: false,
    status: 'Fail (3DS2 Frictionless)',
  },
  {
    pan: '4000 0011 1111 1118',
    expiry: '12/30',
    cvv: '123',
    threeDS: '00000',
    success: true,
    status: 'Success (3DS2 Attempt)',
  },
];

export function TestCardsAction({
  nameCheckHint = false,
}: {
  nameCheckHint?: boolean;
}) {
  const {colors} = useExampleTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={[styles.action, {color: colors.accent}]}>Test cards</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={[styles.sheet, {backgroundColor: colors.bg}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>Test cards</Text>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.iconButton}>
              <IconClose color={colors.text} size={22} />
            </Pressable>
          </View>
          <Text style={[styles.lede, {color: colors.muted}]}>
            xMoney test cards. Tap a number to copy it into the form.
          </Text>
          <ScrollView contentContainerStyle={styles.list}>
            {CARDS.map((card) => (
              <TestCardRow key={card.pan} card={card} />
            ))}
            {nameCheckHint ? (
              <ExampleCard>
                <Text style={[styles.kicker, {color: colors.muted}]}>
                  NAME CHECK
                </Text>
                <Text style={{color: colors.muted}}>
                  This sample expects John Doe. Use a test card whose
                  account-validation result matches that name, or pay is blocked.
                </Text>
              </ExampleCard>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function TestCardRow({card}: {card: DemoTestCard}) {
  const {colors} = useExampleTheme();
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const handle = setTimeout(() => setCopied(null), 1400);
    return () => clearTimeout(handle);
  }, [copied]);

  const copy = (value: string, label: string) => {
    void copyToClipboard(value).then(() => setCopied(label));
  };

  return (
    <ExampleCard>
      <View style={styles.panRow}>
        <Pressable
          onPress={() => copy(card.pan.replace(/\s/g, ''), 'PAN')}
          style={{flex: 1}}>
          <Text style={[styles.pan, {color: colors.text}]}>{card.pan}</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            copy(`${card.pan}  ${card.expiry}  ${card.cvv}  ${card.threeDS}`, 'Card')
          }
          accessibilityRole="button"
          accessibilityLabel="Copy card details"
          style={styles.iconButton}>
          <IconCopy color={colors.muted} size={18} />
        </Pressable>
      </View>
      <Text
        style={[
          styles.status,
          {color: card.success ? colors.success : colors.error},
        ]}>
        {copied ? `Copied ${copied}` : card.status}
      </Text>
      <View style={styles.row}>
        <Field
          title="Expiry"
          value={card.expiry}
          onCopy={() => copy(card.expiry, 'expiry')}
        />
        <Field
          title="CVV"
          value={card.cvv}
          onCopy={() => copy(card.cvv, 'CVV')}
        />
        <Field
          title="3DS"
          value={card.threeDS}
          onCopy={() => copy(card.threeDS, '3DS')}
        />
      </View>
    </ExampleCard>
  );
}

function Field({
  title,
  value,
  onCopy,
}: {
  title: string;
  value: string;
  onCopy: () => void;
}) {
  const {colors} = useExampleTheme();
  return (
    <Pressable onPress={onCopy} style={styles.field}>
      <Text style={[styles.kicker, {color: colors.muted}]}>{title}</Text>
      <Text style={[styles.fieldValue, {color: colors.text}]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {fontSize: 15, fontWeight: '600'},
  sheet: {flex: 1, paddingTop: 56, paddingHorizontal: 20},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {fontSize: 28, fontWeight: '700'},
  lede: {fontSize: 15, marginBottom: 16},
  list: {gap: 16, paddingBottom: 40},
  panRow: {flexDirection: 'row', alignItems: 'center'},
  pan: {fontSize: 18, fontWeight: '700'},
  status: {fontSize: 13, fontWeight: '600'},
  row: {flexDirection: 'row', gap: 12},
  field: {flex: 1, gap: 4},
  fieldValue: {fontSize: 16, fontWeight: '600'},
  kicker: {fontSize: 11, fontWeight: '700', letterSpacing: 0.8},
});
