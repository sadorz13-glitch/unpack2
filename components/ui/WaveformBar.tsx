import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet, AccessibilityInfo, Animated } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnUI,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const BAR_COUNT = 32;
const BAR_WIDTH = 4;
const BAR_GAP = 4;
const BAR_MIN = 8;
const BAR_MAX = 60;
const CONTAINER_HEIGHT = 80;

// meteringLevelAnim from useVoice ranges 1.0 (silent) → ~3.5 (loud).
// Map it to a 0–1 normalized amplitude SharedValue.
const METERING_MIN = 1.0;
const METERING_MAX = 3.5;

interface BarProps {
  index: number;
  amplitudeSV: SharedValue<number>; // 0–1 normalized
  active: SharedValue<boolean>;
  accentColor: string;
  fullRadius: number;
  reduceMotion: boolean;
}

function Bar({ index, amplitudeSV, active, accentColor, fullRadius, reduceMotion }: BarProps) {
  const height = useSharedValue(BAR_MIN);

  // Idle target height for this bar — sine-wave stagger based on index.
  const idleMid = (BAR_MIN + BAR_MAX) / 2;
  const idleRange = (BAR_MAX - BAR_MIN) * 0.2;
  const offset = (index / BAR_COUNT) * Math.PI * 2;
  const idleTarget =
    idleMid - idleRange + Math.sin(offset) * idleRange + idleRange * (index % 2 === 0 ? 1 : -1);

  // Derive the desired height on the UI thread — no JS-thread useEffect needed.
  useDerivedValue(() => {
    if (reduceMotion) {
      height.value = withTiming(BAR_MIN, { duration: 200 });
      return;
    }

    if (!active.value) {
      // Idle: animate to staggered sine target, repeat.
      // Only restart the repeat animation when transitioning to idle
      // (cancelAnimation + withRepeat handles idempotency via Reanimated 4).
      height.value = withRepeat(
        withTiming(idleTarget, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      // Active: snap to amplitude-driven height.
      const clamped = Math.max(0, Math.min(1, amplitudeSV.value));
      const target = BAR_MIN + (BAR_MAX - BAR_MIN) * clamped;
      cancelAnimation(height);
      height.value = withTiming(target, { duration: 50, easing: Easing.linear });
    }
  });

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Reanimated.View
      style={[
        animStyle,
        styles.bar,
        {
          backgroundColor: accentColor,
          borderRadius: fullRadius,
          width: BAR_WIDTH,
        },
      ]}
    />
  );
}

interface Props {
  /** Legacy number amplitude (0–1). Ignored when meteringLevelAnim is provided. */
  amplitude?: number;
  active?: boolean;
  style?: ViewStyle;
  /**
   * Pass the Animated.Value from useVoice's meteringLevelAnim for live reactivity.
   * Ranges 1.0 (silent) → ~3.5 (loud). WaveformBar bridges it internally to a
   * Reanimated SharedValue so the animation runs fully on the UI thread.
   */
  meteringLevelAnim?: Animated.Value;
}

export function WaveformBar({ amplitude = 0, active = false, style, meteringLevelAnim }: Props) {
  const { colors, radius } = useTheme();
  const [reduceMotion, setReduceMotion] = React.useState(false);

  // Shared values visible to Bar components — mutated on UI thread.
  const amplitudeSV = useSharedValue(0);
  const activeSV = useSharedValue(active);

  // Keep activeSV in sync with the active prop.
  useEffect(() => {
    runOnUI(() => {
      'worklet';
      activeSV.value = active;
    })();
  }, [active]);

  // Bridge meteringLevelAnim (Animated.Value) → amplitudeSV (Reanimated SharedValue).
  useEffect(() => {
    if (meteringLevelAnim) {
      const id = meteringLevelAnim.addListener(({ value }) => {
        const normalized =
          (value - METERING_MIN) / (METERING_MAX - METERING_MIN);
        runOnUI(() => {
          'worklet';
          amplitudeSV.value = Math.max(0, Math.min(1, normalized));
        })();
      });
      return () => meteringLevelAnim.removeListener(id);
    } else {
      // Fallback: sync plain amplitude prop via runOnUI.
      runOnUI(() => {
        'worklet';
        amplitudeSV.value = Math.max(0, Math.min(1, amplitude));
      })();
    }
  }, [meteringLevelAnim, amplitude]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => setReduceMotion(enabled))
      .catch(() => undefined);
  }, []);

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <Bar
          key={i}
          index={i}
          amplitudeSV={amplitudeSV}
          active={activeSV}
          accentColor={colors['accent-primary']}
          fullRadius={radius.full}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
  },
});
