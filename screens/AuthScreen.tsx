import { useState, useMemo } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { spacing, fontFamilies, useTheme } from '../theme';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../constants';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

let GoogleSignin: any = null;
try {
  const gsModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gsModule.GoogleSignin;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
  });
} catch {}

interface Props {
  onDevBypass?: () => void;
  onOpenCrisisResources?: () => void;
}

export function AuthScreen({ onDevBypass, onOpenCrisisResources }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);
  const { isConnected } = useNetworkStatus();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

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
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Sentry.captureException(e);
        Alert.alert('Sign in failed', err.message);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    if (!GoogleSignin || !isConnected) return;
    setLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return;
      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert('Sign in failed', 'Google did not return an ID token.');
        return;
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) Alert.alert('Sign in failed', error.message);
    } catch (e) {
      Sentry.captureException(e);
      Alert.alert('Sign in failed', (e as Error).message);
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
          <ActivityIndicator color={colors['accent-gold']} style={styles.loader} />
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleBtn}
            onPress={handleApple}
          />
        )}

        {loading === 'google' ? (
          <ActivityIndicator color={colors['accent-gold']} style={styles.loader} />
        ) : (
          GoogleSignin && (
            <TouchableOpacity
              onPress={handleGoogle}
              style={styles.googleBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginRight: 12 }}>
                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </Svg>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          )
        )}

        {__DEV__ && onDevBypass && (
          <Text style={styles.devBtn} onPress={onDevBypass}>
            [DEV] Skip — login as user_1
          </Text>
        )}

        <Text style={styles.crisisText}>
          {"If you're in crisis right now, you can find support resources "}
          <Text
            style={styles.crisisLink}
            onPress={onOpenCrisisResources}
            accessibilityRole="link"
            accessibilityLabel="Open crisis resources"
          >
            here
          </Text>
          {'.'}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(colors: import('../theme').ColorTokens, _typography: import('../theme').TypographyTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors['bg-primary'],
      paddingHorizontal: spacing.xl,
      justifyContent: 'space-between',
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    wordmark: {
      color: colors['text-tertiary'],
      fontSize: 11,
      letterSpacing: 6,
      marginBottom: spacing.xxl,
    },
    heading: {
      fontFamily: fontFamilies.serifItalic,
      fontSize: 36,
      color: colors['text-primary'],
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    sub: {
      color: colors['border-subtle'],
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
      height: 56,
    },
    googleBtn: {
      width: '100%',
      height: 48,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleBtnText: {
      fontFamily: fontFamilies.interRegular,
      fontSize: 17,
      fontWeight: '600',
      color: '#3c3c3c',
      letterSpacing: 0.3,
    },
    loader: {
      height: 48,
    },
    offlineText: {
      color: colors['text-tertiary'],
      fontSize: 12,
      textAlign: 'center',
      letterSpacing: 0.3,
      marginBottom: spacing.sm,
    },
    devBtn: {
      color: colors['border-subtle'],
      fontSize: 11,
      textAlign: 'center',
      paddingVertical: spacing.sm,
      opacity: 0.5,
    },
    crisisText: {
      color: colors['text-tertiary'],
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: spacing.sm,
    },
    crisisLink: {
      color: colors['accent-gold'],
    },
  });
}
