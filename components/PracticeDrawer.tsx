import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import { ChevronRight, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { ListRow } from './ui/ListRow';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PracticeDrawerProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  streakDays: number;
  sessionCount: number;
  traits: Record<string, number> | null;
  weeklyTraits: Record<string, number> | null;
  isPremium: boolean;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
  onSignOut: () => void;
}

type SessionRow = {
  insight_short: string | null;
  topic: string | null;
  created_at: string;
};

type ProfileRow = {
  name: string;
  memberSince: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.85, 360);
const SWIPE_CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(isoString: string): string {
  const d = new Date(
    /Z$|[+-]\d{2}:\d{2}$/.test(isoString) ? isoString : isoString + 'Z'
  );
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInsightPreview(session: SessionRow): string {
  const text = session.insight_short?.trim() ?? '';
  return text.length > 80 ? text.slice(0, 80) + '…' : text;
}

function topTraits(
  traits: Record<string, number>,
  count: number
): Array<[string, number]> {
  return Object.entries(traits)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PracticeDrawer({
  visible,
  onClose,
  userId,
  streakDays,
  sessionCount,
  traits,
  weeklyTraits,
  isPremium,
  onOpenSettings,
  onOpenAnalytics,
  onSignOut,
}: PracticeDrawerProps) {
  const { colors, typography, spacing, radius } = useTheme();

  // Animated values — translateX: 0 = visible, -DRAWER_WIDTH = hidden
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // isMounted guard — prevents setState after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Close animation → then call onClose ────────────────────────────────────

  const animateClose = useCallback((onComplete?: () => void) => {
    Animated.timing(translateX, {
      toValue: -DRAWER_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }).start(() => {
        // Call onClose first so parent unmounts drawer, then run optional callback
        onClose();
        onComplete?.();
      });
    });
  }, [translateX, backdropOpacity, onClose]);

  // ── Animate in/out when visible changes ────────────────────────────────────

  useEffect(() => {
    if (visible) {
      // Reset position before animating in (in case it was partially swiped)
      translateX.setValue(-DRAWER_WIDTH);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          stiffness: 280,
          damping: 30,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, backdropOpacity]);

  // ── Data fetch when drawer opens ───────────────────────────────────────────

  useEffect(() => {
    if (!visible || !userId) return;

    let cancelled = false;

    async function fetchProfile(): Promise<void> {
      try {
        const [profileResult, userResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('name')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);
        if (cancelled || !isMounted.current) return;
        if (profileResult.error) throw profileResult.error;
        const rawCreatedAt = userResult.data?.user?.created_at ?? null;
        const memberSince = rawCreatedAt
          ? new Date(rawCreatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : null;
        const row = profileResult.data as { name: string | null } | null;
        const authUser = userResult.data?.user ?? null;
        // Fallback chain: profiles.name → auth metadata name → email prefix → "Friend"
        // NEVER use app_metadata.provider (e.g. "google", "apple") as a display name
        const meta = authUser?.user_metadata as Record<string, string | undefined> | undefined;
        const resolvedName: string =
          (row?.name?.trim() && row.name.trim()) ||
          (meta?.name?.trim() && meta.name.trim()) ||
          (meta?.full_name?.trim() && meta.full_name.trim()) ||
          (authUser?.email ? authUser.email.split('@')[0] : '') ||
          'Friend';
        setProfile({ name: resolvedName, memberSince });
        if (__DEV__) console.log('[PracticeDrawer] resolvedName:', resolvedName, '| profiles.name:', row?.name, '| meta.name:', meta?.name, '| meta.full_name:', meta?.full_name);
      } catch {
        // TODO: add error handling here
      }
    }

    async function fetchRecentSessions(): Promise<void> {
      if (!isMounted.current || cancelled) return;
      setSessionsLoading(true);
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('insight_short, topic, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3);
        if (cancelled || !isMounted.current) return;
        if (error) throw error;
        setRecentSessions((data as SessionRow[]) ?? []);
      } catch {
        // TODO: add error handling here
      } finally {
        if (!cancelled && isMounted.current) setSessionsLoading(false);
      }
    }

    void fetchProfile();
    void fetchRecentSessions();

    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  // ── PanResponder — swipe left to close ─────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.min(0, gestureState.dx); // only allow leftward drag
        translateX.setValue(newX);
        // Fade backdrop proportionally
        const progress = 1 + newX / DRAWER_WIDTH; // 1 when dx=0, 0 when dx=-DRAWER_WIDTH
        backdropOpacity.setValue(Math.max(0, progress));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose =
          gestureState.dx < -SWIPE_CLOSE_THRESHOLD ||
          gestureState.vx < -SWIPE_VELOCITY_THRESHOLD;

        if (shouldClose) {
          animateClose();
        } else {
          // Snap back to open
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              stiffness: 280,
              damping: 30,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 160,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // ── Derived data ────────────────────────────────────────────────────────────

  const topWeeklyTrait = weeklyTraits
    ? topTraits(weeklyTraits, 1)[0]?.[0] ?? null
    : null;

  const top3Traits = traits ? topTraits(traits, 3) : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent={true}
      presentationStyle="overFullScreen"
      animationType="none"
      onRequestClose={() => animateClose()}
    >
      <View style={styles.root}>
        {/* Backdrop — tap outside to close */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors['overlay-scrim'],
              opacity: backdropOpacity,
            },
          ]}
        >
          <TouchableWithoutFeedback
            onPress={() => animateClose()}
            accessibilityLabel="Close drawer"
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors['bg-primary'],
              borderRightColor: colors['border-subtle'],
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Sentry.ErrorBoundary
            fallback={
              <View style={styles.errorFallback}>
                <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
                  Something went wrong. Please close and try again.
                </Text>
              </View>
            }
          >
            {/* Close button row */}
            <View
              style={[
                styles.closeRow,
                { borderBottomColor: colors['border-subtle'] },
              ]}
            >
              <IconButton
                icon={X}
                onPress={animateClose}
                color={colors['text-tertiary']}
                accessibilityLabel="Close"
              />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Section 1: Your Practice ──────────────────────────────── */}
              <Text
                style={[
                  typography.labelCaps,
                  {
                    color: colors['text-tertiary'],
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                YOUR PRACTICE
              </Text>

              {/* Profile row */}
              <View style={[styles.profileRow, { marginBottom: spacing.md }]}>
                <Text
                  style={[typography.h2, { color: colors['text-primary'] }]}
                >
                  {profile?.name ?? '—'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: isPremium ? colors['accent-gold'] : colors['text-tertiary'],
                    marginTop: 2,
                  }}
                >
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </Text>
                {profile?.memberSince ? (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors['text-tertiary'], marginTop: 2 },
                    ]}
                  >
                    Member since {profile.memberSince}
                  </Text>
                ) : null}
              </View>

              {/* Personality */}
              {sessionCount >= 5 && top3Traits.length > 0 ? (
                <View style={{ marginBottom: spacing.md }}>
                  <Text
                    style={[
                      typography.labelSm,
                      {
                        color: colors['text-secondary'],
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    Your personality
                  </Text>
                  {top3Traits.map(([traitName, value]) => (
                    <View key={traitName} style={styles.traitRow}>
                      <Text
                        style={[
                          typography.caption,
                          { color: colors['text-primary'], width: 110 },
                        ]}
                      >
                        {traitName}
                      </Text>
                      <View
                        style={[
                          styles.traitBarBg,
                          {
                            backgroundColor: colors['bg-surface-variant'],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.traitBarFill,
                            {
                              width: `${Math.min(value, 100)}%`,
                              backgroundColor: colors['accent-gold'],
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: colors['text-tertiary'],
                            width: 34,
                            textAlign: 'right',
                          },
                        ]}
                      >
                        {value}%
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors['text-tertiary'],
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  Complete 5 sessions to unlock your weekly wheel and personality profile.
                </Text>
              )}

              {/* Weekly top trait */}
              {topWeeklyTrait ? (
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors['text-secondary'],
                      marginBottom: spacing.lg,
                      fontStyle: 'italic',
                    },
                  ]}
                >
                  Your top trait this week: {topWeeklyTrait}
                </Text>
              ) : null}

              {/* ── Section 2: Your Insights ──────────────────────────────── */}
              <Text
                style={[
                  typography.labelCaps,
                  {
                    color: colors['text-tertiary'],
                    marginBottom: spacing.sm,
                    marginTop: spacing.md,
                  },
                ]}
              >
                YOUR INSIGHTS
              </Text>

              {sessionsLoading ? (
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors['text-tertiary'],
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  Loading...
                </Text>
              ) : recentSessions.length === 0 ? (
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors['text-tertiary'],
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  Complete your first session to see insights
                </Text>
              ) : (
                recentSessions.map((session, i) => (
                  <Card
                    key={i}
                    style={{
                      backgroundColor: colors['bg-surface'],
                      borderColor: colors['border-subtle'],
                      minHeight: 0,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.md,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Text
                      style={[
                        typography.labelCaps,
                        { color: colors['text-tertiary'], marginBottom: 4 },
                      ]}
                    >
                      {formatDateShort(session.created_at)}
                      {session.topic ? `  ·  ${session.topic}` : ''}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors['text-primary'],
                          fontStyle: 'italic',
                        },
                      ]}
                    >
                      {getInsightPreview(session)}
                    </Text>
                  </Card>
                ))
              )}

              <TouchableOpacity
                onPress={() => animateClose(() => onOpenAnalytics())}
                accessibilityLabel="View all insights"
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  minHeight: 44,
                  marginBottom: spacing.lg,
                }}
              >
                <Text
                  style={[
                    typography.labelSm,
                    { color: colors['text-secondary'], marginRight: 4 },
                  ]}
                >
                  View all insights
                </Text>
                <ChevronRight size={14} color={colors['text-secondary']} />
              </TouchableOpacity>

              {/* ── Section 3: Account ────────────────────────────────────── */}
              <Text
                style={[
                  typography.labelCaps,
                  {
                    color: colors['text-tertiary'],
                    marginBottom: spacing.xs,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                ACCOUNT
              </Text>

              <ListRow
                title="Manage subscription"
                rightElement="chevron"
                onPress={() =>
                  void Linking.openURL(
                    'https://apps.apple.com/account/subscriptions'
                  )
                }
              />
              <ListRow
                title="Help & support"
                rightElement="chevron"
                onPress={() =>
                  void Linking.openURL('mailto:support@letsunpack.app')
                }
              />
              <ListRow
                title="Settings"
                rightElement="chevron"
                onPress={() => animateClose(() => onOpenSettings())}
              />
              <ListRow
                title="Sign out"
                titleColor={colors['status-danger']}
                onPress={onSignOut}
              />
            </ScrollView>
          </Sentry.ErrorBoundary>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    height: '100%',
    borderRightWidth: 1,
  },
  errorFallback: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  closeRow: {
    height: 56,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileRow: {
    paddingTop: 4,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  traitBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  traitBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
