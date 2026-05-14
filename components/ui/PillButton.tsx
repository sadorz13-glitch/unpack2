import { Pressable, Text, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PillButton({ label, onPress, disabled, icon: Icon, style }: Props) {
  const { colors, typography, radius } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  function handlePressIn() {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(0.8);
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(1);
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[
        animStyle,
        styles.base,
        {
          height: 56,
          borderRadius: radius.full,
          backgroundColor: colors['accent-primary'],
          opacity: disabled ? 0.3 : 1,
        },
        style,
      ]}
    >
      <Text style={[typography.buttonText, { color: colors['text-on-primary'] }]}>
        {label}
      </Text>
      {Icon && (
        <Icon
          size={18}
          color={colors['text-on-primary']}
          strokeWidth={1.5}
          style={{ marginLeft: 8 }}
        />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    minWidth: 44,
    minHeight: 44,
  },
});
