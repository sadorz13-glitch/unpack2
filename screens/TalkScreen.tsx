// screens/TalkScreen.tsx
import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies } from '../theme';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  chatMessages: Message[];
  therapyInput: string;
  therapyLoading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  inputMode: 'voice' | 'type';
  micPulseAnim: Animated.Value;
  meteringLevelAnim: Animated.Value;
  ttsEnabled: boolean;
  sessionCount: number;
  sessionCountLoaded: boolean;
  therapyPreview: string | null;
  pinnedTherapyTopic: string;
  onSendMessage: (text?: string) => void;
  onSetTherapyInput: (text: string) => void;
  onSetInputMode: (mode: 'voice' | 'type') => void;
  onOpenTherapy: (topic?: string) => void;
  onStartVoiceRecording: (setter: (t: string) => void) => void;
  onStopVoiceRecording: (setter: (t: string) => void) => void;
  therapyVoiceModeRef: React.MutableRefObject<boolean>;
};

export function TalkScreen({
  chatMessages, therapyInput, therapyLoading, isRecording, isTranscribing,
  inputMode, micPulseAnim, meteringLevelAnim, sessionCount, sessionCountLoaded,
  therapyPreview, pinnedTherapyTopic, onSendMessage, onSetTherapyInput,
  onSetInputMode, onOpenTherapy, onStartVoiceRecording, onStopVoiceRecording, therapyVoiceModeRef,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const sessionStarted = chatMessages.length > 0 || therapyLoading;

  function handleStartTalking() {
    if (sessionStarted) return;
    therapyVoiceModeRef.current = true;
    onOpenTherapy(pinnedTherapyTopic);
  }

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages]);

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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.tabTitle}>Vent</Text>
      </View>

      {/* Messages — or starter prompt */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[{ padding: spacing.lg, gap: spacing.md }, !sessionStarted && styles.starterContainer]}
        keyboardShouldPersistTaps="handled"
      >
        {!sessionStarted ? (
          <TouchableOpacity onPress={handleStartTalking} activeOpacity={0.7} style={styles.starterBubble}>
            <BlurCard intensity={18} style={styles.msgBubble}>
              <Text style={[styles.msgText, styles.msgTextAI]}>
                hey, let's have a chat.{'\n'}what's on your mind?
              </Text>
            </BlurCard>
            <Text style={styles.starterHint}>TAP TO RESPOND</Text>
          </TouchableOpacity>
        ) : (
          <>
            {chatMessages.map((msg, i) => (
              <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                <BlurCard
                  intensity={msg.role === 'user' ? 8 : 18}
                  style={[
                    styles.msgBubble,
                    msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAI,
                  ]}
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

      {/* Input */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        {inputMode === 'voice' ? (
          <View style={styles.voiceRow}>
            <TouchableOpacity
              onPress={() => {
                if (!sessionStarted) {
                  handleStartTalking();
                } else if (isRecording) {
                  therapyVoiceModeRef.current = false;
                  onStopVoiceRecording(onSetTherapyInput);
                } else {
                  therapyVoiceModeRef.current = true;
                  onStartVoiceRecording(onSetTherapyInput);
                }
              }}
              activeOpacity={0.6}
            >
              <Animated.View style={[styles.micRing, { borderColor: isRecording ? 'rgba(180,140,90,0.5)' : colors.border, transform: [{ scale: micPulseAnim }] }]}>
                <Animated.View style={[styles.micDot, { backgroundColor: isRecording ? colors.accent : '#2a2822', transform: [{ scale: meteringLevelAnim }] }]} />
              </Animated.View>
            </TouchableOpacity>
            {isTranscribing
              ? <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: spacing.md }} />
              : <Text style={styles.listeningLabel}>{isRecording ? 'LISTENING' : ''}</Text>
            }
            {!isRecording && !isTranscribing && (
              <TouchableOpacity onPress={() => { therapyVoiceModeRef.current = false; onSetInputMode('type'); }} style={{ marginTop: spacing.base }}>
                <Text style={styles.ghostText}>TYPE INSTEAD</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.typeRow}>
            <TouchableOpacity onPress={() => onSetInputMode('voice')} style={{ paddingVertical: spacing.md }}>
              <Text style={styles.ghostText}>MIC</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="reply..."
              placeholderTextColor={colors.textGhost}
              value={therapyInput}
              onChangeText={onSetTherapyInput}
              multiline
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={() => onSendMessage()} style={{ paddingVertical: spacing.md }}>
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
  wordmark: { color: colors.textSecondary, fontSize: 11, letterSpacing: 5 },
  tabTitle: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 22,
    color: colors.accent,
  },
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
  lockedTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 24, color: colors.textPrimary, marginBottom: spacing.base },
  lockedSub: { color: colors.textMuted, fontSize: 14 },
  starterContainer: { flex: 1, justifyContent: 'center' },
  starterBubble: { alignItems: 'flex-start', gap: spacing.sm },
  starterHint: { color: colors.textGhost, fontSize: 8, letterSpacing: 4, marginLeft: spacing.md },
});
