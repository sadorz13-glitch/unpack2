import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BlurCard } from '../components/BlurCard';
import { MiniRadar } from '../components/Radar';
import { ShimmerTile } from '../components/ShimmerTile';
import { PaywallScreen } from './PaywallScreen';
import { colors, spacing, fontFamilies, CARD_SIZE } from '../theme';
import { TRAITS } from '../constants';

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth={1.5} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

type Props = {
  streakDays: number;
  sessionCount: number;
  sessionCountLoaded: boolean;
  hasSessionToday: boolean;
  insight: string;
  insightShort: string;
  traits: Record<string, number> | null;
  weeklyTraits: Record<string, number> | null;
  topic: string;
  therapyPreview: string | null;
  dayNote: string;
  freshSession: boolean;
  streakDisplayValue: number;
  showFireEmoji: boolean;
  fireFloatAnim: Animated.Value;
  fireOpacityAnim: Animated.Value;
  streakScaleAnim: Animated.Value;
  onStartSession: () => void;
  onOpenTalk: () => void;
  onOpenJournal: () => void;
  onOpenAnswers: () => void;
  onOpenSettings: () => void;
  userId: string | null;
  isPremium?: boolean;
  onPremiumStatusChanged?: () => Promise<void>;
  canRevive?: boolean;
  onReclaimStreak?: () => void;
};

export function HomeScreen({
  streakDays, sessionCount, sessionCountLoaded, hasSessionToday,
  insight, insightShort, traits, weeklyTraits, topic, therapyPreview, dayNote,
  freshSession, streakDisplayValue, showFireEmoji, fireFloatAnim, fireOpacityAnim,
  streakScaleAnim, onStartSession, onOpenTalk, onOpenJournal,
  onOpenAnswers, onOpenSettings, userId, isPremium = false, onPremiumStatusChanged,
  canRevive, onReclaimStreak,
}: Props) {
  const insets = useSafeAreaInsets();
  const topTrait = traits ? TRAITS.reduce((a: string, b: string) => ((traits[a] ?? 0) > (traits[b] ?? 0) ? a : b)) : null;
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.base, paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.tabTitle}>Home</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onOpenSettings} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <GearIcon color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.sessionCta} onPress={onStartSession}>
          <Text style={styles.sessionCtaText}>START SESSION</Text>
        </TouchableOpacity>

        <View style={styles.bento}>

          <View style={styles.wideTileWrapper}>
            <BlurCard style={styles.wideTile}>
              <View style={styles.streakInner}>
                <View>
                  <Text style={styles.tileLabel}>STREAK</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                    {showFireEmoji && (
                      <Animated.Text style={[styles.fireEmoji, { transform: [{ translateY: fireFloatAnim }], opacity: fireOpacityAnim }]}>🔥</Animated.Text>
                    )}
                    <Animated.Text style={[styles.streakNumber, { transform: [{ scale: streakScaleAnim }], color: hasSessionToday && streakDays > 0 ? colors.accent : colors.textGhost }]}>
                      {streakDisplayValue || streakDays}
                    </Animated.Text>
                    <Text style={styles.tileSubLabel}>DAYS</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tileLabel}>SESSIONS</Text>
                  <Text style={styles.sessionCountNumber}>{sessionCount}</Text>
                </View>
              </View>
              {canRevive && onReclaimStreak && (
                <TouchableOpacity onPress={onReclaimStreak} style={styles.reclaimBtn}>
                  <Text style={styles.reclaimTxt}>RECLAIM</Text>
                </TouchableOpacity>
              )}
            </BlurCard>
          </View>

          <TouchableOpacity
            onPress={() => { if (sessionCountLoaded && sessionCount === 0) return; onOpenTalk(); }}
            activeOpacity={0.8}
            style={styles.wideTileWrapper}
          >
            <BlurCard style={styles.wideTile}>
              <Text style={styles.tileLabel}>TALK IT OUT</Text>
              {sessionCountLoaded && sessionCount === 0 ? (
                <Text style={styles.lockedText}>🔒  Complete a session to unlock.</Text>
              ) : therapyPreview === null ? (
                <ShimmerTile size={CARD_SIZE * 0.5} />
              ) : therapyPreview === '' ? (
                <Text style={styles.previewText}>Complete a session to unlock your first preview.</Text>
              ) : (
                <Text style={[styles.previewText, { color: colors.accent, fontFamily: fontFamilies.serifItalic, fontSize: 13 }]} numberOfLines={3}>
                  {therapyPreview}
                </Text>
              )}
            </BlurCard>
          </TouchableOpacity>

          <View style={styles.halfRow}>
            <View style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>WHEEL</Text>
                <View style={styles.tileCenter}>
                  {freshSession && traits
                    ? <MiniRadar traits={traits} />
                    : <Text style={styles.previewText}>Complete{'\n'}a session</Text>
                  }
                </View>
              </BlurCard>
            </View>

            <TouchableOpacity onPress={onOpenJournal} activeOpacity={0.8} style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>JOURNAL</Text>
                <Text style={styles.previewText} numberOfLines={3}>
                  {dayNote || 'Tap to write...'}
                </Text>
              </BlurCard>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onOpenAnswers} activeOpacity={0.8} style={styles.wideTileWrapper}>
            <BlurCard style={styles.wideTile}>
              <Text style={styles.tileLabel}>MY ANSWERS</Text>
              <Text style={styles.previewText} numberOfLines={2}>
                {insight ? (insightShort || insight.split(' ').slice(0, 10).join(' ') + '...') : 'Complete a session'}
              </Text>
            </BlurCard>
          </TouchableOpacity>

          <View style={styles.halfRow}>
            <View style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>TOP TRAIT</Text>
                {traits && topTrait ? (
                  <View style={styles.tileCenter}>
                    <Text style={styles.bigNumber}>{traits[topTrait]}%</Text>
                    <Text style={[styles.tileSubLabel, { marginTop: 2 }]}>{topTrait.toUpperCase()}</Text>
                  </View>
                ) : (
                  <Text style={styles.previewText}>Complete{'\n'}a session</Text>
                )}
              </BlurCard>
            </View>

            <TouchableOpacity
              style={styles.halfTileWrapper}
              activeOpacity={weeklyTraits && !isPremium ? 0.8 : 1}
              onPress={() => { if (weeklyTraits && !isPremium) setShowPaywall(true); }}
            >
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>WEEKLY WHEEL</Text>
                {!weeklyTraits ? (
                  <Text style={styles.lockedText}>
                    {'Unlocks after\n5 sessions\n\n'}{Math.max(0, 5 - sessionCount)} to go
                  </Text>
                ) : !isPremium ? (
                  <View style={styles.tileCenter}>
                    <Text style={{ fontSize: 20, color: colors.textGhost }}>🔒</Text>
                    <Text style={[styles.tileSubLabel, { marginTop: spacing.sm }]}>PREMIUM</Text>
                  </View>
                ) : (
                  <MiniRadar traits={weeklyTraits} />
                )}
              </BlurCard>
            </TouchableOpacity>

            <PaywallScreen
              visible={showPaywall}
              source="weekly_wheel"
              onClose={() => setShowPaywall(false)}
              onSubscribed={onPremiumStatusChanged ?? (() => Promise.resolve())}
            />
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tabTitle: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 22,
    color: colors.accent,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  headerDate: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 3,
  },
  sessionCta: {
    borderWidth: 1,
    borderColor: 'rgba(180,140,90,0.4)',
    borderRadius: 2,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sessionCtaText: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 6,
  },
  bento: { gap: spacing.md },
  wideTileWrapper: { width: '100%' },
  wideTile: { padding: spacing.base },
  halfRow: { flexDirection: 'row', gap: spacing.md },
  halfTileWrapper: { flex: 1 },
  halfTile: { padding: spacing.base, minHeight: CARD_SIZE },
  tileLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  tileSubLabel: {
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: 2,
  },
  tileCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  streakInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  streakNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 40,
    lineHeight: 44,
    color: colors.accent,
  },
  sessionCountNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
  },
  bigNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 32,
    color: colors.accent,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  lockedText: {
    color: colors.textGhost,
    fontSize: 11,
    lineHeight: 18,
  },
  fireEmoji: {
    fontSize: 32,
    position: 'absolute',
    top: -16,
  },
  reclaimBtn: { marginTop: 6, alignSelf: 'center' },
  reclaimTxt: { color: 'rgba(180,140,90,0.7)', fontSize: 9, letterSpacing: 2 },
});
