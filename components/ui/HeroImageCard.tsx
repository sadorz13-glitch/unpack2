import { ImageBackground, View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { PillButton } from './PillButton';

interface Props {
  imageUrl: string;
  quote: string;
  ctaLabel: string;
  onCtaPress: () => void;
  style?: ViewStyle;
}

export function HeroImageCard({ imageUrl, quote, ctaLabel, onCtaPress, style }: Props) {
  const { colors, typography, radius } = useTheme();

  const containerStyle = [
    styles.container,
    { borderRadius: radius.lg, overflow: 'hidden' as const },
    style,
  ];

  const innerContent = (
    <>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text
          style={[
            typography.h3,
            styles.quote,
            { color: '#ffffff' },
          ]}
          numberOfLines={4}
        >
          {quote}
        </Text>
        <PillButton
          label={ctaLabel}
          onPress={onCtaPress}
          style={styles.cta}
        />
      </View>
    </>
  );

  if (!imageUrl) {
    // No image URL — render a solid background using the theme's secondary color
    // instead of passing an empty uri to ImageBackground (which triggers a warning).
    return (
      <View style={[containerStyle, { backgroundColor: colors['bg-secondary'] }]}>
        <View style={styles.image}>{innerContent}</View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
        imageStyle={{ borderRadius: radius.lg }}
      >
        {/* Gradient overlay using a View since expo-linear-gradient is not installed */}
        {innerContent}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    padding: 24,
    gap: 12,
  },
  quote: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cta: {
    height: 44,
    paddingHorizontal: 24,
  },
});
