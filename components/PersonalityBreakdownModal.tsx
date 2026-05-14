import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FullRadar } from './Radar';
import { TRAITS, TRAIT_DESCRIPTIONS } from '../constants';
import { fontFamilies, colors } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  traits: Record<string, number>;
  eyebrow?: string;
  heading?: string;
  takeaway?: string;
};

export default function PersonalityBreakdownModal({
  visible, onClose, traits,
  eyebrow = 'YOUR PERSONALITY',
  heading = 'Your Traits',
  takeaway,
}: Props) {
  const strongest = TRAITS.reduce((a, b) => (traits[a] ?? 0) >= (traits[b] ?? 0) ? a : b);
  const takeawayText = takeaway ?? `Your strongest trait right now is ${strongest}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.heading}>{heading}</Text>

          <View style={styles.radarWrap}>
            <FullRadar traits={traits} />
          </View>

          <View style={styles.divider} />

          {TRAITS.map(trait => {
            const pct = Math.round(traits[trait] ?? 0);
            const desc = TRAIT_DESCRIPTIONS[trait];
            return (
              <View key={trait} style={styles.traitRow}>
                <View style={styles.traitHeader}>
                  <Text style={styles.traitName}>{trait}</Text>
                  <Text style={styles.traitPct}>{pct}%</Text>
                </View>
                {desc ? <Text style={styles.traitDesc}>{desc}</Text> : null}
              </View>
            );
          })}

          <View style={styles.takeawayDivider} />
          <Text style={styles.takeaway}>{takeawayText}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 20 },
  closeBtn: { alignSelf: 'flex-end', padding: 20 },
  closeTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },
  scroll: { padding: 28, paddingTop: 8, paddingBottom: 60 },
  eyebrow: {
    color: 'rgba(180,140,90,0.55)',
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 8,
  },
  heading: {
    fontFamily: fontFamilies.serifItalic,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 26,
    letterSpacing: 0.5,
  },
  radarWrap: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(180,140,90,0.12)',
    marginBottom: 28,
  },
  traitRow: {
    marginBottom: 22,
  },
  traitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  traitName: {
    fontFamily: fontFamilies.serifRegular,
    color: colors['accent-gold'],
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  traitPct: {
    fontFamily: fontFamilies.serifItalic,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
  },
  traitDesc: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 13,
    lineHeight: 20,
  },
  takeawayDivider: {
    height: 1,
    backgroundColor: 'rgba(180,140,90,0.12)',
    marginTop: 6,
    marginBottom: 24,
  },
  takeaway: {
    fontFamily: fontFamilies.serifItalic,
    color: 'rgba(180,140,90,0.85)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
