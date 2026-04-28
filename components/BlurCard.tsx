import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';
import { colors, radius } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: BlurViewProps['tint'];
};

export function BlurCard({ children, style, intensity = 18, tint = 'dark' }: Props) {
  return (
    <BlurView intensity={intensity} tint={tint} style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
});
