import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import { useTheme } from '../theme';
import { PillButton } from '../components/ui';

const REFLECT_IMAGE_URI =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
const TALK_IMAGE_URI =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TalkHubScreenProps {
  onStartSession: () => void;
  onStartVent: () => void;
  hasSessionToday: boolean;
  isPremium: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TalkHubScreen({
  onStartSession,
  onStartVent,
  hasSessionToday,
  isPremium,
}: TalkHubScreenProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors['bg-primary'] }]}>
      <View
        style={[
          styles.inner,
          { paddingHorizontal: spacing['margin-screen'] },
        ]}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Text
          style={[
            typography.labelCaps,
            styles.eyebrow,
            { color: colors['text-tertiary'] },
          ]}
        >
          TALK
        </Text>

        {/* ── Cards ───────────────────────────────────────────────────────── */}
        <View style={styles.cards}>

          {/* Card 1 — Reflect */}
          <Pressable
            onPress={onStartSession}
            accessibilityRole="button"
            accessibilityLabel="Begin Reflect session"
            style={({ pressed }) => [
              styles.card,
              {
                borderRadius: radius.lg,
                ...shadows.elevation1,
                opacity: pressed ? 0.92 : 1,
                overflow: 'hidden',
              },
            ]}
          >
            <ImageBackground
              source={{ uri: REFLECT_IMAGE_URI }}
              style={styles.cardBg}
              resizeMode="cover"
              imageStyle={{ borderRadius: radius.lg }}
            >
              <View style={[styles.overlay, { borderRadius: radius.lg }]} />
              <View style={styles.cardContent}>
                <Text
                  style={[
                    typography.h1,
                    { color: 'white', marginBottom: spacing.xs },
                  ]}
                >
                  Reflect
                </Text>

                <Text
                  style={[
                    typography.body,
                    {
                      color: 'rgba(255,255,255,0.8)',
                      marginBottom: spacing.lg,
                    },
                  ]}
                >
                  Three questions. A new perspective each day.
                </Text>

                <PillButton
                  label="BEGIN"
                  onPress={onStartSession}
                  style={styles.cta}
                />

                {hasSessionToday && !isPremium && (
                  <Text
                    style={[
                      typography.caption,
                      styles.usedLabel,
                      { color: 'rgba(255,255,255,0.6)' },
                    ]}
                  >
                    Used today · Upgrade to unlock
                  </Text>
                )}
              </View>
            </ImageBackground>
          </Pressable>

          {/* Card 2 — Talk It Out */}
          <Pressable
            onPress={onStartVent}
            accessibilityRole="button"
            accessibilityLabel="Begin Talk It Out session"
            style={({ pressed }) => [
              styles.card,
              {
                borderRadius: radius.lg,
                ...shadows.elevation1,
                opacity: pressed ? 0.92 : 1,
                overflow: 'hidden',
              },
            ]}
          >
            <ImageBackground
              source={{ uri: TALK_IMAGE_URI }}
              style={styles.cardBg}
              resizeMode="cover"
              imageStyle={{ borderRadius: radius.lg }}
            >
              <View style={[styles.overlay, { borderRadius: radius.lg }]} />
              <View style={styles.cardContent}>
                <Text
                  style={[
                    typography.h1,
                    { color: 'white', marginBottom: spacing.xs },
                  ]}
                >
                  Talk It Out
                </Text>

                <Text
                  style={[
                    typography.body,
                    {
                      color: 'rgba(255,255,255,0.8)',
                      marginBottom: spacing.lg,
                    },
                  ]}
                >
                  Say it out loud. No rules.
                </Text>

                <PillButton
                  label="BEGIN"
                  onPress={onStartVent}
                  style={styles.cta}
                />
              </View>
            </ImageBackground>
          </Pressable>

        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingTop: 32,
  },
  eyebrow: {
    marginBottom: 24,
  },
  cards: {
    flex: 1,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    flex: 1,
  },
  cardBg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cardContent: {
    flex: 1,
    padding: 28,
    justifyContent: 'flex-end',
  },
  cta: {
    alignSelf: 'flex-start',
  },
  usedLabel: {
    marginTop: 12,
  },
});
