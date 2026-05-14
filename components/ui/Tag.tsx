import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  label: string;
  style?: ViewStyle;
}

export function Tag({ label, style }: Props) {
  const { colors, typography, radius } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors['bg-surface'],
          borderRadius: radius.full,
        },
        style,
      ]}
    >
      <Text style={[typography.labelSm, { color: colors['text-secondary'] }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
