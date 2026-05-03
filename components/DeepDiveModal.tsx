import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { track } from '../lib/analytics';
import { generateDeepDive } from '../lib/ai/session';

type Props = {
  visible: boolean;
  onClose: () => void;
  answers: Array<{ question: string; answer: string }>;
  traits: Record<string, number>;
  recentInsights: string[];
};

export default function DeepDiveModal({ visible, onClose, answers, traits, recentInsights }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setText('');
    track('deep_dive_opened');
    generateDeepDive(answers, traits, recentInsights)
      .then(result => {
        if (cancelled) return;
        setText(result);
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
          <Text style={styles.heading}>DEEPER LOOK</Text>
          {loading && <ActivityIndicator color="rgba(180,140,90,0.9)" style={styles.spinner} />}
          {error && (
            <Text style={styles.error}>Could not load — check your connection and try again.</Text>
          )}
          {!!text && <Text style={styles.body}>{text}</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', paddingTop: 20 },
  closeBtn: { alignSelf: 'flex-end', padding: 20 },
  closeTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },
  scroll: { padding: 28, paddingTop: 8 },
  heading: { color: 'rgba(180,140,90,0.6)', fontSize: 10, letterSpacing: 3, marginBottom: 24 },
  spinner: { marginTop: 48 },
  error: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 22 },
  body: { color: 'rgba(255,255,255,0.88)', fontSize: 16, lineHeight: 26, fontWeight: '300' as const },
});
