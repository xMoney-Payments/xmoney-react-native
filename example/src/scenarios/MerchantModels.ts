import type {ImageSourcePropType} from 'react-native';
import type {AppearanceConfig} from '@xmoney/react-native';
import {exampleAppearance} from '../SampleHelpers';
import {ExampleColors} from '../theme/ExampleColors';

export type MerchantCatalogStyle = 'menu' | 'plans' | 'grid';
export type MerchantPaySurface = 'sheet' | 'embedded';

export type MerchantProduct = {
  id: string;
  name: string;
  category: string;
  blurb: string;
  priceMinor: number;
  image: ImageSourcePropType;
};

export type MerchantLine = {
  product: MerchantProduct;
  quantity: number;
};

export type MerchantBrand = {
  id: 'lumen' | 'hearth' | 'pulse';
  name: string;
  tagline: string;
  emptyHint: string;
  catalogStyle: MerchantCatalogStyle;
  paySurface: MerchantPaySurface;
  products: MerchantProduct[];
  appearance: AppearanceConfig;
  accent: string;
  onAccent: string;
  accentText?: string;
};

export function lineTotal(line: MerchantLine): number {
  return line.product.priceMinor * line.quantity;
}

export function itemCount(lines: MerchantLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function subtotalMinor(lines: MerchantLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function toLines(
  products: MerchantProduct[],
  quantities: Record<string, number>
): MerchantLine[] {
  return products.flatMap((product) => {
    const quantity = quantities[product.id] ?? 0;
    return quantity > 0 ? [{product, quantity}] : [];
  });
}

const img = (name: string): ImageSourcePropType =>
  ({
    earbuds: require('../assets/products/product_earbuds.png'),
    lamp: require('../assets/products/product_lamp.png'),
    pourover: require('../assets/products/product_pourover.png'),
    throw: require('../assets/products/product_throw.png'),
    notebooks: require('../assets/products/product_notebooks.png'),
    weekender: require('../assets/products/product_weekender.png'),
    diffuser: require('../assets/products/product_diffuser.png'),
    bottle: require('../assets/products/product_bottle.png'),
    espresso: require('../assets/products/product_espresso.png'),
    cortado: require('../assets/products/product_cortado.png'),
    coldbrew: require('../assets/products/product_coldbrew.png'),
    grainbowl: require('../assets/products/product_grainbowl.png'),
    tartine: require('../assets/products/product_tartine.png'),
    croissant: require('../assets/products/product_croissant.png'),
    morningbun: require('../assets/products/product_morningbun.png'),
    loaf: require('../assets/products/product_loaf.png'),
    unlimited: require('../assets/products/product_pulse_unlimited.png'),
    pack: require('../assets/products/product_pulse_pack.png'),
    dropin: require('../assets/products/product_pulse_dropin.png'),
    reformer: require('../assets/products/product_pulse_reformer.png'),
    recovery: require('../assets/products/product_pulse_recovery.png'),
    swim: require('../assets/products/product_pulse_swim.png'),
    heart: require('../assets/products/product_pulse_heart.png'),
  })[name] as ImageSourcePropType;

export const LumenBrand: MerchantBrand = {
  id: 'lumen',
  name: 'Lumen',
  tagline: 'Modern essentials. Pay with Payment Sheet.',
  emptyHint: 'Add a few Lumen pieces from the store, then pay with Payment Sheet.',
  catalogStyle: 'grid',
  paySurface: 'sheet',
  appearance: exampleAppearance(),
  accent: ExampleColors.purple,
  onAccent: '#FFFFFF',
  products: [
    {id: 'earbuds', name: 'Aura Earbuds', category: 'Audio', blurb: 'Spatial audio, 32-hour case', priceMinor: 12900, image: img('earbuds')},
    {id: 'lamp', name: 'Arc Desk Lamp', category: 'Lighting', blurb: 'Dimmable, brushed aluminum', priceMinor: 8900, image: img('lamp')},
    {id: 'pour-over', name: 'Stone Pour-Over', category: 'Kitchen', blurb: 'Matte ceramic, 600 ml', priceMinor: 4200, image: img('pourover')},
    {id: 'throw', name: 'Merino Throw', category: 'Home', blurb: 'Undyed wool, 140 × 200', priceMinor: 7500, image: img('throw')},
    {id: 'notebooks', name: 'Oak Notebooks', category: 'Stationery', blurb: 'Set of three, linen cover', priceMinor: 2400, image: img('notebooks')},
    {id: 'weekender', name: 'Canvas Weekender', category: 'Travel', blurb: 'Vegetable-tanned straps', priceMinor: 11800, image: img('weekender')},
    {id: 'diffuser', name: 'Ceramic Diffuser', category: 'Wellness', blurb: 'Ultrasonic, 4-hour timer', priceMinor: 5400, image: img('diffuser')},
    {id: 'bottle', name: 'Steel Bottle', category: 'Everyday', blurb: 'Double-wall, 750 ml', priceMinor: 3200, image: img('bottle')},
  ],
};

const hearthTerracotta = '#C45C26';

export const HearthBrand: MerchantBrand = {
  id: 'hearth',
  name: 'Hearth',
  tagline: 'Neighbourhood café. Pay in-page with Embedded Element.',
  emptyHint: 'Add a coffee or a plate from the board, then check out in this screen.',
  catalogStyle: 'menu',
  paySurface: 'embedded',
  appearance: exampleAppearance({primary: hearthTerracotta}),
  accent: hearthTerracotta,
  onAccent: '#FFFFFF',
  products: [
    {id: 'espresso', name: 'House Espresso', category: 'Drinks', blurb: 'Single origin, 18g', priceMinor: 350, image: img('espresso')},
    {id: 'cortado', name: 'Oat Cortado', category: 'Drinks', blurb: 'Equal parts, steamed oat', priceMinor: 420, image: img('cortado')},
    {id: 'cold-brew', name: 'Cold Brew', category: 'Drinks', blurb: '16-hour steep, served over ice', priceMinor: 480, image: img('coldbrew')},
    {id: 'grain-bowl', name: 'Seasonal Grain Bowl', category: 'Kitchen', blurb: 'Farro, greens, citrus tahini', priceMinor: 1400, image: img('grainbowl')},
    {id: 'tartine', name: 'Smoked Salmon Tartine', category: 'Kitchen', blurb: 'Rye, crème fraîche, dill', priceMinor: 1250, image: img('tartine')},
    {id: 'croissant', name: 'Butter Croissant', category: 'Bakery', blurb: 'Laminated overnight', priceMinor: 380, image: img('croissant')},
    {id: 'morning-bun', name: 'Almond Morning Bun', category: 'Bakery', blurb: 'Orange blossom, toasted nuts', priceMinor: 440, image: img('morningbun')},
    {id: 'loaf', name: 'Citrus Loaf', category: 'Bakery', blurb: 'Olive oil, slice', priceMinor: 410, image: img('loaf')},
  ],
};

export const PulseBrand: MerchantBrand = {
  id: 'pulse',
  name: 'Pulse',
  tagline: 'Studio memberships and classes. Embedded checkout.',
  emptyHint: 'Choose a pack or a drop-in, then pay with the form on the next screen.',
  catalogStyle: 'plans',
  paySurface: 'embedded',
  appearance: exampleAppearance({
    primary: ExampleColors.limeDark,
    primaryDark: ExampleColors.lime,
    buttonBackground: ExampleColors.lime,
    buttonText: ExampleColors.limeDark,
  }),
  accent: ExampleColors.lime,
  onAccent: ExampleColors.limeDark,
  accentText: ExampleColors.limeDark,
  products: [
    {id: 'unlimited', name: 'Monthly Unlimited', category: 'Membership', blurb: 'All classes, guest pass once a month', priceMinor: 7900, image: img('unlimited')},
    {id: 'pack-5', name: '5-Class Pack', category: 'Packs', blurb: 'Use within 8 weeks', priceMinor: 9500, image: img('pack')},
    {id: 'drop-in', name: 'Drop-in Class', category: 'Classes', blurb: 'Any public session today', priceMinor: 2200, image: img('dropin')},
    {id: 'reformer', name: 'Reformer Intro', category: 'Classes', blurb: '50 minutes, small group', priceMinor: 4500, image: img('reformer')},
    {id: 'recovery', name: 'Recovery Session', category: 'Wellness', blurb: 'Stretch + breathwork', priceMinor: 3800, image: img('recovery')},
    {id: 'swim', name: 'Lane Swim Pass', category: 'Wellness', blurb: 'Morning lanes, 10 entries', priceMinor: 6000, image: img('swim')},
    {id: 'heart', name: 'Heart-Rate Lab', category: 'Classes', blurb: 'Guided intervals, 40 minutes', priceMinor: 2800, image: img('heart')},
  ],
};

export const brands = {
  lumen: LumenBrand,
  hearth: HearthBrand,
  pulse: PulseBrand,
};
