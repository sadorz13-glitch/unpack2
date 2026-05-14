import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface Props {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onPress: () => void;
}

export function TabBarItem({ icon: Icon, label, active, onPress }: Props) {
  const { colors, typography, isDark } = useTheme();

  const iconColor = active ? colors['accent-primary'] : colors['text-tertiary'];
  const labelColor = active
    ? isDark
      ? colors['accent-primary']
      : colors['text-primary']
    : colors['text-tertiary'];

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={styles.container}
    >
      <Icon size={24} color={iconColor} strokeWidth={1.5} />
      <View style={styles.indicatorRow}>
        {active && (
          <View
            style={[
              styles.activeDot,
              { backgroundColor: colors['accent-primary'] },
            ]}
          />
        )}
      </View>
      <Text
        style={[
          typography.labelSm,
          {
            color: labelColor,
            marginTop: 2,
            fontWeight: active ? '600' : undefined,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 44,
  },
  indicatorRow: {
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
