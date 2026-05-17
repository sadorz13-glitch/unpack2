// Archived 2026-05-13: Exported but never rendered anywhere in the app.
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { colors } from '../theme';

type Props = { size?: number };

export function ShimmerTile({ size }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.10] });
  return (
    <Animated.View style={{
      width: size || 40, height: 8, borderRadius: 4,
      backgroundColor: colors.accent, opacity, marginBottom: 6,
    }} />
  );
}
