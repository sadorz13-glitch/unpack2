import { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { AILabel } from './ui';
import { track } from '../lib/analytics';
import { generateDeepDive } from '../lib/ai/session';
import { DeepDiveResult } from '../types';
import { useTheme } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  answers: Array<{ question: string; answer: string }>;
  traits: Record<string, number>;
  recentInsights: string[];
  topic?: string;
  onVent?: (topic: string) => void;
};

const SECTIONS: { key: keyof Omit<DeepDiveResult, 'quote' | 'reflection_prompt'>; label: string }[] = [
  { key: 'what_you_said', label: 'WHAT YOU SAID' },
  { key: 'the_pattern', label: 'THE PATTERN' },
  { key: 'something_to_sit_with', label: 'SOMETHING TO SIT WITH' },
];

export default function DeepDiveModal({ visible, onClose, answers, traits, recentInsights, topic, onVent }: Props) {
  const { colors } = useTheme();
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setResult(null);
    track('deep_dive_opened');
    generateDeepDive(answers, traits, recentInsights)
      .then(data => {
        if (cancelled) return;
        setResult(data);
        track('deep_dive_loaded');
      })
      .catch((_: unknown) => {
        if (cancelled) return;
        setError(true);
        track('deep_dive_failed');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.eyebrow}>JUST FOR YOU</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.heading}>A Deeper Look</Text>
            <AILabel />
          </View>

          {loading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={colors['accent-gold']} />
              <Text style={s.loadingTxt}>Reflecting on your session…</Text>
            </View>
          )}

          {error && (
            <Text style={s.error}>Could not load — check your connection and try again.</Text>
          )}

          {result && (
            <View style={s.content}>
              <Text style={s.quote}>"{result.quote}"</Text>
              <View style={s.divider} />

              {SECTIONS.map(({ key, label }) => (
                <View key={key} style={s.section}>
                  <Text style={s.sectionLabel}>{label}</Text>
                  <Text style={s.sectionBody}>{result[key]}</Text>
                </View>
              ))}

              {onVent && topic ? (
                <TouchableOpacity
                  style={s.ventBtn}
                  onPress={() => {
                    // Fix: iOS cannot render two <Modal> components simultaneously.
                    // Closing DeepDive first and deferring onVent gives the native layer
                    // ~80ms to dismiss this modal before the Vent modal is presented.
                    // Same pattern used for the Crisis Resources double-modal fix.
                    if (__DEV__) console.log('[DeepDiveModal] "Talk about this" pressed — closing DeepDive modal'); // __DEV__ TODO: remove before ship
                    onClose();
                    setTimeout(() => {
                      if (__DEV__) console.log('[DeepDiveModal] setTimeout fired — calling onVent with topic:', topic); // __DEV__ TODO: remove before ship
                      onVent(topic);
                    }, 80);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.ventText}>TALK ABOUT THIS →</Text>
                </TouchableOpacity>
              ) : null}

              <View style={s.reflectionWrap}>
                <Text style={s.reflectionLabel}>CARRY THIS WITH YOU</Text>
                <Text style={s.reflectionText}>{result.reflection_prompt}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors['bg-primary'], paddingTop: 20 },
    closeBtn: { alignSelf: 'flex-end', padding: 20 },
    closeTxt: { color: colors['text-tertiary'], fontSize: 18 },
    scroll: { padding: 28, paddingTop: 8, paddingBottom: 60 },
    eyebrow: { color: colors['accent-gold'], fontSize: 12, letterSpacing: 3, marginBottom: 8, opacity: 0.7 },
    heading: { color: colors['text-primary'], fontSize: 26, fontWeight: '300' as const, letterSpacing: 0.5 },
    loadingWrap: { alignItems: 'center', marginTop: 56, gap: 14 },
    loadingTxt: { color: colors['text-tertiary'], fontSize: 13, letterSpacing: 0.5 },
    error: { color: colors['text-secondary'], fontSize: 14, lineHeight: 22, marginTop: 32 },
    content: { marginTop: 28 },
    quote: {
      color: colors['accent-gold'],
      fontSize: 19,
      fontStyle: 'italic',
      lineHeight: 29,
      fontWeight: '300' as const,
      marginBottom: 28,
    },
    divider: { height: 1, backgroundColor: colors['border-subtle'], marginBottom: 32 },
    section: { marginBottom: 28 },
    sectionLabel: {
      color: colors['accent-gold'],
      fontSize: 12,
      letterSpacing: 2.5,
      marginBottom: 10,
      opacity: 0.7,
    },
    sectionBody: {
      color: colors['text-primary'],
      fontSize: 16,
      lineHeight: 26,
      fontWeight: '300' as const,
    },
    reflectionWrap: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors['border-subtle'],
      paddingTop: 28,
    },
    reflectionLabel: {
      color: colors['accent-gold'],
      fontSize: 12,
      letterSpacing: 2.5,
      marginBottom: 12,
      opacity: 0.7,
    },
    reflectionText: {
      color: colors['text-secondary'],
      fontSize: 15,
      lineHeight: 24,
      fontStyle: 'italic',
      fontWeight: '300' as const,
    },
    ventBtn: {
      alignSelf: 'flex-start',
      marginBottom: 32,
      paddingVertical: 8,
      paddingHorizontal: 0,
    },
    ventText: {
      color: colors['accent-gold'],
      fontSize: 12,
      letterSpacing: 2,
      fontWeight: '500' as const,
    },
  });
}
