import { Dimensions } from 'react-native';

export const colors = {
  bg:            '#0a0a0a',
  surface:       'rgba(17,17,17,0.7)',
  surfaceBorder: 'rgba(180,140,90,0.15)',
  accent:        '#b48c5a',
  textPrimary:   '#e8e4dc',
  textSecondary: '#8a8480',
  textMuted:     '#6b6560',
  textGhost:     '#3a3530',
  border:        '#1e1e1e',
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   24,
  xl:   32,
  xxl:  48,
} as const;

export const radius = {
  card:   10,
  button: 2,
  dot:    2,
} as const;

// Font family names from @expo-google-fonts/dm-serif-display
export const fontFamilies = {
  serifRegular: 'DMSerifDisplay_400Regular',
  serifItalic:  'DMSerifDisplay_400Regular_Italic',
} as const;

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 2-column bento grid: 24px padding each side, 12px gap between columns
export const CARD_SIZE = (SCREEN_WIDTH - 48 - 12) / 2;
