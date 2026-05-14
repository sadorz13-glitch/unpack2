import { Pressable, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface Props {
  icon: LucideIcon;
  onPress: () => void;
  color?: string;
  accessibilityLabel: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({ icon: Icon, onPress, color, accessibilityLabel, style }: Props) {
  const { colors, radius } = useTheme();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.value === 1 ? colors['bg-surface'] : 'transparent',
    borderRadius: radius.full,
  }));

  function handlePressIn() {
    pressed.value = withSpring(1);
  }

  function handlePressOut() {
    pressed.value = withSpring(0);
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[animStyle, styles.base, style]}
    >
      <Icon
        size={24}
        color={color ?? colors['text-primary']}
        strokeWidth={1.5}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
