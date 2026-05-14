import React from 'react';
import { Pressable, View, Text, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';

type RightElement = 'chevron' | 'toggle' | 'radio' | React.ReactNode;

interface Props {
  title: string;
  subtitle?: string;
  rightElement?: RightElement;
  onPress?: () => void;
  rightValue?: string;
  style?: ViewStyle;
  titleColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ListRow({
  title,
  subtitle,
  rightElement,
  onPress,
  rightValue,
  style,
  titleColor,
}: Props) {
  const { colors, typography } = useTheme();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.value === 1
      ? colors['bg-surface']
      : colors['bg-secondary'],
  }));

  function handlePressIn() {
    pressed.value = withTiming(1, { duration: 100 });
  }

  function handlePressOut() {
    pressed.value = withTiming(0, { duration: 150 });
  }

  function renderRight() {
    if (rightElement === 'chevron') {
      return <ChevronRight size={20} color={colors['text-tertiary']} strokeWidth={1.5} />;
    }
    if (rightValue) {
      return (
        <Text style={[typography.body, { color: colors['text-tertiary'] }]}>
          {rightValue}
        </Text>
      );
    }
    if (rightElement && typeof rightElement !== 'string') {
      return <>{rightElement}</>;
    }
    return null;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityLabel={title}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={[animStyle, styles.base, style]}
    >
      <View style={styles.left}>
        <Text style={[typography.body, { color: titleColor ?? colors['text-primary'] }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              typography.caption,
              { color: colors['text-tertiary'], marginTop: 2 },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{renderRight()}</View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  right: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
