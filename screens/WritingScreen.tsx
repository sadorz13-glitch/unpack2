import React, { useState, useRef, type Dispatch, type SetStateAction } from 'react';
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
import { X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { IconButton } from '../components/ui/IconButton';
import { saveJournalEntry, updateJournalEntry } from '../lib/journalHelpers';
import { addPendingEntry } from '../lib/offlineQueue';
import { track } from '../lib/analytics';
import { generateJournalPrompt, generateJournalReflection } from '../lib/journalAi';
import { requestMicPermission } from '../lib/micPermission';
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
  isActive: boolean;
  isConnected?: boolean;
  journalRefreshTick?: number;
  isRecording?: boolean;
  micPulseAnim?: Animated.Value;
  meteringLevelAnim?: Animated.Value;
  onStartVoiceRecording?: (setterFn: Dispatch<SetStateAction<string>>) => void;
  onStopVoiceRecording?: (setterFn: Dispatch<SetStateAction<string>>) => void;
  writingVoiceModeRef?: React.MutableRefObject<boolean>;
  fontsLoaded?: boolean;
  onClose?: () => void;
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
  userId, horoscopeContext, insight, topic, isActive,
  isConnected = true, journalRefreshTick,
  isRecording, micPulseAnim, meteringLevelAnim,
  onStartVoiceRecording, onStopVoiceRecording, writingVoiceModeRef,
  fontsLoaded = true,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [view, setView] = useState<'editor' | 'history'>('editor');

  const [entry, setEntry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(true);

  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);

  const [history, setHistory] = useState<DayNote[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayEntries, setTodayEntries] = useState<DayNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // REVIEW: verify [] is intentional — possible stale closure on fetchPrompt/loadTodayEntries
  React.useEffect(() => {
    fetchPrompt();
    loadTodayEntries();
  }, []);

  React.useEffect(() => {
    if (isActive) {
      loadTodayEntries();
      fetchPrompt();
    } else {
      if (writingVoiceModeRef) writingVoiceModeRef.current = false;
      if (isRecording && onStopVoiceRecording) onStopVoiceRecording(setEntry);
      setView('editor'); setSearchQuery(''); setEditingId(null); setEditingText('');
    }
    // REVIEW: isRecording, onStopVoiceRecording not in deps — stale closure risk in else branch
  }, [isActive]);

  React.useEffect(() => {
    if (journalRefreshTick && journalRefreshTick > 0) loadTodayEntries();
    // REVIEW: loadTodayEntries defined in component, not in deps
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
    Keyboard.dismiss();
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

  function renderBanner() {
    const bannerStyle = [styles.banner, { borderLeftColor: colors['accent-gold'], backgroundColor: colors['bg-surface'] }];
    if (promptLoading || reflectionLoading) {
      return (
        <View style={bannerStyle}>
          <ActivityIndicator color={colors['accent-gold']} size="small" />
        </View>
      );
    }
    if (reflection) {
      return (
        <View style={bannerStyle}>
          <Text style={[styles.reflectionText, { color: colors['text-secondary'] }]}>{reflection}</Text>
          <TouchableOpacity onPress={fetchPrompt} style={styles.newPromptBtn}>
            <Text style={[styles.newPromptText, { color: colors['accent-gold'] }]}>Write more</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (prompt) {
      return (
        <TouchableOpacity style={bannerStyle} onPress={fetchPrompt} activeOpacity={0.7}>
          <Text style={[styles.promptLabel, { color: colors['accent-gold'] }]}>PROMPT</Text>
          <Text style={[styles.promptText, { color: colors['text-secondary'] }]}>{prompt}</Text>
          <Text style={[styles.tapToRefresh, { color: colors['text-tertiary'] }]}>tap to refresh</Text>
        </TouchableOpacity>
      );
    }
    return null;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={[styles.container, { backgroundColor: colors['bg-primary'], paddingTop: insets.top }]}>

      {/* Header row — contains optional close button, title, streak, and tabs */}
      <View style={[styles.header, { borderBottomColor: colors['border-subtle'] }]}>
        {onClose ? (
          <IconButton
            icon={X}
            onPress={onClose}
            accessibilityLabel="Close"
            color={colors['text-tertiary']}
            style={styles.closeBtn}
          />
        ) : (
          <View style={styles.closeBtn} />
        )}
        <Text style={[styles.headerTitle, { color: colors['accent-gold'] }]}>Write</Text>
        <View style={styles.headerTabs}>
          <TouchableOpacity onPress={() => switchView('editor')} style={styles.headerTab}>
            <Text style={[
              styles.headerTabText,
              { color: colors['text-tertiary'] },
              view === 'editor' && { color: colors['accent-gold'] },
            ]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchView('history')} style={styles.headerTab}>
            <Text style={[
              styles.headerTabText,
              { color: colors['text-tertiary'] },
              view === 'history' && { color: colors['accent-gold'] },
            ]}>
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
            {renderBanner()}

            {fontsLoaded && (
              <TextInput
                ref={inputRef}
                style={[styles.editor, { color: colors['text-primary'] }]}
                multiline
                placeholder="Start writing..."
                placeholderTextColor={colors['text-tertiary']}
                value={entry}
                onChangeText={setEntry}
                autoCorrect
                textAlignVertical="top"
                scrollEnabled={false}
              />
            )}

            <View style={[styles.toolbar, { borderTopColor: colors['border-subtle'] }]}>
              <Text style={[styles.wordCount, { color: colors['text-tertiary'] }]}>{wc} {wc === 1 ? 'word' : 'words'}</Text>

              {onStartVoiceRecording && micPulseAnim && meteringLevelAnim ? (
                <TouchableOpacity
                  onPress={async () => {
                    if (!isConnected || !writingVoiceModeRef || !onStartVoiceRecording || !onStopVoiceRecording) return;
                    if (isRecording) {
                      writingVoiceModeRef.current = false;
                      onStopVoiceRecording(setEntry);
                    } else {
                      const granted = await requestMicPermission();
                      if (granted) {
                        writingVoiceModeRef.current = true;
                        onStartVoiceRecording(setEntry);
                      }
                    }
                  }}
                  activeOpacity={isConnected ? 0.6 : 1}
                  style={{ marginRight: 10, opacity: isConnected ? 1 : 0.3 }}
                >
                  <Animated.View style={[styles.micRing, {
                    borderColor: isRecording ? colors['accent-gold'] : colors['border-strong'],
                    transform: [{ scale: micPulseAnim }],
                  }]}>
                    <Animated.View style={[styles.micDot, {
                      backgroundColor: isRecording ? colors['accent-gold'] : colors['bg-surface'],
                      transform: [{ scale: meteringLevelAnim }],
                    }]} />
                  </Animated.View>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: colors['accent-gold'] }, (!entry.trim() || isSaving) && styles.saveBtnDisabled]}
                disabled={!entry.trim() || isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors['bg-primary']} size="small" />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors['bg-primary'] }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {todayEntries.length > 0 && (
              <View style={styles.todaySection}>
                <Text style={[styles.todaySectionLabel, { color: colors['text-tertiary'] }]}>EARLIER TODAY</Text>
                {todayEntries.map((item) =>
                  editingId === item.id ? (
                    <View key={item.id} style={[styles.historyCard, { backgroundColor: colors['bg-surface'], borderColor: colors['border-subtle'] }]}>
                      <Text style={[styles.historyTime, { color: colors['text-tertiary'] }]}>{item.time_label}</Text>
                      <TextInput
                        style={[styles.editInput, { color: colors['text-primary'], borderBottomColor: colors['border-subtle'] }]}
                        value={editingText}
                        onChangeText={setEditingText}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity onPress={() => setEditingId(null)}>
                          <Text style={[styles.cancelText, { color: colors['text-tertiary'] }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => saveEdit(item.id)} disabled={isSavingEdit}>
                          <Text style={[styles.saveEditText, { color: colors['accent-gold'] }, isSavingEdit && { opacity: 0.4 }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.historyCard, { backgroundColor: colors['bg-surface'], borderColor: colors['border-subtle'] }]}
                      onPress={() => { setEditingId(item.id); setEditingText(item.note); }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.historyMeta}>
                        <Text style={[styles.historyTime, { color: colors['text-tertiary'] }]}>{item.time_label}</Text>
                        <Text style={[styles.editHint, { color: colors['text-tertiary'] }]}>tap to edit</Text>
                      </View>
                      <Text style={[styles.historyNote, { color: colors['text-secondary'] }]}>{item.note}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBar, { backgroundColor: colors['bg-surface'] }]}>
            <TextInput
              style={[styles.searchInput, { color: colors['text-primary'] }]}
              placeholder="Search your entries..."
              placeholderTextColor={colors['text-tertiary']}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent} keyboardShouldPersistTaps="handled">
            {historyLoading ? (
              <ActivityIndicator color={colors['accent-gold']} style={{ marginTop: 40 }} />
            ) : (() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = q
                ? history.filter(i => new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(i.note ?? ''))
                : history;
              if (filtered.length === 0) return (
                <Text style={[styles.emptyText, { color: colors['text-tertiary'] }]}>
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
                  <Text style={[styles.historyGroupLabel, { color: colors['accent-gold'] }]}>{formatHistoryLabel(date)}</Text>
                  {items.map(item => (
                    <View key={item.id} style={[styles.historyCard, { backgroundColor: colors['bg-surface'], borderColor: colors['border-subtle'] }]}>
                      <Text style={[styles.historyTime, { color: colors['text-tertiary'] }]}>{item.time_label}</Text>
                      <Text style={[styles.historyNote, { color: colors['text-secondary'] }]} numberOfLines={4}>{item.note}</Text>
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
  container: { flex: 1 },
  closeBtn: {
    width: 44,
    height: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    fontSize: 22,
    flex: 1,
  },
  headerTabs: { flexDirection: 'row', gap: 16 },
  headerTab: { paddingVertical: 4, paddingHorizontal: 4 },
  headerTabText: { fontSize: 13, letterSpacing: 0.5 },
  banner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderLeftWidth: 2,
    borderRadius: 6,
  },
  promptLabel: {
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  promptText: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  tapToRefresh: { fontSize: 10, textAlign: 'right', marginTop: 8 },
  reflectionText: { fontSize: 14, lineHeight: 21 },
  newPromptBtn: { marginTop: 10, alignSelf: 'flex-start' },
  newPromptText: { fontSize: 12, textDecorationLine: 'underline' },
  editor: {
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 17,
    lineHeight: Platform.OS === 'ios' ? 22 : 28,
    minHeight: 150,
    paddingTop: 0,
    paddingBottom: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  wordCount: { flex: 1, textAlign: 'center', fontSize: 12 },
  saveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { fontWeight: '600', fontSize: 14 },
  todaySection: { marginTop: 24, paddingHorizontal: 20, paddingBottom: 20 },
  todaySectionLabel: {
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  editInput: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    minHeight: 60,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },
  cancelText: { fontSize: 13 },
  saveEditText: { fontSize: 13, fontWeight: '600' },
  editHint: { fontSize: 10, letterSpacing: 0.5 },
  searchBar: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchInput: { fontSize: 16 },
  historyScroll: { flex: 1 },
  historyGroupLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  historyGroup: { marginBottom: 8 },
  historyContent: { padding: 20, paddingBottom: 120, gap: 16 },
  historyCard: {
    borderRadius: 10,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  historyTime: { fontSize: 11 },
  historyNote: { fontSize: 14, lineHeight: 22 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  micRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
