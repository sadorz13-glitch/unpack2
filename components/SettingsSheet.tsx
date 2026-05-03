import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Pressable, Switch,
  ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontFamilies } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  onSaveNotifPrefs?: (hour: number, minute: number, enabled: boolean) => void;
  notifHour?: number;
  notifMinute?: number;
  notifEnabled?: boolean;
};

type Step = 'menu' | 'confirm' | 'type' | 'notifications';

const ACCENT = 'rgba(180,140,90,0.9)';

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function formatMinute(m: number): string {
  return `:${m.toString().padStart(2, '0')}`;
}

export function SettingsSheet({
  visible, onClose, onSignOut, onDeleteAccount,
  onSaveNotifPrefs,
  notifHour = 20, notifMinute = 0, notifEnabled = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('menu');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Notification local state
  const [notifLocalHour, setNotifLocalHour] = useState(notifHour);
  const [notifLocalMinute, setNotifLocalMinute] = useState(notifMinute);
  const [notifLocalEnabled, setNotifLocalEnabled] = useState(notifEnabled);

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
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Try again.');
      setLoading(false);
    }
  }

  const handleContact = () => {
    Linking.openURL('mailto:support@letsunpack.app');
  };

  const handleManageSub = async () => {
    const url = 'itms-apps://apps.apple.com/account/subscriptions';
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : 'https://apps.apple.com/account/subscriptions');
  };

  function handleOpenNotifications() {
    setNotifLocalHour(notifHour);
    setNotifLocalMinute(notifMinute);
    setNotifLocalEnabled(notifEnabled);
    setStep('notifications');
  }

  function handleSaveNotifs() {
    onSaveNotifPrefs?.(notifLocalHour, notifLocalMinute, notifLocalEnabled);
    handleClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]} onPress={() => {}}>
          <View style={styles.handle} />

          {step === 'menu' && (
            <>
              <Text style={styles.title}>Settings</Text>
              <TouchableOpacity style={styles.option} onPress={handleOpenNotifications}>
                <Text style={styles.optionText}>Notification reminder</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.option} onPress={handleManageSub}>
                <Text style={styles.optionText}>Manage Subscription</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.option} onPress={handleContact}>
                <Text style={styles.optionText}>Contact / Data requests</Text>
                <Text style={styles.optionSub}>support@letsunpack.app</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.option} onPress={onSignOut}>
                <Text style={styles.optionText}>Sign out</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.option} onPress={() => setStep('confirm')}>
                <Text style={[styles.optionText, styles.destructive]}>Delete account</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Text style={styles.title}>Delete account?</Text>
              <Text style={styles.body}>
                This permanently deletes your account, all sessions, all journal entries, and your data. This cannot be undone.
              </Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueBtn} onPress={() => setStep('type')}>
                  <Text style={styles.continueText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'type' && (
            <>
              <Text style={styles.title}>Confirm deletion</Text>
              <Text style={styles.body}>Type DELETE to confirm.</Text>
              <TextInput
                style={styles.input}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                autoFocus
                placeholder="DELETE"
                placeholderTextColor={colors.textGhost}
                editable={!loading}
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <View style={styles.row}>
                <TouchableOpacity style={styles.cancelBtn} onPress={reset} disabled={loading}>
                  <Text style={[styles.cancelText, loading && styles.dimmed]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.continueBtn, styles.destructiveBtn, (confirmText !== 'DELETE' || loading) && styles.dimmed]}
                  onPress={handleDelete}
                  disabled={confirmText !== 'DELETE' || loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.bg} size="small" />
                    : <Text style={styles.continueText}>Delete</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'notifications' && (
            <>
              <View style={styles.notifHeader}>
                <TouchableOpacity onPress={() => setStep('menu')} style={styles.backBtn}>
                  <Text style={styles.backText}>{'←'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Daily reminder</Text>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.optionText}>Enabled</Text>
                <Switch
                  value={notifLocalEnabled}
                  onValueChange={setNotifLocalEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: ACCENT }}
                  thumbColor={colors.textPrimary}
                />
              </View>

              {notifLocalEnabled && (
                <>
                  <Text style={styles.chipLabel}>Hour</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                    contentContainerStyle={styles.chipRow}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.chip, notifLocalHour === h && styles.chipSelected]}
                        onPress={() => setNotifLocalHour(h)}
                      >
                        <Text style={[styles.chipText, notifLocalHour === h && styles.chipTextSelected]}>
                          {formatHour(h)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.chipLabel}>Minute</Text>
                  <View style={styles.chipRow}>
                    {[0, 15, 30, 45].map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.chip, notifLocalMinute === m && styles.chipSelected]}
                        onPress={() => setNotifLocalMinute(m)}
                      >
                        <Text style={[styles.chipText, notifLocalMinute === m && styles.chipTextSelected]}>
                          {formatMinute(m)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNotifs}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  option: {
    paddingVertical: spacing.base,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  optionSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  destructive: {
    color: '#c0392b',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: spacing.sm,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
  },
  continueBtn: {
    flex: 1,
    paddingVertical: spacing.base,
    backgroundColor: colors.accent,
    borderRadius: 2,
    alignItems: 'center',
  },
  destructiveBtn: {
    backgroundColor: '#c0392b',
  },
  continueText: {
    color: colors.bg,
    fontSize: 13,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    color: colors.textPrimary,
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: spacing.base,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 12,
    marginBottom: spacing.base,
  },
  dimmed: {
    opacity: 0.4,
  },
  // Notifications step
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    marginRight: spacing.base,
    paddingVertical: 2,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    marginBottom: spacing.base,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chipScroll: {
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: 2,
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '600',
  },
});
