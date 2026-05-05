import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { track } from '../lib/analytics';
import { generateDeepDive } from '../lib/ai/session';
import { DeepDiveResult } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  answers: Array<{ question: string; answer: string }>;
  traits: Record<string, number>;
  recentInsights: string[];
};

const SECTIONS: { key: keyof Omit<DeepDiveResult, 'quote' | 'reflection_prompt'>; label: string }[] = [
  { key: 'what_you_said', label: 'WHAT YOU SAID' },
  { key: 'the_pattern', label: 'THE PATTERN' },
  { key: 'something_to_sit_with', label: 'SOMETHING TO SIT WITH' },
];

export default function DeepDiveModal({ visible, onClose, answers, traits, recentInsights }: Props) {
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
      .catch(() => {
        if (cancelled) return;
        setError(true);
        track('deep_dive_failed');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.eyebrow}>JUST FOR YOU</Text>
          <Text style={styles.heading}>A Deeper Look</Text>

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="rgba(180,140,90,0.9)" />
              <Text style={styles.loadingTxt}>Reflecting on your session…</Text>
            </View>
          )}

          {error && (
            <Text style={styles.error}>Could not load — check your connection and try again.</Text>
          )}

          {result && (
            <View style={styles.content}>
              <Text style={styles.quote}>"{result.quote}"</Text>
              <View style={styles.divider} />

              {SECTIONS.map(({ key, label }) => (
                <View key={key} style={styles.section}>
                  <Text style={styles.sectionLabel}>{label}</Text>
                  <Text style={styles.sectionBody}>{result[key]}</Text>
                </View>
              ))}

              <View style={styles.reflectionWrap}>
                <Text style={styles.reflectionLabel}>CARRY THIS WITH YOU</Text>
                <Text style={styles.reflectionText}>{result.reflection_prompt}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', paddingTop: 20 },
  closeBtn: { alignSelf: 'flex-end', padding: 20 },
  closeTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },
  scroll: { padding: 28, paddingTop: 8, paddingBottom: 60 },
  eyebrow: { color: 'rgba(180,140,90,0.55)', fontSize: 10, letterSpacing: 3, marginBottom: 8 },
  heading: { color: 'rgba(255,255,255,0.9)', fontSize: 26, fontWeight: '300' as const, letterSpacing: 0.5 },
  loadingWrap: { alignItems: 'center', marginTop: 56, gap: 14 },
  loadingTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 13, letterSpacing: 0.5 },
  error: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 22, marginTop: 32 },
  content: { marginTop: 28 },
  quote: {
    color: 'rgba(180,140,90,0.85)',
    fontSize: 19,
    fontStyle: 'italic',
    lineHeight: 29,
    fontWeight: '300' as const,
    marginBottom: 28,
  },
  divider: { height: 1, backgroundColor: 'rgba(180,140,90,0.12)', marginBottom: 32 },
  section: { marginBottom: 28 },
  sectionLabel: {
    color: 'rgba(180,140,90,0.6)',
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  sectionBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '300' as const,
  },
  reflectionWrap: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180,140,90,0.12)',
    paddingTop: 28,
  },
  reflectionLabel: {
    color: 'rgba(180,140,90,0.6)',
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  reflectionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '300' as const,
  },
});
