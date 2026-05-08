import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies } from '../theme';
import { supabase } from '../lib/supabase';
import { callClaude, callClaudeChat, sanitizeInput } from '../lib/ai/client';
import { loadTherapyPreview } from '../lib/ai/therapy';
import { getUserId } from '../lib/auth';
import { STORAGE_KEY_HANDLED_TOPICS, STORAGE_KEY_FLAGGED_TOPICS, FREE_VENT_MESSAGE_LIMIT as FREE_VENT_LIMIT, FORCE_STOP_MSG_DURATION_MS } from '../constants';
import { track } from '../lib/analytics';
import { PaywallScreen } from './PaywallScreen';

const I_DONT_KNOW_PHRASES = [
  "i don't know", "i dont know", "not sure", "i have no idea",
  "can't figure", "cant figure", "help me figure",
  "i don't understand why", "no idea",
];
import type { ChatMessage } from '../types';
import { requestMicPermission } from '../lib/micPermission';

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
  onStartVoiceRecording: (setter: (t: string) => void) => void;
  onStopVoiceRecording: (setter: (t: string) => void) => void;
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
};

export function TalkScreen({
  horoscopeContext, ttsEnabled, stopTTS, speakAndWait,
  sessionCount, sessionCountLoaded, therapyPreview, therapyResetTick,
  isRecording, isTranscribing, micPulseAnim, meteringLevelAnim,
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
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [therapyInput, setTherapyInput] = useState('');
  const [therapyLoading, setTherapyLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [handledTopics, setHandledTopics] = useState<string[]>([]);
  const [flaggedTopics, setFlaggedTopics] = useState<string[]>([]);
  const [pinnedTherapyTopic, setPinnedTherapyTopic] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isMicMode, setIsMicMode] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [forceStopMsg, setForceStopMsg] = useState(false);

  useEffect(() => {
    if (!isRecording) { setRecordingSeconds(0); return; }
    const id = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

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
  }, [ventTopicOverride]);

  const sessionStarted = chatMessages.length > 0 || therapyLoading;

  async function openTherapySession(forceTopic = '', existingOpening?: string) {
    track('vent_session_started');
    setChatMessages([]);
    setTherapyLoading(true);
    try {
      // Fast path: user tapped the preview bubble — use the exact text they saw on the dashboard.
      // Skip DB queries and the Claude call entirely.
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

      const sessionIds = (recentSessions || []).map((s: any) => s.id);
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
        .map((s: any) => `[${formatDate(s.created_at)}] Topic: ${s.topic} — Insight: ${s.insight}`)
        .join('\n');
      const answerHistory = (recentAnswers || [])
        .map((a: any) => `[${formatDate(a.created_at)}] Q: ${a.question}\nA: ${a.answer}`)
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
        ' You are a therapist with memory of past sessions.' + topicInstruction +
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
        " You are a therapist. Follow the thread. Be direct. Max 2 short sentences. No fluff.";

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
    // Pass the preview text so the user lands in the exact conversation they tapped on.
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

  if (!canUseVent && !sessionStarted) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.bg }]}>
        <Text style={styles.tabTitle}>Vent</Text>
        <Text style={[styles.lockedSub, { marginTop: spacing.lg, marginBottom: spacing.xl, textAlign: 'center' }]}>
          You've used your {FREE_VENT_LIMIT} free messages.{'\n'}Upgrade to keep going.
        </Text>
        <TouchableOpacity
          style={{ borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)', borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xl }}
          onPress={() => setShowPaywall(true)}
        >
          <Text style={{ color: colors.accent, fontSize: 11, letterSpacing: 4 }}>UPGRADE TO PREMIUM</Text>
        </TouchableOpacity>
        <PaywallScreen
          visible={showPaywall}
          source="vent"
          onClose={() => setShowPaywall(false)}
          onSubscribed={onPremiumStatusChanged ?? (() => Promise.resolve())}
        />
      </View>
    );
  }

  if (sessionCountLoaded && sessionCount === 0) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.bg }]}>
        <Text style={styles.tabTitle}>Vent</Text>
        <Text style={styles.lockedSub}>Complete a session to unlock.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={40}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.tabTitle}>Vent</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[{ padding: spacing.lg, gap: spacing.md }, !sessionStarted && styles.starterContainer]}
        keyboardShouldPersistTaps="handled"
      >
        {!sessionStarted ? (
          <TouchableOpacity
            onPress={isConnected ? () => handleStartTalking(false) : undefined}
            activeOpacity={isConnected ? 0.7 : 1}
            style={[styles.starterBubble, !isConnected && { opacity: 0.5 }]}
          >
            <BlurCard intensity={18} style={styles.msgBubble}>
              <Text style={[styles.msgText, styles.msgTextAI]}>
                {therapyPreview || "hey, let's have a chat.\nwhat's on your mind?"}
              </Text>
            </BlurCard>
            <Text style={styles.starterHint}>
              {isConnected ? 'TAP TO RESPOND' : 'NO INTERNET CONNECTION'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {chatMessages.map((msg, i) => (
              <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                <BlurCard
                  intensity={msg.role === 'user' ? 8 : 18}
                  style={[styles.msgBubble, msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAI]}
                >
                  <Text style={[styles.msgText, msg.role === 'assistant' && styles.msgTextAI]}>
                    {msg.content}
                  </Text>
                </BlurCard>
              </View>
            ))}
            {therapyLoading && (
              <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }} />
            )}
          </>
        )}
      </ScrollView>

      <PaywallScreen
        visible={showPaywall}
        source="vent"
        onClose={() => setShowPaywall(false)}
        onSubscribed={onPremiumStatusChanged ?? (() => Promise.resolve())}
      />

      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        {inputMode === 'voice' ? (
          <View style={styles.voiceRow}>
            <TouchableOpacity
              onPress={async () => {
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
              }}
              activeOpacity={isConnected ? 0.6 : 1}
              style={{ opacity: isConnected ? 1 : 0.3 }}
            >
              <Animated.View style={[
                styles.micRing,
                {
                  borderColor: isMicMode ? colors.accent : (isRecording ? 'rgba(180,140,90,0.5)' : colors.border),
                  shadowColor: isMicMode ? colors.accent : 'transparent',
                  shadowOpacity: isMicMode ? 0.6 : 0,
                  shadowRadius: isMicMode ? 10 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  transform: [{ scale: micPulseAnim }],
                },
              ]}>
                <Animated.View style={[styles.micDot, { backgroundColor: isMicMode || isRecording ? colors.accent : '#2a2822', transform: [{ scale: meteringLevelAnim }] }]} />
              </Animated.View>
            </TouchableOpacity>
            {isTranscribing
              ? <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: spacing.md }} />
              : <Text style={styles.listeningLabel}>{isMicMode ? (isRecording ? 'LISTENING' : 'MIC ON') : ''}</Text>
            }
            {isRecording && (
              <Text style={styles.recordingTimer}>
                {`0:${String(recordingSeconds).padStart(2, '0')}`}
              </Text>
            )}
            {forceStopMsg && (
              <Text style={styles.forceStopMsg}>Recording stopped — tap mic to record again</Text>
            )}
            {!isMicMode && !isRecording && !isTranscribing && (
              <TouchableOpacity onPress={() => { therapyVoiceModeRef.current = false; setInputMode('type'); }} style={{ marginTop: spacing.base }}>
                <Text style={styles.ghostText}>TYPE INSTEAD</Text>
              </TouchableOpacity>
            )}
            {isMicMode && !isRecording && !isTranscribing && !forceStopMsg && (
              <Text style={[styles.ghostText, { marginTop: spacing.base }]}>TAP MIC TO EXIT</Text>
            )}
          </View>
        ) : (
          <View style={styles.typeRow}>
            <TouchableOpacity onPress={() => setInputMode('voice')} style={{ paddingVertical: spacing.md }}>
              <Text style={styles.ghostText}>MIC MODE</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="reply..."
              placeholderTextColor={colors.textGhost}
              value={therapyInput}
              onChangeText={setTherapyInput}
              multiline
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={() => { if (isConnected) sendTherapyMessage(); }}
              style={{ paddingVertical: spacing.md, opacity: isConnected ? 1 : 0.3 }}
            >
              <Text style={[styles.ghostText, { color: colors.accent, letterSpacing: 3 }]}>SEND</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingBottom: spacing.base, paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  tabTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 22, color: colors.accent },
  msgRow: { alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: spacing.md },
  msgBubbleAI: {},
  msgBubbleUser: { borderColor: 'rgba(180,140,90,0.25)' },
  msgText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  msgTextAI: { fontStyle: 'italic' },
  inputArea: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.base, paddingHorizontal: spacing.lg,
  },
  voiceRow: { alignItems: 'center', paddingVertical: spacing.sm },
  micRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  micDot: { width: 7, height: 7, borderRadius: 3.5 },
  listeningLabel: { color: colors.accent, fontSize: 9, letterSpacing: 3, marginTop: spacing.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textInput: { flex: 1, color: colors.textPrimary, fontSize: 14, borderBottomWidth: 1, borderBottomColor: '#2a2822', paddingVertical: spacing.md },
  ghostText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  recordingTimer: { color: colors.textMuted, fontSize: 9, letterSpacing: 2, marginTop: 4 },
  forceStopMsg: { color: colors.textMuted, fontSize: 10, fontStyle: 'italic', marginTop: spacing.base, textAlign: 'center' },
  lockedSub: { color: colors.textMuted, fontSize: 14 },
  starterContainer: { flex: 1, justifyContent: 'center' },
  starterBubble: { alignItems: 'flex-start', gap: spacing.sm },
  starterHint: { color: colors.textGhost, fontSize: 8, letterSpacing: 4, marginLeft: spacing.md },
});
