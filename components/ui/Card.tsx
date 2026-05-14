import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  const { colors, radius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors['bg-secondary'],
          borderColor: colors['border-subtle'],
          borderRadius: radius.md,
          ...shadows.elevation1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 120,
    padding: 24,
    borderWidth: 1,
  },
});
