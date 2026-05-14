import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, Dimensions, TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Color Tokens ───────────────────────────────────────────────────────────

export interface ColorTokens {
  'bg-primary': string;
  'bg-secondary': string;
  'bg-surface': string;
  'bg-surface-variant': string;
  'text-primary': string;
  'text-secondary': string;
  'text-tertiary': string;
  'text-on-primary': string;
  'border-subtle': string;
  'border-strong': string;
  'accent-primary': string;
  'accent-gold': string;
  'status-success': string;
  'status-warning': string;
  'status-danger': string;
  'overlay-scrim': string;
}

const lightColors: ColorTokens = {
  'bg-primary': '#fbf9f9',
  'bg-secondary': '#ffffff',
  'bg-surface': '#f5f3f3',
  'bg-surface-variant': '#dbdad9',
  'text-primary': '#1a1a1a',
  'text-secondary': '#4a4a4a',
  'text-tertiary': '#7a7a7a',
  'text-on-primary': '#ffffff',
  'border-subtle': 'rgba(26, 26, 26, 0.05)',
  'border-strong': 'rgba(26, 26, 26, 0.15)',
  'accent-primary': '#1a1a1a',
  'accent-gold': '#b48c5a',
  'status-success': '#2e7d32',
  'status-warning': '#ed6c02',
  'status-danger': '#d32f2f',
  'overlay-scrim': 'rgba(0, 0, 0, 0.4)',
};

const darkColors: ColorTokens = {
  'bg-primary': '#131314',
  'bg-secondary': '#1b1c1c',
  'bg-surface': '#1f2021',
  'bg-surface-variant': '#393939',
  'text-primary': '#ffffff',
  'text-secondary': '#dbdad9',
  'text-tertiary': '#9a9a9a',
  'text-on-primary': '#131314',
  'border-subtle': 'rgba(255, 255, 255, 0.05)',
  'border-strong': 'rgba(255, 255, 255, 0.15)',
  'accent-primary': '#b48c5a',
  'accent-gold': '#b48c5a',
  'status-success': '#4caf50',
  'status-warning': '#ff9800',
  'status-danger': '#f44336',
  'overlay-scrim': 'rgba(0, 0, 0, 0.6)',
};

export const colorSchemes = {
  light: lightColors,
  dark: darkColors,
};

// Backwards-compat: export light colors plus legacy keys used in existing screens
export const colors = {
  ...lightColors,
  // Legacy keys from old theme — mapped to nearest new tokens
  bg: lightColors['bg-primary'],
  surface: lightColors['bg-surface'],
  surfaceBorder: lightColors['border-subtle'],
  accent: lightColors['accent-gold'],
  textPrimary: lightColors['text-primary'],
  textSecondary: lightColors['text-secondary'],
  textMuted: lightColors['text-tertiary'],
  textGhost: lightColors['border-subtle'],
  border: lightColors['border-strong'],
};

// ─── Typography ─────────────────────────────────────────────────────────────

const _internalFonts = {
  playfairBold: 'PlayfairDisplay_700Bold',
  playfairBoldItalic: 'PlayfairDisplay_700Bold_Italic',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
} as const;

export type TypographyTokens = {
  display: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  bodyLarge: TextStyle;
  body: TextStyle;
  caption: TextStyle;
  labelCaps: TextStyle;
  labelSm: TextStyle;
  buttonText: TextStyle;
};

export const typography: TypographyTokens = {
  display: {
    fontFamily: _internalFonts.playfairBoldItalic,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    fontStyle: 'italic',
  },
  h1: {
    fontFamily: _internalFonts.playfairBoldItalic,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },
  h2: {
    fontFamily: _internalFonts.playfairBoldItalic,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.2,
    fontStyle: 'italic',
  },
  h3: {
    fontFamily: _internalFonts.playfairBoldItalic,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontStyle: 'italic',
  },
  bodyLarge: {
    fontFamily: _internalFonts.interRegular,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0,
  },
  body: {
    fontFamily: _internalFonts.interRegular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: _internalFonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  labelCaps: {
    fontFamily: _internalFonts.interSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  labelSm: {
    fontFamily: _internalFonts.interMedium,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  buttonText: {
    fontFamily: _internalFonts.interSemiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

/**
 * Returns typography tokens for the given mode.
 * In dark mode, display/h1/h2/h3 switch from Playfair Display Bold Italic
 * to Inter Bold and drop fontStyle: 'italic'. All other tokens are unchanged.
 */
export function getTypography(isDark: boolean): TypographyTokens {
  if (!isDark) return typography;
  return {
    ...typography,
    display: {
      ...typography.display,
      fontFamily: _internalFonts.interBold,
      fontStyle: undefined,
    },
    h1: {
      ...typography.h1,
      fontFamily: _internalFonts.interBold,
      fontStyle: undefined,
    },
    h2: {
      ...typography.h2,
      fontFamily: _internalFonts.interSemiBold,
      fontStyle: undefined,
    },
    h3: {
      ...typography.h3,
      fontFamily: _internalFonts.interSemiBold,
      fontStyle: undefined,
    },
  };
}

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  // Legacy alias: existing screens use spacing.base
  base: 16,
  lg: 24,
  xl: 32,
  // Legacy alias: existing screens use spacing.xxl
  xxl: 48,
  '2xl': 48,
  '3xl': 64,
  'margin-screen': 20,
} as const;

// ─── Radius ──────────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
  // Legacy alias: existing components use radius.card and radius.button
  card: 8,
  button: 9999,
  dot: 2,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  elevation0: {},
  elevation1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  elevation2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  elevation3: {
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 3,
  },
} as const;

// ─── Theme Context ────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const THEME_STORAGE_KEY = 'theme_mode';

export const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows,
  mode: 'system',
  setMode: () => undefined,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const systemScheme = Appearance.getColorScheme();
  const [systemIsDark, setSystemIsDark] = useState(systemScheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemIsDark(colorScheme === 'dark');
    });
    return () => listener.remove();
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => undefined);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemIsDark);
  const activeColors = isDark ? darkColors : lightColors;
  const activeTypography = getTypography(isDark);

  const value: ThemeContextValue = {
    colors: activeColors,
    typography: activeTypography,
    spacing,
    radius,
    shadows,
    mode,
    setMode,
    isDark,
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ─── Legacy Backward-Compat Exports ──────────────────────────────────────────
// Existing screens import fontFamilies, CARD_SIZE, SCREEN_WIDTH from this module.
// Keep these exports to avoid cascading TS errors outside the redesign scope.

export const fontFamilies = {
  serifRegular: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_700Bold_Italic',
  playfairBold: 'PlayfairDisplay_700Bold',
  playfairBoldItalic: 'PlayfairDisplay_700Bold_Italic',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
} as const;

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 2-column bento grid: 24px padding each side, 12px gap between columns
export const CARD_SIZE = (SCREEN_WIDTH - 48 - 12) / 2;
