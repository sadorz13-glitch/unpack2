import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableOpacity,
  Linking,
  TextInput as NativeTextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme';
import { PillButton } from './ui/PillButton';
import { IconButton } from './ui/IconButton';
import { TextInput } from './ui/TextInput';
import { saveProfile } from '../lib/auth';
import { PRIVACY_POLICY_URL } from '../constants';

// ── Types ─────────────────────────────────────────────────────────────────────
type ProfileData = { name: string; dob: string };
type Props = {
  onComplete: (result: ProfileData) => void;
};
type Step = 1 | 2;

// ── Validation helpers ────────────────────────────────────────────────────────
function isNameValid(name: string): boolean {
  return name.trim().length > 0;
}

function isDobValid(month: string, day: string, year: string): boolean {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  return (
    !Number.isNaN(d) && !Number.isNaN(m) && !Number.isNaN(y) &&
    d >= 1 && d <= 31 &&
    m >= 1 && m <= 12 &&
    y >= 1900 && y <= new Date().getFullYear() - 13
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function OnboardingScreen({ onComplete }: Props) {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ddRef = useRef<NativeTextInput>(null);
  const yyyyRef = useRef<NativeTextInput>(null);

  async function handleCompleteSetup() {
    const trimmedName = name.trim();
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const dob = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    setSaving(true);
    setError('');
    try {
      await saveProfile(trimmedName, dob);
      onComplete({ name: trimmedName, dob });
    } catch {
      setError('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  const screenPadding = spacing['margin-screen'];

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Name
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.fullScreen, { backgroundColor: colors['bg-primary'] }]}
      >
        <View
          style={[
            styles.headerRow,
            { paddingTop: insets.top + spacing.sm, paddingHorizontal: screenPadding },
          ]}
        >
          <View style={styles.headerSpacer} />
          <Text
            style={[
              typography.labelCaps,
              { color: colors['text-tertiary'], flex: 1, textAlign: 'center' },
            ]}
          >
            Step 1 of 2
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View
          style={[
            styles.stepContent,
            { paddingHorizontal: screenPadding, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <Text
            style={[
              typography.h1,
              { color: colors['text-primary'], textAlign: 'center', marginBottom: spacing.sm },
            ]}
          >
            What should we call you?
          </Text>

          <Text
            style={[
              typography.body,
              { color: colors['text-secondary'], textAlign: 'center', marginBottom: spacing.xl },
            ]}
          >
            First name is fine.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => { if (isNameValid(name)) setStep(2); }}
          />

          <View style={{ height: spacing.xl }} />

          <PillButton
            label="Continue"
            onPress={() => setStep(2)}
            disabled={!isNameValid(name)}
            style={styles.fullWidth}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Date of Birth
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.fullScreen, { backgroundColor: colors['bg-primary'] }]}
    >
      <View
        style={[
          styles.headerRow,
          { paddingTop: insets.top + spacing.sm, paddingHorizontal: screenPadding },
        ]}
      >
        <IconButton
          icon={ChevronLeft}
          onPress={() => setStep(1)}
          accessibilityLabel="Go back"
        />
        <Text
          style={[
            typography.labelCaps,
            { color: colors['text-tertiary'], flex: 1, textAlign: 'center' },
          ]}
        >
          Step 2 of 2
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View
        style={[
          styles.stepContent,
          { paddingHorizontal: screenPadding, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Text
          style={[
            typography.h1,
            { color: colors['text-primary'], textAlign: 'center', marginBottom: spacing.sm },
          ]}
        >
          When were you born?
        </Text>

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
          Used to personalize your reflections. Stored securely, never shared with third parties.
        </Text>

        <View style={styles.dobRow}>
          <NativeTextInput
            value={month}
            onChangeText={v => {
              const val = v.replace(/\D/g, '').slice(0, 2);
              setMonth(val);
              if (val.length === 2) ddRef.current?.focus();
            }}
            placeholder="MM"
            placeholderTextColor={colors['text-tertiary']}
            keyboardType="number-pad"
            maxLength={2}
            style={[typography.bodyLarge, styles.dobInput, { color: colors['text-primary'], borderBottomColor: colors['border-strong'] }]}
          />
          <Text style={[styles.dobDivider, { color: colors['text-tertiary'] }]}>/</Text>
          <NativeTextInput
            ref={ddRef}
            value={day}
            onChangeText={v => {
              const val = v.replace(/\D/g, '').slice(0, 2);
              setDay(val);
              if (val.length === 2) yyyyRef.current?.focus();
            }}
            placeholder="DD"
            placeholderTextColor={colors['text-tertiary']}
            keyboardType="number-pad"
            maxLength={2}
            style={[typography.bodyLarge, styles.dobInput, { color: colors['text-primary'], borderBottomColor: colors['border-strong'] }]}
          />
          <Text style={[styles.dobDivider, { color: colors['text-tertiary'] }]}>/</Text>
          <NativeTextInput
            ref={yyyyRef}
            value={year}
            onChangeText={v => {
              const val = v.replace(/\D/g, '').slice(0, 4);
              setYear(val);
              if (val.length === 4) Keyboard.dismiss();
            }}
            placeholder="YYYY"
            placeholderTextColor={colors['text-tertiary']}
            keyboardType="number-pad"
            maxLength={4}
            style={[typography.bodyLarge, styles.dobInputYear, { color: colors['text-primary'], borderBottomColor: colors['border-strong'] }]}
          />
        </View>

        {error ? (
          <Text
            style={[
              typography.caption,
              { color: colors['status-danger'], textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            {error}
          </Text>
        ) : null}

        <Text
          style={{
            fontSize: 12,
            fontStyle: 'italic',
            color: colors['text-tertiary'],
            lineHeight: 18,
            marginTop: spacing.md,
            marginBottom: spacing.md,
            textAlign: 'center',
          }}
        >
          {'Your date of birth helps us personalise questions and reflections for you. We use your zodiac sign as background context for your sessions — not as predictions or diagnoses. '}
          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
          >
            <Text style={{ color: colors['accent-primary'], fontSize: 12, fontStyle: 'italic' }}>
              Learn more in our Privacy Policy.
            </Text>
          </TouchableOpacity>
        </Text>

        <PillButton
          label={saving ? 'Saving...' : 'Complete Setup'}
          onPress={handleCompleteSetup}
          disabled={!isDobValid(month, day, year) || saving}
          style={styles.fullWidth}
        />

        <View style={{ height: spacing.sm }} />

        <Pressable
          onPress={async () => {
            const trimmed = name.trim();
            try { await saveProfile(trimmed, ''); } catch { /* best-effort */ }
            onComplete({ name: trimmed, dob: '' });
          }}
          accessibilityLabel="Skip"
          accessibilityRole="button"
          style={styles.skipButton}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors['text-secondary'], textAlign: 'center' }}>
            Skip
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dobInput: {
    flex: 1,
    height: 48,
    textAlign: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  dobInputYear: {
    flex: 1.5,
    height: 48,
    textAlign: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  dobDivider: {
    fontSize: 18,
    paddingHorizontal: 8,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
