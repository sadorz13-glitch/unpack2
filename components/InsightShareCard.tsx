import { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  insight: string;
};

const InsightShareCard = forwardRef<View, Props>(({ insight }, ref) => {
  const { colors } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    card: {
      width: 360,
      height: 640,
      backgroundColor: colors['bg-primary'],
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      overflow: 'hidden',
    },
    topGlow: {
      position: 'absolute',
      top: -80,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: colors['accent-gold'],
      opacity: 0.07,
    },
    rule: {
      width: 48,
      height: 1,
      backgroundColor: colors['accent-gold'],
      opacity: 0.5,
      marginVertical: 28,
    },
    body: {
      alignItems: 'center',
    },
    quote: {
      fontFamily: 'DMSerifDisplay_400Regular_Italic',
      fontSize: 22,
      color: colors['text-primary'],
      textAlign: 'center',
      lineHeight: 34,
      letterSpacing: 0.3,
    },
    footer: {
      position: 'absolute',
      bottom: 44,
      alignItems: 'center',
    },
    wordmark: {
      color: colors['accent-gold'],
      fontSize: 11,
      letterSpacing: 6,
    },
    tagline: {
      color: colors['text-tertiary'],
      fontSize: 9,
      letterSpacing: 2,
      marginTop: 5,
    },
  }), [colors]);

  return (
    <View ref={ref} style={s.card} collapsable={false}>
      <View style={s.topGlow} />
      <View style={s.rule} />
      <View style={s.body}>
        <Text style={s.quote}>"{insight}"</Text>
      </View>
      <View style={s.rule} />
      <View style={s.footer}>
        <Text style={s.wordmark}>UNPACK</Text>
        <Text style={s.tagline}>unpack your mind</Text>
      </View>
    </View>
  );
});

InsightShareCard.displayName = 'InsightShareCard';
export default InsightShareCard;
