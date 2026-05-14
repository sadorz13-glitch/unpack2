import { useEffect } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

interface Props {
  total: number;
  current: number;
  style?: ViewStyle;
}

function Segment({
  active,
  accentColor,
  inactiveColor,
  fullRadius,
}: {
  active: boolean;
  accentColor: string;
  inactiveColor: string;
  fullRadius: number;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? accentColor : inactiveColor,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        styles.segment,
        { borderRadius: fullRadius },
      ]}
    />
  );
}

export function ProgressSegments({ total, current, style }: Props) {
  const { colors, radius } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: total }, (_, i) => (
        <Segment
          key={i}
          active={i < current}
          accentColor={colors['accent-primary']}
          inactiveColor={colors['bg-surface-variant']}
          fullRadius={radius.full}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 4,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
  },
});
