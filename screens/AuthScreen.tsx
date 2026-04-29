// screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { colors, spacing, fontFamilies } from '../theme';
import { OTP_CODE_LENGTH, AUTH_REDIRECT_URL } from '../constants';

type Props = {
  onAuthComplete?: () => void;
};

type Step = 'email' | 'sending' | 'sent' | 'verifying' | 'error';

export function AuthScreen({ onAuthComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastSentAt, setLastSentAt] = useState(0);

  async function sendMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      setStep('error');
      return;
    }
    setStep('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: AUTH_REDIRECT_URL },
    });
    if (error) {
      setErrorMsg(error.message);
      setStep('error');
    } else {
      setLastSentAt(Date.now());
      setStep('sent');
    }
  }

  function devWipe() {
    Alert.alert('Wipe all data?', 'Deletes all Supabase rows and clears local storage.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Wipe', style: 'destructive', onPress: async () => {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const uid = currentSession?.user?.id;
          if (!uid) { Alert.alert('Not signed in'); return; }
          const { data: userSessions } = await supabase
            .from('sessions').select('id').eq('user_id', uid);
          const ids = (userSessions || []).map((s: any) => s.id);
          if (ids.length > 0) {
            await supabase.from('answers').delete().in('session_id', ids);
          }
          await supabase.from('sessions').delete().eq('user_id', uid);
          await supabase.from('day_notes').delete().eq('user_id', uid);
          await supabase.from('profiles').delete().eq('user_id', uid);
          await supabase.auth.signOut();
          await AsyncStorage.clear();
          setStep('email'); setEmail(''); setCode(''); setErrorMsg('');
          Alert.alert('Done', 'Your data has been wiped.');
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to wipe data');
        }
      }},
    ]);
  }

  async function verifyCode() {
    const trimmedCode = code.trim();
    if (trimmedCode.length < OTP_CODE_LENGTH) {
      setErrorMsg(`Enter the ${OTP_CODE_LENGTH}-digit code from your email.`);
      setStep('sent'); // stay on code screen, not email screen
      return;
    }
    setStep('verifying');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: trimmedCode,
      type: 'email',
    });
    if (error) {
      setErrorMsg(error.message);
      setStep('sent');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.wordmark}>UNPACK</Text>

        {step === 'sent' || step === 'verifying' ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentTitle}>check your email</Text>
            <Text style={styles.sentSub}>
              enter the 8-digit code sent to{'\n'}{email.trim().toLowerCase()}
            </Text>
            <TextInput
              style={[styles.input, { marginTop: spacing.xl, letterSpacing: 8, textAlign: 'center' }]}
              placeholder={'0'.repeat(OTP_CODE_LENGTH)}
              placeholderTextColor={colors.textGhost}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={OTP_CODE_LENGTH}
              returnKeyType="done"
              onSubmitEditing={verifyCode}
              editable={step !== 'verifying'}
            />
            {errorMsg && step === 'sent' && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}
            {step === 'verifying' ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : (
              <TouchableOpacity style={styles.btn} onPress={verifyCode}>
                <Text style={styles.btnText}>VERIFY CODE</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setStep('email'); setCode(''); setErrorMsg(''); }} style={{ marginTop: spacing.xl }}>
              <Text style={styles.ghostText}>WRONG EMAIL? START OVER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.heading}>sign in</Text>
            <Text style={styles.sub}>enter your email — we'll send you a magic link.</Text>

            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textGhost}
              value={email}
              onChangeText={t => { setEmail(t); if (step === 'error') setStep('email'); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={sendMagicLink}
              editable={step !== 'sending'}
            />

            {step === 'error' && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            {step === 'sending' ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : Date.now() - lastSentAt < 60_000 ? (
              <Text style={[styles.ghostText, { marginTop: spacing.xl }]}>CHECK YOUR INBOX — RESEND IN 60S</Text>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={sendMagicLink}>
                <Text style={styles.btnText}>SEND MAGIC LINK</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <TouchableOpacity onPress={devWipe} style={styles.devWipe}>
          <Text style={styles.devWipeText}>DEV WIPE</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: colors.textMuted, fontSize: 11, letterSpacing: 6, marginBottom: spacing.xxl },
  heading: { fontFamily: fontFamilies.serifItalic, fontSize: 28, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  sub: { color: colors.textGhost, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  input: {
    width: '100%', color: colors.textPrimary, fontSize: 15,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: spacing.md, textAlign: 'center', letterSpacing: 1,
  },
  btn: {
    marginTop: spacing.xl, borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)',
    borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xxl,
  },
  btnText: { color: colors.accent, fontSize: 11, letterSpacing: 6 },
  ghostText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  errorText: { color: '#c0614a', fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  devWipe: { position: 'absolute', bottom: 0, right: 0, padding: spacing.md, opacity: 0.25 },
  devWipeText: { color: colors.textMuted, fontSize: 9, letterSpacing: 2 },
  sentBox: { alignItems: 'center', gap: spacing.md },
  sentTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 24, color: colors.textPrimary },
  sentSub: { color: colors.textGhost, fontSize: 13, textAlign: 'center', lineHeight: 22 },
});
