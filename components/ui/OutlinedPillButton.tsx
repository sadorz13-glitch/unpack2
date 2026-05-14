import { Pressable, Text, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OutlinedPillButton({ label, onPress, disabled, style }: Props) {
  const { colors, typography, radius } = useTheme();
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  function handlePressIn() {
    opacity.value = withSpring(0.6);
  }

  function handlePressOut() {
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
          borderColor: colors['accent-primary'],
          opacity: disabled ? 0.3 : 1,
        },
        style,
      ]}
    >
      <Text style={[typography.buttonText, { color: colors['accent-primary'] }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    borderWidth: 1,
    minWidth: 44,
    minHeight: 44,
    backgroundColor: 'transparent',
  },
});
