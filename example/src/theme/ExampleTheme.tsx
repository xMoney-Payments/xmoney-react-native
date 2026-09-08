import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {Appearance, useColorScheme} from 'react-native';
import {ExampleColors} from './ExampleColors';

type ThemeContextValue = {
  dark: boolean;
  toggle: () => void;
  colors: {
    bg: string;
    card: string;
    elevated: string;
    text: string;
    muted: string;
    hairline: string;
    accent: string;
    onAccent: string;
    accentText: string;
    error: string;
    success: string;
    successSoft: string;
    dangerSoft: string;
  };
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Process-wide light/dark override so nested brand providers keep the same mode. */
let darkOverride: boolean | null = null;
const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function emitTheme() {
  themeListeners.forEach((listener) => listener());
}

export function ExampleThemeProvider({
  children,
  accent = ExampleColors.purple,
  onAccent = '#FFFFFF',
  accentText,
}: {
  children: ReactNode;
  accent?: string;
  onAccent?: string;
  accentText?: string;
}) {
  const systemDark = useColorScheme() === 'dark';
  const [, rerender] = useState(0);

  useEffect(() => subscribeTheme(() => rerender((n) => n + 1)), []);

  const dark = darkOverride ?? systemDark;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = dark
      ? {
          bg: ExampleColors.darkBg,
          card: ExampleColors.darkCard,
          elevated: ExampleColors.darkElevated,
          text: ExampleColors.darkText,
          muted: ExampleColors.darkMuted,
          hairline: ExampleColors.darkHairline,
          accent,
          onAccent,
          accentText: accentText ?? accent,
          error: ExampleColors.error,
          success: ExampleColors.success,
          successSoft: ExampleColors.successSoftDark,
          dangerSoft: ExampleColors.dangerSoftDark,
        }
      : {
          bg: ExampleColors.lightBg,
          card: ExampleColors.lightCard,
          elevated: ExampleColors.lightCard,
          text: ExampleColors.lightText,
          muted: ExampleColors.lightMuted,
          hairline: ExampleColors.lightHairline,
          accent,
          onAccent,
          accentText: accentText ?? accent,
          error: ExampleColors.error,
          success: ExampleColors.success,
          successSoft: ExampleColors.successSoftLight,
          dangerSoft: ExampleColors.dangerSoftLight,
        };
    return {
      dark,
      toggle: () => {
        darkOverride = !(darkOverride ?? systemDark);
        emitTheme();
      },
      colors,
    };
  }, [accent, accentText, dark, onAccent, systemDark]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useExampleTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useExampleTheme must be used inside ExampleThemeProvider');
  }
  return ctx;
}

export function systemIsDark(): boolean {
  return Appearance.getColorScheme() === 'dark';
}
