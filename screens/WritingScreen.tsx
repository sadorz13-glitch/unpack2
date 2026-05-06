import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { saveJournalEntry, updateJournalEntry } from '../lib/journalHelpers';
import { addPendingEntry } from '../lib/offlineQueue';
import { track } from '../lib/analytics';
import { generateJournalPrompt, generateJournalReflection } from '../lib/journalAi';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/auth';

type DayNote = {
  id: string;
  note: string;
  time_label: string;
  created_at: string;
  date: string;
};

type Props = {
  userId: string;
  horoscopeContext: string;
  insight: string;
  topic: string;
  streakDays: number;
  isActive: boolean;
  isConnected?: boolean;
  journalRefreshTick?: number;
  isRecording?: boolean;
  micPulseAnim?: Animated.Value;
  meteringLevelAnim?: Animated.Value;
  onStartVoiceRecording?: (setterFn: any) => void;
  onStopVoiceRecording?: (setterFn: any) => void;
  writingVoiceModeRef?: React.MutableRefObject<boolean>;
};

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function formatHistoryLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function WritingScreen({
  userId, horoscopeContext, insight, topic, streakDays, isActive,
  isConnected = true, journalRefreshTick,
  isRecording, micPulseAnim, meteringLevelAnim,
  onStartVoiceRecording, onStopVoiceRecording, writingVoiceModeRef,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [view, setView] = useState<'editor' | 'history'>('editor');

  const [entry, setEntry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);

  const [history, setHistory] = useState<DayNote[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayEntries, setTodayEntries] = useState<DayNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  React.useEffect(() => {
    fetchPrompt();
    loadTodayEntries();
  }, []);

  React.useEffect(() => {
    if (isActive) loadTodayEntries();
    else {
      if (writingVoiceModeRef) writingVoiceModeRef.current = false;
      if (isRecording && onStopVoiceRecording) onStopVoiceRecording(setEntry);
      setView('editor'); setSearchQuery(''); setEditingId(null); setEditingText('');
    }
  }, [isActive]);

  React.useEffect(() => {
    if (journalRefreshTick && journalRefreshTick > 0) loadTodayEntries();
  }, [journalRefreshTick]);

  async function fetchPrompt() {
    setPromptLoading(true);
    setReflection(null);
    try {
      const p = await generateJournalPrompt(insight, topic, horoscopeContext);
      setPrompt(p);
    } catch {
      setPrompt(null);
    } finally {
      setPromptLoading(false);
    }
  }

  async function handleSave() {
    const text = entry.trim();
    if (!text) return;
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const timeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (!isConnected) {
      await addPendingEntry(date, text, timeLabel);
      setTodayEntries(prev => [...prev, {
        id: `pending-${Date.now()}`,
        note: text,
        time_label: timeLabel,
        created_at: now.toISOString(),
        date,
      }]);
      setEntry('');
      track('journal_entry_saved', { wordCount: wordCount(text), offline: true });
      return;
    }

    setIsSaving(true);
    await saveJournalEntry(date, text, timeLabel);
    track('journal_entry_saved', { wordCount: wordCount(text), offline: false });
    setIsSaving(false);
    setReflectionLoading(true);
    setEntry('');
    loadTodayEntries();
    try {
      const r = await generateJournalReflection(text, horoscopeContext);
      setReflection(r);
    } catch {
      setReflection(null);
    } finally {
      setReflectionLoading(false);
    }
  }

  async function loadHistory() {
    const today = new Date().toISOString().slice(0, 10);
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('day_notes')
        .select('id, note, time_label, created_at, date')
        .eq('user_id', getUserId())
        .neq('date', today)
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory(data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadTodayEntries() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { data } = await supabase
        .from('day_notes')
        .select('id, note, time_label, created_at, date')
        .eq('user_id', getUserId())
        .eq('date', today)
        .order('created_at', { ascending: true });
      setTodayEntries(data ?? []);
    } catch {
      setTodayEntries([]);
    }
  }

  async function saveEdit(id: string) {
    if (!editingText.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    await updateJournalEntry(id, editingText.trim());
    setIsSavingEdit(false);
    setEditingId(null);
    await loadTodayEntries();
  }

  function switchView(next: 'editor' | 'history') {
    setView(next);
    if (next === 'history') loadHistory();
  }

  const wc = wordCount(entry);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Write</Text>
        {streakDays > 0 && (
          <Text style={styles.streak}>{streakDays} day streak</Text>
        )}
        <View style={styles.headerTabs}>
          <TouchableOpacity onPress={() => switchView('editor')} style={styles.headerTab}>
            <Text style={[styles.headerTabText, view === 'editor' && styles.headerTabActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchView('history')} style={styles.headerTab}>
            <Text style={[styles.headerTabText, view === 'history' && styles.headerTabActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {view === 'editor' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
          >
            {(promptLoading || reflectionLoading) ? (
              <View style={styles.banner}>
                <ActivityIndicator color={colors.accent} size="small" />
              </View>
            ) : reflection ? (
              <View style={styles.banner}>
                <Text style={styles.reflectionText}>{reflection}</Text>
                <TouchableOpacity onPress={fetchPrompt} style={styles.newPromptBtn}>
                  <Text style={styles.newPromptText}>Write more</Text>
                </TouchableOpacity>
              </View>
            ) : prompt ? (
              <TouchableOpacity style={styles.banner} onPress={fetchPrompt} activeOpacity={0.7}>
                <Text style={styles.promptLabel}>PROMPT</Text>
                <Text style={styles.promptText}>{prompt}</Text>
                <Text style={styles.tapToRefresh}>tap to refresh</Text>
              </TouchableOpacity>
            ) : null}

            <TextInput
              ref={inputRef}
              style={styles.editor}
              multiline
              placeholder="Start writing..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={entry}
              onChangeText={setEntry}
              autoCorrect
              textAlignVertical="top"
              scrollEnabled={false}
            />

            <View style={styles.toolbar}>
              <Text style={styles.wordCount}>{wc} {wc === 1 ? 'word' : 'words'}</Text>

              {onStartVoiceRecording && micPulseAnim && meteringLevelAnim ? (
                <TouchableOpacity
                  onPress={() => {
                    if (!isConnected || !writingVoiceModeRef || !onStartVoiceRecording || !onStopVoiceRecording) return;
                    if (isRecording) {
                      writingVoiceModeRef.current = false;
                      onStopVoiceRecording(setEntry);
                    } else {
                      writingVoiceModeRef.current = true;
                      onStartVoiceRecording(setEntry);
                    }
                  }}
                  activeOpacity={isConnected ? 0.6 : 1}
                  style={{ marginRight: 10, opacity: isConnected ? 1 : 0.3 }}
                >
                  <Animated.View style={[styles.micRing, {
                    borderColor: isRecording ? 'rgba(180,140,90,0.5)' : colors.border,
                    transform: [{ scale: micPulseAnim }],
                  }]}>
                    <Animated.View style={[styles.micDot, {
                      backgroundColor: isRecording ? colors.accent : '#2a2822',
                      transform: [{ scale: meteringLevelAnim }],
                    }]} />
                  </Animated.View>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, (!entry.trim() || isSaving) && styles.saveBtnDisabled]}
                disabled={!entry.trim() || isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {todayEntries.length > 0 && (
              <View style={styles.todaySection}>
                <Text style={styles.todaySectionLabel}>EARLIER TODAY</Text>
                {todayEntries.map((item) =>
                  editingId === item.id ? (
                    <View key={item.id} style={styles.historyCard}>
                      <Text style={styles.historyTime}>{item.time_label}</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editingText}
                        onChangeText={setEditingText}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity onPress={() => setEditingId(null)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => saveEdit(item.id)} disabled={isSavingEdit}>
                          <Text style={[styles.saveEditText, isSavingEdit && { opacity: 0.4 }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.historyCard}
                      onPress={() => { setEditingId(item.id); setEditingText(item.note); }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyTime}>{item.time_label}</Text>
                        <Text style={styles.editHint}>tap to edit</Text>
                      </View>
                      <Text style={styles.historyNote}>{item.note}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your entries..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent} keyboardShouldPersistTaps="handled">
            {historyLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
            ) : (() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = q
                ? history.filter(i => new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(i.note ?? ''))
                : history;
              if (filtered.length === 0) return (
                <Text style={styles.emptyText}>
                  {q ? 'No entries match that.' : 'No entries yet. Start writing.'}
                </Text>
              );
              const dateMap = new Map<string, DayNote[]>();
              for (const item of filtered) {
                if (!dateMap.has(item.date)) dateMap.set(item.date, []);
                dateMap.get(item.date)!.push(item);
              }
              return Array.from(dateMap.entries()).map(([date, items]) => (
                <View key={date} style={styles.historyGroup}>
                  <Text style={styles.historyGroupLabel}>{formatHistoryLabel(date)}</Text>
                  {items.map(item => (
                    <View key={item.id} style={styles.historyCard}>
                      <Text style={styles.historyTime}>{item.time_label}</Text>
                      <Text style={styles.historyNote} numberOfLines={4}>{item.note}</Text>
                    </View>
                  ))}
                </View>
              ));
            })()}
          </ScrollView>
        </View>
      )}
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(180,140,90,0.2)',
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    fontSize: 22,
    color: colors.accent,
    flex: 1,
  },
  streak: {
    fontSize: 11,
    color: colors.accent,
    marginRight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTabs: { flexDirection: 'row', gap: 16 },
  headerTab: { paddingVertical: 4 },
  headerTabText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },
  headerTabActive: { color: colors.accent },
  banner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    backgroundColor: 'rgba(180,140,90,0.08)',
    borderRadius: 6,
  },
  promptLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.accent,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  promptText: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 22, fontStyle: 'italic' },
  tapToRefresh: { fontSize: 10, color: 'rgba(180,140,90,0.5)', textAlign: 'right', marginTop: 8 },
  reflectionText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 21 },
  newPromptBtn: { marginTop: 10, alignSelf: 'flex-start' },
  newPromptText: { fontSize: 12, color: colors.accent, textDecorationLine: 'underline' },
  editor: {
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 17,
    color: '#fff',
    lineHeight: 28,
    minHeight: 150,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  wordCount: { flex: 1, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#000', fontWeight: '600', fontSize: 14 },
  todaySection: { marginTop: 24, paddingHorizontal: 20, paddingBottom: 20 },
  todaySectionLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  editInput: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: 8,
    minHeight: 60,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  saveEditText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  editHint: { fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.5 },
  searchBar: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchInput: { color: '#fff', fontSize: 16 },
  historyScroll: { flex: 1 },
  historyGroupLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  historyGroup: { marginBottom: 8 },
  historyContent: { padding: 20, paddingBottom: 120, gap: 16 },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(180,140,90,0.15)',
  },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  historyTime: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  historyNote: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  emptyText: { textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.3)', fontSize: 15 },
  micRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2a2822',
  },
});
