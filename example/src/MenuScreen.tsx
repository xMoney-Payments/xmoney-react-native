import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useExampleTheme} from './theme/ExampleTheme';
import {ExampleTopBar} from './ui/ExampleComponents';
import {IconChevronRight} from './ui/ExampleIcons';

export type MenuDestination =
  | 'sheet'
  | 'element'
  | 'wallet'
  | 'lumen'
  | 'hearth'
  | 'pulse'
  | 'merchantPay'
  | 'updateOrder'
  | 'chv'
  | 'playground';

type MenuSection = 'Integrations' | 'Example app' | 'Advanced' | 'Internal';

type MenuItem = {
  title: string;
  subtitle: string;
  section: MenuSection;
  destination: MenuDestination;
  image?: number;
};

const items: MenuItem[] = [
  {
    title: 'Payment Sheet',
    subtitle: 'Drop-in checkout sheet — copy-paste starting point',
    section: 'Integrations',
    destination: 'sheet',
  },
  {
    title: 'Embedded Payment Element',
    subtitle:
      Platform.OS === 'ios'
        ? 'Card, saved cards, and Apple Pay in your layout'
        : 'Card, saved cards, and Google Pay in your layout',
    section: 'Integrations',
    destination: 'element',
  },
  {
    title: Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay',
    subtitle: 'Standalone wallet button',
    section: 'Integrations',
    destination: 'wallet',
  },
  {
    title: 'Lumen shop',
    subtitle: 'Lifestyle store — catalog, cart, Payment Sheet',
    section: 'Example app',
    destination: 'lumen',
    image: require('./assets/products/product_earbuds.png'),
  },
  {
    title: 'Hearth Café',
    subtitle: 'Food menu — cart and Embedded checkout',
    section: 'Example app',
    destination: 'hearth',
    image: require('./assets/products/product_espresso.png'),
  },
  {
    title: 'Pulse Studio',
    subtitle: 'Memberships and classes — Embedded checkout',
    section: 'Example app',
    destination: 'pulse',
    image: require('./assets/products/product_pulse_unlimited.png'),
  },
  {
    title: 'Merchant Pay button',
    subtitle: 'Embedded form, your CTA via confirm()',
    section: 'Advanced',
    destination: 'merchantPay',
  },
  {
    title: 'Update order',
    subtitle: 'updateOrder() a new PaymentIntent on a mounted Element',
    section: 'Advanced',
    destination: 'updateOrder',
  },
  {
    title: 'Card holder verification',
    subtitle: 'Pre-pay name check via CardHolderVerification',
    section: 'Advanced',
    destination: 'chv',
  },
  {
    title: 'Playground',
    subtitle: 'Every PaymentConfig option — SDK development',
    section: 'Internal',
    destination: 'playground',
  },
];

const sections: MenuSection[] = [
  'Integrations',
  'Example app',
  'Advanced',
  'Internal',
];

export function MenuScreen({
  onOpen,
}: {
  onOpen: (destination: MenuDestination) => void;
}) {
  const {colors} = useExampleTheme();
  return (
    <View style={[styles.fill, {backgroundColor: colors.bg}]}>
      <ExampleTopBar
        title="Examples"
        subtitle="Copy-paste samples, merchant scenarios, and an internal playground."
        showWordmark
      />
      <ScrollView contentContainerStyle={styles.list}>
        {sections.map((section) => {
          const sectionItems = items.filter((item) => item.section === section);
          return (
            <View key={section}>
              <Text
                style={[
                  styles.section,
                  {color: colors.muted, opacity: section === 'Internal' ? 0.7 : 1},
                ]}>
                {section.toUpperCase()}
              </Text>
              {sectionItems.map((item, index) => (
                <View key={item.destination}>
                  <Pressable
                    onPress={() => onOpen(item.destination)}
                    style={styles.row}>
                    {item.image ? (
                      <Image source={item.image} style={styles.thumb} />
                    ) : null}
                    <View style={{flex: 1, gap: 4}}>
                      <Text style={[styles.title, {color: colors.text}]}>
                        {item.title}
                      </Text>
                      <Text style={{color: colors.muted, fontSize: 14}}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <IconChevronRight color={colors.muted} size={20} />
                  </Pressable>
                  {index < sectionItems.length - 1 ? (
                    <View
                      style={[
                        styles.divider,
                        {backgroundColor: colors.hairline},
                      ]}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  list: {paddingBottom: 40},
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  divider: {height: StyleSheet.hairlineWidth, marginLeft: 20},
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  title: {fontSize: 16, fontWeight: '700'},
});
