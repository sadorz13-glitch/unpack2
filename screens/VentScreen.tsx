import React, { useRef, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { type SharedValue } from 'react-native-reanimated';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { BlurCard } from '../components/BlurCard';
import { IconButton } from '../components/ui/IconButton';
import { colors as legacyColors, spacing, useTheme, typography, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { callClaude, callClaudeChat, sanitizeInput } from '../lib/ai/client';
import { loadTherapyPreview } from '../lib/ai/therapy';
import { getUserId } from '../lib/auth';
import { STORAGE_KEY_HANDLED_TOPICS, STORAGE_KEY_FLAGGED_TOPICS, FREE_VENT_MESSAGE_LIMIT as FREE_VENT_LIMIT, FORCE_STOP_MSG_DURATION_MS } from '../constants';
import { track } from '../lib/analytics';
import { PaywallScreen } from './PaywallScreen';
import { MicButton } from '../components/ui/MicButton';
import { WaveformBar } from '../components/ui/WaveformBar';
import { PillButton } from '../components/ui/PillButton';
import { OutlinedPillButton } from '../components/ui/OutlinedPillButton';
import { Card } from '../components/ui/Card';
import { AILabel } from '../components/ui';

const VENT_HEADERS = [
  "Say it out loud",
  "Let's talk it out",
  "Come vent",
  "Something on your mind?",
  "What's eating you?",
  "Get it off your chest",
];

const I_DONT_KNOW_PHRASES = [
  "i don't know", "i dont know", "not sure", "i have no idea",
  "can't figure", "cant figure", "help me figure",
  "i don't understand why", "no idea",
];
import type { ChatMessage } from '../types';
import { requestMicPermission } from '../lib/micPermission';

type VentSessionRow = { id: string; insight: string; topic: string; created_at: string };
type VentAnswerRow = { question: string; answer: string; created_at: string };

type Props = {
  horoscopeContext: string;
  ttsEnabled: boolean;
  stopTTS: () => Promise<void>;
  speakAndWait: (text: string) => Promise<void>;
  sessionCount: number;
  sessionCountLoaded: boolean;
  therapyPreview: string | null;
  therapyResetTick: number;
  isRecording: boolean;
  isTranscribing: boolean;
  micPulseAnim: Animated.Value;
  meteringLevelAnim: Animated.Value;
  meteringSV: SharedValue<number>;
  isTtsSpeaking: boolean;
  ttsMeteringSV: SharedValue<number>;
  onStartVoiceRecording: (setter: Dispatch<SetStateAction<string>>) => void;
  onStopVoiceRecording: (setter: Dispatch<SetStateAction<string>>) => void;
  therapyVoiceModeRef: React.MutableRefObject<boolean>;
  therapyVoiceSubmitRef: React.MutableRefObject<((text: string) => void) | null>;
  onTherapyPreviewChange: (line: string) => void;
  isConnected?: boolean;
  canUseVent?: boolean;
  freeMessagesRemaining?: number;
  isPremium?: boolean;
  onVentMessageSent?: () => Promise<void>;
  onPremiumStatusChanged?: () => Promise<void>;
  ventTopicOverride?: string | null;
  onVentTopicUsed?: () => void;
  forceStopCount?: number;
  onClose?: () => void;
};

export function VentScreen({
  horoscopeContext, ttsEnabled, stopTTS, speakAndWait,
  sessionCount, sessionCountLoaded, therapyPreview, therapyResetTick,
  isRecording, isTranscribing, micPulseAnim, meteringLevelAnim, meteringSV, isTtsSpeaking, ttsMeteringSV,
  onStartVoiceRecording, onStopVoiceRecording,
  therapyVoiceModeRef, therapyVoiceSubmitRef, onTherapyPreviewChange,
  isConnected = true,
  canUseVent = true,
  freeMessagesRemaining = 5,
  isPremium = false,
  onVentMessageSent,
  onPremiumStatusChanged,
  ventTopicOverride,
  onVentTopicUsed,
  forceStopCount = 0,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [header] = useState(() => VENT_HEADERS[Math.floor(Math.random() * VENT_HEADERS.length)]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [therapyInput, setTherapyInput] = useState('');
  const [therapyLoading, setTherapyLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [handledTopics, setHandledTopics] = useState<string[]>([]);
  const [flaggedTopics, setFlaggedTopics] = useState<string[]>([]);
  const [pinnedTherapyTopic, setPinnedTherapyTopic] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isMicMode, setIsMicMode] = useState(false);
  const [forceStopMsg, setForceStopMsg] = useState(false);
  useEffect(() => {
    if (!forceStopCount) return;
    setForceStopMsg(true);
    const t = setTimeout(() => setForceStopMsg(false), FORCE_STOP_MSG_DURATION_MS);
    return () => clearTimeout(t);
  }, [forceStopCount]);

  useEffect(() => {
    therapyVoiceSubmitRef.current = sendTherapyMessage;
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_HANDLED_TOPICS).then(val => {
      if (val) { try { setHandledTopics(JSON.parse(val)); } catch {} }
    });
    AsyncStorage.getItem(STORAGE_KEY_FLAGGED_TOPICS).then(val => {
      if (val) { try { setFlaggedTopics(JSON.parse(val)); } catch {} }
    });
  }, []);

  useEffect(() => {
    if (handledTopics.length > 0) AsyncStorage.setItem(STORAGE_KEY_HANDLED_TOPICS, JSON.stringify(handledTopics));
  }, [handledTopics]);

  useEffect(() => {
    if (flaggedTopics.length > 0) AsyncStorage.setItem(STORAGE_KEY_FLAGGED_TOPICS, JSON.stringify(flaggedTopics));
  }, [flaggedTopics]);

  useEffect(() => {
    if (!therapyPreview) return;
    callClaude(`Extract the core topic in 2-3 words, no punctuation: "${therapyPreview}"`, 15)
      .then(t => setPinnedTherapyTopic(t))
      .catch(() => {});
  }, [therapyPreview]);

  useEffect(() => {
    if (therapyResetTick === 0) return;
    setChatMessages([]);
    setTherapyInput('');
    setTherapyLoading(false);
    setInputMode('voice');
    setIsMicMode(false);
    setHandledTopics([]);
    setFlaggedTopics([]);
    setPinnedTherapyTopic('');
  }, [therapyResetTick]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages]);

  useEffect(() => {
    if (!ventTopicOverride) return;
    therapyVoiceModeRef.current = false;
    setIsMicMode(false);
    setInputMode('type');
    openTherapySession(ventTopicOverride);
    onVentTopicUsed?.();
    // REVIEW: openTherapySession and onVentTopicUsed not in deps — stale closure risk
  }, [ventTopicOverride]);

  const sessionStarted = chatMessages.length > 0 || therapyLoading;
  const waveformActive = isRecording || isTtsSpeaking;
  const waveformMeteringSV = isRecording ? meteringSV : ttsMeteringSV;

  async function openTherapySession(forceTopic = '', existingOpening?: string) {
    track('vent_session_started');
    setChatMessages([]);
    setTherapyLoading(true);
    try {
      if (existingOpening) {
        setChatMessages([{ role: 'assistant', content: existingOpening }]);
        if (ttsEnabled) {
          speakAndWait(existingOpening)
            .then(() => { if (therapyVoiceModeRef.current) onStartVoiceRecording(setTherapyInput); })
            .catch(() => {});
        }
        if (pinnedTherapyTopic) {
          const newHandled = [...new Set([...handledTopics, pinnedTherapyTopic])];
          setHandledTopics(newHandled);
          AsyncStorage.setItem(STORAGE_KEY_HANDLED_TOPICS, JSON.stringify(newHandled));
          loadTherapyPreview(newHandled).then(line => { if (line) onTherapyPreviewChange(line); });
        }
        return;
      }

      const uid = getUserId();
      const { data: recentSessions } = await supabase
        .from('sessions').select('id, insight, topic, traits, created_at')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(3);

      const sessionIds = (recentSessions || []).map((s: VentSessionRow) => s.id);
      const { data: recentAnswers } = sessionIds.length > 0
        ? await supabase.from('answers').select('question, answer, created_at')
            .in('session_id', sessionIds).order('created_at', { ascending: false }).limit(9)
        : { data: [] };

      const formatDate = (iso: string) => {
        const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return 'recently';
        return 'a while back';
      };

      const sessionHistory = (recentSessions || [])
        .map((s: VentSessionRow) => `[${formatDate(s.created_at)}] Topic: ${s.topic} — Insight: ${s.insight}`)
        .join('\n');
      const answerHistory = (recentAnswers || [])
        .map((a: VentAnswerRow) => `[${formatDate(a.created_at)}] Q: ${a.question}\nA: ${a.answer}`)
        .join('\n\n');

      const avoidStr = handledTopics.length > 0
        ? `\n\nDo NOT bring up these topics again: ${handledTopics.map(t => sanitizeInput(t, 100)).join(', ')}.` : '';
      const flaggedStr = flaggedTopics.length > 0
        ? `\n\nHIGH PRIORITY — The user said they genuinely do not understand why they feel/think/do the following. Focus on gently helping them explore and understand: ${flaggedTopics.map(t => sanitizeInput(t, 100)).join(', ')}.` : '';
      const topicInstruction = forceTopic
        ? ` You MUST open specifically about this topic: "${forceTopic}". Reference when it was said.`
        : ' Pick ONE specific thing the user said recently and open with an observation about it — referencing when they said it if it adds something.';

      const context =
        "You MUST end every single response with a probing question that pulls the conversation forward. NO EXCEPTIONS. Even responses under 30 tokens. Acknowledgment without a question is forbidden. Examples: 'What was happening for you in that moment?', 'Where do you feel that?', 'When did this start?', 'What would you say to them now?'" +
        ' ' + horoscopeContext +
        ' You are a guide with memory of past sessions.' + topicInstruction +
        ' Max 2 sentences. No fluff.' +
        avoidStr + flaggedStr +
        '\n\nPast sessions:\n' + sessionHistory +
        '\n\nPast answers:\n' + answerHistory;

      const opening = await callClaude(context, 200);
      setChatMessages([{ role: 'assistant', content: opening }]);
      if (ttsEnabled) {
        speakAndWait(opening)
          .then(() => { if (therapyVoiceModeRef.current) onStartVoiceRecording(setTherapyInput); })
          .catch(() => {});
      }

      callClaude(`Extract the core topic of this sentence in 2-3 words, no punctuation: "${opening}"`, 20)
        .then(extractedTopic => {
          const newHandled = [...new Set([...handledTopics, extractedTopic])];
          setHandledTopics(newHandled);
          AsyncStorage.setItem(STORAGE_KEY_HANDLED_TOPICS, JSON.stringify(newHandled));
          loadTherapyPreview(newHandled).then(line => { if (line) onTherapyPreviewChange(line); });
        })
        .catch(() => {});
    } catch {
      setChatMessages([{ role: 'assistant', content: "Hey. I've been reading through what you've shared. Something tells me there's more going on than you've let on. What's really on your mind?" }]);
    } finally {
      setTherapyLoading(false);
    }
  }

  async function sendTherapyMessage(msgText?: string) {
    const userMsg = (msgText ?? therapyInput).trim();
    if (!userMsg || therapyLoading) return;
    if (!canUseVent) { setShowPaywall(true); return; }
    Keyboard.dismiss();
    await stopTTS();
    if (!isPremium) onVentMessageSent?.();
    track('vent_message_sent', { freeRemaining: Math.max(0, freeMessagesRemaining - 1) });
    setTherapyInput('');
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setTherapyLoading(true);

    if (I_DONT_KNOW_PHRASES.some(p => userMsg.toLowerCase().includes(p)) && pinnedTherapyTopic) {
      setFlaggedTopics(prev => [...new Set([...prev, pinnedTherapyTopic])]);
    }

    try {
      const sysPrompt =
        "You MUST end every single response with a probing question that pulls the conversation forward. NO EXCEPTIONS. Even responses under 30 tokens. Acknowledgment without a question is forbidden. Examples: 'What was happening for you in that moment?', 'Where do you feel that?', 'When did this start?', 'What would you say to them now?'" +
        ' ' + horoscopeContext +
        " You are a guide. Follow the thread. Be direct. Max 2 short sentences. No fluff.";

      const reply = await callClaudeChat(
        sysPrompt,
        newMessages.map(m => ({ role: m.role, content: m.content })),
        80
      );
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (ttsEnabled) {
        speakAndWait(reply)
          .then(() => { if (therapyVoiceModeRef.current) onStartVoiceRecording(setTherapyInput); })
          .catch(() => {});
      } else if (therapyVoiceModeRef.current) {
        onStartVoiceRecording(setTherapyInput);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I lost my train of thought. What were you saying?" },
      ]);
    } finally {
      setTherapyLoading(false);
    }
  }

  function handleStartTalking(withMicMode = false) {
    if (sessionStarted) return;
    if (!canUseVent) { setShowPaywall(true); return; }
    therapyVoiceModeRef.current = withMicMode;
    if (withMicMode) setIsMicMode(true);
    openTherapySession(pinnedTherapyTopic, therapyPreview || undefined);
  }

  function exitMicMode() {
    setIsMicMode(false);
    therapyVoiceModeRef.current = false;
    if (isRecording) onStopVoiceRecording(setTherapyInput);
  }

  function enterMicMode() {
    setIsMicMode(true);
    therapyVoiceModeRef.current = true;
    onStartVoiceRecording(setTherapyInput);
  }

  async function handleMicPress() {
    if (!isConnected) return;
    if (isMicMode) {
      exitMicMode();
    } else if (!sessionStarted) {
      const granted = await requestMicPermission();
      if (granted) handleStartTalking(true);
    } else {
      const granted = await requestMicPermission();
      if (granted) enterMicMode();
    }
  }

  function handlePauseSession() {
    exitMicMode();
    setInputMode('voice');
  }

  function handleSaveReflection() {
    if (isConnected) sendTherapyMessage();
  }

  // ─── Locked: no vent access ─────────────────────────────────────────────────
  if (!canUseVent && !sessionStarted) {
    return (
      <View style={[styles.root, { backgroundColor: colors['bg-primary'], paddingTop: insets.top }]}>
        <View style={[styles.headerArea, { paddingTop: spacing.md }]}>
          <View style={styles.headerRow}>
            <IconButton
              icon={X}
              onPress={onClose ?? (() => {})}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            />
          </View>
          <Text style={[typography.labelCaps, { color: colors['text-tertiary'], textAlign: 'center' }]}>
            UNBURDEN YOUR MIND
          </Text>
          <Text style={[typography.h1, { color: colors['text-primary'], textAlign: 'center', marginTop: spacing.sm }]}>
            {header}
          </Text>
        </View>

        <View style={[styles.centeredContent, { paddingHorizontal: spacing['margin-screen'] }]}>
          <Card style={{ alignItems: 'center' }}>
            <Text style={[typography.labelCaps, { color: colors['accent-gold'], marginBottom: spacing.sm, textAlign: 'center' }]}>
              INFINITE JOURNAL
            </Text>
            <Text style={[typography.body, { color: colors['text-secondary'], textAlign: 'center', marginBottom: spacing.lg }]}>
              You've used your {FREE_VENT_LIMIT} free messages.{'\n'}Upgrade to keep going.
            </Text>
            <PillButton label="UPGRADE TO PREMIUM" onPress={() => setShowPaywall(true)} />
          </Card>
        </View>

        <PaywallScreen
          visible={showPaywall}
          source="vent"
          onClose={() => setShowPaywall(false)}
          onSubscribed={onPremiumStatusChanged ?? (() => Promise.resolve())}
        />
      </View>
    );
  }

  // ─── Locked: no sessions completed ─────────────────────────────────────────
  if (sessionCountLoaded && sessionCount === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors['bg-primary'], paddingTop: insets.top }]}>
        <View style={[styles.headerArea, { paddingTop: spacing.md }]}>
          <View style={styles.headerRow}>
            <IconButton
              icon={X}
              onPress={onClose ?? (() => {})}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            />
          </View>
          <Text style={[typography.labelCaps, { color: colors['text-tertiary'], textAlign: 'center' }]}>
            UNBURDEN YOUR MIND
          </Text>
          <Text style={[typography.h1, { color: colors['text-primary'], textAlign: 'center', marginTop: spacing.sm }]}>
            {header}
          </Text>
        </View>

        <View style={[styles.centeredContent, { paddingHorizontal: spacing['margin-screen'] }]}>
          <Card style={{ alignItems: 'center' }}>
            <Text style={[typography.body, { color: colors['text-secondary'], textAlign: 'center' }]}>
              Complete a session to unlock the Talk tab.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  // ─── Main screen ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors['bg-primary'] }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={40}
    >
      {/* Non-scrolling header */}
      <View style={[styles.headerArea, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <IconButton
            icon={X}
            onPress={onClose ?? (() => {})}
            style={styles.closeBtn}
            accessibilityLabel="Close"
          />
        </View>
        <Text style={[typography.labelCaps, { color: colors['text-tertiary'], textAlign: 'center' }]}>
          UNBURDEN YOUR MIND
        </Text>
        <Text style={[typography.h1, { color: colors['text-primary'], textAlign: 'center', marginTop: spacing.sm }]}>
          {header}
        </Text>
      </View>

      {/* Chat messages (scrollable) — only shown when session is active */}
      {sessionStarted && (
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.map((msg, i) => (
            <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              <BlurCard
                intensity={msg.role === 'user' ? 8 : 18}
                style={[styles.msgBubble, msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAI]}
              >
                {msg.role === 'assistant' && (
                  <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
                    <AILabel />
                  </View>
                )}
                <Text style={[styles.msgText, msg.role === 'assistant' && styles.msgTextAI]}>
                  {msg.content}
                </Text>
              </BlurCard>
            </View>
          ))}
          {therapyLoading && (
            <ActivityIndicator
              color={colors['accent-gold']}
              style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }}
            />
          )}
        </ScrollView>
      )}

      {/* Center area: waveform + subtitle (shown when session not started) */}
      {!sessionStarted && (
        <View style={styles.waveArea}>
          <WaveformBar
            meteringLevelAnim={meteringLevelAnim}
            meteringSV={waveformMeteringSV}
            active={waveformActive}
            style={styles.waveform}
          />
          <Text style={[typography.body, styles.waveSubtitle, { color: colors['text-tertiary'] }]}>
            No judgment, just your voice.
          </Text>
        </View>
      )}

      {/* Lower center: MicButton with recessed frame */}
      <View style={styles.micArea}>
        {/* Inline waveform when session active */}
        {sessionStarted && (
          <WaveformBar
            meteringLevelAnim={meteringLevelAnim}
            meteringSV={waveformMeteringSV}
            active={waveformActive}
            style={styles.waveformInline}
          />
        )}

        <View style={[
          styles.micFrame,
          { backgroundColor: colors['bg-surface'], borderRadius: radius.xl },
        ]}>
          <MicButton
            active={isRecording}
            onPress={handleMicPress}
          />
        </View>

        {isRecording && (
          <Text style={[typography.labelCaps, styles.recordingLabel, { color: colors['text-tertiary'] }]}>
            RECORDING...
          </Text>
        )}

        {isTranscribing && (
          <ActivityIndicator color={colors['accent-gold']} size="small" style={{ marginTop: spacing.sm }} />
        )}

        {forceStopMsg && (
          <Text style={[typography.caption, styles.forceStopMsg, { color: colors['text-tertiary'] }]}>
            Recording stopped — tap mic to record again
          </Text>
        )}

        {/* Type mode input */}
        {inputMode === 'type' && (
          <View style={[styles.typeRow, { borderColor: colors['border-strong'] }]}>
            <TouchableOpacity onPress={() => setInputMode('voice')} style={styles.modeToggle}>
              <Text style={[typography.labelSm, { color: colors['text-tertiary'] }]}>MIC MODE</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { color: colors['text-primary'], borderBottomColor: colors['border-strong'] }]}
              placeholder="reply..."
              placeholderTextColor={colors['text-tertiary']}
              value={therapyInput}
              onChangeText={setTherapyInput}
              multiline
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={() => { if (isConnected) sendTherapyMessage(); }}
              style={[styles.modeToggle, { opacity: isConnected ? 1 : 0.3 }]}
            >
              <Text style={[typography.labelSm, { color: colors['accent-gold'] }]}>SEND</Text>
            </TouchableOpacity>
          </View>
        )}

        {inputMode === 'voice' && !isMicMode && !isRecording && !isTranscribing && sessionStarted && (
          <TouchableOpacity
            onPress={() => { therapyVoiceModeRef.current = false; setInputMode('type'); }}
            style={styles.modeToggle}
          >
            <Text style={[typography.labelSm, { color: colors['text-tertiary'] }]}>TYPE INSTEAD</Text>
          </TouchableOpacity>
        )}

        {isMicMode && !isRecording && !isTranscribing && !forceStopMsg && (
          <Text style={[typography.labelSm, { color: colors['text-tertiary'], marginTop: spacing.sm }]}>
            TAP MIC TO EXIT
          </Text>
        )}
      </View>

      {/* Premium / free messages counter */}
      {!isPremium && freeMessagesRemaining <= 3 && freeMessagesRemaining > 0 && (
        <View style={[styles.freeCounterArea, { paddingHorizontal: spacing['margin-screen'] }]}>
          <Card style={styles.freeCounterCard}>
            <Text style={[typography.caption, { color: colors['text-tertiary'], textAlign: 'center' }]}>
              {freeMessagesRemaining} free {freeMessagesRemaining === 1 ? 'message' : 'messages'} remaining
            </Text>
            <TouchableOpacity onPress={() => setShowPaywall(true)} style={{ marginTop: spacing.sm, alignSelf: 'center' }}>
              <Text style={[typography.labelSm, { color: colors['accent-gold'] }]}>UNLOCK UNLIMITED</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {/* Bottom row */}
      <View style={[
        styles.bottomRow,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md,
          paddingHorizontal: spacing['margin-screen'],
        },
      ]}>
        <OutlinedPillButton
          label="PAUSE SESSION"
          onPress={handlePauseSession}
          style={styles.bottomBtn}
        />
        <PillButton
          label="SAVE REFLECTION"
          onPress={handleSaveReflection}
          disabled={!isConnected || !therapyInput.trim()}
          style={styles.bottomBtn}
        />
      </View>

      <PaywallScreen
        visible={showPaywall}
        source="vent"
        onClose={() => setShowPaywall(false)}
        onSubscribed={onPremiumStatusChanged ?? (() => Promise.resolve())}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: spacing['margin-screen'],
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: spacing['margin-screen'],
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  msgRow: {
    alignItems: 'flex-start',
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  msgBubble: {
    maxWidth: '80%',
    padding: spacing.md,
  },
  msgBubbleAI: {},
  msgBubbleUser: {
    borderColor: 'rgba(180,140,90,0.25)',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 22,
    color: legacyColors.textPrimary,
  },
  msgTextAI: {
    fontStyle: 'italic',
  },
  waveArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['margin-screen'],
    gap: spacing.md,
  },
  waveform: {
    width: '100%',
  },
  waveSubtitle: {
    textAlign: 'center',
  },
  waveformInline: {
    width: '100%',
    marginBottom: spacing.md,
    paddingHorizontal: spacing['margin-screen'],
  },
  micArea: {
    alignItems: 'center',
    paddingHorizontal: spacing['margin-screen'],
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  micFrame: {
    padding: 8,
  },
  recordingLabel: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  forceStopMsg: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  modeToggle: {
    paddingVertical: spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  freeCounterArea: {
    marginBottom: spacing.md,
  },
  freeCounterCard: {
    minHeight: 0,
    padding: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  bottomBtn: {
    flex: 1,
  },
});
