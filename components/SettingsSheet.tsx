import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Pressable, Switch, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function SettingsSheet({
  visible, onClose, onSignOut, onDeleteAccount,
  onSaveNotifPrefs,
  notifEnabled = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('menu');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [notifLocalEnabled, setNotifLocalEnabled] = useState(notifEnabled);
  const [emailOptOut, setEmailOptOut] = useState(false);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('email_opt_out').then(val => setEmailOptOut(val === 'true'));
    }
  }, [visible]);

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

  async function handleEmailOptOutToggle(val: boolean) {
    setEmailOptOut(val);
    await AsyncStorage.setItem('email_opt_out', String(val));
  }

  const handleManageSub = async () => {
    const url = 'itms-apps://apps.apple.com/account/subscriptions';
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : 'https://apps.apple.com/account/subscriptions');
  };

  function handleOpenNotifications() {
    setNotifLocalEnabled(notifEnabled);
    setStep('notifications');
  }

  function handleSaveNotifs() {
    onSaveNotifPrefs?.(20, 0, notifLocalEnabled);
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
              <View style={[styles.option, styles.optionRow]}>
                <Text style={styles.optionText}>Marketing emails</Text>
                <Switch
                  value={!emailOptOut}
                  onValueChange={val => handleEmailOptOutToggle(!val)}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: ACCENT }}
                  thumbColor={colors.textPrimary}
                />
              </View>
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
