import { useEffect, useRef } from 'react';
import { Pressable, ViewStyle, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Mic } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface Props {
  active?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MicButton({ active, onPress, style }: Props) {
  const { colors, radius, shadows } = useTheme();
  const scale = useSharedValue(1);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      reduceMotionRef.current = enabled;
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (active && !reduceMotionRef.current) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      scale.value = withSpring(1);
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    if (!active) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  }

  const activeShadow = active ? shadows.elevation3 : shadows.elevation2;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={active ? 'Stop recording' : 'Start recording'}
      accessibilityRole="button"
      style={[
        animStyle,
        styles.base,
        {
          backgroundColor: colors['accent-primary'],
          borderRadius: radius.xl,
          ...activeShadow,
        },
        style,
      ]}
    >
      <Mic size={32} color={colors['text-on-primary']} strokeWidth={1.5} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
