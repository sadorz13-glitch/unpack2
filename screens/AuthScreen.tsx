import React, { useState } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontFamilies } from '../theme';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../constants';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  scopes: ['profile', 'email'],
});

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);
  const { isConnected } = useNetworkStatus();

  async function handleApple() {
    if (!isConnected) return;
    setLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      });
      if (error) Alert.alert('Sign in failed', error.message);
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Sentry.captureException(e);
        Alert.alert('Sign in failed', e.message);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    if (!isConnected) return;
    setLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return;
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.data.idToken!,
      });
      if (error) Alert.alert('Sign in failed', error.message);
    } catch (e: any) {
      Sentry.captureException(e);
      Alert.alert('Sign in failed', e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.inner}>
        <Text style={styles.wordmark}>UNPACK</Text>
        <Text style={styles.heading}>know yourself.</Text>
        <Text style={styles.sub}>your thoughts, privately yours.</Text>
      </View>

      <View style={styles.buttons}>
        {!isConnected && (
          <Text style={styles.offlineText}>No internet connection.</Text>
        )}
        {loading === 'apple' ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={2}
            style={styles.appleBtn}
            onPress={handleApple}
          />
        )}

        {loading === 'google' ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <Text
            style={[styles.googleBtn, loading ? styles.disabled : null]}
            onPress={loading ? undefined : handleGoogle}
          >
            Continue with Google
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 6,
    marginBottom: spacing.xxl,
  },
  heading: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 36,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sub: {
    color: colors.textGhost,
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttons: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  appleBtn: {
    width: '100%',
    height: 48,
  },
  googleBtn: {
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loader: {
    height: 48,
  },
  disabled: {
    opacity: 0.4,
  },
  offlineText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
});
