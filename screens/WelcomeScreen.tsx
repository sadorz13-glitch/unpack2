import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontFamilies } from '../theme';

type Props = {
  onDone: () => void;
};

const GOLD = colors.accent;
const DIM  = 'rgba(180,140,90,0.4)';

function HomeIllustration() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V10.5z"
        stroke={GOLD} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

function SessionIllustration() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"
        stroke={GOLD} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

function TalkIllustration() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={GOLD} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}

function JournalIllustration() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={GOLD} strokeWidth={1.2} />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={GOLD} strokeWidth={1.2} />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={GOLD} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={GOLD} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

const SLIDES = [
  {
    Icon: HomeIllustration,
    label: 'HOME',
    title: 'your dashboard',
    body: "See your streak, session count, and quick-access tiles for everything you've built. Tap START SESSION whenever you're ready.",
  },
  {
    Icon: SessionIllustration,
    label: 'SESSION',
    title: 'unpack yourself',
    body: "Answer 3 honest questions, get an insight, then decide — keep going or call it done. Swipe left to exit and save your question for next time.",
  },
  {
    Icon: TalkIllustration,
    label: 'TALK IT OUT',
    title: 'your ai therapist',
    body: "Have a real conversation about what's surfaced in your sessions. It knows your patterns. Unlocks after your first session.",
  },
  {
    Icon: JournalIllustration,
    label: 'JOURNAL',
    title: 'look back, write more',
    body: "Browse every past session on a calendar. Write free-form journal entries. Read your answers from any day.",
  },
];

export function WelcomeScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, backgroundColor: colors.bg }]}>
      <Text style={styles.wordmark}>UNPACK</Text>

      <View style={styles.slideContent}>
        <slide.Icon />
        <Text style={styles.tabLabel}>{slide.label}</Text>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideBody}>{slide.body}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => isLast ? onDone() : setPage(p => p + 1)}
      >
        <Text style={styles.nextBtnText}>{isLast ? "LET'S GO" : 'NEXT'}</Text>
      </TouchableOpacity>

      {!isLast && (
        <TouchableOpacity onPress={onDone} style={{ marginTop: spacing.lg }}>
          <Text style={styles.skipText}>skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  wordmark: { color: colors.textSecondary, fontSize: 11, letterSpacing: 6 },
  slideContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base, paddingHorizontal: spacing.lg },
  tabLabel: { color: DIM, fontSize: 9, letterSpacing: 5, marginTop: spacing.md },
  slideTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 26, color: colors.textPrimary, textAlign: 'center' },
  slideBody: { color: colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: spacing.sm },
  dots: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(180,140,90,0.2)' },
  dotActive: { backgroundColor: GOLD, width: 16 },
  nextBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)', borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xxl, alignItems: 'center', width: '100%' },
  nextBtnText: { color: GOLD, fontSize: 11, letterSpacing: 6 },
  skipText: { color: colors.textGhost, fontSize: 11, letterSpacing: 3 },
});
