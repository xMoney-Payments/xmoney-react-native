export const ExampleColors = {
  purple: '#7C4DFF',
  purpleHover: '#6D3FFF',
  lime: '#DCFC97',
  limeDark: '#3C5708',
  lightBg: '#F4F3FB',
  lightCard: '#FFFFFF',
  lightText: '#16141A',
  // RN iOS treats 8-digit hex as RRGGBBAA — use rgba for StyleSheet.
  lightMuted: 'rgba(22, 20, 26, 0.5)',
  lightHairline: 'rgba(22, 20, 26, 0.06)',
  darkBg: '#09090B',
  darkCard: '#18181B',
  darkElevated: '#1F1F23',
  darkText: '#FAFAFA',
  darkMuted: '#A1A1AA',
  darkHairline: 'rgba(255, 255, 255, 0.12)',
  error: '#FF4757',
  success: '#059669',
  successSoftLight: 'rgba(209, 250, 229, 0.6)',
  successSoftDark: 'rgba(16, 185, 129, 0.15)',
  dangerSoftLight: 'rgba(254, 226, 226, 0.6)',
  dangerSoftDark: 'rgba(239, 68, 68, 0.15)',
};

/** Native SDK AppearanceConfig only parses #RRGGBB / #AARRGGBB. */
export const AppearanceHex = {
  lightMuted: '#8016141A',
  lightHairline: '#0F16141A',
  darkHairline: '#1FFFFFFF',
};

export const ExampleRadii = {
  pill: 9999,
  card: 24,
  inner: 16,
  small: 8,
};
