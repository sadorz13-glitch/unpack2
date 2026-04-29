import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef } from 'react';
import {
  View, Alert, BackHandler, Platform,
} from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import PagerView from 'react-native-pager-view';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { STORAGE_KEY_HAS_SEEN_WELCOME } from './constants';
import { supabase, loadStreakAndCount, loadWeeklyTraits, loadLastSession } from './lib/supabase';
import { initAuth, buildHoroscopeContext, setAuthUser } from './lib/auth';
import { requestNotificationPermissions, scheduleDailyReminder, scheduleStreakReminders } from './lib/notifications';
import { loadTherapyPreview } from './lib/ai/therapy';
import { loadJournalEntries } from './lib/journalHelpers';
import { AuthScreen } from './screens/AuthScreen';
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
  const [horoscopeContext, setHoroscopeContext] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

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

  // ── Voice mode refs ──────────────────────────────────────────────────────
  const sessionVoiceModeRef = useRef(false);
  const sessionVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
  const therapyVoiceModeRef = useRef(false);
  const therapyVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
  const writingVoiceModeRef = useRef(false);

  // Voice routing wrapper — routes transcribed text to the correct handler
  function startVoiceRecording(setterFn: any) {
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

  // Auth init
  useEffect(() => {
    initAuth().then(async ({ userId: uid, profile }) => {
      setUserId(uid);
      if (uid && !profile) {
        setNeedsOnboarding(true);
      } else if (uid && profile) {
        setHoroscopeContext(buildHoroscopeContext(profile.dob));
        const seen = await AsyncStorage.getItem(STORAGE_KEY_HAS_SEEN_WELCOME);
        if (!seen) setShowWelcome(true);
      }
      setAuthReady(true);
      requestNotificationPermissions().then(granted => { if (granted) scheduleDailyReminder(); });
    }).catch(() => setAuthReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      if (session?.user) {
        const uid = session.user.id;
        setAuthUser(uid);
        setUserId(uid);
        const { data: profile } = await supabase
          .from('profiles').select('name, dob').eq('user_id', uid).maybeSingle();
        if (!profile) {
          setNeedsOnboarding(true);
        } else {
          setHoroscopeContext(buildHoroscopeContext(profile.dob));
          const seen = await AsyncStorage.getItem(STORAGE_KEY_HAS_SEEN_WELCOME);
          if (!seen) setShowWelcome(true);
        }
      } else {
        setAuthUser(null);
        setUserId(null);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // Mount data load
  useEffect(() => {
    if (!authReady || needsOnboarding) return;

    loadStreakAndCount(false, userId).then(({ streak, total }) => {
      setStreakDays(streak);
      setSessionCount(total);
      setSessionCountLoaded(true);
      if (total === 0) setTherapyPreview('');
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

    loadWeeklyTraits(userId).then(wt => { if (wt) setWeeklyTraits(wt); });

    (async () => {
      const htVal = await AsyncStorage.getItem('handledTopics');
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
      }
    });
  }, [authReady, needsOnboarding]);

  // ── Dev wipe ─────────────────────────────────────────────────────────────

  async function devWipe() {
    Alert.alert('Wipe all data?', 'Deletes everything. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Wipe', style: 'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['handledTopics', 'flaggedTopics']);
          const { data: sessions } = await supabase.from('sessions').select('id').eq('user_id', userId);
          if (sessions?.length) {
            await supabase.from('answers').delete().in('session_id', sessions.map((s: any) => s.id));
          }
          await Promise.all([
            supabase.from('sessions').delete().eq('user_id', userId),
            supabase.from('day_notes').delete().eq('user_id', userId),
            supabase.from('profiles').delete().eq('user_id', userId),
          ]);
          setInsight(''); setInsightShort(''); setTraits(null); setTopic('');
          setSessionCount(0); setStreakDays(0); setHasSessionToday(false); setDayNote('');
          setTherapyPreview(''); setWeeklyTraits(null); setTherapyResetTick(t => t + 1);
          Alert.alert('Done', 'All data wiped.');
        },
      },
    ]);
  }

  function handleTabPress(tab: TabId) {
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
          <AuthScreen />
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
                onDevWipe={devWipe}
                userId={userId}
              />
            </View>

            {/* Tab 1: Session */}
            <View key="1" style={{ flex: 1 }}>
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
                  AsyncStorage.getItem('handledTopics')
                    .then(val => { try { return val ? JSON.parse(val) : []; } catch { return []; } })
                    .then(ht => loadTherapyPreview(ht))
                    .then(line => setTherapyPreview(line || ''));
                  loadWeeklyTraits(userId).then(wt => { if (wt) setWeeklyTraits(wt); });
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
            </View>

            {/* Tab 2: Talk */}
            <View key="2" style={{ flex: 1 }}>
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
              />
            </View>

            {/* Tab 3: Journal */}
            <View key="3" style={{ flex: 1 }}>
              <JournalScreen
                userId={userId}
                sessionCount={sessionCount}
                dayNote={dayNote}
                onDayNoteChange={setDayNote}
                isActive={activeTab === 3}
              />
            </View>

            {/* Tab 4: Write */}
            <View key="4" style={{ flex: 1 }}>
              <WritingScreen
                userId={userId ?? ''}
                horoscopeContext={horoscopeContext}
                insight={insight}
                topic={topic}
                streakDays={streakDays}
                isActive={activeTab === 4}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                micPulseAnim={micPulseAnim}
                meteringLevelAnim={meteringLevelAnim}
                onStartVoiceRecording={startVoiceRecording}
                onStopVoiceRecording={stopVoiceRecording}
                writingVoiceModeRef={writingVoiceModeRef}
              />
            </View>
          </PagerView>

          <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
