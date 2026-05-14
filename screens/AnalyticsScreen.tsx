import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Share,
  StyleSheet,
} from 'react-native';
import { Share2, X } from 'lucide-react-native';
import { IconButton } from '../components/ui/IconButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Card } from '../components/ui/Card';
import { SectionDivider } from '../components/ui/SectionDivider';
import { PillButton } from '../components/ui/PillButton';
import { OutlinedPillButton } from '../components/ui/OutlinedPillButton';
import { supabase } from '../lib/supabase';
import DeepDiveModal from '../components/DeepDiveModal';
import { AILabel } from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionRow = {
  id: string;
  insight: string;
  insight_short: string | null;
  topic: string | null;
  created_at: string;
  traits: Record<string, number> | null;
};

type Props = {
  userId: string;
  isActive: boolean;
  onClose?: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  const d = new Date(
    /Z$|[+-]\d{2}:\d{2}$/.test(isoString) ? isoString : isoString + 'Z'
  );
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(isoString: string): string {
  const d = new Date(
    /Z$|[+-]\d{2}:\d{2}$/.test(isoString) ? isoString : isoString + 'Z'
  );
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPreview(session: SessionRow): string {
  const text = session.insight_short?.trim() || session.insight;
  return text.length > 80 ? text.slice(0, 80) + '…' : text;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PosterizedQuote({ insight }: { insight: string }) {
  const { colors, typography } = useTheme();
  const words = insight.split(' ');
  const emphasisWords = words.slice(0, 6);
  const restWords = words.slice(6);

  return (
    <Card
      style={{
        backgroundColor: colors['bg-surface'],
        borderColor: colors['border-subtle'],
        paddingVertical: 28,
        paddingHorizontal: 24,
        minHeight: 0,
      }}
    >
      <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
        <AILabel />
      </View>
      <Text style={[typography.h1, { color: colors['text-primary'] }]}>
        {emphasisWords.join(' ')}
        {restWords.length > 0 ? ' ' : ''}
        <Text style={[typography.h2, { color: colors['text-primary'] }]}>
          {restWords.join(' ')}
        </Text>
      </Text>
    </Card>
  );
}

function RelatedEntryRow({ session }: { session: SessionRow }) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.entryRow} accessibilityRole="text">
      <View style={styles.entryLeft}>
        <Text
          style={[
            typography.h3,
            { color: colors['text-tertiary'], fontSize: 14, lineHeight: 20 },
          ]}
        >
          {formatDateShort(session.created_at)}
        </Text>
      </View>
      <View style={styles.entryRight}>
        {session.topic ? (
          <Text
            style={[
              typography.labelCaps,
              { color: colors['text-secondary'], marginBottom: 2 },
            ]}
          >
            {session.topic}
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
          Reflection • session
        </Text>
        <Text
          style={[typography.body, { color: colors['text-primary'], marginTop: 4 }]}
          numberOfLines={2}
        >
          {getPreview(session)}
        </Text>
      </View>
    </View>
  );
}

function PastInsightCard({ session }: { session: SessionRow }) {
  const { colors, typography } = useTheme();

  return (
    <Card
      style={{
        backgroundColor: colors['bg-surface'],
        borderColor: colors['border-subtle'],
        minHeight: 0,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
      }}
    >
      <Text
        style={[
          typography.labelCaps,
          { color: colors['text-tertiary'], marginBottom: 6 },
        ]}
      >
        {formatDate(session.created_at)}
      </Text>
      <Text
        style={[typography.body, { color: colors['text-primary'], fontStyle: 'italic' }]}
        numberOfLines={3}
      >
        {getPreview(session)}
      </Text>
    </Card>
  );
}

function EmptyState() {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.emptyState} accessibilityRole="text">
      <Text style={[typography.h2, { color: colors['text-primary'], textAlign: 'center' }]}>
        Your insights will appear here
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors['text-secondary'], textAlign: 'center', marginTop: 12 },
        ]}
      >
        Complete your first session to unlock your analytics.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function AnalyticsScreen({ userId, isActive, onClose }: Props) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [deepDiveVisible, setDeepDiveVisible] = useState(false);
  const [deepDiveAnswers, setDeepDiveAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    void fetchSessions();
    // REVIEW: verify [] is intentional — fetchSessions closes over userId which could change
  }, [isActive]);

  async function fetchSessions(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, insight, insight_short, topic, created_at, traits')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions((data as SessionRow[]) ?? []);
    } catch {
      // TODO: add error handling here
    }
  }

  async function handleDeepDive(): Promise<void> {
    if (!latest) return;
    setDeepDiveLoading(true);
    try {
      const { data } = await supabase
        .from('answers')
        .select('question, answer')
        .eq('session_id', latest.id)
        .order('id', { ascending: true });
      setDeepDiveAnswers((data ?? []) as Array<{ question: string; answer: string }>);
    } catch {
      setDeepDiveAnswers([]);
    } finally {
      setDeepDiveLoading(false);
      setDeepDiveVisible(true);
    }
  }

  async function handleShareInsight(): Promise<void> {
    const latest = sessions[0];
    if (!latest) return;
    try {
      await Share.share({ message: latest.insight });
    } catch {
      // TODO: add error handling here
    }
  }

  const latest = sessions[0] ?? null;
  const pastSessions = sessions.slice(1);
  const hasSessions = sessions.length > 0;

  return (
    <View
      style={[styles.container, { backgroundColor: colors['bg-primary'] }]}
    >
      {onClose && (
        <IconButton
          icon={X}
          onPress={onClose}
          accessibilityLabel="Close"
          style={{ ...styles.closeBtn, top: insets.top + 8 }}
        />
      )}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen heading */}
        <Text
          style={[
            typography.h2,
            { color: colors['text-primary'], marginBottom: spacing.xl },
          ]}
        >
          Analytics
        </Text>

        {!hasSessions ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Latest Insight ───────────────────────────────────────── */}
            <Text
              style={[
                typography.labelCaps,
                {
                  color: colors['text-tertiary'],
                  textAlign: 'center',
                  marginBottom: spacing.md,
                },
              ]}
            >
              SYNTHESIZED FROM YOUR EVENING UNPACK
            </Text>

            {latest ? <PosterizedQuote insight={latest.insight} /> : null}

            {/* Action buttons */}
            <View style={[styles.buttonRow, { marginTop: spacing.md }]}>
              <PillButton
                label="SHARE INSIGHT"
                icon={Share2}
                onPress={handleShareInsight}
                style={styles.buttonHalf}
              />
              <OutlinedPillButton
                label={deepDiveLoading ? '...' : 'DEEPER LOOK'}
                onPress={handleDeepDive}
                disabled={deepDiveLoading}
                style={styles.buttonHalf}
              />
            </View>

            {/* ── Related Journal Entries ──────────────────────────────── */}
            <View style={{ marginTop: spacing.xl }}>
              <Text
                style={[
                  typography.labelCaps,
                  { color: colors['text-tertiary'], marginBottom: spacing.md },
                ]}
              >
                RELATED REFLECTIONS
              </Text>

              {sessions.map((session) => (
                <RelatedEntryRow key={session.id} session={session} />
              ))}
            </View>

            {/* ── Past Insights Archive ────────────────────────────────── */}
            {pastSessions.length > 0 ? (
              <>
                <SectionDivider label="PAST INSIGHTS" />
                {pastSessions.map((session) => (
                  <PastInsightCard key={session.id} session={session} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {latest ? (
        <DeepDiveModal
          visible={deepDiveVisible}
          onClose={() => setDeepDiveVisible(false)}
          answers={deepDiveAnswers}
          traits={latest.traits ?? {}}
          recentInsights={[latest.insight]}
          topic={latest.topic ?? undefined}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 8,
    width: 44,
    height: 44,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26, 26, 26, 0.05)',
    minHeight: 44,
  },
  entryLeft: {
    width: 56,
    paddingTop: 2,
  },
  entryRight: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
});
