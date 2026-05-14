import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, ScrollView, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, LogOut, Trash2 } from 'lucide-react-native';
import { useTheme } from '../theme';
import { ListRow } from './ui/ListRow';
import { SectionDivider } from './ui/SectionDivider';
import { ToggleSwitch } from './ui/ToggleSwitch';
import { RadioButton } from './ui/RadioButton';
import { IconButton } from './ui/IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  notifHour: number;
  notifMinute: number;
  notifEnabled: boolean;
  onSaveNotifPrefs: (hour: number, minute: number, enabled: boolean) => void;
  onOpenCrisisResources?: () => void;
};

type Step = 'menu' | 'confirm' | 'type' | 'notifications';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function SettingsSheet({
  visible,
  onClose,
  onSignOut,
  onDeleteAccount,
  notifHour,
  notifMinute,
  notifEnabled,
  onSaveNotifPrefs,
  onOpenCrisisResources,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = useTheme();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [step, setStep] = useState<Step>('menu');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [notifLocalEnabled, setNotifLocalEnabled] = useState(notifEnabled);
  const [notifLocalHour, setNotifLocalHour] = useState(notifHour);
  const [notifLocalMinute, setNotifLocalMinute] = useState(notifMinute);

  useEffect(() => {
    if (visible) {
      setNotifLocalEnabled(notifEnabled);
      setNotifLocalHour(notifHour);
      setNotifLocalMinute(notifMinute);
    }
  }, [visible, notifEnabled, notifHour, notifMinute]);

  function reset() {
    setStep('menu');
    setConfirmText('');
    setError('');
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      await onDeleteAccount();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.';
      setError(msg);
      setLoading(false);
    }
  }

  function handleSaveNotifs() {
    onSaveNotifPrefs(notifLocalHour, notifLocalMinute, notifLocalEnabled);
    handleClose();
  }

  // ─── Dynamic styles that depend on theme colors ──────────────────────────────

  const s = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors['bg-primary'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing['margin-screen'],
      paddingTop: insets.top + spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors['bg-primary'],
    },
    headerTitle: {
      ...typography.h1,
      color: colors['text-primary'],
    },
    scrollContent: {
      paddingHorizontal: 0,
      paddingBottom: insets.bottom + spacing.xl,
    },
    rowGroup: {
      backgroundColor: colors['bg-secondary'],
      borderRadius: radius.md,
      marginHorizontal: spacing['margin-screen'],
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors['border-subtle'],
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors['border-subtle'],
      marginLeft: 20,
    },
    dangerSectionLabel: {
      ...typography.labelCaps,
      color: colors['status-danger'],
      marginBottom: spacing.sm,
    },
    dangerSectionContainer: {
      marginTop: spacing.xl,
      marginHorizontal: spacing['margin-screen'],
      marginBottom: spacing.md,
    },
    sectionWrapper: {
      paddingHorizontal: spacing['margin-screen'],
    },
    // Confirm / Type step styles
    modalInner: {
      flex: 1,
      backgroundColor: colors['bg-primary'],
      paddingHorizontal: spacing['margin-screen'],
    },
    stepTitle: {
      ...typography.h1,
      color: colors['text-primary'],
      marginBottom: spacing.md,
    },
    stepBody: {
      ...typography.body,
      color: colors['text-secondary'],
      marginBottom: spacing.xl,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    cancelBtn: {
      flex: 1,
      height: 56,
      borderWidth: 1,
      borderColor: colors['border-strong'],
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      ...typography.buttonText,
      color: colors['text-secondary'],
    },
    confirmBtn: {
      flex: 1,
      height: 56,
      backgroundColor: colors['accent-primary'],
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnText: {
      ...typography.buttonText,
      color: colors['text-on-primary'],
    },
    deleteBtn: {
      flex: 1,
      height: 56,
      backgroundColor: colors['status-danger'],
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtnText: {
      ...typography.buttonText,
      color: colors['text-on-primary'],
    },
    dimmed: {
      opacity: 0.4,
    },
    textInput: {
      borderBottomWidth: 2,
      borderBottomColor: colors['border-strong'],
      color: colors['text-primary'],
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 2,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      fontFamily: 'Inter_400Regular',
    },
    textInputFocused: {
      borderBottomColor: colors['accent-primary'],
    },
    errorText: {
      ...typography.caption,
      color: colors['status-danger'],
      marginBottom: spacing.md,
    },
    notifHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing['margin-screen'],
      paddingTop: insets.top + spacing.md,
      paddingBottom: spacing.md,
    },
    notifTitle: {
      ...typography.h1,
      color: colors['text-primary'],
      flex: 1,
    },
    timeDisplay: {
      ...typography.labelCaps,
      color: colors['text-tertiary'],
    },
  });

  // ─── Notifications sub-screen ────────────────────────────────────────────────

  if (step === 'notifications') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStep('menu')}
      >
        <View style={[s.screen]}>
          <View style={s.notifHeader}>
            <IconButton
              icon={X}
              onPress={() => setStep('menu')}
              accessibilityLabel="Back to settings"
            />
            <Text style={s.notifTitle}>Daily Reminder</Text>
          </View>
          <View style={s.rowGroup}>
            <ListRow
              title="Enable Reminder"
              rightElement={
                <ToggleSwitch
                  value={notifLocalEnabled}
                  onValueChange={setNotifLocalEnabled}
                  accessibilityLabel="Toggle daily reminder"
                />
              }
            />
            <View style={s.rowDivider} />
            <ListRow
              title="Reminder Time"
              rightValue={`${pad(notifLocalHour)}:${pad(notifLocalMinute)}`}
            />
          </View>
          <View style={[s.buttonRow, { marginHorizontal: spacing['margin-screen'], marginTop: spacing.xl }]}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setStep('menu')}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleSaveNotifs}>
              <Text style={s.confirmBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Confirm delete sub-screen ───────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={reset}
      >
        <View style={[s.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={s.modalInner}>
            <Text style={[s.stepTitle, { marginTop: spacing.xl }]}>Delete account?</Text>
            <Text style={s.stepBody}>
              This permanently deletes your account, all sessions, all journal entries, and your data. This cannot be undone.
            </Text>
            <View style={s.buttonRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={reset}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={() => setStep('type')}>
                <Text style={s.confirmBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Type DELETE sub-screen ──────────────────────────────────────────────────

  if (step === 'type') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={reset}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[s.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={s.modalInner}>
              <Text style={[s.stepTitle, { marginTop: spacing.xl }]}>Confirm deletion</Text>
              <Text style={s.stepBody}>Type DELETE to confirm.</Text>
              <TextInput
                style={s.textInput}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                autoFocus
                placeholder="DELETE"
                placeholderTextColor={colors['text-tertiary']}
                editable={!loading}
              />
              {!!error && <Text style={s.errorText}>{error}</Text>}
              <View style={s.buttonRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={reset} disabled={loading}>
                  <Text style={[s.cancelBtnText, loading && s.dimmed]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.deleteBtn, (confirmText !== 'DELETE' || loading) && s.dimmed]}
                  onPress={handleDelete}
                  disabled={confirmText !== 'DELETE' || loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors['text-on-primary']} size="small" />
                    : <Text style={s.deleteBtnText}>Delete</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ─── Main settings menu ───────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={s.screen}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Settings</Text>
          <IconButton
            icon={X}
            onPress={handleClose}
            accessibilityLabel="Close settings"
          />
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ACCOUNT section */}
          <View style={s.sectionWrapper}>
            <SectionDivider label="Account" style={{ marginTop: spacing.sm }} />
          </View>
          <View style={s.rowGroup}>
            <ListRow
              title="Sign Out"
              rightElement={
                <LogOut
                  size={20}
                  color={colors['text-tertiary']}
                  strokeWidth={1.5}
                />
              }
              onPress={onSignOut}
            />
          </View>

          {/* NOTIFICATIONS section */}
          <View style={s.sectionWrapper}>
            <SectionDivider label="Notifications" />
          </View>
          <View style={s.rowGroup}>
            <ListRow
              title="Daily Reminder"
              rightElement={
                <ToggleSwitch
                  value={notifLocalEnabled}
                  onValueChange={val => {
                    setNotifLocalEnabled(val);
                    onSaveNotifPrefs(notifLocalHour, notifLocalMinute, val);
                  }}
                  accessibilityLabel="Toggle daily reminder"
                />
              }
            />
            <View style={s.rowDivider} />
            <ListRow
              title="Reminder Time"
              rightValue={`${pad(notifHour)}:${pad(notifMinute)}`}
              onPress={() => {
                setNotifLocalEnabled(notifEnabled);
                setNotifLocalHour(notifHour);
                setNotifLocalMinute(notifMinute);
                setStep('notifications');
              }}
            />
          </View>

          {/* APPEARANCE section */}
          <View style={s.sectionWrapper}>
            <SectionDivider label="Appearance" />
          </View>
          <View style={s.rowGroup}>
            <ListRow
              title="Light"
              onPress={() => setThemeMode('light')}
              rightElement={
                <RadioButton
                  selected={themeMode === 'light'}
                  onPress={() => setThemeMode('light')}
                  accessibilityLabel="Select light theme"
                />
              }
            />
            <View style={s.rowDivider} />
            <ListRow
              title="Dark"
              onPress={() => setThemeMode('dark')}
              rightElement={
                <RadioButton
                  selected={themeMode === 'dark'}
                  onPress={() => setThemeMode('dark')}
                  accessibilityLabel="Select dark theme"
                />
              }
            />
            <View style={s.rowDivider} />
            <ListRow
              title="System"
              onPress={() => setThemeMode('system')}
              rightElement={
                <RadioButton
                  selected={themeMode === 'system'}
                  onPress={() => setThemeMode('system')}
                  accessibilityLabel="Select system theme"
                />
              }
            />
          </View>

          {/* ABOUT section */}
          <View style={s.sectionWrapper}>
            <SectionDivider label="About" />
          </View>
          <View style={s.rowGroup}>
            <ListRow
              title="Privacy Policy"
              rightElement="chevron"
              onPress={() => Linking.openURL('https://letsunpack.app/privacy')}
            />
            <View style={s.rowDivider} />
            <ListRow
              title="Terms of Service"
              rightElement="chevron"
              onPress={() => Linking.openURL('https://letsunpack.app/terms')}
            />
            <View style={s.rowDivider} />
            <ListRow
              title="Support"
              rightElement="chevron"
              onPress={() => Linking.openURL('mailto:support@letsunpack.app')}
            />
            <View style={s.rowDivider} />
            <ListRow
              title="Crisis resources"
              rightElement="chevron"
              onPress={() => {
                onClose();
                setTimeout(() => onOpenCrisisResources?.(), 80);
              }}
            />
          </View>

          {/* DANGER ZONE section — custom label in status-danger color */}
          <View style={s.dangerSectionContainer}>
            <Text style={s.dangerSectionLabel}>Danger Zone</Text>
            <View style={[{ height: 1, backgroundColor: colors['border-subtle'] }]} />
          </View>
          <View style={s.rowGroup}>
            <ListRow
              title="Delete Account"
              titleColor={colors['status-danger']}
              rightElement={
                <Trash2
                  size={20}
                  color={colors['status-danger']}
                  strokeWidth={1.5}
                />
              }
              onPress={() => setStep('confirm')}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
