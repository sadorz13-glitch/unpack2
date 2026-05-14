import React, { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Share,
  ImageBackground,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { requestMicPermission } from '../lib/micPermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { BlurCard } from '../components/BlurCard';
import DeepDiveModal from '../components/DeepDiveModal';
import { PaywallScreen } from './PaywallScreen';
import InsightShareCard from '../components/InsightShareCard';
import { useTheme } from '../theme';
import { QUESTIONS, STORAGE_KEY_PENDING_SESSION, TTS_HARD_TIMEOUT_MS, SESSION_BRIDGE_MIN_DISPLAY_MS, SESSION_BRIDGE_TEXT_WAIT_MS } from '../constants';
import { callClaude } from '../lib/ai/client';
import { getTransition, generateInsightAndTraits } from '../lib/api';
import { saveSession, loadStreakAndCount } from '../lib/supabase';
import { track } from '../lib/analytics';
import { IconButton } from '../components/ui/IconButton';
import { PillButton } from '../components/ui/PillButton';
import { Card } from '../components/ui/Card';
import { MicButton } from '../components/ui/MicButton';
import { WaveformBar } from '../components/ui/WaveformBar';
import { ProgressSegments } from '../components/ui/ProgressSegments';
import { AILabel } from '../components/ui';

const REQUEUE_KEY = 'requeuedQuestion';
const FALLBACK_INSIGHT = "Stop waiting for the right moment — it's not coming.";
const FALLBACK_TOPIC = 'self reflection';
const FALLBACK_TRAITS: Record<string, number> = { Openness: 60, 'Self-awareness': 50, Avoidance: 40, Ambition: 70, Resilience: 55 };

export async function saveRequeuedQuestion(question: string): Promise<void> {
  await AsyncStorage.setItem(REQUEUE_KEY, question);
}

export async function loadAndClearRequeuedQuestion(): Promise<string | null> {
  const val = await AsyncStorage.getItem(REQUEUE_KEY);
  if (val) await AsyncStorage.removeItem(REQUEUE_KEY);
  return val;
}

type Props = {
  userId: string | null;
  sessionCount: number;
  horoscopeContext: string;
  topic: string;
  traits: Record<string, number> | null;
  isRecording: boolean;
  isTranscribing: boolean;
  micPulseAnim: Animated.Value;
  meteringLevelAnim: Animated.Value;
  ttsEnabled: boolean;
  isConnected?: boolean;
  onSessionComplete: (params: {
    answers: { question: string; answer: string }[];
    insight: string;
    insightShort: string;
    traits: Record<string, number>;
    topic: string;
    streak: number;
    total: number;
  }) => void;
  onExit: () => void;
  onStartVoiceRecording: (setter: Dispatch<SetStateAction<string>>) => void;
  onStopVoiceRecording: (setter: Dispatch<SetStateAction<string>>) => void;
  onStopTTS: () => void;
  onSpeakAndWait: (text: string) => Promise<void>;
  sessionVoiceModeRef: React.MutableRefObject<boolean>;
  sessionVoiceSubmitRef: React.MutableRefObject<((text: string) => void) | null>;
  onNavigateToVent?: (topic: string) => void;
  isPremium?: boolean;
  onPremiumStatusChanged?: () => Promise<void>;
  hasSessionToday?: boolean;
  onSessionSaved?: (streak: number, total: number) => void;
};

type SessionView = 'entry' | 'question' | 'loading' | 'celebrate';

const TONGUE_CONFIGS = [
  { width: 50, height: 150, color: '#ff6a00', deg: 0,    offsetX: 0 },
  { width: 36, height: 115, color: '#ff4500', deg: -14,  offsetX: -44 },
  { width: 36, height: 115, color: '#ff4500', deg: 14,   offsetX: 44 },
  { width: 24, height: 82,  color: '#cc2200', deg: -26,  offsetX: -80 },
  { width: 24, height: 82,  color: '#cc2200', deg: 26,   offsetX: 80 },
];

export function SessionScreen({
  userId, sessionCount, horoscopeContext, topic, traits, isRecording, isTranscribing,
  micPulseAnim, meteringLevelAnim, ttsEnabled, isConnected = true, onSessionComplete, onExit,
  onStartVoiceRecording, onStopVoiceRecording, onStopTTS, onSpeakAndWait, sessionVoiceModeRef,
  sessionVoiceSubmitRef, onNavigateToVent, isPremium = false, onPremiumStatusChanged,
  hasSessionToday = false, onSessionSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, typography, spacing: sp, radius } = useTheme();

  const [view, setView] = useState<SessionView>('entry');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [transitioning, setTransitioning] = useState(false);
  const [transition, setTransition] = useState('');
  const [batchAnswers, setBatchAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [allAnswers, setAllAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [insight, setInsight] = useState('');
  const [insightShort, setInsightShort] = useState('');
  const [currentTraits, setCurrentTraits] = useState<Record<string, number> | null>(null);
  const [currentTopic, setCurrentTopic] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [celebrationTotal, setCelebrationTotal] = useState(0);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [showDeepDivePaywall, setShowDeepDivePaywall] = useState(false);
  const [showKeepGoingPaywall, setShowKeepGoingPaywall] = useState(false);
  const sessionSavedRef = useRef(false);
  const shareCardRef = useRef<View>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const streakBounce = useRef(new Animated.Value(0)).current;
  const streakOpacity = useRef(new Animated.Value(0)).current;
  const tongueAnims = useRef(
    Array.from({ length: 5 }, () => ({
      translateY: new Animated.Value(200),
      opacity: new Animated.Value(0),
    }))
  ).current;
  const [pregeneratedQuestion, setPregeneratedQuestion] = useState<string | null>(null);
  const answersRef = useRef<{ question: string; answer: string }[]>([]);
  const currentQuestionRef = useRef('');
  const batchAnswersRef = useRef<{ question: string; answer: string }[]>([]);

  // REVIEW: verify [] is intentional — possible stale closure on prepareFirstQuestion
  useEffect(() => {
    prepareFirstQuestion();
  }, []);

  async function prepareFirstQuestion() {
    const requeued = await loadAndClearRequeuedQuestion();
    const first = requeued || getNextQuestion([]);
    setCurrentQuestion(first);
    currentQuestionRef.current = first;
    setUsedQuestions([first]);
    generateNextQuestion([first], []).then(q => setPregeneratedQuestion(q));
  }

  async function beginSession() {
    if (!isPremium && hasSessionToday) {
      setShowKeepGoingPaywall(true);
      return;
    }
    track('session_started');
    setView('question');
    if (sessionVoiceModeRef) {
      sessionVoiceModeRef.current = true;
      await new Promise(r => setTimeout(r, 300));
      await Promise.race([onSpeakAndWait(currentQuestionRef.current), new Promise(r => setTimeout(r, TTS_HARD_TIMEOUT_MS))]);
      if (sessionVoiceModeRef.current) onStartVoiceRecording(setInput);
    }
  }

  async function skipQuestion() {
    if (transitioning) return;
    track('question_skipped', { questionNumber });
    const next = pregeneratedQuestion || getNextQuestion(usedQuestions);
    setPregeneratedQuestion(null);
    const newUsed = [...usedQuestions, next];
    setUsedQuestions(newUsed);
    setCurrentQuestion(next);
    currentQuestionRef.current = next;
    generateNextQuestion(newUsed, answersRef.current).then(q => setPregeneratedQuestion(q));
    if (sessionVoiceModeRef?.current) {
      onStopTTS();
      await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, TTS_HARD_TIMEOUT_MS))]);
      if (sessionVoiceModeRef.current) onStartVoiceRecording(setInput);
    }
  }

  function getNextQuestion(used: string[]): string {
    const available = QUESTIONS.filter((q: string) => !used.includes(q));
    if (available.length === 0) return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    return available[Math.floor(Math.random() * available.length)];
  }

  async function generateNextQuestion(used: string[], answersSoFar: { question: string; answer: string }[]): Promise<string> {
    try {
      const recentTopics = topic ? `Recent session topic: ${topic}. ` : '';
      const traitContext = traits ? `Traits: ${Object.entries(traits).map(([k, v]) => `${k} ${v}%`).join(', ')}. ` : '';
      const answeredSoFar = answersSoFar.length > 0
        ? 'Already answered this session:\n' + answersSoFar.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n') + '\n\n'
        : '';
      const usedList = used.length > 0 ? 'Do not ask any of these:\n' + used.join('\n') + '\n\n' : '';
      const prompt = horoscopeContext + `\n\nGenerate ONE journaling question for this person. ${recentTopics}${traitContext}${answeredSoFar}${usedList}Style: direct, specific, conversational — like a sharp friend asking you something real. Max 12 words. Must be answerable in 1-2 sentences. No broad philosophical openers. No preamble, just the question.`;
      const result = await callClaude(prompt, 60);
      return result.replace(/^["']|["']$/g, '');
    } catch {
      return getNextQuestion(used);
    }
  }

  async function submitAnswer(answerText?: string) {
    const userAnswer = (answerText ?? input).trim();
    if (!userAnswer || transitioning) return;

    const newBatchAnswers = [...batchAnswersRef.current, { question: currentQuestionRef.current, answer: userAnswer }];
    batchAnswersRef.current = newBatchAnswers;
    setBatchAnswers(newBatchAnswers);
    setInput('');
    setInputMode('voice');
    setQuestionNumber(q => q + 1);

    const newAllAnswers = [...answersRef.current, { question: currentQuestionRef.current, answer: userAnswer }];
    answersRef.current = newAllAnswers;
    setAllAnswers(newAllAnswers);

    if (newBatchAnswers.length >= 3) {
      if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
      onStopTTS();
      setView('loading');
      let insightText = FALLBACK_INSIGHT;
      let insightShortText = '';
      let traitsResult: Record<string, number> = { ...FALLBACK_TRAITS };
      let topicResult = FALLBACK_TOPIC;
      try {
        const result = await generateInsightAndTraits(newAllAnswers, horoscopeContext);
        insightText = result.insight;
        insightShortText = result.insightShort || '';
        traitsResult = result.traits;
        topicResult = result.topic;
      } catch (e) { Sentry.captureException(e); /* fallback values already set above */ }
      setInsight(insightText);
      setInsightShort(insightShortText);
      setCurrentTraits(traitsResult);
      setCurrentTopic(topicResult);
      let streakVal = 0;
      let totalVal = 0;
      try {
        await saveSession(newAllAnswers, insightText, traitsResult, topicResult, insightShortText);
        await AsyncStorage.removeItem(STORAGE_KEY_PENDING_SESSION);
        const { streak, total } = await loadStreakAndCount(true);
        streakVal = streak;
        totalVal = total;
        sessionSavedRef.current = true;
        onSessionSaved?.(streakVal, totalVal);
      } catch {
        await AsyncStorage.setItem(STORAGE_KEY_PENDING_SESSION, JSON.stringify({
          answers: newAllAnswers,
          insight: insightText,
          insightShort: insightShortText,
          traits: traitsResult,
          topic: topicResult,
        })).catch(() => {});
      }
      setCelebrationStreak(streakVal);
      setCelebrationTotal(totalVal);
      setView('celebrate');
    } else {
      const next = pregeneratedQuestion || getNextQuestion(usedQuestions);
      setPregeneratedQuestion(null);
      const newUsed = [...usedQuestions, next];
      setUsedQuestions(newUsed);
      setTransitioning(true);
      setTransition('...');
      generateNextQuestion(newUsed, newAllAnswers).then(q => setPregeneratedQuestion(q));
      try {
        const bridge = await getTransition(currentQuestionRef.current, userAnswer, next, horoscopeContext);
        setTransition(bridge);
        if (sessionVoiceModeRef?.current) {
          // Both must resolve: TTS (or 10s hard cap) AND a 4s minimum so free users
          // (where onSpeakAndWait returns immediately) still see the bridge text.
          await Promise.all([
            Promise.race([onSpeakAndWait(bridge), new Promise(r => setTimeout(r, TTS_HARD_TIMEOUT_MS))]),
            new Promise(r => setTimeout(r, SESSION_BRIDGE_MIN_DISPLAY_MS)),
          ]);
        } else {
          await new Promise(r => setTimeout(r, SESSION_BRIDGE_TEXT_WAIT_MS));
        }
      } catch {
        await new Promise(r => setTimeout(r, sessionVoiceModeRef?.current ? SESSION_BRIDGE_MIN_DISPLAY_MS : SESSION_BRIDGE_TEXT_WAIT_MS));
      }
      setCurrentQuestion(next);
      currentQuestionRef.current = next;
      setTransition('');
      setTransitioning(false);
      if (sessionVoiceModeRef?.current) {
        await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, TTS_HARD_TIMEOUT_MS))]);
        if (sessionVoiceModeRef.current) onStartVoiceRecording(setInput);
      }
    }
  }

  const submitAnswerRef = useRef(submitAnswer);
  useEffect(() => { submitAnswerRef.current = submitAnswer; });

  useEffect(() => {
    sessionVoiceSubmitRef.current = (text: string) => submitAnswerRef.current(text);
    return () => { sessionVoiceSubmitRef.current = null; };
  }, []);

  useEffect(() => {
    if (view !== 'celebrate') return;
    flashAnim.setValue(0);
    streakBounce.setValue(0);
    streakOpacity.setValue(0);
    tongueAnims.forEach(t => { t.translateY.setValue(200); t.opacity.setValue(0); });

    Animated.parallel([
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
      ...tongueAnims.map((t, i) =>
        Animated.sequence([
          Animated.delay(i * 45),
          Animated.parallel([
            Animated.spring(t.translateY, { toValue: 0, tension: 220, friction: 7, useNativeDriver: true }),
            Animated.timing(t.opacity, { toValue: 0.92, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(t.translateY, { toValue: -220, duration: 750, useNativeDriver: true }),
            Animated.timing(t.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ])
      ),
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.spring(streakBounce, { toValue: 1.35, tension: 220, friction: 5, useNativeDriver: true }),
          Animated.timing(streakOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]),
        Animated.spring(streakBounce, { toValue: 1.0, tension: 160, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, [view]);

  async function handleKeepGoing() {
    if (!isPremium && hasSessionToday) {
      setShowKeepGoingPaywall(true);
      return;
    }
    sessionSavedRef.current = false;
    batchAnswersRef.current = [];
    setBatchAnswers([]);
    const next = pregeneratedQuestion || getNextQuestion(usedQuestions);
    setPregeneratedQuestion(null);
    const newUsed = [...usedQuestions, next];
    setUsedQuestions(newUsed);
    setCurrentQuestion(next);
    currentQuestionRef.current = next;
    setView('question');
    generateNextQuestion(newUsed, answersRef.current).then(q => setPregeneratedQuestion(q));
    if (sessionVoiceModeRef) {
      sessionVoiceModeRef.current = true;
      await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, TTS_HARD_TIMEOUT_MS))]);
      if (sessionVoiceModeRef.current) onStartVoiceRecording(setInput);
    }
  }

  async function handleDone() {
    if (!insight) return;
    track('session_completed', { streak: celebrationStreak, total: celebrationTotal });
    if (sessionSavedRef.current) {
      onSessionComplete({
        answers: answersRef.current, insight, insightShort,
        traits: currentTraits || {}, topic: currentTopic,
        streak: celebrationStreak, total: celebrationTotal,
      });
      return;
    }
    // Fallback: session wasn't saved yet (e.g., API error path)
    try {
      await saveSession(answersRef.current, insight, currentTraits || {}, currentTopic, insightShort);
      const { streak, total } = await loadStreakAndCount(true);
      onSessionComplete({
        answers: answersRef.current, insight, insightShort,
        traits: currentTraits || {}, topic: currentTopic, streak, total,
      });
    } catch {
      onSessionComplete({
        answers: answersRef.current, insight, insightShort,
        traits: currentTraits || {}, topic: currentTopic, streak: 0, total: 0,
      });
    }
  }

  const handleShareInsight = async () => {
    if (!insight) return;
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Share.share({ url: uri });
      track('insight_shared', { insight_length: insight.length, format: 'image' });
    } catch {
      // Fallback to plain text if capture fails or user cancels
      try { await Share.share({ message: insight }); } catch { /* user cancelled */ }
    }
  };

  async function handleExit() {
    if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
    onStopTTS();
    if (!sessionSavedRef.current && answersRef.current.length > 0 && insight) {
      try {
        await saveSession(answersRef.current, insight, currentTraits || {}, currentTopic, insightShort);
      } catch (e) { Sentry.captureException(e); /* best effort */ }
    }
    onExit();
  }

  function handleEdgeSwipe({ nativeEvent }: any) {
    if (
      nativeEvent.state === State.END &&
      nativeEvent.x0 < 25 &&
      nativeEvent.translationX > 60 &&
      view === 'question'
    ) {
      saveRequeuedQuestion(currentQuestionRef.current).then(() => {
        if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
        onStopTTS();
        onExit();
      });
    }
  }

  // ─── ENTRY / INTRO SCREEN ────────────────────────────────────────────────────

  if (view === 'entry') {
    return (
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=90' }}
        style={[
          styles.screen,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + sp.xl,
          },
        ]}
        resizeMode="cover"
      >
        {/* Blur layer — softens the hero image */}
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        {/* Dark gradient overlay — reduced opacity since BlurView already darkens */}
        <View style={styles.introOverlay} />

        {/* X close — top-left */}
        <View style={[styles.topBar, { paddingHorizontal: sp['margin-screen'] }]}>
          <IconButton
            icon={X}
            onPress={handleExit}
            accessibilityLabel="Close session"
          />
        </View>

        {/* Centered title block */}
        <View style={styles.introCenter}>
          <Text style={[typography.h1, { color: '#ffffff', textAlign: 'center' }]}>
            Ready to Unpack?
          </Text>
          <Text
            style={[
              typography.body,
              { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: sp.md },
            ]}
          >
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {/* Intention cards */}
        <View style={[styles.introCards, { paddingHorizontal: sp['margin-screen'] }]}>
          <Card style={styles.intentionCard}>
            <Text style={[typography.h3, { color: themeColors['text-primary'] }]}>
              Evening Reflection
            </Text>
            <Text
              style={[
                typography.caption,
                { color: themeColors['text-tertiary'], marginTop: sp.xs },
              ]}
            >
              Wind down and process the day
            </Text>
          </Card>
          <Card style={styles.intentionCard}>
            <Text style={[typography.h3, { color: themeColors['text-primary'] }]}>
              Quick Check-in
            </Text>
            <Text
              style={[
                typography.caption,
                { color: themeColors['text-tertiary'], marginTop: sp.xs },
              ]}
            >
              Three questions, sharp and focused
            </Text>
          </Card>
        </View>

        {/* BEGIN SESSION button */}
        <View
          style={[
            styles.introFooter,
            { paddingHorizontal: sp['margin-screen'] },
          ]}
        >
          {!isConnected && (
            <Text
              style={[
                typography.caption,
                {
                  color: 'rgba(255,255,255,0.9)',
                  textAlign: 'center',
                  marginBottom: sp.md,
                },
              ]}
            >
              No internet — sessions require a connection.
            </Text>
          )}
          <PillButton
            label="BEGIN SESSION"
            onPress={isConnected ? beginSession : () => undefined}
            disabled={!isConnected}
          />
        </View>
      </ImageBackground>
    );
  }

  // ─── LOADING SCREEN ──────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <View
        style={[
          styles.screen,
          styles.centered,
          {
            backgroundColor: themeColors['bg-primary'],
            paddingTop: insets.top + sp.xl,
          },
        ]}
      >
        <Text
          style={[
            typography.labelCaps,
            { color: themeColors['text-tertiary'], marginBottom: sp.lg },
          ]}
        >
          UNPACK
        </Text>
        <ActivityIndicator color={themeColors['accent-primary']} style={{ marginBottom: sp.lg }} />
        <Text style={[typography.body, { color: themeColors['text-tertiary'], textAlign: 'center' }]}>
          reading between the lines...
        </Text>
      </View>
    );
  }

  // ─── CELEBRATE SCREEN ────────────────────────────────────────────────────────

  if (view === 'celebrate') {
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: themeColors['bg-primary'],
            paddingTop: insets.top,
            overflow: 'hidden',
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(255,70,0,0.22)', opacity: flashAnim },
          ]}
        />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 220, height: 180, position: 'relative', alignItems: 'center' }}>
            {TONGUE_CONFIGS.map((cfg, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: cfg.width,
                  height: cfg.height,
                  marginLeft: cfg.offsetX,
                  backgroundColor: cfg.color,
                  borderTopLeftRadius: cfg.width / 2,
                  borderTopRightRadius: cfg.width / 2,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  shadowColor: '#ff6a00',
                  shadowOpacity: 0.85,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                  transform: [
                    { rotate: `${cfg.deg}deg` },
                    { translateY: tongueAnims[i].translateY },
                  ],
                  opacity: tongueAnims[i].opacity,
                }}
              />
            ))}
          </View>

          <Animated.Text
            style={[
              styles.celebrationNumber,
              { color: themeColors['text-primary'], transform: [{ scale: streakBounce }], opacity: streakOpacity },
            ]}
          >
            {celebrationStreak}
          </Animated.Text>
          <Animated.Text style={[styles.celebrationLabel, { color: themeColors['text-secondary'], opacity: streakOpacity }]}>
            DAY STREAK
          </Animated.Text>

          {insight ? (
            <View style={{ alignItems: 'flex-end', width: '100%', paddingHorizontal: 32, marginTop: 16 }}>
              <AILabel />
            </View>
          ) : null}
          {insight ? (
            <Text style={[styles.celebrationInsight, { color: themeColors['text-tertiary'], marginTop: 0 }]} numberOfLines={3}>
              "{insight}"
            </Text>
          ) : null}
          {insight ? (
            <TouchableOpacity
              style={styles.readMoreBtn}
              onPress={() => {
                if (!isPremium) { setShowDeepDivePaywall(true); return; }
                setShowDeepDive(true);
              }}
              accessibilityLabel="Read more"
              accessibilityRole="button"
            >
              <Text style={[styles.readMoreTxt, { color: themeColors['accent-gold'] }]}>READ MORE</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {insight ? (
          <View style={{ paddingHorizontal: sp.lg }}>
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: themeColors['accent-gold'] }]}
              onPress={handleShareInsight}
              accessibilityLabel="Share insight"
              accessibilityRole="button"
            >
              <Text style={[styles.shareBtnText, { color: themeColors['accent-gold'] }]}>SHARE INSIGHT</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={{
            paddingHorizontal: sp['margin-screen'],
            paddingBottom: insets.bottom + sp.lg,
            gap: sp.lg,
          }}
        >
          <PillButton label="KEEP GOING" onPress={handleKeepGoing} />
          <TouchableOpacity
            style={{ alignSelf: 'center' }}
            onPress={handleDone}
            accessibilityLabel="I'm done for now"
            accessibilityRole="button"
          >
            <Text
              style={[
                typography.caption,
                { color: themeColors['text-tertiary'] },
              ]}
            >
              I'M DONE FOR NOW
            </Text>
          </TouchableOpacity>
        </View>

        <DeepDiveModal
          visible={showDeepDive}
          onClose={() => setShowDeepDive(false)}
          answers={allAnswers}
          traits={currentTraits ?? {}}
          recentInsights={[insight].filter(Boolean)}
          topic={currentTopic}
          onVent={onNavigateToVent}
        />
        <PaywallScreen
          visible={showDeepDivePaywall}
          source="deep_dive"
          onClose={() => setShowDeepDivePaywall(false)}
          onSubscribed={async () => {
            await onPremiumStatusChanged?.();
            setShowDeepDivePaywall(false);
            setShowDeepDive(true);
          }}
        />
        <PaywallScreen
          visible={showKeepGoingPaywall}
          source="session"
          onClose={() => setShowKeepGoingPaywall(false)}
          onSubscribed={async () => {
            await onPremiumStatusChanged?.();
            setShowKeepGoingPaywall(false);
          }}
        />

        {/* Off-screen card for image capture — must be rendered to be captured */}
        <View style={{ position: 'absolute', top: -9999, left: 0 }} pointerEvents="none">
          <InsightShareCard ref={shareCardRef} insight={insight} />
        </View>
      </View>
    );
  }

  // ─── QUESTION SCREEN (+ BRIDGE) ──────────────────────────────────────────────

  return (
    <PanGestureHandler onHandlerStateChange={handleEdgeSwipe}>
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: themeColors['bg-primary'] }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}
      >
        <ScrollView
          contentContainerStyle={[
            styles.questionScroll,
            {
              paddingTop: insets.top + sp.lg,
              paddingBottom: insets.bottom + sp.lg,
              paddingHorizontal: sp['margin-screen'],
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar: X close */}
          <View style={styles.questionTopBar}>
            <IconButton
              icon={X}
              onPress={handleExit}
              accessibilityLabel="Exit session"
            />
          </View>

          {/* BRIDGE SCREEN: transitioning between questions */}
          {transitioning ? (
            <View style={styles.bridgeContainer}>
              <Text
                style={[
                  typography.h2,
                  {
                    color: themeColors['text-primary'],
                    textAlign: 'center',
                  },
                ]}
              >
                {transition === '...' ? '' : transition}
              </Text>
              {transition === '...' && (
                <ActivityIndicator
                  color={themeColors['accent-primary']}
                  style={{ marginTop: sp.xl }}
                />
              )}
            </View>
          ) : (
            <>
              {/* Step indicator */}
              <View style={styles.stepBlock}>
                <Text
                  style={[
                    typography.labelCaps,
                    { color: themeColors['text-tertiary'], textAlign: 'center' },
                  ]}
                >
                  STEP {Math.min(questionNumber, 3)} OF 3
                </Text>
                <ProgressSegments
                  total={3}
                  current={Math.min(questionNumber, 3)}
                  style={{ marginTop: sp.sm }}
                />
              </View>

              {/* Question text */}
              <Text
                style={[
                  typography.h1,
                  {
                    color: themeColors['text-primary'],
                    textAlign: 'center',
                    marginTop: sp['2xl'],
                    marginBottom: sp['2xl'],
                  },
                ]}
              >
                {currentQuestion}
              </Text>

              {/* Voice / type input area */}
              {inputMode === 'voice' ? (
                <View style={styles.voiceArea}>
                  <MicButton
                    active={isRecording}
                    onPress={async () => {
                      if (!isConnected) return;
                      if (isRecording) {
                        onStopVoiceRecording(setInput);
                      } else {
                        const granted = await requestMicPermission();
                        if (granted) onStartVoiceRecording(setInput);
                      }
                    }}
                    style={!isConnected ? { opacity: 0.3 } : undefined}
                  />

                  {isTranscribing ? (
                    <ActivityIndicator
                      color={themeColors['accent-primary']}
                      size="small"
                      style={{ marginTop: sp.md }}
                    />
                  ) : (
                    <TouchableOpacity
                      style={{ marginTop: sp.lg }}
                      onPress={() => {
                        if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
                        setInputMode('type');
                      }}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: themeColors['text-tertiary'] },
                        ]}
                      >
                        TAP TO TYPE INSTEAD
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.typeArea}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: themeColors['text-primary'],
                        borderBottomColor: themeColors['border-strong'],
                      },
                    ]}
                    placeholder="be honest..."
                    placeholderTextColor={themeColors['text-tertiary']}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    blurOnSubmit={false}
                  />
                  <View style={styles.typeActions}>
                    <TouchableOpacity onPress={() => setInputMode('voice')}>
                      <Text
                        style={[
                          typography.caption,
                          { color: themeColors['text-tertiary'] },
                        ]}
                      >
                        USE MIC
                      </Text>
                    </TouchableOpacity>
                    <PillButton
                      label="CONTINUE"
                      onPress={() => submitAnswer()}
                      style={{ flex: 0, paddingHorizontal: 24, height: 44 }}
                    />
                  </View>
                </View>
              )}

              {/* Skip question */}
              <TouchableOpacity onPress={skipQuestion} style={styles.skipBtn}>
                <Text
                  style={[
                    typography.caption,
                    { color: themeColors['text-tertiary'], textAlign: 'center' },
                  ]}
                >
                  this question doesn't sit right with me
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Waveform — shown when recording */}
          {isRecording && !transitioning && (
            <View style={styles.waveformSection}>
              <WaveformBar active={isRecording} amplitude={0} />
              <Text
                style={[
                  typography.labelCaps,
                  { color: themeColors['text-tertiary'], marginTop: sp.sm, textAlign: 'center' },
                ]}
              >
                LISTENING...
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Intro (entry) ────────────────────────────────────────────────────────
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  introCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  introCards: {
    gap: 12,
    marginBottom: 24,
  },
  intentionCard: {
    minHeight: 0,
    padding: 20,
  },
  introFooter: {
    paddingBottom: 0,
  },
  // ─── Question ─────────────────────────────────────────────────────────────
  questionScroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  questionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  stepBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  voiceArea: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  typeArea: {
    width: '100%',
    marginTop: 8,
  },
  textInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
    minHeight: 60,
    maxHeight: 160,
    textAlignVertical: 'top',
    alignSelf: 'stretch',
  },
  typeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipBtn: {
    marginTop: 32,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  waveformSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  // ─── Bridge ───────────────────────────────────────────────────────────────
  bridgeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
    width: '100%',
  },
  // ─── Celebration ──────────────────────────────────────────────────────────
  celebrationNumber: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 96,
    fontWeight: '900',
    lineHeight: 100,
    letterSpacing: -4,
    marginTop: 16,
  },
  celebrationLabel: {
    fontSize: 12,
    letterSpacing: 5,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  celebrationInsight: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  shareBtn: {
    borderWidth: 1,
    borderColor: 'rgba(180,140,90,0.4)',
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
    marginTop: 8,
  },
  shareBtnText: {
    color: 'rgba(180,140,90,0.9)',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '500' as const,
  },
  readMoreBtn: {
    marginTop: 12,
    alignSelf: 'center',
  },
  readMoreTxt: {
    color: 'rgba(180,140,90,0.6)',
    fontSize: 12,
    letterSpacing: 2,
  },
});
