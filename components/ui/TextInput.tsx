import { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  ViewStyle,
  StyleSheet,
  ReturnKeyType,
} from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
  returnKeyType?: ReturnKeyType;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}

export function TextInput({
  value,
  onChangeText,
  placeholder,
  error,
  disabled,
  style,
  returnKeyType,
  onSubmitEditing,
  autoFocus,
}: Props) {
  const { colors, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors['status-danger']
    : focused
    ? colors['accent-primary']
    : colors['border-strong'];

  const borderWidth = focused ? 2 : 1;

  return (
    <View style={[styles.container, { opacity: disabled ? 0.5 : 1 }, style]}>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors['text-tertiary']}
        editable={!disabled}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          typography.bodyLarge,
          styles.input,
          {
            color: colors['text-primary'],
            borderBottomColor: borderColor,
            borderBottomWidth: borderWidth,
          },
        ]}
      />
      {error ? (
        <Text style={[typography.caption, { color: colors['status-danger'], marginTop: 4 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: 48,
    paddingHorizontal: 0,
  },
});
