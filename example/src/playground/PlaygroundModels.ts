import type {
  AppearanceConfig,
  SubmitButtonType,
  UserInterfaceStyle,
  ValidationMode,
  WalletButtonType,
} from '@xmoney/react-native';
import {exampleAppearance} from '../SampleHelpers';

export type DemoOption<T extends string = string> = {
  label: string;
  value: T;
};

export type IntegrationMode = 'sheet' | 'wallet' | 'embedded';

export const playgroundLocaleOptions: DemoOption[] = [
  {label: 'English', value: 'en-US'},
  {label: 'Greek', value: 'el-GR'},
  {label: 'Romanian', value: 'ro-RO'},
  {label: 'Bulgarian', value: 'bg-BG'},
  {label: 'Hungarian', value: 'hu-HU'},
  {label: 'Polish', value: 'pl-PL'},
];

export const playgroundStyleOptions: DemoOption<UserInterfaceStyle>[] = [
  {label: 'Auto', value: 'automatic'},
  {label: 'Light', value: 'alwaysLight'},
  {label: 'Dark', value: 'alwaysDark'},
];

export const playgroundButtonTypeOptions: DemoOption<SubmitButtonType>[] = [
  {label: 'Pay', value: 'pay'},
  {label: 'Book', value: 'book'},
  {label: 'Buy', value: 'buy'},
  {label: 'Checkout', value: 'checkout'},
  {label: 'Donate', value: 'donate'},
  {label: 'Order', value: 'order'},
  {label: 'Subscribe', value: 'subscribe'},
  {label: 'Top up', value: 'topUp'},
  {label: 'Deposit', value: 'deposit'},
];

export const playgroundValidationOptions: DemoOption<ValidationMode>[] = [
  {label: 'On touched', value: 'onTouched'},
  {label: 'On change', value: 'onChange'},
  {label: 'On blur', value: 'onBlur'},
  {label: 'On submit', value: 'onSubmit'},
];

export const playgroundGroupingOptions: DemoOption<'condensed' | 'spaced'>[] = [
  {label: 'Condensed', value: 'condensed'},
  {label: 'Spaced', value: 'spaced'},
];

export type PlaygroundWalletColor = 'auto' | 'black' | 'white' | 'white-outline';

export const playgroundWalletColorOptions: DemoOption<PlaygroundWalletColor>[] = [
  {label: 'Auto', value: 'auto'},
  {label: 'Black', value: 'black'},
  {label: 'White', value: 'white'},
  {label: 'White outline', value: 'white-outline'},
];

export const playgroundWalletTypeOptions: DemoOption<WalletButtonType>[] = [
  {label: 'Pay', value: 'pay'},
  {label: 'Plain', value: 'plain'},
  {label: 'Buy', value: 'buy'},
  {label: 'Book', value: 'book'},
  {label: 'Checkout', value: 'checkout'},
  {label: 'Donate', value: 'donate'},
  {label: 'Order', value: 'order'},
  {label: 'Subscribe', value: 'subscribe'},
];

export const playgroundFontFamilyOptions: DemoOption[] = [
  {label: 'Default (Roobert)', value: ''},
  {label: 'Georgia', value: 'Georgia'},
  {label: 'Courier New', value: 'CourierNewPSMT'},
  {label: 'Avenir Next', value: 'AvenirNext-Regular'},
  {label: 'Helvetica Neue', value: 'HelveticaNeue'},
];

export type AppearancePreset = {
  id: string;
  label: string;
  description: string;
  appearance: AppearanceConfig;
};

function colors(values: NonNullable<AppearanceConfig['colors']>): AppearanceConfig['colors'] {
  return values;
}

function preset(
  id: string,
  label: string,
  description: string,
  appearance: AppearanceConfig
): AppearancePreset {
  return {id, label, description, appearance};
}

export const appearancePresets: AppearancePreset[] = [
  preset('example', 'Example chrome', 'Matches this app', exampleAppearance()),
  preset('default', 'Default', 'SDK defaults', {}),
  preset('night', 'Night', 'Dark surfaces, indigo accent', {
    colors: colors({
      primary: '#818CF8',
      background: '#0B0B0F',
      componentBackground: '#16161D',
      componentBorder: '#2E2E3A',
      componentDivider: '#2E2E3A',
      primaryText: '#F4F4F8',
      secondaryText: '#A8A8B8',
      componentText: '#E8E8F0',
      placeholderText: '#6E6E80',
      icon: '#A8A8B8',
      error: '#F87171',
    }),
    shapes: {borderRadius: 12, borderWidth: 1},
    primaryButton: {
      colors: {background: '#6366F1', text: '#FFFFFF'},
      shapes: {borderRadius: 12},
    },
  }),
  preset('soft_light', 'Soft light', 'Warm paper, soft teal', {
    colors: colors({
      primary: '#0E7C66',
      background: '#F7F3EC',
      componentBackground: '#FFFBF5',
      componentBorder: '#D9D0C3',
      componentDivider: '#E8DFD2',
      primaryText: '#14202B',
      secondaryText: '#5C6B78',
      componentText: '#14202B',
      placeholderText: '#8A96A1',
      icon: '#5C6B78',
      error: '#B42318',
      containerBorder: 'none',
    }),
    shapes: {borderRadius: 14, borderWidth: 1},
    primaryButton: {
      colors: {background: '#0E7C66', text: '#FFFFFF'},
      shapes: {borderRadius: 14},
    },
  }),
  preset('minimal_sharp', 'Minimal sharp', 'High contrast, square corners', {
    colors: colors({
      primary: '#111111',
      background: '#FFFFFF',
      componentBackground: '#FFFFFF',
      componentBorder: '#111111',
      componentDivider: '#E5E5E5',
      primaryText: '#111111',
      secondaryText: '#555555',
      componentText: '#111111',
      placeholderText: '#888888',
      icon: '#111111',
      error: '#D92D20',
    }),
    shapes: {borderRadius: 0, borderWidth: 1.5},
    primaryButton: {
      colors: {background: '#111111', text: '#FFFFFF'},
      shapes: {borderRadius: 0, borderWidth: 0},
    },
  }),
  preset('rounded_friendly', 'Rounded friendly', 'Large radii, pastel surfaces', {
    colors: colors({
      primary: '#7C5CFC',
      background: '#F5F3FF',
      componentBackground: '#FFFFFF',
      componentBorder: '#E4DEFF',
      componentDivider: '#EDE9FE',
      primaryText: '#2E1064',
      secondaryText: '#6B7280',
      componentText: '#2E1064',
      placeholderText: '#9CA3AF',
      icon: '#7C5CFC',
      error: '#EF4444',
    }),
    font: {scale: 1.02},
    shapes: {borderRadius: 22, borderWidth: 1},
    primaryButton: {
      colors: {background: '#7C5CFC', text: '#FFFFFF'},
      shapes: {borderRadius: 28},
    },
  }),
  preset('forest', 'Forest', 'Demo teal and navy', {
    colors: colors({
      primary: '#0E7C66',
      background: '#F3EDE3',
      componentBackground: '#FFFBF5',
      componentBorder: '#D9D0C3',
      componentDivider: '#E8DFD2',
      primaryText: '#0B1F33',
      secondaryText: '#5C6B78',
      componentText: '#0B1F33',
      placeholderText: '#8A96A1',
      icon: '#0B1F33',
      error: '#B42318',
    }),
    shapes: {borderRadius: 16, borderWidth: 1},
    primaryButton: {
      colors: {background: '#0E7C66', text: '#FFFFFF'},
      shapes: {borderRadius: 16},
    },
  }),
  preset('ocean', 'Ocean', 'Deep blue, cool gray', {
    colors: colors({
      primary: '#0B5FFF',
      background: '#F4F7FB',
      componentBackground: '#FFFFFF',
      componentBorder: '#C9D4E3',
      componentDivider: '#E2E8F0',
      primaryText: '#0F172A',
      secondaryText: '#64748B',
      componentText: '#0F172A',
      placeholderText: '#94A3B8',
      icon: '#475569',
      error: '#DC2626',
    }),
    shapes: {borderRadius: 12, borderWidth: 1},
    primaryButton: {
      colors: {background: '#0B5FFF', text: '#FFFFFF'},
      shapes: {borderRadius: 12},
    },
  }),
  preset('sunset', 'Sunset', 'Warm coral on cream', {
    colors: colors({
      primary: '#E85D4C',
      background: '#FFF8F1',
      componentBackground: '#FFFFFF',
      componentBorder: '#F0D9C8',
      componentDivider: '#F5E6DA',
      primaryText: '#3B1F14',
      secondaryText: '#8B6B5C',
      componentText: '#3B1F14',
      placeholderText: '#B08978',
      icon: '#C2410C',
      error: '#B91C1C',
    }),
    shapes: {borderRadius: 16, borderWidth: 1},
    primaryButton: {
      colors: {background: '#E85D4C', text: '#FFFFFF'},
      shapes: {borderRadius: 16},
    },
  }),
  preset('contrast', 'Contrast', 'Bold black, stronger type', {
    colors: colors({
      primary: '#000000',
      background: '#FFFFFF',
      componentBackground: '#FAFAFA',
      componentBorder: '#000000',
      componentDivider: '#D4D4D4',
      primaryText: '#000000',
      secondaryText: '#404040',
      componentText: '#000000',
      placeholderText: '#737373',
      icon: '#000000',
      error: '#DC2626',
    }),
    font: {scale: 1.12},
    shapes: {borderRadius: 8, borderWidth: 2},
    primaryButton: {
      colors: {background: '#000000', text: '#FFFFFF', border: '#000000'},
      shapes: {borderRadius: 8, borderWidth: 2},
    },
  }),
  preset('slate', 'Slate', 'Muted enterprise blue-gray', {
    colors: colors({
      primary: '#334155',
      background: '#F8FAFC',
      componentBackground: '#FFFFFF',
      componentBorder: '#CBD5E1',
      componentDivider: '#E2E8F0',
      primaryText: '#0F172A',
      secondaryText: '#64748B',
      componentText: '#1E293B',
      placeholderText: '#94A3B8',
      icon: '#64748B',
      error: '#B91C1C',
    }),
    shapes: {borderRadius: 8, borderWidth: 1},
    primaryButton: {
      colors: {background: '#334155', text: '#FFFFFF'},
      shapes: {borderRadius: 8},
    },
  }),
];

export const appearanceColorFields: {
  label: string;
  caption: string;
  key: keyof NonNullable<AppearanceConfig['colors']>;
}[] = [
  {label: 'Primary', caption: 'colors.primary · accent, focus, checkbox', key: 'primary'},
  {label: 'Background', caption: 'colors.background · form / sheet', key: 'background'},
  {
    label: 'Component background',
    caption: 'colors.componentBackground · field surfaces',
    key: 'componentBackground',
  },
  {
    label: 'Component border',
    caption: 'colors.componentBorder · field outlines',
    key: 'componentBorder',
  },
  {
    label: 'Component divider',
    caption: 'colors.componentDivider · condensed hairlines',
    key: 'componentDivider',
  },
  {label: 'Primary text', caption: 'colors.primaryText · titles and body', key: 'primaryText'},
  {label: 'Secondary text', caption: 'colors.secondaryText · muted copy', key: 'secondaryText'},
  {label: 'Component text', caption: 'colors.componentText · typed fields', key: 'componentText'},
  {
    label: 'Placeholder',
    caption: 'colors.placeholderText · field placeholders',
    key: 'placeholderText',
  },
  {label: 'Icon', caption: 'colors.icon', key: 'icon'},
  {label: 'Error', caption: 'colors.error · field and sheet errors', key: 'error'},
  {
    label: 'Container border',
    caption: 'colors.containerBorder · method outline (`none` hides it)',
    key: 'containerBorder',
  },
];
