import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function useStreak() {
  const [streakDisplayValue, setStreakDisplayValue] = useState(0);
  const [showFireEmoji, setShowFireEmoji] = useState(false);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const streakScaleAnim = useRef(new Animated.Value(1)).current;
  const fireFloatAnim = useRef(new Animated.Value(0)).current;
  const fireOpacityAnim = useRef(new Animated.Value(0)).current;

  // Safety net: clear fire emoji after animation duration in case callback doesn't fire
  useEffect(() => {
    if (!showFireEmoji) return;
    const timer = setTimeout(() => setShowFireEmoji(false), 2600);
    return () => clearTimeout(timer);
  }, [showFireEmoji]);

  function runStreakFireAnimation(oldStreak: number, newStreak: number) {
    setStreakDisplayValue(oldStreak);
    streakScaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(streakScaleAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
      Animated.timing(streakScaleAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setStreakDisplayValue(newStreak);
      setShowFireEmoji(true);
      fireFloatAnim.setValue(0);
      fireOpacityAnim.setValue(1);
      Animated.parallel([
        Animated.timing(fireFloatAnim, { toValue: -70, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(fireOpacityAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
        ]),
      ]).start(() => setShowFireEmoji(false));
      Animated.sequence([
        Animated.timing(streakScaleAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(streakScaleAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
      ]).start(() => setShowStreakCelebration(false));
    });
  }

  return {
    streakDisplayValue,
    showFireEmoji,
    showStreakCelebration,
    setShowStreakCelebration,
    streakScaleAnim,
    fireFloatAnim,
    fireOpacityAnim,
    runStreakFireAnimation,
  };
}
