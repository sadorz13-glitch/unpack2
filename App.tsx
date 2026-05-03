import 'react-native-url-polyfill/auto';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef } from 'react';
import {
  View, BackHandler, Platform, Alert,
} from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import PagerView from 'react-native-pager-view';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { STORAGE_KEY_HAS_SEEN_WELCOME, STORAGE_KEY_HANDLED_TOPICS, STORAGE_KEY_FLAGGED_TOPICS, STORAGE_KEY_VENT_MESSAGES_USED, STORAGE_KEY_HOME_CACHE, STORAGE_KEY_PENDING_SESSION, NOTIF_PREFS_KEY, DEFAULT_NOTIF_HOUR, DEFAULT_NOTIF_MINUTE, REVIVAL_PRODUCT_ID } from './constants';
import { supabase, loadStreakAndCount, loadWeeklyTraits, loadLastSession, saveSession, recordStreakRevival } from './lib/supabase';
import { initAuth, buildHoroscopeContext, setAuthUser, signOut, deleteAccount, getUserId } from './lib/auth';
import { track, identifyUser, resetAnalytics } from './lib/analytics';
import { initIAP, loginIAP, logoutIAP, purchaseRevival } from './lib/iap';
import Purchases from 'react-native-purchases';
import RevivalModal from './components/RevivalModal';
import { useSubscription } from './hooks/useSubscription';
import { requestNotificationPermissions, scheduleDailyReminder, cancelDailyReminder, scheduleStreakReminders } from './lib/notifications';
import { loadTherapyPreview } from './lib/ai/therapy';
import { loadJournalEntries } from './lib/journalHelpers';
import { AuthScreen } from './screens/AuthScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BottomTabBar, TabId } from './components/BottomTabBar';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { TalkScreen } from './screens/TalkScreen';
import { JournalScreen } from './screens/JournalScreen';
import { WritingScreen } from './screens/WritingScreen';
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
  const pagerRef = useRef<any>(null);
  const [fontsLoaded] = useFonts({ DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic });

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

  // ── Hooks ────────────────────────────────────────────────────────────────
  const {
    isRecording, isTranscribing, micPulseAnim, meteringLevelAnim,
    recordingRef, recordingSetterRef, startVoiceRecording: _startVoiceRecording,
    stopVoiceRecording: _stopVoiceRecording,
  } = useVoice();

  const { isSpeaking, ttsEnabled, setTtsEnabled, stopTTS, speakAndWait } = useTTS();

  const {
    streakDisplayValue, showFireEmoji, setShowStreakCelebration,
    streakScaleAnim, fireFloatAnim, fireOpacityAnim, runStreakFireAnimation,
  } = useStreak();

  const { isConnected } = useNetworkStatus();
  const [journalRefreshTick, setJournalRefreshTick] = useState(0);
  const prevConnectedRef = useRef(true);

  const { isPremium, canUseVent, freeMessagesRemaining, incrementVentMessages, refreshPremiumStatus } = useSubscription();

  // ── Voice mode refs ──────────────────────────────────────────────────────
  const sessionVoiceModeRef = useRef(false);
  const sessionVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
  const therapyVoiceModeRef = useRef(false);
  const therapyVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
  const writingVoiceModeRef = useRef(false);

  // Voice routing wrapper — routes transcribed text to the correct handler
  function startVoiceRecording(setterFn: any) {
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
    });
  }

  function stopVoiceRecording(setterFn: any) {
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
        loginIAP(uid).catch(() => {});
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
        loginIAP(uid).catch(() => {});
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
          const seen = await AsyncStorage.getItem(STORAGE_KEY_HAS_SEEN_WELCOME);
          if (!seen) setShowWelcome(true);
          if (event === 'SIGNED_IN') track('login');
        }
      } else {
        setAuthUser(null);
        setUserId(null);
        Sentry.setUser(null);
        resetAnalytics();
        logoutIAP();
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
    const rcReady = typeof Purchases !== 'undefined';
    if (!rcReady) { setCanRevive(false); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toLocaleDateString('en-CA');
    const uid = getUserId();
    if (!uid) { setCanRevive(false); return; }
    const [{ count: sCount }, { count: nCount }, { count: rCount }] = await Promise.all([
      supabase.from('sessions').select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', new Date(yStr + 'T00:00:00').toISOString())
        .lt('created_at', new Date(yStr + 'T23:59:59').toISOString()),
      supabase.from('day_notes').select('id', { count: 'exact', head: true })
        .eq('user_id', uid).eq('date', yStr),
      supabase.from('streak_revivals').select('id', { count: 'exact', head: true })
        .eq('user_id', uid).eq('revived_date', yStr),
    ]);
    setCanRevive(((sCount ?? 0) + (nCount ?? 0) + (rCount ?? 0)) > 0);
  };

  const handleStreakRevival = async () => {
    try {
      const success = await purchaseRevival();
      if (!success) return;
      const today = new Date().toISOString().split('T')[0];
      await recordStreakRevival(today);
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

  const TAB_NAMES: Record<number, string> = { 0: 'home', 1: 'session', 2: 'vent', 3: 'journal', 4: 'write' };

  function handleTabPress(tab: TabId) {
    track('tab_changed', { tab: TAB_NAMES[tab] ?? tab });
    setActiveTab(tab);
    pagerRef.current?.setPage(tab);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!fontsLoaded || !authReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!userId) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" translucent />
          <AuthScreen onDevBypass={__DEV__ ? async () => { isDevBypassRef.current = true; const { error } = await supabase.auth.signInAnonymously(); if (error) { isDevBypassRef.current = false; Alert.alert('Dev bypass failed', error.message); } } : undefined} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (needsOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" translucent />
          <OnboardingScreen
            onComplete={({ name, dob }: { name: string; dob: string }) => {
              track('onboarding_completed');
              setHoroscopeContext(buildHoroscopeContext(dob));
              setNeedsOnboarding(false);
              setShowWelcome(true);
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (showWelcome) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" translucent />
          <WelcomeScreen onDone={() => {
            track('welcome_screen_dismissed');
            AsyncStorage.setItem(STORAGE_KEY_HAS_SEEN_WELCOME, '1');
            setShowWelcome(false);
          }} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {!isConnected && <OfflineBanner />}
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={0}
            onPageSelected={e => {
              const tab = e.nativeEvent.position as TabId;
              setActiveTab(tab);
              sessionVoiceModeRef.current = false;
              therapyVoiceModeRef.current = false;
              writingVoiceModeRef.current = false;
              if (recordingRef.current) stopVoiceRecording(recordingSetterRef.current);
            }}
          >
            {/* Tab 0: Home */}
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
                onStartSession={() => { setActiveTab(1); pagerRef.current?.setPage(1); }}
                onOpenTalk={() => { setActiveTab(2); pagerRef.current?.setPage(2); }}
                onOpenJournal={() => { setActiveTab(3); pagerRef.current?.setPage(3); }}
                onOpenAnswers={() => { setActiveTab(3); pagerRef.current?.setPage(3); }}
                onOpenSettings={() => setShowSettings(true)}
                userId={userId}
                isPremium={isPremium}
                onPremiumStatusChanged={refreshPremiumStatus}
                canRevive={canRevive}
                onReclaimStreak={() => setShowRevival(true)}
              />
              </Sentry.ErrorBoundary>
            </View>

            {/* Tab 1: Session */}
            <View key="1" style={{ flex: 1 }}>
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
                ttsEnabled={ttsEnabled}
                isConnected={isConnected}
                onSessionComplete={({ answers: _ans, insight: ins, insightShort: insShort, traits: tr, topic: tp, streak, total }) => {
                  const wasFirstToday = !hasSessionToday;
                  const oldStreak = streakDays;
                  setInsight(ins); setInsightShort(insShort); setTraits(tr); setTopic(tp);
                  setStreakDays(streak); setSessionCount(total); setSessionCountLoaded(true);
                  setHasSessionToday(true); setFreshSession(true);
                  if (wasFirstToday) {
                    setShowStreakCelebration(true);
                    runStreakFireAnimation(oldStreak, streak);
                  }
                  AsyncStorage.getItem(STORAGE_KEY_HANDLED_TOPICS)
                    .then(val => { try { return val ? JSON.parse(val) : []; } catch { return []; } })
                    .then(ht => loadTherapyPreview(ht))
                    .then(line => setTherapyPreview(line || ''));
                  loadWeeklyTraits().then(wt => { if (wt) setWeeklyTraits(wt); });
                  setActiveTab(0); pagerRef.current?.setPage(0);
                }}
                onExit={() => { setActiveTab(0); pagerRef.current?.setPage(0); }}
                onStartVoiceRecording={startVoiceRecording}
                onStopVoiceRecording={stopVoiceRecording}
                onStopTTS={stopTTS}
                onSpeakAndWait={speakAndWait}
                sessionVoiceModeRef={sessionVoiceModeRef}
                sessionVoiceSubmitRef={sessionVoiceSubmitRef}
              />
              </Sentry.ErrorBoundary>
            </View>

            {/* Tab 2: Talk */}
            <View key="2" style={{ flex: 1 }}>
              <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
              <TalkScreen
                horoscopeContext={horoscopeContext}
                ttsEnabled={ttsEnabled}
                stopTTS={stopTTS}
                speakAndWait={speakAndWait}
                sessionCount={sessionCount}
                sessionCountLoaded={sessionCountLoaded}
                therapyPreview={therapyPreview}
                therapyResetTick={therapyResetTick}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                micPulseAnim={micPulseAnim}
                meteringLevelAnim={meteringLevelAnim}
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
              />
              </Sentry.ErrorBoundary>
            </View>

            {/* Tab 3: Journal */}
            <View key="3" style={{ flex: 1 }}>
              <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
              <JournalScreen
                userId={userId}
                sessionCount={sessionCount}
                dayNote={dayNote}
                onDayNoteChange={setDayNote}
                isActive={activeTab === 3}
                isConnected={isConnected}
              />
              </Sentry.ErrorBoundary>
            </View>

            {/* Tab 4: Write */}
            <View key="4" style={{ flex: 1 }}>
              <Sentry.ErrorBoundary fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
              <WritingScreen
                userId={userId ?? ''}
                horoscopeContext={horoscopeContext}
                insight={insight}
                topic={topic}
                streakDays={streakDays}
                isActive={activeTab === 4}
                isConnected={isConnected}
                journalRefreshTick={journalRefreshTick}
                isRecording={isRecording}
                micPulseAnim={micPulseAnim}
                meteringLevelAnim={meteringLevelAnim}
                onStartVoiceRecording={startVoiceRecording}
                onStopVoiceRecording={stopVoiceRecording}
                writingVoiceModeRef={writingVoiceModeRef}
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
        />
        <RevivalModal
          visible={showRevival}
          onClose={() => setShowRevival(false)}
          onConfirm={async () => { await handleStreakRevival(); setShowRevival(false); }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
