import { ScrollView, Text, TouchableOpacity, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { PillButton } from './ui/PillButton';
import { PRIVACY_POLICY_URL } from '../constants';

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  onConsent: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
export function AIConsentScreen({ onConsent }: Props) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.fullScreen, { backgroundColor: colors['bg-primary'] }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing['margin-screen'],
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <Text
        style={[
          typography.h1,
          { color: colors['text-primary'], textAlign: 'center', marginBottom: spacing.lg },
        ]}
      >
        AI-powered reflection
      </Text>

      {/* Body — intro paragraph */}
      <Text
        style={[
          typography.body,
          { color: colors['text-secondary'], textAlign: 'center', marginBottom: spacing.md },
        ]}
      >
        Unpack uses third-party AI services to generate reflections, transcribe your voice, and
        synthesize spoken responses. To provide these features, your data is sent to:
      </Text>

      {/* Bullet items */}
      <View style={styles.bulletList}>
        <Text style={[typography.body, { color: colors['text-primary'], textAlign: 'center' }]}>
          {'• Anthropic (Claude) — generates insights and questions from your journal entries'}
        </Text>
        <View style={{ height: spacing.sm }} />
        <Text style={[typography.body, { color: colors['text-primary'], textAlign: 'center' }]}>
          {'• OpenAI (Whisper) — transcribes voice recordings to text'}
        </Text>
        <View style={{ height: spacing.sm }} />
        <Text style={[typography.body, { color: colors['text-primary'], textAlign: 'center' }]}>
          {'• ElevenLabs — converts AI responses to spoken audio'}
        </Text>
      </View>

      {/* Body — storage paragraph */}
      <Text
        style={[
          typography.body,
          {
            color: colors['text-secondary'],
            textAlign: 'center',
            marginTop: spacing.md,
            marginBottom: spacing.md,
          },
        ]}
      >
        Voice data is processed in real-time and not stored by these services. Text from your
        sessions is stored encrypted in your private account.
      </Text>

      {/* Body — consent paragraph */}
      <Text
        style={[
          typography.body,
          {
            color: colors['text-secondary'],
            textAlign: 'center',
            marginBottom: spacing.xl,
          },
        ]}
      >
        By tapping Continue, you consent to this data sharing. You can revoke consent in Settings
        at any time.
      </Text>

      {/* Primary CTA */}
      <PillButton
        label="I understand — continue"
        onPress={onConsent}
        style={styles.fullWidth}
      />

      {/* Privacy Policy link */}
      <TouchableOpacity
        onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        accessibilityRole="link"
        accessibilityLabel="Read full Privacy Policy"
        style={styles.privacyLink}
      >
        <Text
          style={[
            typography.caption,
            { color: colors['text-tertiary'], textAlign: 'center' },
          ]}
        >
          Read full Privacy Policy
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bulletList: {
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  privacyLink: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
});
