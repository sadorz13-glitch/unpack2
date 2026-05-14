import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { PanGestureHandler, State, type HandlerStateChangeEvent, type PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Settings, Mic, Lock } from 'lucide-react-native';
import { useTheme } from '../theme';
import {
  IconButton,
  Card,
  HeroImageCard,
  OutlinedPillButton,
  SectionDivider,
  AILabel,
} from '../components/ui';
import { PaywallScreen } from './PaywallScreen';
import PersonalityBreakdownModal from '../components/PersonalityBreakdownModal';
import { TRAITS } from '../constants';

import { dailyHeroImageUrl } from '../lib/dailyFeature';

// ─── Daily Feature stub (Phase 4 will wire real lib/dailyFeature) ─────────────
function buildDailyFeature() {
  return {
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    title: "Today's Reflection",
    quote: 'What part of you are you leaving unexplored?',
    imageUrl: dailyHeroImageUrl,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  streakDisplayValue: any;
  showFireEmoji: boolean;
  fireFloatAnim: Animated.Value;
  fireOpacityAnim: Animated.Value;
  streakScaleAnim: Animated.Value;
  onStartSession: () => void;
  onOpenTalk: () => void;
  onOpenJournal: () => void;
  onOpenAnswers: () => void;
  onOpenSettings: () => void;
  onOpenDrawer?: () => void;
  userId: string;
  isPremium: boolean;
  onPremiumStatusChanged: () => void;
  canRevive: boolean;
  onReclaimStreak: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TodayScreen = function TodayScreen({
  streakDays,
  sessionCount,
  sessionCountLoaded,
  hasSessionToday,
  insight,
  insightShort,
  traits,
  weeklyTraits,
  topic,
  therapyPreview,
  dayNote,
  freshSession,
  streakDisplayValue,
  showFireEmoji,
  fireFloatAnim,
  fireOpacityAnim,
  streakScaleAnim,
  onStartSession,
  onOpenTalk,
  onOpenJournal,
  onOpenAnswers,
  onOpenSettings,
  onOpenDrawer,
  userId,
  isPremium,
  onPremiumStatusChanged,
  canRevive,
  onReclaimStreak,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = useTheme();

  const [showPaywall, setShowPaywall] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  const dailyFeature = buildDailyFeature();

  const topTrait = traits
    ? TRAITS.reduce((a: string, b: string) =>
        (traits[a] ?? 0) > (traits[b] ?? 0) ? a : b
      )
    : null;

  const displayStreak = streakDisplayValue || streakDays;
  const isStreakActive = streakDays > 0 && (hasSessionToday || !!dayNote);
  const streakColor = isStreakActive ? colors['accent-gold'] : colors['text-tertiary'];

  if (__DEV__) {
    const streakState = streakDays > 0
      ? (isStreakActive ? 'STATE1_gold' : 'STATE2_pending')
      : canRevive ? 'STATE3_revive' : 'STATE4_none';
    console.log('[HomeScreen streak]', { streakDays, hasSessionToday, canRevive, streakState });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors['bg-primary'] }]}>

      {/* ── Pinned top bar ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing['margin-screen'],
            borderBottomColor: colors['border-subtle'],
          },
        ]}
      >
        <IconButton
          icon={Menu}
          onPress={() => onOpenDrawer?.()}
          accessibilityLabel="Open menu"
        />

        <Text style={[typography.h2, { color: colors['text-primary'] }]}>
          Unpack
        </Text>

        <IconButton
          icon={Settings}
          onPress={onOpenSettings}
          accessibilityLabel="Open settings"
        />
      </View>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: spacing['margin-screen'],
            paddingBottom: 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Daily Feature ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text
            style={[
              typography.labelCaps,
              { color: colors['text-tertiary'], marginBottom: spacing.sm },
            ]}
          >
            {dailyFeature.date}
          </Text>

          <Text
            style={[
              typography.h1,
              { color: colors['text-primary'], marginBottom: spacing.md },
            ]}
          >
            {dailyFeature.title}
          </Text>

          <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
            <AILabel />
          </View>
          <HeroImageCard
            imageUrl={dailyFeature.imageUrl}
            quote={dailyFeature.quote}
            ctaLabel="REFLECT NOW"
            onCtaPress={onStartSession}
          />
        </View>

        {/* ── Talk-It-Out card ───────────────────────────────────────────── */}
        <Card style={styles.talkCard}>
          <Mic
            size={24}
            color={colors['accent-primary']}
            strokeWidth={1.5}
          />

          <Text
            style={[
              typography.h3,
              { color: colors['text-primary'], marginTop: spacing.sm },
            ]}
          >
            Something on your mind?
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: colors['text-secondary'],
                marginTop: spacing.xs,
                marginBottom: spacing.md,
              },
            ]}
          >
            {therapyPreview || 'Start a conversation with yourself'}
          </Text>

          <TouchableOpacity
            onPress={onOpenTalk}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Start recording"
          >
            <Text
              style={[
                typography.labelCaps,
                { color: colors['accent-primary'] },
              ]}
            >
              START RECORDING →
            </Text>
          </TouchableOpacity>
        </Card>

        {/* ── Membership card (free users only) ─────────────────────────── */}
        {!isPremium && (
          <Card style={styles.membershipCard}>
            <Lock
              size={24}
              color={colors['text-tertiary']}
              strokeWidth={1.5}
            />

            <Text
              style={[
                typography.labelCaps,
                { color: colors['text-secondary'], marginTop: spacing.sm },
              ]}
            >
              Infinite Journal
            </Text>

            <Text
              style={[
                typography.body,
                {
                  color: colors['text-secondary'],
                  marginTop: spacing.xs,
                  marginBottom: spacing.md,
                },
              ]}
            >
              Unlock voice sessions, unlimited journal, and deeper insights.
            </Text>

            <OutlinedPillButton
              label="UNLOCK ACCESS"
              onPress={() => setShowPaywall(true)}
            />
          </Card>
        )}

        {/* ── The Archive section ────────────────────────────────────────── */}
        <SectionDivider label="THE ARCHIVE" />

        {/* Streak + Session counts */}
        <View style={styles.archiveStats}>
          {streakDays > 0 ? (
            <View style={styles.statItem}>
              <Animated.Text
                style={[
                  typography.h1,
                  {
                    color: streakColor,
                    transform: [{ scale: streakScaleAnim }],
                  },
                ]}
              >
                {displayStreak}
              </Animated.Text>
              <Text
                style={[
                  typography.labelCaps,
                  { color: colors['text-tertiary'], marginTop: spacing.xs },
                ]}
              >
                day streak
              </Text>
            </View>
          ) : canRevive ? (
            <View style={[styles.statItem, { alignItems: 'center' }]}>
              <Text
                style={[
                  typography.labelCaps,
                  { color: colors['text-tertiary'], marginBottom: spacing.sm },
                ]}
              >
                Streak broken
              </Text>
              <OutlinedPillButton
                label="RECLAIM YESTERDAY"
                onPress={onReclaimStreak}
              />
            </View>
          ) : null}

          {(streakDays > 0 || canRevive) && (
            <View style={[styles.statDivider, { backgroundColor: colors['border-strong'] }]} />
          )}

          <View style={styles.statItem}>
            <Text style={[typography.h1, { color: colors['text-primary'] }]}>
              {sessionCount}
            </Text>
            <Text
              style={[
                typography.labelCaps,
                { color: colors['text-tertiary'], marginTop: spacing.xs },
              ]}
            >
              sessions
            </Text>
          </View>
        </View>

        {/* Day note */}
        {!!dayNote && (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={[typography.body, { color: colors['text-primary'] }]}>
              {dayNote}
            </Text>
          </Card>
        )}

        {/* Latest insight */}
        {!!insight && (
          <View style={{ marginTop: spacing.md }}>
            <Text
              style={[
                typography.labelCaps,
                { color: colors['text-tertiary'], marginBottom: spacing.xs },
              ]}
            >
              Your latest insight
            </Text>
            <Text
              style={[
                typography.h3,
                { color: colors['text-secondary'] },
              ]}
            >
              {insightShort || insight}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Left-edge swipe overlay (native gesture, competes with PagerView) ── */}
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
          if (
            nativeEvent.state === State.END &&
            nativeEvent.translationX > 40 &&
            Math.abs(nativeEvent.translationY) < 80
          ) {
            onOpenDrawer?.();
          }
        }}
        activeOffsetX={[-9999, 5]}
        failOffsetY={[-20, 20]}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 30,
            zIndex: 50,
          }}
          pointerEvents="box-only"
        />
      </PanGestureHandler>

      {/* ── Modals (preserved from original) ──────────────────────────────── */}
      <PaywallScreen
        visible={showPaywall}
        source="weekly_wheel"
        onClose={() => setShowPaywall(false)}
        onSubscribed={() => { onPremiumStatusChanged(); return Promise.resolve(); }}
      />

      {traits && (
        <PersonalityBreakdownModal
          visible={showPersonalityModal}
          onClose={() => setShowPersonalityModal(false)}
          traits={traits}
        />
      )}

      {weeklyTraits && (
        <PersonalityBreakdownModal
          visible={showWeeklyModal}
          onClose={() => setShowWeeklyModal(false)}
          traits={weeklyTraits}
          eyebrow="THIS WEEK"
          heading="Weekly Breakdown"
          takeaway={`Your strongest trait this week is ${TRAITS.reduce(
            (a, b) => ((weeklyTraits[a] ?? 0) >= (weeklyTraits[b] ?? 0) ? a : b)
          )}`}
        />
      )}
    </View>
  );
};

// ─── Backwards-compat export ─────────────────────────────────────────────────
export const HomeScreen = TodayScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  scroll: {
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  talkCard: {
    marginBottom: 16,
  },
  membershipCard: {
    marginBottom: 16,
  },
  archiveStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
  },
  statItem: {
    alignItems: 'center',
    position: 'relative',
  },
  statDivider: {
    width: 1,
    height: 64,
    opacity: 0.3,
  },
});
