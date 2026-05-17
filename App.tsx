import 'react-native-url-polyfill/auto';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  View, BackHandler, Platform, Alert, Modal,
} from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ThemeProvider } from './theme';
import PagerView from 'react-native-pager-view';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { STORAGE_KEY_HAS_SEEN_WELCOME, STORAGE_KEY_HANDLED_TOPICS, STORAGE_KEY_FLAGGED_TOPICS, STORAGE_KEY_VENT_MESSAGES_USED, STORAGE_KEY_HOME_CACHE, STORAGE_KEY_PENDING_SESSION, NOTIF_PREFS_KEY, DEFAULT_NOTIF_HOUR, DEFAULT_NOTIF_MINUTE, REVIVAL_PRODUCT_ID } from './constants';
import { supabase, loadStreakAndCount, loadWeeklyTraits, loadLastSession, saveSession, recordStreakRevival, computeCanRevive as computeCanReviveDate } from './lib/supabase';
import { initAuth, buildHoroscopeContext, setAuthUser, signOut, deleteAccount, getUserId } from './lib/auth';
import { track, identifyUser, resetAnalytics } from './lib/analytics';
import { initIAP, loginIAP, logoutIAP, purchaseRevival } from './lib/iap';
import Purchases from 'react-native-purchases';
import RevivalModal from './components/RevivalModal';
import { useSubscription } from './hooks/useSubscription';
import { requestNotificationPermissions, scheduleDailyReminder, cancelDailyReminder, cancelTodayReminder, scheduleStreakReminders } from './lib/notifications';
import { loadTherapyPreview } from './lib/ai/therapy';
import { loadJournalEntries } from './lib/journalHelpers';
import { AuthScreen } from './screens/AuthScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BottomTabBar, TabId } from './components/BottomTabBar';
import { PaywallScreen } from './screens/PaywallScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { VentScreen } from './screens/VentScreen';
import { TalkHubScreen } from './screens/TalkHubScreen';
import { JournalScreen } from './screens/JournalScreen';
import { WritingScreen } from './screens/WritingScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { CrisisResourcesScreen } from './screens/CrisisResourcesScreen';
import { PracticeDrawer } from './components/PracticeDrawer';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { colors } from './theme';
import { useVoice } from './hooks/useVoice';
import { useTTS } from './hooks/useTTS';
import { useStreak } from './hooks/useStreak';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { flushPendingEntries } from './lib/offlineQueue';
import { OfflineBanner } from './components/OfflineBanner';

// ─── MODULE-LEVEL IAP INIT ────────────────────────────────────────────────
initIAP();

// ─── NOTIFICATION HANDLER ──────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── APP COMPONENT ─────────────────────────────────────────────────────────

export default function App() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const [authReady, setAuthReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const isDevBypassRef = useRef(false);
  const [horoscopeContext, setHoroscopeContext] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ hour: DEFAULT_NOTIF_HOUR, minute: DEFAULT_NOTIF_MINUTE, enabled: true });

  // ── Navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>(0);
  const [showWriting, setShowWriting] = useState(false);
  const pagerRef = useRef<PagerView>(null);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ── Shared session results ───────────────────────────────────────────────
  const [insight, setInsight] = useState('');
  const [insightShort, setInsightShort] = useState('');
  const [traits, setTraits] = useState<Record<string, number> | null>(null);
  const [topic, setTopic] = useState('');

  // ── Home data ────────────────────────────────────────────────────────────
  const [streakDays, setStreakDays] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [showRevival, setShowRevival] = useState(false);
  const [canRevive, setCanRevive] = useState(false);
  const [sessionCountLoaded, setSessionCountLoaded] = useState(false);
  const [hasSessionToday, setHasSessionToday] = useState(false);
  const [weeklyTraits, setWeeklyTraits] = useState<Record<string, number> | null>(null);
  const [therapyPreview, setTherapyPreview] = useState<string | null>(null);
  const [dayNote, setDayNote] = useState('');
  const [freshSession, setFreshSession] = useState(false);
  const [therapyResetTick, setTherapyResetTick] = useState(0);
  const [ventTopicOverride, setVentTopicOverride] = useState<string | null>(null);
  const [showSessionPaywall, setShowSessionPaywall] = useState(false);
  const [revivalDate, setRevivalDate] = useState('');
  const [showSession, setShowSession] = useState(false);
  const [showAnswersTick, setShowAnswersTick] = useState(0);
  const [showVent, setShowVent] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [sessionLaunchSource, setSessionLaunchSource] = useState<'home' | 'talk'>('home');

  // ── Hooks ────────────────────────────────────────────────────────────────
  const {
    isRecording, isTranscribing, forceStopCount, micPulseAnim, meteringLevelAnim, meteringSV,
    recordingRef, recordingSetterRef, startVoiceRecording: _startVoiceRecording,
    stopVoiceRecording: _stopVoiceRecording,
  } = useVoice();

  const { ttsEnabled, stopTTS, speakAndWait, isSpeaking, isSpeakingRef: ttsIsSpeakingRef, ttsMeteringSV } = useTTS();

  const {
    streakDisplayValue, showFireEmoji, setShowStreakCelebration,
    streakScaleAnim, fireFloatAnim, fireOpacityAnim, runStreakFireAnimation,
  } = useStreak();

  const { isConnected } = useNetworkStatus();

  // All users get ElevenLabs TTS voiceovers
  function guardedSpeakAndWait(text: string): Promise<void> {
    return speakAndWait(text);
  }
  const [journalRefreshTick, setJournalRefreshTick] = useState(0);
  const prevConnectedRef = useRef(true);

  const { isPremium, canUseVent, freeMessagesRemaining, incrementVentMessages, refreshPremiumStatus } = useSubscription();

  // ── Voice mode refs ──────────────────────────────────────────────────────
  const sessionVoiceModeRef = useRef(false);
  const sessionVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
  const therapyVoiceModeRef = useRef(false);
  const therapyVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
  const writingVoiceModeRef = useRef(false);
  const streakAnimatedTodayRef = useRef('');

  function startVoiceRecording(setterFn: Dispatch<SetStateAction<string>>) {
    const context = sessionVoiceModeRef.current ? 'session'
      : therapyVoiceModeRef.current ? 'vent'
      : 'journal';
    track('voice_recording_started', { context });
    _startVoiceRecording(setterFn, (text: string) => {
      if (sessionVoiceModeRef.current) {
        sessionVoiceSubmitRef.current?.(text);
      } else if (therapyVoiceModeRef.current) {
        therapyVoiceSubmitRef.current?.(text);
      } else {
        setterFn((prev: string) => (prev ? prev + ' ' + text : text));
      }
    }, () => ttsIsSpeakingRef.current);
  }

  function stopVoiceRecording(setterFn: Dispatch<SetStateAction<string>>) {
    _stopVoiceRecording(setterFn);
  }

  // ── Effects ──────────────────────────────────────────────────────────────

  // Android back: non-home tabs go to home tab; home tab exits app
  useEffect(() => {
    const onBack = () => {
      if (activeTab !== 0) {
        setActiveTab(0);
        pagerRef.current?.setPage(0);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [activeTab]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  async function retryPendingSession() {
    const uid = getUserId();
    if (!uid) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PENDING_SESSION);
      if (!raw) return;
      const pending = JSON.parse(raw);
      await saveSession(pending.answers, pending.insight, pending.traits, pending.topic, pending.insightShort || '');
      await AsyncStorage.removeItem(STORAGE_KEY_PENDING_SESSION);
      const { streak, total } = await loadStreakAndCount(false);
      setStreakDays(streak); setSessionCount(total); setSessionCountLoaded(true);
    } catch { /* keep in storage for next retry */ }
  }

  // Flush queued journal writes when connectivity is restored
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current) {
      flushPendingEntries().then(() => setJournalRefreshTick(t => t + 1));
      retryPendingSession();
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // Auth init
  useEffect(() => {
    initAuth().then(async ({ userId: uid, profile }) => {
      if (uid) {
        Sentry.setUser({ id: uid });
        identifyUser(uid);
        loginIAP(uid).then(() => refreshPremiumStatus()).catch(() => {});
      }
      setUserId(uid);
      if (uid && !profile) {
        setNeedsOnboarding(true);
      } else if (uid && profile) {
        setHoroscopeContext(buildHoroscopeContext(profile.dob));
        const seen = await AsyncStorage.getItem(STORAGE_KEY_HAS_SEEN_WELCOME);
        if (!seen) setShowWelcome(true);
      }
      setAuthReady(true);
      AsyncStorage.getItem(NOTIF_PREFS_KEY).then(val => {
        if (val) setNotifPrefs(JSON.parse(val));
      });
      requestNotificationPermissions().then(granted => { if (granted) scheduleDailyReminder(); });
    }).catch(() => setAuthReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      if (session?.user) {
        const uid = session.user.id;
        setAuthUser(uid);
        setUserId(uid);
        Sentry.setUser({ id: uid });
        identifyUser(uid);
        loginIAP(uid).then(() => refreshPremiumStatus()).catch(() => {});
        if (event === 'SIGNED_IN') {
          const { streak, total } = await loadStreakAndCount(false);
          setStreakDays(streak);
          setSessionCount(total);
          setSessionCountLoaded(true);
          AsyncStorage.multiRemove([STORAGE_KEY_HOME_CACHE]).catch(() => {});
          const todayStr = new Date().toLocaleDateString('en-CA');
          const { count: todayCount } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .gte('created_at', new Date(todayStr + 'T00:00:00').toISOString())
            .lt('created_at', new Date(todayStr + 'T24:00:00').toISOString());
          setHasSessionToday((todayCount ?? 0) > 0);
        }
        const { data: profile } = await supabase
          .from('profiles').select('name, dob').eq('user_id', uid).maybeSingle();
        if (!profile) {
          if (__DEV__ && isDevBypassRef.current) {
            isDevBypassRef.current = false;
            await supabase.from('profiles').upsert({ user_id: uid, name: 'Dev User', dob: '1995-06-15' });
            setHoroscopeContext(buildHoroscopeContext('1995-06-15'));
          } else {
            setNeedsOnboarding(true);
            if (event === 'SIGNED_IN') track('sign_up');
          }
        } else {
          setHoroscopeContext(buildHoroscopeContext(profile.dob));
          if (event === 'SIGNED_IN') {
            await AsyncStorage.setItem(STORAGE_KEY_HAS_SEEN_WELCOME, '1');
            setShowWelcome(false);
            track('login');
          } else {
            const seen = await AsyncStorage.getItem(STORAGE_KEY_HAS_SEEN_WELCOME);
            if (!seen) setShowWelcome(true);
          }
        }
      } else {
        setAuthUser(null);
        setUserId(null);
        Sentry.setUser(null);
        resetAnalytics();
        logoutIAP();
        // Reset in-memory data so a new user never sees the previous user's content
        setInsight('');
        setInsightShort('');
        setTraits(null);
        setTopic('');
        setStreakDays(0);
        setSessionCount(0);
        setSessionCountLoaded(false);
        setHasSessionToday(false);
        setWeeklyTraits(null);
        setTherapyPreview(null);
        setDayNote('');
        setFreshSession(false);
        AsyncStorage.multiRemove([STORAGE_KEY_HOME_CACHE, STORAGE_KEY_PENDING_SESSION]).catch(() => {});
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // Mount data load
  useEffect(() => {
    if (!authReady || needsOnboarding) return;

    // Show cached home data immediately while network loads
    AsyncStorage.getItem(STORAGE_KEY_HOME_CACHE).then(raw => {
      if (!raw) return;
      try {
        const cache = JSON.parse(raw);
        if (cache.streakDays !== undefined) { setStreakDays(cache.streakDays); setSessionCount(cache.sessionCount); setSessionCountLoaded(true); }
        if (cache.insight !== undefined) { setInsight(cache.insight); setInsightShort(cache.insightShort || ''); setTraits(cache.traits || null); setTopic(cache.topic || ''); }
      } catch { /* ignore corrupt cache */ }
    });

    retryPendingSession();

    loadStreakAndCount(false).then(({ streak, total }) => {
      setStreakDays(streak);
      setSessionCount(total);
      setSessionCountLoaded(true);
      if (total === 0) setTherapyPreview('');
      computeCanRevive(streak).catch(() => {});
      AsyncStorage.getItem(STORAGE_KEY_HOME_CACHE)
        .then(raw => { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } })
        .then(cache => AsyncStorage.setItem(STORAGE_KEY_HOME_CACHE, JSON.stringify({ ...cache, streakDays: streak, sessionCount: total })))
        .catch(() => {});
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(todayStr + 'T00:00:00').toISOString())
      .lt('created_at', new Date(todayStr + 'T23:59:59').toISOString())
      .then(({ count }) => {
        const doneToday = (count ?? 0) > 0;
        if (doneToday) setHasSessionToday(true);
        scheduleStreakReminders(doneToday);
      });

    loadWeeklyTraits().then(wt => { if (wt) setWeeklyTraits(wt); });

    (async () => {
      const htVal = await AsyncStorage.getItem(STORAGE_KEY_HANDLED_TOPICS);
      const ht = htVal ? JSON.parse(htVal) : [];
      const line = await loadTherapyPreview(ht);
      setTherapyPreview(line || '');
    })();

    loadJournalEntries(todayStr).then(entries => {
      if (entries.length > 0) setDayNote(entries[entries.length - 1].note);
    });

    loadLastSession().then(async last => {
      if (last) {
        setInsight(last.insight || '');
        setInsightShort(last.insight_short || '');
        setTraits(last.traits || null);
        setTopic(last.topic || '');
        AsyncStorage.getItem(STORAGE_KEY_HOME_CACHE)
          .then(raw => { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } })
          .then(cache => AsyncStorage.setItem(STORAGE_KEY_HOME_CACHE, JSON.stringify({ ...cache, insight: last.insight || '', insightShort: last.insight_short || '', traits: last.traits || null, topic: last.topic || '' })))
          .catch(() => {});
      }
    });
  }, [authReady, needsOnboarding]);

  const computeCanRevive = async (currentStreak: number) => {
    if (currentStreak > 0) { setCanRevive(false); return; }
    const uid = getUserId();
    if (!uid) { setCanRevive(false); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toLocaleDateString('en-CA');
    const result = await computeCanReviveDate(uid, yStr);
    setCanRevive(result);
  };

  const handleStreakRevival = async () => {
    try {
      const success = await purchaseRevival();
      if (!success) return;
      await recordStreakRevival(revivalDate || new Date().toLocaleDateString('en-CA'));
      setCanRevive(false);
      const { streak, total } = await loadStreakAndCount(false);
      setStreakDays(streak);
      setSessionCount(total);
      setSessionCountLoaded(true);
    } catch {
      // purchase failed — do nothing, RevenueCat shows its own error UI
    }
  };

  async function handleSignOut() {
    setShowSettings(false);
    await signOut();
  }

  async function handleDeleteAccount(): Promise<void> {
    await deleteAccount();
    await AsyncStorage.multiRemove([
      STORAGE_KEY_HAS_SEEN_WELCOME,
      STORAGE_KEY_HANDLED_TOPICS,
      STORAGE_KEY_FLAGGED_TOPICS,
      STORAGE_KEY_VENT_MESSAGES_USED,
      STORAGE_KEY_HOME_CACHE,
      STORAGE_KEY_PENDING_SESSION,
    ]);
    setShowSettings(false);
  }

  const handleSaveNotifPrefs = async (hour: number, minute: number, enabled: boolean) => {
    const prefs = { hour, minute, enabled };
    setNotifPrefs(prefs);
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
    if (enabled) {
      scheduleDailyReminder(hour, minute);
    } else {
      cancelDailyReminder();
    }
  };

  const TAB_NAMES: Record<number, string> = { 0: 'home', 1: 'talk', 2: 'journal' };

  // PagerView has 3 pages: 0=Today, 1=TalkHub, 2=Journal
  // TabId values: 0=Today, 1=Talk, 2=Journal
  const TAB_TO_PAGE: Record<TabId, number> = { 0: 0, 1: 1, 2: 2 };
  const PAGE_TO_TAB: Record<number, TabId> = { 0: 0 as TabId, 1: 1 as TabId, 2: 2 as TabId };

  function handleTabPress(tab: TabId) {
    track('tab_changed', { tab: TAB_NAMES[tab] ?? tab });
    setActiveTab(tab);
    pagerRef.current?.setPage(TAB_TO_PAGE[tab]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ThemeProvider is intentionally placed at the outermost level (outside all
  // auth-state conditional branches) so it never remounts when the user signs
  // in/out. Remounting would reset isDark to false before AsyncStorage is read,
  // which caused the "logging in switches to dark mode" symptom (D2 fix).
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>

          {/* Loading gate: hide all UI until fonts and auth are ready */}
          {(!fontsLoaded || !authReady) && (
            <View style={{ flex: 1, backgroundColor: colors.bg }} />
          )}

          {/* Auth screen */}
          {fontsLoaded && authReady && !userId && (
            <>
              <StatusBar style="dark" translucent />
              <AuthScreen
                onDevBypass={__DEV__ ? async () => { isDevBypassRef.current = true; const { error } = await supabase.auth.signInAnonymously(); if (error) { isDevBypassRef.current = false; Alert.alert('Dev bypass failed', error.message); } } : undefined}
                onOpenCrisisResources={() => setShowCrisis(true)}
              />
            </>
          )}

          {/* Onboarding */}
          {fontsLoaded && authReady && !!userId && needsOnboarding && (
            <>
              <StatusBar style="dark" translucent />
              <OnboardingScreen
                onComplete={({ name, dob }: { name: string; dob: string }) => {
                  track('onboarding_completed');
                  setHoroscopeContext(buildHoroscopeContext(dob));
                  setNeedsOnboarding(false);
                  setShowWelcome(true);
                }}
              />
            </>
          )}

          {/* Welcome */}
          {fontsLoaded && authReady && !!userId && !needsOnboarding && showWelcome && (
            <>
              <StatusBar style="dark" translucent />
              <WelcomeScreen onDone={() => {
                track('welcome_screen_dismissed');
                AsyncStorage.setItem(STORAGE_KEY_HAS_SEEN_WELCOME, '1');
                setShowWelcome(false);
              }} />
            </>
          )}

          {/* Main app */}
          {fontsLoaded && authReady && !!userId && !needsOnboarding && !showWelcome && (
            <>
          <StatusBar style="auto" translucent />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {!isConnected && <OfflineBanner />}
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={0}
            offscreenPageLimit={3}
            onPageSelected={e => {
              const page = e.nativeEvent.position;
              const tab = PAGE_TO_TAB[page] ?? 0 as TabId;
              setActiveTab(tab);
              sessionVoiceModeRef.current = false;
              therapyVoiceModeRef.current = false;
              writingVoiceModeRef.current = false;
              if (recordingRef.current && recordingSetterRef.current) stopVoiceRecording(recordingSetterRef.current);
            }}
          >
            {/* Page 0: Today */}
            <View key="0" style={{ flex: 1 }}>
              <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
              <HomeScreen
                streakDays={streakDays}
                sessionCount={sessionCount}
                sessionCountLoaded={sessionCountLoaded}
                hasSessionToday={hasSessionToday}
                insight={insight}
                insightShort={insightShort}
                traits={traits}
                weeklyTraits={weeklyTraits}
                topic={topic}
                therapyPreview={therapyPreview}
                dayNote={dayNote}
                freshSession={freshSession}
                streakDisplayValue={streakDisplayValue}
                showFireEmoji={showFireEmoji}
                fireFloatAnim={fireFloatAnim}
                fireOpacityAnim={fireOpacityAnim}
                streakScaleAnim={streakScaleAnim}
                onStartSession={() => {
                  if (!isPremium && hasSessionToday) { setShowSessionPaywall(true); return; }
                  setSessionLaunchSource('home');
                  setShowSession(true);
                }}
                onOpenTalk={() => { setActiveTab(1); pagerRef.current?.setPage(TAB_TO_PAGE[1]); }}
                onOpenJournal={() => { setActiveTab(2); pagerRef.current?.setPage(TAB_TO_PAGE[2]); }}
                onOpenAnswers={() => { setActiveTab(2); pagerRef.current?.setPage(TAB_TO_PAGE[2]); setShowAnswersTick(t => t + 1); }}
                onOpenSettings={() => setShowSettings(true)}
                onOpenDrawer={() => setShowDrawer(true)}
                userId={userId}
                isPremium={isPremium}
                onPremiumStatusChanged={refreshPremiumStatus}
                canRevive={canRevive}
                onReclaimStreak={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setRevivalDate(y.toLocaleDateString('en-CA'));
                  setShowRevival(true);
                }}
              />
              </Sentry.ErrorBoundary>
            </View>

            {/* Page 1: Talk Hub */}
            <View key="1" style={{ flex: 1 }}>
              <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
              <TalkHubScreen
                onStartSession={() => {
                  if (!isPremium && hasSessionToday) { setShowSessionPaywall(true); return; }
                  setSessionLaunchSource('talk');
                  setShowSession(true);
                }}
                onStartVent={() => setShowVent(true)}
                hasSessionToday={hasSessionToday}
                isPremium={isPremium}
              />
              </Sentry.ErrorBoundary>
            </View>

            {/* Page 2: Journal */}
            <View key="2" style={{ flex: 1 }}>
              <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
              <JournalScreen
                key={userId ?? 'guest'}
                userId={userId}
                sessionCount={sessionCount}
                dayNote={dayNote}
                onDayNoteChange={setDayNote}
                isActive={activeTab === 2}
                isConnected={isConnected}
                showAnswersTick={showAnswersTick}
                onOpenWriting={() => setShowWriting(true)}
                onStreakRevived={async () => {
                  const { streak, total } = await loadStreakAndCount(false);
                  setStreakDays(streak);
                  setSessionCount(total);
                  setSessionCountLoaded(true);
                }}
              />
              </Sentry.ErrorBoundary>
            </View>
          </PagerView>

          <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
        </View>
        <SettingsSheet
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          notifHour={notifPrefs.hour}
          notifMinute={notifPrefs.minute}
          notifEnabled={notifPrefs.enabled}
          onSaveNotifPrefs={handleSaveNotifPrefs}
          onOpenCrisisResources={() => setShowCrisis(true)}
        />
        <RevivalModal
          visible={showRevival}
          onClose={() => setShowRevival(false)}
          onConfirm={async () => { await handleStreakRevival(); setShowRevival(false); }}
          date={revivalDate}
        />
        <PaywallScreen
          visible={showSessionPaywall}
          source="session"
          onClose={() => setShowSessionPaywall(false)}
          onSubscribed={async () => { await refreshPremiumStatus(); setShowSessionPaywall(false); setShowSession(true); }}
        />
        <Modal
          visible={showWriting}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowWriting(false)}
        >
          <SafeAreaProvider>
            <WritingScreen
              userId={userId ?? ''}
              horoscopeContext={horoscopeContext}
              insight={insight}
              topic={topic}
              isActive={showWriting}
              isConnected={isConnected}
              journalRefreshTick={journalRefreshTick}
              isRecording={isRecording}
              micPulseAnim={micPulseAnim}
              meteringLevelAnim={meteringLevelAnim}
              onStartVoiceRecording={startVoiceRecording}
              onStopVoiceRecording={stopVoiceRecording}
              writingVoiceModeRef={writingVoiceModeRef}
              fontsLoaded={fontsLoaded ?? false}
              onClose={() => setShowWriting(false)}
            />
          </SafeAreaProvider>
        </Modal>
        <Modal
          visible={showSession}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowSession(false)}
        >
          <SafeAreaProvider>
            <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
            <SessionScreen
              userId={userId}
              sessionCount={sessionCount}
              horoscopeContext={horoscopeContext}
              topic={topic}
              traits={traits}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              micPulseAnim={micPulseAnim}
              meteringLevelAnim={meteringLevelAnim}
              meteringSV={meteringSV}
              isTtsSpeaking={isSpeaking}
              ttsMeteringSV={ttsMeteringSV}
              ttsEnabled={ttsEnabled}
              isConnected={isConnected}
              onSessionComplete={({ answers: _ans, insight: ins, insightShort: insShort, traits: tr, topic: tp, streak, total }) => {
                const oldStreak = streakDays;
                setInsight(ins); setInsightShort(insShort); setTraits(tr); setTopic(tp);
                setStreakDays(streak); setSessionCount(total); setSessionCountLoaded(true);
                setHasSessionToday(true); setFreshSession(true);
                const _d = new Date();
                const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
                if (streakAnimatedTodayRef.current === todayStr) {
                  // already animated today — skip
                } else {
                  AsyncStorage.getItem('lastStreakAnimDate').then(lastDate => {
                    if (lastDate !== todayStr) {
                      streakAnimatedTodayRef.current = todayStr;
                      AsyncStorage.setItem('lastStreakAnimDate', todayStr)
                        .then(() => {})
                        .catch(() => {});
                      setShowStreakCelebration(true);
                      runStreakFireAnimation(oldStreak, streak);
                    }
                  }).catch(() => {});
                }
                AsyncStorage.getItem(STORAGE_KEY_HANDLED_TOPICS)
                  .then(val => { try { return val ? JSON.parse(val) : []; } catch { return []; } })
                  .then(ht => loadTherapyPreview(ht))
                  .then(line => setTherapyPreview(line || ''));
                loadWeeklyTraits().then(wt => { if (wt) setWeeklyTraits(wt); });
                setShowSession(false);
                if (sessionLaunchSource === 'home') { setActiveTab(0); pagerRef.current?.setPage(0); }
              }}
              onExit={() => setShowSession(false)}
              onNavigateToVent={(tp) => { setVentTopicOverride(tp); setShowSession(false); setActiveTab(1); pagerRef.current?.setPage(1); setShowVent(true); }}
              onStartVoiceRecording={startVoiceRecording}
              onStopVoiceRecording={stopVoiceRecording}
              onStopTTS={stopTTS}
              onSpeakAndWait={guardedSpeakAndWait}
              sessionVoiceModeRef={sessionVoiceModeRef}
              sessionVoiceSubmitRef={sessionVoiceSubmitRef}
              isPremium={isPremium}
              onPremiumStatusChanged={refreshPremiumStatus}
              hasSessionToday={hasSessionToday}
              onSessionSaved={(streak, total) => {
                setStreakDays(streak);
                setSessionCount(total);
                setSessionCountLoaded(true);
                setHasSessionToday(true);
                cancelTodayReminder().catch(() => {});
              }}
            />
            </Sentry.ErrorBoundary>
          </SafeAreaProvider>
        </Modal>
        <Modal visible={showVent} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowVent(false)}>
          <SafeAreaProvider>
            <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
            <VentScreen
              horoscopeContext={horoscopeContext}
              ttsEnabled={ttsEnabled}
              stopTTS={stopTTS}
              speakAndWait={guardedSpeakAndWait}
              sessionCount={sessionCount}
              sessionCountLoaded={sessionCountLoaded}
              therapyPreview={therapyPreview}
              therapyResetTick={therapyResetTick}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              micPulseAnim={micPulseAnim}
              meteringLevelAnim={meteringLevelAnim}
              meteringSV={meteringSV}
              isTtsSpeaking={isSpeaking}
              ttsMeteringSV={ttsMeteringSV}
              onStartVoiceRecording={startVoiceRecording}
              onStopVoiceRecording={stopVoiceRecording}
              therapyVoiceModeRef={therapyVoiceModeRef}
              therapyVoiceSubmitRef={therapyVoiceSubmitRef}
              onTherapyPreviewChange={line => setTherapyPreview(line)}
              isConnected={isConnected}
              canUseVent={canUseVent}
              freeMessagesRemaining={freeMessagesRemaining}
              isPremium={isPremium}
              onVentMessageSent={incrementVentMessages}
              onPremiumStatusChanged={refreshPremiumStatus}
              ventTopicOverride={ventTopicOverride}
              onVentTopicUsed={() => setVentTopicOverride(null)}
              forceStopCount={forceStopCount}
              onClose={() => setShowVent(false)}
            />
            </Sentry.ErrorBoundary>
          </SafeAreaProvider>
        </Modal>
        <Modal visible={showAnalytics} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowAnalytics(false)}>
          <SafeAreaProvider>
            <AnalyticsScreen userId={userId ?? ''} isActive={showAnalytics} onClose={() => setShowAnalytics(false)} />
          </SafeAreaProvider>
        </Modal>
        <PracticeDrawer
          visible={showDrawer}
          onClose={() => setShowDrawer(false)}
          userId={userId ?? ''}
          streakDays={streakDays}
          sessionCount={sessionCount}
          traits={traits}
          weeklyTraits={weeklyTraits}
          isPremium={isPremium}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAnalytics={() => setShowAnalytics(true)}
          onSignOut={handleSignOut}
        />
            </>
          )}

        {showCrisis && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            backgroundColor: colors['bg-primary'],
          }}>
            <SafeAreaProvider>
              <CrisisResourcesScreen onClose={() => setShowCrisis(false)} />
            </SafeAreaProvider>
          </View>
        )}
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
