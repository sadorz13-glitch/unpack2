// screens/SessionScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies } from '../theme';
import { QUESTIONS, STORAGE_KEY_PENDING_SESSION } from '../constants';
import { callClaude } from '../lib/ai/client';
import { getTransition, generateInsightAndTraits } from '../lib/api';
import { saveSession, loadStreakAndCount } from '../lib/supabase';
import { track } from '../lib/analytics';

// ─── Exported utilities (tested) ─────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  onStartVoiceRecording: (setter: (t: string) => void) => void;
  onStopVoiceRecording: (setter: (t: string) => void) => void;
  onStopTTS: () => void;
  onSpeakAndWait: (text: string) => Promise<void>;
  sessionVoiceModeRef: React.MutableRefObject<boolean>;
  sessionVoiceSubmitRef: React.MutableRefObject<((text: string) => void) | null>;
};

type SessionView = 'entry' | 'question' | 'loading' | 'celebrate';

const TONGUE_CONFIGS = [
  { width: 50, height: 150, color: '#ff6a00', deg: 0,    offsetX: 0 },
  { width: 36, height: 115, color: '#ff4500', deg: -14,  offsetX: -44 },
  { width: 36, height: 115, color: '#ff4500', deg: 14,   offsetX: 44 },
  { width: 24, height: 82,  color: '#cc2200', deg: -26,  offsetX: -80 },
  { width: 24, height: 82,  color: '#cc2200', deg: 26,   offsetX: 80 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionScreen({
  userId, sessionCount, horoscopeContext, topic, traits, isRecording, isTranscribing,
  micPulseAnim, meteringLevelAnim, ttsEnabled, isConnected = true, onSessionComplete, onExit,
  onStartVoiceRecording, onStopVoiceRecording, onStopTTS, onSpeakAndWait, sessionVoiceModeRef,
  sessionVoiceSubmitRef,
}: Props) {
  const insets = useSafeAreaInsets();
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
  const sessionSavedRef = useRef(false);

  // Flame animation values — created once, reused across celebration triggers
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

  // Preload the first question silently on mount so it's ready when user taps BEGIN
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
    track('session_started');
    setView('question');
    if (sessionVoiceModeRef) {
      sessionVoiceModeRef.current = true;
      await new Promise(r => setTimeout(r, 300));
      await Promise.race([onSpeakAndWait(currentQuestionRef.current), new Promise(r => setTimeout(r, 10000))]);
      onStartVoiceRecording(setInput);
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
      await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, 10000))]);
      onStartVoiceRecording(setInput);
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
      const prompt = horoscopeContext + `\n\nGenerate ONE powerful journaling question for this person. ${recentTopics}${traitContext}${answeredSoFar}${usedList}Style: direct, slightly confrontational, introspective. Max 15 words. No preamble, just the question.`;
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
      } catch { /* fallback values already set above */ }
      setInsight(insightText);
      setInsightShort(insightShortText);
      setCurrentTraits(traitsResult);
      setCurrentTopic(topicResult);
      // Save session + load streak before showing celebration
      let streakVal = 0;
      let totalVal = 0;
      try {
        await saveSession(newAllAnswers, insightText, traitsResult, topicResult, insightShortText);
        await AsyncStorage.removeItem(STORAGE_KEY_PENDING_SESSION);
        const { streak, total } = await loadStreakAndCount(true);
        streakVal = streak;
        totalVal = total;
        sessionSavedRef.current = true;
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
          await Promise.race([onSpeakAndWait(bridge), new Promise(r => setTimeout(r, 10000))]);
        } else {
          await new Promise(r => setTimeout(r, 2800));
        }
      } catch {
        if (!sessionVoiceModeRef?.current) await new Promise(r => setTimeout(r, 2800));
      }
      setCurrentQuestion(next);
      currentQuestionRef.current = next;
      setTransition('');
      setTransitioning(false);
      if (sessionVoiceModeRef?.current) {
        await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, 10000))]);
        onStartVoiceRecording(setInput);
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
    // Reset to start positions
    flashAnim.setValue(0);
    streakBounce.setValue(0);
    streakOpacity.setValue(0);
    tongueAnims.forEach(t => { t.translateY.setValue(200); t.opacity.setValue(0); });

    Animated.parallel([
      // Screen flash: fast orange bloom then fade
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
      // Flame tongues shoot up then dissolve (staggered)
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
      // Streak number: pop in with overshoot after brief delay
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
      await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, 10000))]);
      onStartVoiceRecording(setInput);
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
      await Share.share({ message: insight });
      track('insight_shared', { insight_length: insight.length });
    } catch {
      // user cancelled — do nothing
    }
  };

  async function handleExit() {
    if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
    onStopTTS();
    if (!sessionSavedRef.current && answersRef.current.length > 0 && insight) {
      try {
        await saveSession(answersRef.current, insight, currentTraits || {}, currentTopic, insightShort);
      } catch { /* best effort */ }
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

  if (view === 'entry') {
    return (
      <View style={[styles.root, styles.entryRoot, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, backgroundColor: colors.bg }]}>
        <Text style={styles.tabTitle}>Questions</Text>
        <View style={styles.entryCenter}>
          <Text style={styles.entryHeading}>ready to unpack?</Text>
          <Text style={styles.entrySub}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.beginBtn, !isConnected && styles.beginBtnDisabled]}
          onPress={isConnected ? beginSession : undefined}
        >
          <Text style={styles.beginBtnText}>BEGIN SESSION</Text>
        </TouchableOpacity>
        {!isConnected && (
          <Text style={styles.offlineHint}>No internet — sessions require a connection.</Text>
        )}
      </View>
    );
  }

  if (view === 'loading') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl, backgroundColor: colors.bg }]}>
        <Text style={styles.wordmark}>UNPACK</Text>
        <ActivityIndicator color={colors.accent} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.loadingText}>reading between the lines...</Text>
      </View>
    );
  }

  if (view === 'celebrate') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg, overflow: 'hidden' }]}>
        {/* Orange screen flash */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(255,70,0,0.22)', opacity: flashAnim },
          ]}
        />

        {/* Flame + streak centred in remaining space */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Flame tongues — absolute inside a fixed-size container */}
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

          {/* Streak number */}
          <Animated.Text
            style={[
              styles.celebrationNumber,
              { transform: [{ scale: streakBounce }], opacity: streakOpacity },
            ]}
          >
            {celebrationStreak}
          </Animated.Text>
          <Animated.Text style={[styles.celebrationLabel, { opacity: streakOpacity }]}>
            DAY STREAK
          </Animated.Text>

          {/* Insight quote */}
          {insight ? (
            <Text style={styles.celebrationInsight} numberOfLines={3}>
              "{insight}"
            </Text>
          ) : null}
        </View>

        {/* Share insight button */}
        {insight ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareInsight}>
              <Text style={styles.shareBtnText}>SHARE INSIGHT</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Buttons pinned to bottom */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleKeepGoing}>
            <Text style={styles.primaryBtnText}>KEEP GOING →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignSelf: 'center' }} onPress={handleDone}>
            <Text style={styles.ghostText}>I'M DONE FOR NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <PanGestureHandler onHandlerStateChange={handleEdgeSwipe}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}
      >
        <ScrollView
          contentContainerStyle={[styles.questionScroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sessionHeader}>
            <TouchableOpacity onPress={handleExit}>
              <Text style={styles.exitText}>EXIT SESSION</Text>
            </TouchableOpacity>
            <Text style={styles.qProgress}>Q{questionNumber}</Text>
          </View>

          {transitioning ? (
            <>
              <Text style={styles.transition}>{transition}</Text>
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            </>
          ) : (
            <Text style={styles.question}>Tell me... {currentQuestion}</Text>
          )}

          {!transitioning && (
            inputMode === 'voice' ? (
              <View style={styles.voiceArea}>
                <TouchableOpacity
                  onPress={() => {
                    if (!isConnected) return;
                    if (isRecording) onStopVoiceRecording(setInput);
                    else onStartVoiceRecording(setInput);
                  }}
                  activeOpacity={isConnected ? 0.6 : 1}
                  style={{ opacity: isConnected ? 1 : 0.3 }}
                >
                  <Animated.View style={[styles.micRing, { borderColor: isRecording ? 'rgba(180,140,90,0.5)' : colors.border, transform: [{ scale: micPulseAnim }] }]}>
                    <Animated.View style={[styles.micDot, { backgroundColor: isRecording ? colors.accent : '#2a2822', transform: [{ scale: meteringLevelAnim }] }]} />
                  </Animated.View>
                </TouchableOpacity>
                {isTranscribing
                  ? <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: spacing.base }} />
                  : <Text style={styles.listeningText}>{isRecording ? 'TAP TO SEND' : ''}</Text>
                }
                {!isRecording && !isTranscribing && (
                  <TouchableOpacity onPress={() => { if (sessionVoiceModeRef) sessionVoiceModeRef.current = false; setInputMode('type'); }} style={{ marginTop: spacing.lg }}>
                    <Text style={styles.ghostText}>TYPE INSTEAD</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <TextInput
                  style={styles.textInput}
                  placeholder="be honest..."
                  placeholderTextColor={colors.textGhost}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  blurOnSubmit={false}
                />
                <View style={styles.textInputActions}>
                  <TouchableOpacity onPress={() => setInputMode('voice')}>
                    <Text style={styles.ghostText}>USE MIC</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => submitAnswer()}>
                    <Text style={styles.primaryBtnText}>CONTINUE →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
          {/* Skip question — barely visible */}
          {!transitioning && (
            <TouchableOpacity onPress={skipQuestion} style={styles.skipBtn}>
              <Text style={styles.skipText}>this question doesn't sit right with me</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  questionScroll: { alignItems: 'center', paddingHorizontal: spacing.xl, flexGrow: 1 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.xl },
  wordmark: { color: colors.textMuted, fontSize: 11, letterSpacing: 6, textAlign: 'center', marginBottom: spacing.xl },
  tabTitle: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 22,
    color: colors.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  qProgress: { color: colors.textGhost, fontSize: 9, letterSpacing: 4 },
  exitText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  question: { fontFamily: fontFamilies.serifItalic, fontSize: 22, color: colors.textPrimary, textAlign: 'center', lineHeight: 32, marginBottom: spacing.xl },
  transition: { fontFamily: fontFamilies.serifItalic, fontSize: 18, color: colors.accent, textAlign: 'center', lineHeight: 28 },
  voiceArea: { alignItems: 'center', width: '100%', paddingVertical: spacing.base },
  micRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  micDot: { width: 7, height: 7, borderRadius: 3.5 },
  listeningText: { color: colors.accent, fontSize: 9, letterSpacing: 3, marginTop: spacing.md },
  textInput: {
    color: colors.textPrimary, fontSize: 15,
    borderBottomWidth: 1, borderBottomColor: colors.textGhost,
    paddingVertical: spacing.md, marginBottom: spacing.base,
    minHeight: 60, maxHeight: 160, textAlignVertical: 'top', alignSelf: 'stretch',
  },
  textInputActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  primaryBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)', borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xl },
  primaryBtnText: { color: colors.accent, fontSize: 11, letterSpacing: 6 },
  ghostText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  loadingText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  // Entry screen
  entryRoot: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  entryCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  entryHeading: { fontFamily: fontFamilies.serifItalic, fontSize: 28, color: colors.textPrimary, textAlign: 'center' },
  entrySub: { color: colors.textGhost, fontSize: 9, letterSpacing: 4 },
  beginBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)', borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xxl, alignItems: 'center' },
  beginBtnDisabled: { opacity: 0.3 },
  beginBtnText: { color: colors.accent, fontSize: 11, letterSpacing: 6 },
  offlineHint: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.3, marginTop: spacing.md, textAlign: 'center' },
  // Skip question
  skipBtn: { marginTop: spacing.xl, paddingVertical: spacing.md, alignSelf: 'center' },
  skipText: { color: 'rgba(107,101,96,0.35)', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  // Celebration screen
  celebrationNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 96,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 100,
    letterSpacing: -4,
    marginTop: spacing.base,
  },
  celebrationLabel: {
    fontSize: 10,
    letterSpacing: 5,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: spacing.xl,
  },
  celebrationInsight: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.base,
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
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '500' as const,
  },
});
