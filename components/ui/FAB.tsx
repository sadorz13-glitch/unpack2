import { useEffect } from 'react';
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
  accessibilityLabel: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FAB({ icon: Icon, onPress, accessibilityLabel, style }: Props) {
  const { colors, radius, shadows } = useTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.5 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[
        animStyle,
        styles.base,
        {
          backgroundColor: colors['accent-primary'],
          borderRadius: radius.lg,
          ...shadows.elevation2,
        },
        style,
      ]}
    >
      <Icon size={24} color={colors['text-on-primary']} strokeWidth={1.5} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
