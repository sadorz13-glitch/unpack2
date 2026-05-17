import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet, AccessibilityInfo, Animated } from 'react-native';
import Reanimated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  Easing,
  runOnUI,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const BAR_COUNT = 41;
const BAR_WIDTH = 3;
const BAR_GAP = 3;
const BAR_MIN = 7;
const BAR_MAX = 58;
const CONTAINER_HEIGHT = 80;
const LOOP_RADIANS = Math.PI * 2;

// meteringLevelAnim from useVoice ranges 1.0 (silent) to ~3.5 (loud).
// Map it to a 0-1 normalized amplitude SharedValue.
const METERING_MIN = 1.0;
const METERING_MAX = 3.5;

interface BarProps {
  index: number;
  amplitudeSV: SharedValue<number>;
  activeSV: SharedValue<boolean>;
  reduceMotionSV: SharedValue<boolean>;
  phaseSV: SharedValue<number>;
  baseColor: string;
  accentColor: string;
}

function Bar({ index, amplitudeSV, activeSV, reduceMotionSV, phaseSV, baseColor, accentColor }: BarProps) {
  const position = index / (BAR_COUNT - 1);
  const centerDistance = Math.abs(position - 0.5) * 2;
  const envelope = Math.sin(position * Math.PI) ** 0.62;
  const phaseOffset = index * 1.731 + (index % 5) * 0.619;
  const speed = 0.72 + (index % 7) * 0.065;
  const idleHeight = BAR_MIN + envelope * 7 + (index % 3) * 1.5;
  const floor = BAR_MIN + (1 - centerDistance) * 3;

  const animStyle = useAnimatedStyle(() => {
    const clamped = Math.max(0, Math.min(1, amplitudeSV.value));
    const phase = phaseSV.value * speed + phaseOffset;
    const shimmerA = (Math.sin(phase) + 1) / 2;
    const shimmerB = (Math.sin(phase * 0.61 + index * 0.43) + 1) / 2;
    const texture = 0.42 + shimmerA * 0.36 + shimmerB * 0.22;
    const energy = Math.min(1, clamped * (0.42 + envelope * 0.88) * texture);
    const target = reduceMotionSV.value
      ? BAR_MIN
      : activeSV.value
        ? floor + (BAR_MAX - floor) * energy
        : idleHeight;

    return {
      height: withTiming(target, {
        duration: activeSV.value ? 82 : 260,
        easing: Easing.out(Easing.quad),
      }),
      backgroundColor: interpolateColor(clamped, [0, 1], [baseColor, accentColor]),
    };
  });

  return (
    <Reanimated.View
      style={[
        animStyle,
        styles.bar,
        {
          width: BAR_WIDTH,
        },
      ]}
    />
  );
}

interface Props {
  /** Legacy number amplitude (0-1). Ignored when meteringSV or meteringLevelAnim is provided. */
  amplitude?: number;
  active?: boolean;
  style?: ViewStyle;
  /** Preferred: Reanimated SharedValue (0-1) from useVoice/useTTS. Bypasses Animated.Value bridge. */
  meteringSV?: SharedValue<number>;
  /** Legacy: Animated.Value from useVoice. Used only when meteringSV is absent. */
  meteringLevelAnim?: Animated.Value;
}

export function WaveformBar({ amplitude = 0, active = false, style, meteringSV, meteringLevelAnim }: Props) {
  const { colors } = useTheme();

  const fallbackAmplitudeSV = useSharedValue(amplitude);
  const activeSV = useSharedValue(active);
  const reduceMotionSV = useSharedValue(false);
  const phaseSV = useSharedValue(0);
  const amplitudeSourceSV = meteringSV ?? fallbackAmplitudeSV;

  useEffect(() => {
    runOnUI(() => {
      'worklet';
      activeSV.value = active;
    })();
  }, [active]);

  useEffect(() => {
    if (meteringSV) return;
    if (meteringLevelAnim) {
      const id = meteringLevelAnim.addListener(({ value }) => {
        const normalized = (value - METERING_MIN) / (METERING_MAX - METERING_MIN);
        runOnUI(() => {
          'worklet';
          fallbackAmplitudeSV.value = Math.max(0, Math.min(1, normalized));
        })();
      });
      return () => meteringLevelAnim.removeListener(id);
    }

    runOnUI(() => {
      'worklet';
      fallbackAmplitudeSV.value = Math.max(0, Math.min(1, amplitude));
    })();
  }, [meteringSV, meteringLevelAnim, amplitude]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        runOnUI(() => {
          'worklet';
          reduceMotionSV.value = enabled;
        })();
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    phaseSV.value = withRepeat(
      withTiming(LOOP_RADIANS, { duration: 1800, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <Bar
          key={i}
          index={i}
          amplitudeSV={amplitudeSourceSV}
          activeSV={activeSV}
          reduceMotionSV={reduceMotionSV}
          phaseSV={phaseSV}
          baseColor={colors['text-tertiary']}
          accentColor={colors['accent-gold']}
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
    borderRadius: 1,
  },
});
