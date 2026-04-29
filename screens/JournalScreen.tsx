// screens/JournalScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies, SCREEN_WIDTH } from '../theme';
import { supabase, loadAllAnswers } from '../lib/supabase';
import { loadDayNote, loadCalendarMonth } from '../lib/calendarHelpers';
import { saveJournalEntry, loadJournalEntries } from '../lib/journalHelpers';
import { track } from '../lib/analytics';

// Module-level constant so StyleSheet can reference it
const cellSize = (SCREEN_WIDTH - 48) / 7;

type Props = {
  userId: string | null;
  sessionCount: number;
  dayNote: string;
  onDayNoteChange: (note: string) => void;
  isActive?: boolean;
};

type CalendarSession = { id: string; insight: string; topic: string; hasNote?: boolean };
type SelectedDay = { date: string; session: CalendarSession | null; answers: any[] | null; dayNote: string };

export function JournalScreen({ userId, sessionCount, dayNote, onDayNoteChange, isActive }: Props) {
  const insets = useSafeAreaInsets();
  const today = new Date().toLocaleDateString('en-CA');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSessions, setCalendarSessions] = useState<Record<string, CalendarSession>>({});
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [currentEntry, setCurrentEntry] = useState('');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [noteSaved, setNoteSaved] = useState(false);
  const [detailView, setDetailView] = useState<'journal' | 'answers' | null>(null);
  const [journalViewDate, setJournalViewDate] = useState<string>(today);
  const [journalViewEntries, setJournalViewEntries] = useState<any[]>([]);
  const [journalViewLoading, setJournalViewLoading] = useState(false);
  const [allAnswers, setAllAnswers] = useState<any[]>([]);
  const [allAnswersLoading, setAllAnswersLoading] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<number, string>>({});

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => { loadTodayJournal(); }, []);
  useEffect(() => { loadMonth(calendarMonth); }, [sessionCount]);
  useEffect(() => {
    if (isActive) loadMonth(calendarMonth);
  }, [isActive, calendarMonth]);


  async function loadMonth(date: Date) {
    setCalendarLoading(true);
    const map = await loadCalendarMonth(date.getFullYear(), date.getMonth());
    setCalendarSessions(map as any);
    setCalendarLoading(false);
  }

  async function loadTodayJournal() {
    const entries = await loadJournalEntries(today);
    if (entries.length > 0) {
      setJournalEntries(entries.map((e: any) => ({ ...e, saved: true })));
      onDayNoteChange(entries[entries.length - 1].note);
    }
  }

  async function goMonth(dir: number) {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + dir, 1);
    setCalendarMonth(next);
    setSelectedDay(null);
    await loadMonth(next);
  }

  async function tapDay(d: number) {
    const key = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d).toLocaleDateString('en-CA');
    track('calendar_day_tapped', { date: key, hasSession: !!calendarSessions[key]?.id });
    const session = calendarSessions[key] || null;
    const note = await loadDayNote(key);
    setSelectedDay({ date: key, session, answers: null, dayNote: note || '' });
    if (session?.id) {
      const { data } = await supabase.from('answers').select('question, answer').eq('session_id', session.id).order('id', { ascending: true });
      setSelectedDay(prev => prev ? { ...prev, answers: data || [] } : null);
    } else {
      setSelectedDay(prev => prev ? { ...prev, answers: [] } : null);
    }
  }

  async function saveEntry() {
    if (!currentEntry.trim()) return;
    const timeLabel = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    await saveJournalEntry(today, currentEntry.trim(), timeLabel);
    const entries = await loadJournalEntries(today);
    setJournalEntries(entries.map((e: any) => ({ ...e, saved: true })));
    onDayNoteChange(currentEntry.trim());
    setCurrentEntry('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function openJournalForDay(date: string) {
    setJournalViewDate(date);
    setJournalViewEntries([]);
    setJournalViewLoading(true);
    setDetailView('journal');
    const entries = await loadJournalEntries(date);
    setJournalViewEntries(entries);
    setJournalViewLoading(false);
  }

  function buildCalendarCells() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    const leading = (firstDow + 6) % 7;
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  const monthLabel = calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();

  if (detailView === 'journal') {
    const isToday = journalViewDate === today;
    const displayLabel = isToday
      ? `TODAY — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()}`
      : new Date(journalViewDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    return (
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }: any) => {
          if (nativeEvent.state === State.END && nativeEvent.x0 < 25 && nativeEvent.translationX > 60) {
            setDetailView(null);
          }
        }}
      >
        <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl }}>
          <TouchableOpacity onPress={() => setDetailView(null)} style={{ marginBottom: spacing.xl }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.sectionLabel}>{displayLabel}</Text>
          {journalViewLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : journalViewEntries.length === 0 ? (
            <Text style={[styles.entryTime, { marginTop: 20 }]}>No entries for this day.</Text>
          ) : (
            journalViewEntries.map((entry: any, i: number) => (
              <BlurCard key={entry.id ?? i} style={{ padding: spacing.base, marginBottom: spacing.md }}>
                <Text style={styles.entryTime}>{entry.time_label}</Text>
                <Text style={styles.entryText}>{entry.note}</Text>
              </BlurCard>
            ))
          )}
          {isToday && (
            <>
              <TextInput
                style={styles.journalInput}
                placeholder="write something..."
                placeholderTextColor={colors.textGhost}
                value={currentEntry}
                onChangeText={setCurrentEntry}
                multiline
              />
              <TouchableOpacity style={styles.saveBtn} onPress={async () => {
                await saveEntry();
                const entries = await loadJournalEntries(today);
                setJournalViewEntries(entries);
              }}>
                <Text style={styles.saveBtnText}>{noteSaved ? 'SAVED ✓' : 'SAVE'}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </PanGestureHandler>
    );
  }

  if (detailView === 'answers') {
    return (
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }: any) => {
          if (nativeEvent.state === State.END && nativeEvent.x0 < 25 && nativeEvent.translationX > 60) {
            setDetailView(null);
          }
        }}
      >
        <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl }}>
          <TouchableOpacity onPress={() => setDetailView(null)} style={{ marginBottom: spacing.xl }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.sectionLabel}>MY ANSWERS</Text>
          {allAnswersLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : allAnswers.map((session: any, si: number) => (
            <View key={si} style={{ marginBottom: spacing.xl }}>
              <Text style={styles.entryTime}>{session.date}{session.isToday ? ' — TODAY' : ''}</Text>
              {session.items.map((item: any, ii: number) => (
                <View key={ii} style={{ marginBottom: spacing.base }}>
                  <Text style={styles.answerQuestion}>{item.question}</Text>
                  <Text style={styles.answerText}>{editedAnswers[item.index] ?? item.answer}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </PanGestureHandler>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Tab title */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.base, paddingBottom: spacing.sm }}>
        <Text style={styles.tabTitle}>Look Back</Text>
      </View>

      {/* Header */}
      <View style={[styles.calHeader, { paddingTop: spacing.base }]}>
        <TouchableOpacity onPress={() => goMonth(-1)} style={styles.monthNav}>
          <Text style={styles.monthNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => goMonth(1)} style={styles.monthNav}>
          <Text style={styles.monthNavText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {/* Day labels */}
        <View style={styles.dayLabelRow}>
          {DAY_LABELS.map((l, i) => (
            <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
              <Text style={styles.dayLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {calendarLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {buildCalendarCells().map((d, i) => {
              if (!d) return <View key={`b${i}`} style={{ width: cellSize, height: cellSize }} />;
              const key = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d).toLocaleDateString('en-CA');
              const hasSession = !!calendarSessions[key]?.id;
              const hasNote = !!calendarSessions[key]?.hasNote;
              const isToday = key === today;
              const isSelected = selectedDay?.date === key;
              const isActive = hasSession || hasNote;
              return (
                <TouchableOpacity key={key} onPress={() => tapDay(d)} style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={[styles.dayCell, isSelected && styles.dayCellSelected]}>
                    <Text style={[styles.dayNum, isActive && styles.dayNumActive, isToday && !isActive && styles.dayNumToday]}>{d}</Text>
                    {isActive && (
                      <View style={styles.dotsRow}>
                        {hasSession && hasNote
                          ? <View style={styles.bothDot} />
                          : hasSession
                            ? <View style={styles.sessionDot} />
                            : <View style={styles.noteDot} />}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          <TouchableOpacity
            style={[styles.actionBtn, !selectedDay && styles.actionBtnDisabled]}
            onPress={() => openJournalForDay(selectedDay!.date)}
            disabled={!selectedDay}
          >
            <Text style={[styles.actionBtnText, !selectedDay && styles.actionBtnTextDisabled]}>WRITE JOURNAL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            track('answers_viewed');
            setDetailView('answers');
            setAllAnswersLoading(true);
            loadAllAnswers().then(data => { setAllAnswers(data); setAllAnswersLoading(false); });
          }}>
            <Text style={styles.actionBtnText}>MY ANSWERS</Text>
          </TouchableOpacity>
        </View>

        {/* Selected day detail */}
        {selectedDay && (
          <View style={{ marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg }}>
            <Text style={styles.sectionLabel}>
              {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </Text>
            {!selectedDay.session ? (
              <Text style={styles.entryTime}>No session this day.</Text>
            ) : selectedDay.answers === null ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                {selectedDay.session.insight ? (
                  <Text style={styles.insightPreview}>{selectedDay.session.insight}</Text>
                ) : null}
                {selectedDay.answers.map((a: any, i: number) => (
                  <View key={i} style={{ marginBottom: spacing.base }}>
                    <Text style={styles.answerQuestion}>{a.question}</Text>
                    <Text style={styles.answerText}>{a.answer}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabTitle: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 22,
    color: colors.accent,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  monthNav: { padding: spacing.sm },
  monthNavText: { color: colors.accent, fontSize: 22 },
  monthLabel: { color: colors.textPrimary, fontSize: 11, letterSpacing: 4 },
  dayLabelRow: { flexDirection: 'row', marginVertical: spacing.sm },
  dayLabel: { color: colors.textGhost, fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  dayCell: { width: cellSize - 6, height: cellSize - 6, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  dayCellSelected: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.5)', backgroundColor: 'rgba(180,140,90,0.08)' },
  dayNum: { color: '#2a2822', fontSize: 13 },
  dayNumActive: { color: colors.textPrimary, fontWeight: '600' },
  dayNumToday: { color: colors.textGhost },
  sessionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4a90d9' },
  noteDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ff3b30' },
  bothDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 2 },
  sectionLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 4, marginBottom: spacing.base },
  entryTime: { color: colors.textGhost, fontSize: 9, letterSpacing: 2, marginBottom: spacing.sm },
  entryText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  journalInput: { color: colors.textPrimary, fontSize: 14, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.3)', borderRadius: 2, paddingVertical: spacing.base, alignItems: 'center', marginTop: spacing.base },
  saveBtnText: { color: colors.accent, fontSize: 11, letterSpacing: 4 },
  backText: { color: colors.textMuted, fontSize: 14, letterSpacing: 2 },
  answerQuestion: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginBottom: spacing.sm },
  answerText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  insightPreview: { fontFamily: fontFamilies.serifItalic, color: colors.accent, fontSize: 15, lineHeight: 24, marginBottom: spacing.lg },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(180,140,90,0.25)', borderRadius: 2, paddingVertical: spacing.md, alignItems: 'center' },
  actionBtnText: { color: colors.textMuted, fontSize: 9, letterSpacing: 3 },
  actionBtnDisabled: { opacity: 0.3 },
  actionBtnTextDisabled: { color: colors.textGhost },
});
