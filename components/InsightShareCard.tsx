import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  insight: string;
};

const InsightShareCard = forwardRef<View, Props>(({ insight }, ref) => (
  <View ref={ref} style={styles.card} collapsable={false}>
    {/* Top glow */}
    <View style={styles.topGlow} />

    {/* Gold rule */}
    <View style={styles.rule} />

    {/* Insight text */}
    <View style={styles.body}>
      <Text style={styles.quote}>"{insight}"</Text>
    </View>

    {/* Bottom rule */}
    <View style={styles.rule} />

    {/* Wordmark */}
    <View style={styles.footer}>
      <Text style={styles.wordmark}>UNPACK</Text>
      <Text style={styles.tagline}>unpack your mind</Text>
    </View>
  </View>
));

InsightShareCard.displayName = 'InsightShareCard';
export default InsightShareCard;

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,
    backgroundColor: '#0a0a0a',
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
    backgroundColor: 'rgba(180,140,90,0.07)',
  },
  rule: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(180,140,90,0.45)',
    marginVertical: 28,
  },
  body: {
    alignItems: 'center',
  },
  quote: {
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    fontSize: 22,
    color: 'rgba(255,255,255,0.92)',
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
    color: 'rgba(180,140,90,0.7)',
    fontSize: 11,
    letterSpacing: 6,
  },
  tagline: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 5,
  },
});
