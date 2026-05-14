import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

interface Props {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RadioButton({ selected, onPress, accessibilityLabel }: Props) {
  const { colors, radius } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
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
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[animStyle, styles.hitSlop]}
    >
      <View
        style={[
          styles.outer,
          {
            borderRadius: radius.full,
            borderColor: selected ? colors['accent-primary'] : colors['text-tertiary'],
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.inner,
              {
                backgroundColor: colors['accent-primary'],
                borderRadius: radius.full,
              },
            ]}
          />
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  hitSlop: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 12,
    height: 12,
  },
});
