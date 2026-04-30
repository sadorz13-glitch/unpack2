import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontFamilies } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
};

type Step = 'menu' | 'confirm' | 'type';

export function SettingsSheet({ visible, onClose, onSignOut, onDeleteAccount }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('menu');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]} onPress={() => {}}>
          <View style={styles.handle} />

          {step === 'menu' && (
            <>
              <Text style={styles.title}>Settings</Text>
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
});
