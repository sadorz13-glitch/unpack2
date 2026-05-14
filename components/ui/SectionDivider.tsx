import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  label?: string;
  style?: ViewStyle;
}

export function SectionDivider({ label, style }: Props) {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <View style={styles.labeled}>
          <Text style={[typography.labelCaps, { color: colors['text-tertiary'] }]}>
            {label}
          </Text>
          <View style={[styles.line, { backgroundColor: colors['border-subtle'] }]} />
        </View>
      ) : (
        <View style={[styles.line, { backgroundColor: colors['border-subtle'] }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    marginBottom: 16,
  },
  labeled: {
    gap: 8,
  },
  line: {
    height: 1,
    width: '100%',
  },
});
