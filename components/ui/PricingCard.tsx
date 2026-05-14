import { Pressable, View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Tag } from './Tag';
import { RadioButton } from './RadioButton';

interface Props {
  title: string;
  price: string;
  period: string;
  selected: boolean;
  onPress: () => void;
  savingsBadge?: string;
  trialBadge?: string;
  style?: ViewStyle;
}

export function PricingCard({
  title,
  price,
  period,
  selected,
  onPress,
  savingsBadge,
  trialBadge,
  style,
}: Props) {
  const { colors, typography, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${title}, ${price} ${period}${selected ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.base,
        {
          backgroundColor: colors['bg-secondary'],
          borderRadius: radius.lg,
          borderColor: selected ? colors['accent-primary'] : colors['border-subtle'],
          borderWidth: selected ? 2 : 1,
        },
        style,
      ]}
    >
      {trialBadge ? (
        <View
          style={[
            styles.trialBadge,
            { backgroundColor: '#000000', borderRadius: radius.full },
          ]}
        >
          <Text style={[typography.labelSm, { color: '#ffffff' }]}>
            {trialBadge}
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[typography.h3, { color: colors['text-primary'] }]}>
            {title}
          </Text>
          <Text style={[typography.bodyLarge, { color: colors['text-primary'], marginTop: 4 }]}>
            {price}
          </Text>
          <Text style={[typography.caption, { color: colors['text-secondary'], marginTop: 2 }]}>
            {period}
          </Text>
        </View>

        <View style={styles.rightColumn}>
          {savingsBadge ? (
            <Tag
              label={savingsBadge}
              style={{ alignSelf: 'flex-end', marginBottom: 8 }}
            />
          ) : null}
          <RadioButton
            selected={selected}
            onPress={onPress}
            accessibilityLabel={`Select ${title}`}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 20,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  trialBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
