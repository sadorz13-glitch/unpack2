// Archived 2026-05-13: Exported but never rendered anywhere in the app.
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface Props {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, visible, onHide }: Props) {
  const { colors, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(1, { duration: 300 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-80, {
          duration: 250,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(onHide)();
          }
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-80, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        styles.base,
        {
          backgroundColor: colors['accent-primary'],
          borderRadius: radius.md,
          top: insets.top + 16,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={[typography.body, { color: colors['text-on-primary'] }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 9999,
  },
});
