import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Keyboard, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State, type HandlerStateChangeEvent, type PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react-native';
import { BlurCard } from '../components/BlurCard';
import { Card } from '../components/ui/Card';
import { FAB } from '../components/ui/FAB';
import { IconButton } from '../components/ui/IconButton';
import { SectionDivider } from '../components/ui/SectionDivider';
import { useTheme } from '../theme';
import { spacing, SCREEN_WIDTH } from '../theme';
import { supabase, loadAllAnswers, type AnswerGroup } from '../lib/supabase';
import { loadCalendarMonth } from '../lib/calendarHelpers';
import { saveJournalEntry, loadJournalEntries, type JournalEntry } from '../lib/journalHelpers';
import { addPendingEntry } from '../lib/offlineQueue';
import { track } from '../lib/analytics';
import RevivalModal from '../components/RevivalModal';
import { purchaseRevival } from '../lib/iap';
import { recordStreakRevival } from '../lib/supabase';

// Module-level constant so StyleSheet can reference it
const cellSize = (SCREEN_WIDTH - 48) / 7;

type Props = {
  userId: string | null;
  sessionCount: number;
  dayNote: string;
  onDayNoteChange: (note: string) => void;
  isActive?: boolean;
  isConnected?: boolean;
  showAnswersTick?: number;
  onOpenWriting?: () => void;
  onStreakRevived?: () => void;
};

type CalendarSession = { id: string | null; insight: string | null; topic: string | null; hasNote?: boolean; isRevivable?: boolean };
type AnswerQA = { question: string; answer: string };
type SelectedDay = {
  date: string;
  session: CalendarSession | null;
  answers: AnswerQA[] | null;
  journalEntries: JournalEntry[] | null;
};

// Inline stub — will be wired to lib/monthlyHighlights in a later phase
const monthlyHighlights: Array<{ insight: string; attribution: string }> = [];

export function JournalScreen({ userId, sessionCount, dayNote, onDayNoteChange, isActive, isConnected = true, showAnswersTick = 0, onOpenWriting, onStreakRevived }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, typography, radius } = useTheme();
  const today = new Date().toLocaleDateString('en-CA');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSessions, setCalendarSessions] = useState<Record<string, CalendarSession>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const calendarLoadedRef = useRef(false);
  const hasAutoSelectedRef = useRef(false);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [currentEntry, setCurrentEntry] = useState('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [noteSaved, setNoteSaved] = useState(false);
  const [detailView, setDetailView] = useState<'journal' | 'answers' | null>(null);
  const [journalViewDate, setJournalViewDate] = useState<string>(today);
  const [journalViewEntries, setJournalViewEntries] = useState<JournalEntry[]>([]);
  const [journalViewLoading, setJournalViewLoading] = useState(false);
  const [allAnswers, setAllAnswers] = useState<AnswerGroup[]>([]);
  const [allAnswersLoading, setAllAnswersLoading] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<number, string>>({});
  const [revivalDate, setRevivalDate] = useState('');
  const [showRevivalModal, setShowRevivalModal] = useState(false);
  const [revivalLoading, setRevivalLoading] = useState(false);

  // Monday-first weekday labels matching buildCalendarCells offset logic
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const DAY_LABELS_FULL = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // REVIEW: verify [] is intentional — possible stale closure on loadTodayJournal
  useEffect(() => { loadTodayJournal(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadMonth(calendarMonth); }, []);
  // REVIEW: verify [sessionCount] is intentional — calendarMonth not in deps (stale closure risk)
  useEffect(() => { loadMonth(calendarMonth); }, [sessionCount]);
  useEffect(() => {
    if (isActive) loadMonth(calendarMonth);
    // REVIEW: loadMonth defined in component, not in deps — add useCallback if needed
  }, [isActive, calendarMonth]);
  useEffect(() => {
    if (!showAnswersTick) return;
    openAnswersView();
    // REVIEW: openAnswersView defined in component, not in deps
  }, [showAnswersTick]);
  useEffect(() => {
    if (hasAutoSelectedRef.current) return;
    if (!calendarLoadedRef.current) return;
    if (calendarLoading) return;
    const calendarYear = calendarMonth.getFullYear();
    const calendarMonthNum = calendarMonth.getMonth();
    const todayObj = new Date();
    if (calendarYear !== todayObj.getFullYear() || calendarMonthNum !== todayObj.getMonth()) return;
    hasAutoSelectedRef.current = true;
    void tapDay(todayObj.getDate());
  }, [calendarSessions, calendarLoading]);

  async function loadMonth(date: Date) {
    // Use a ref (not state) to avoid stale closure — state reads inside async
    // functions capture the value at closure creation time, not at call time.
    if (calendarLoadedRef.current) {
      setCalendarRefreshing(true);
    } else {
      setCalendarLoading(true);
    }
    const map = await loadCalendarMonth(date.getFullYear(), date.getMonth());
    calendarLoadedRef.current = true;
    setCalendarSessions(map);
    setCalendarLoading(false);
    setCalendarRefreshing(false);
  }

  async function loadTodayJournal() {
    const entries = await loadJournalEntries(today);
    if (entries.length > 0) {
      setJournalEntries(entries.map((e) => ({ ...e, saved: true })));
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
    if (calendarSessions[key]?.isRevivable) {
      setRevivalDate(key);
      setShowRevivalModal(true);
      return;
    }
    track('calendar_day_tapped', { date: key, hasSession: !!calendarSessions[key]?.id });
    const session = calendarSessions[key] || null;
    setSelectedDay({ date: key, session, answers: null, journalEntries: null });
    const entries = await loadJournalEntries(key);
    setSelectedDay(prev => prev ? { ...prev, journalEntries: entries } : null);
    if (session?.id) {
      const { data } = await supabase.from('answers').select('question, answer').eq('session_id', session.id).order('id', { ascending: true });
      setSelectedDay(prev => prev ? { ...prev, answers: data || [] } : null);
    } else {
      setSelectedDay(prev => prev ? { ...prev, answers: [] } : null);
    }
  }

  async function handleCalendarRevival(): Promise<void> {
    setRevivalLoading(true);
    try {
      const success = await purchaseRevival();
      if (!success) { setRevivalLoading(false); return; }
      await recordStreakRevival(revivalDate);
      setShowRevivalModal(false);
      await loadMonth(calendarMonth);
      onStreakRevived?.();
    } catch (e) {
      if ((e as { revivalNotAvailable?: boolean })?.revivalNotAvailable) {
        setShowRevivalModal(false);
        Alert.alert('Coming Soon', 'Revival purchases are not yet available. Check back soon!');
      }
    } finally {
      setRevivalLoading(false);
    }
  }

  async function saveEntry() {
    if (!currentEntry.trim()) return;
    Keyboard.dismiss();
    const timeLabel = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (!isConnected) {
      await addPendingEntry(today, currentEntry.trim(), timeLabel);
      setJournalEntries(prev => [...prev, { id: `pending-${Date.now()}`, note: currentEntry.trim(), time_label: timeLabel, saved: true }]);
      onDayNoteChange(currentEntry.trim());
      setCurrentEntry('');
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
      return;
    }
    await saveJournalEntry(today, currentEntry.trim(), timeLabel);
    const entries = await loadJournalEntries(today);
    setJournalEntries(entries.map((e) => ({ ...e, saved: true })));
    onDayNoteChange(currentEntry.trim());
    setCurrentEntry('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function openAnswersView() {
    track('answers_viewed');
    setDetailView('answers');
    setAllAnswersLoading(true);
    loadAllAnswers().then(data => { setAllAnswers(data); setAllAnswersLoading(false); });
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

  // ─── Detail view: Journal ────────────────────────────────────────────────────

  if (detailView === 'journal') {
    const isToday = journalViewDate === today;
    const displayLabel = isToday
      ? `TODAY — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()}`
      : new Date(journalViewDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    return (
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
          const x0 = (nativeEvent as typeof nativeEvent & { x0?: number }).x0 ?? 0;
          if (nativeEvent.state === State.END && x0 < 25 && nativeEvent.translationX > 60) {
            setDetailView(null);
          }
        }}
      >
        <ScrollView
          style={[detailStyles.root, { backgroundColor: colors['bg-primary'] }]}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: 100 }}
        >
          <TouchableOpacity onPress={() => setDetailView(null)} style={{ marginBottom: spacing.xl }}>
            <Text style={[typography.caption, { color: colors['text-tertiary'], letterSpacing: 2 }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[typography.labelCaps, { color: colors['text-tertiary'], marginBottom: spacing.md }]}>
            {displayLabel}
          </Text>
          {journalViewLoading ? (
            <ActivityIndicator color={colors['accent-primary']} style={{ marginTop: 40 }} />
          ) : journalViewEntries.length === 0 ? (
            <Text style={[typography.caption, { color: colors['text-tertiary'], marginTop: 20 }]}>
              No entries for this day.
            </Text>
          ) : (
            journalViewEntries.map((entry, i) => (
              <BlurCard key={entry.id ?? i} style={{ padding: spacing.md, marginBottom: spacing.md }}>
                <Text style={[typography.labelSm, { color: colors['text-tertiary'], marginBottom: spacing.xs }]}>
                  {entry.time_label}
                </Text>
                <Text style={[typography.body, { color: colors['text-primary'] }]}>{entry.note}</Text>
              </BlurCard>
            ))
          )}
          {isToday && (
            <>
              <TextInput
                style={[
                  typography.bodyLarge,
                  {
                    color: colors['text-primary'],
                    borderBottomWidth: 1,
                    borderBottomColor: colors['border-strong'],
                    paddingVertical: spacing.md,
                    minHeight: 80,
                    textAlignVertical: 'top',
                    marginTop: spacing.lg,
                  },
                ]}
                placeholder="write something..."
                placeholderTextColor={colors['text-tertiary']}
                value={currentEntry}
                onChangeText={setCurrentEntry}
                multiline
              />
              <TouchableOpacity
                style={[
                  detailStyles.saveBtn,
                  {
                    borderColor: colors['border-strong'],
                    borderRadius: radius.sm,
                    backgroundColor: noteSaved ? colors['accent-primary'] : 'transparent',
                  },
                ]}
                onPress={async () => {
                  await saveEntry();
                  const entries = await loadJournalEntries(today);
                  setJournalViewEntries(entries);
                }}
              >
                <Text
                  style={[
                    typography.buttonText,
                    { color: noteSaved ? colors['text-on-primary'] : colors['accent-primary'] },
                  ]}
                >
                  {noteSaved ? 'SAVED' : 'SAVE'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </PanGestureHandler>
    );
  }

  // ─── Detail view: Answers ────────────────────────────────────────────────────

  if (detailView === 'answers') {
    return (
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
          const x0 = (nativeEvent as typeof nativeEvent & { x0?: number }).x0 ?? 0;
          if (nativeEvent.state === State.END && x0 < 25 && nativeEvent.translationX > 60) {
            setDetailView(null);
          }
        }}
      >
        <ScrollView
          style={[detailStyles.root, { backgroundColor: colors['bg-primary'] }]}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: 100 }}
        >
          <TouchableOpacity onPress={() => setDetailView(null)} style={{ marginBottom: spacing.xl }}>
            <Text style={[typography.caption, { color: colors['text-tertiary'], letterSpacing: 2 }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[typography.labelCaps, { color: colors['text-tertiary'], marginBottom: spacing.md }]}>
            MY ANSWERS
          </Text>
          {allAnswersLoading ? (
            <ActivityIndicator color={colors['accent-primary']} />
          ) : allAnswers.map((session, si) => (
            <View key={si} style={{ marginBottom: spacing.xl }}>
              <Text style={[typography.labelSm, { color: colors['text-tertiary'], marginBottom: spacing.sm }]}>
                {session.date}{session.isToday ? ' — TODAY' : ''}
              </Text>
              {session.items.map((item, ii) => (
                <View key={ii} style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.caption, { color: colors['text-secondary'], fontStyle: 'italic', marginBottom: spacing.xs }]}>
                    {item.question}
                  </Text>
                  <Text style={[typography.body, { color: colors['text-primary'] }]}>
                    {editedAnswers[ii] ?? item.answer}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </PanGestureHandler>
    );
  }

  // ─── Entry list render helpers ───────────────────────────────────────────────

  function renderSelectedDayEntries() {
    if (!selectedDay) return null;
    if (selectedDay.answers === null || selectedDay.journalEntries === null) {
      return <ActivityIndicator color={colors['accent-primary']} style={{ marginTop: spacing.lg }} />;
    }
    if (selectedDay.answers.length === 0 && selectedDay.journalEntries.length === 0 && !selectedDay.session) {
      return (
        <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
          No entries for this day.
        </Text>
      );
    }
    return (
      <>
        {selectedDay.session?.insight ? (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.entryRow}>
              <Text style={[typography.h3, { color: colors['text-tertiary'], flex: 0, width: 60 }]}>
                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyLarge, { color: colors['text-primary'], fontWeight: '600' }]}>
                  Session Insight
                </Text>
                <Text
                  style={[typography.body, { color: colors['text-secondary'], marginTop: spacing.xs }]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {selectedDay.session.insight}
                </Text>
                <Text style={[typography.caption, { color: colors['text-tertiary'], marginTop: spacing.xs }]}>
                  Reflection
                </Text>
              </View>
            </View>
          </Card>
        ) : null}
        {selectedDay.journalEntries.map((entry, i) => (
          <Card key={entry.id ?? `journal-${i}`} style={{ marginBottom: spacing.md }}>
            <View style={styles.entryRow}>
              <Text style={[typography.h3, { color: colors['text-tertiary'], flex: 0, width: 60 }]}>
                {entry.time_label}
              </Text>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyLarge, { color: colors['text-primary'], fontWeight: '600' }]}>
                  Journal Entry
                </Text>
                <Text
                  style={[typography.body, { color: colors['text-secondary'], marginTop: spacing.xs }]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {entry.note}
                </Text>
                <Text style={[typography.caption, { color: colors['text-tertiary'], marginTop: spacing.xs }]}>
                  Reflection
                </Text>
              </View>
            </View>
          </Card>
        ))}
        {selectedDay.answers.map((a, i) => (
          <Card key={i} style={{ marginBottom: spacing.md }}>
            <View style={styles.entryRow}>
              <Text style={[typography.h3, { color: colors['text-tertiary'], flex: 0, width: 60 }]}>
                {`Q${i + 1}`}
              </Text>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyLarge, { color: colors['text-primary'], fontWeight: '600' }]}>
                  {a.question}
                </Text>
                <Text
                  style={[typography.body, { color: colors['text-secondary'], marginTop: spacing.xs }]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {a.answer}
                </Text>
                <Text style={[typography.caption, { color: colors['text-tertiary'], marginTop: spacing.xs }]}>
                  Answer
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </>
    );
  }

  function renderTodayEntries() {
    if (journalEntries.length === 0) {
      return (
        <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
          No entries yet today. Tap the pen to start writing.
        </Text>
      );
    }
    return journalEntries.map((entry, i) => (
      <Card key={entry.id ?? i} style={{ marginBottom: spacing.md }}>
        <View style={styles.entryRow}>
          <Text style={[typography.h3, { color: colors['text-tertiary'], flex: 0, width: 60 }]}>
            {entry.time_label}
          </Text>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.bodyLarge, { color: colors['text-primary'], fontWeight: '600' }]}>
              Journal Entry
            </Text>
            <Text
              style={[typography.body, { color: colors['text-secondary'], marginTop: spacing.xs }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {entry.note}
            </Text>
            <Text style={[typography.caption, { color: colors['text-tertiary'], marginTop: spacing.xs }]}>
              Reflection
            </Text>
          </View>
        </View>
      </Card>
    ));
  }

  // ─── Primary view ────────────────────────────────────────────────────────────

  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long' });
  const yearName = calendarMonth.getFullYear().toString();

  // Count entries for selected date (journal entries state covers today; for other days use session indicator)
  const selectedEntryCount = selectedDay
    ? (selectedDay.answers?.length ?? 0)
      + (selectedDay.journalEntries?.length ?? 0)
      + (selectedDay.session?.insight ? 1 : 0)
    : journalEntries.length;

  const selectedDateLabel = selectedDay
    ? new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.root, { backgroundColor: colors['bg-primary'] }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>

        {/* Month header */}
        <View style={styles.monthHeader}>
          <View style={styles.monthTitleBlock}>
            <Text style={[typography.h1, { color: colors['text-primary'] }]}>
              {monthName} {yearName}
            </Text>
            <Text style={[typography.labelCaps, { color: colors['text-tertiary'], marginTop: spacing.xs }]}>
              ARCHIVED MEMORIES
            </Text>
          </View>
          <View style={styles.monthNavRow}>
            <IconButton
              icon={ChevronLeft}
              onPress={() => goMonth(-1)}
              accessibilityLabel="Previous month"
            />
            <IconButton
              icon={ChevronRight}
              onPress={() => goMonth(1)}
              accessibilityLabel="Next month"
            />
          </View>
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarWrapper}>
          {/* Weekday labels */}
          <View style={styles.weekLabelRow}>
            {DAY_LABELS_FULL.map((label, i) => (
              <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
                <Text style={[typography.labelSm, { color: colors['text-tertiary'] }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Day cells */}
          {calendarLoading ? (
            <ActivityIndicator color={colors['accent-primary']} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', opacity: calendarRefreshing ? 0.6 : 1 }}>
              {buildCalendarCells().map((d, i) => {
                if (!d) return <View key={`b${i}`} style={{ width: cellSize, height: cellSize }} />;
                const key = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d).toLocaleDateString('en-CA');
                const hasSession = !!calendarSessions[key]?.id;
                const hasNote = !!calendarSessions[key]?.hasNote;
                const isToday = key === today;
                const isSelected = selectedDay?.date === key;
                const hasActivity = hasSession || hasNote;
                const isRevivable = !!calendarSessions[key]?.isRevivable;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => tapDay(d)}
                    accessibilityLabel={`Day ${d}`}
                    style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={[
                      styles.dayCell,
                      isSelected && {
                        backgroundColor: colors['accent-primary'],
                        borderRadius: radius.full,
                      },
                      isToday && !isSelected && {
                        borderWidth: 1,
                        borderColor: colors['accent-primary'],
                        borderRadius: radius.sm,
                      },
                      isRevivable && !isSelected && {
                        borderWidth: 1,
                        borderColor: colors['accent-gold'],
                        borderStyle: 'dashed' as const,
                        borderRadius: radius.sm,
                      },
                    ]}>
                      <Text style={[
                        typography.body,
                        { color: isSelected ? colors['text-on-primary'] : colors['text-primary'] },
                        hasActivity && !isSelected && { fontWeight: '600' },
                      ]}>
                        {d}
                      </Text>
                      {hasActivity && (
                        <View style={[
                          styles.entryDot,
                          { backgroundColor: isSelected ? colors['text-on-primary'] : colors['accent-primary'] },
                        ]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Monthly Highlights section */}
        <SectionDivider label="MONTHLY HIGHLIGHTS" style={{ marginTop: spacing.xl }} />
        {monthlyHighlights.length === 0 ? null : (
          monthlyHighlights.map((item, idx) => (
            <Card key={idx} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors['text-primary'], marginBottom: spacing.xs }]}>
                &ldquo;{item.insight}&rdquo;
              </Text>
              <Text style={[typography.caption, { color: colors['text-tertiary'] }]}>
                {item.attribution}
              </Text>
            </Card>
          ))
        )}

        {/* Selected Reflections section */}
        <SectionDivider style={{ marginTop: spacing.xl }} />
        <View style={styles.reflectionsHeader}>
          <Text style={[typography.display, { color: colors['text-primary'], fontStyle: 'italic' }]}>
            {selectedEntryCount}
          </Text>
          <View style={styles.reflectionsHeaderText}>
            <Text style={[typography.h2, { color: colors['text-primary'] }]}>
              Selected Reflections
            </Text>
            <Text style={[typography.caption, { color: colors['text-tertiary'], marginTop: spacing.xs }]}>
              {selectedDateLabel}
            </Text>
          </View>
        </View>

        {/* Entry list */}
        <View style={{ marginTop: spacing.lg }}>
          {selectedDay ? renderSelectedDayEntries() : renderTodayEntries()}
        </View>

      </ScrollView>

      {/* FAB */}
      <FAB
        icon={PenLine}
        onPress={() => { if (onOpenWriting) { onOpenWriting(); } else { openJournalForDay(today); } }}
        accessibilityLabel="Write a new journal entry"
        style={{
          position: 'absolute',
          bottom: spacing.lg + insets.bottom,
          right: 20,
        }}
      />

      <RevivalModal
        visible={showRevivalModal}
        onClose={() => setShowRevivalModal(false)}
        onConfirm={handleCalendarRevival}
        date={revivalDate}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing['margin-screen'],
    paddingBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing['margin-screen'],
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  monthTitleBlock: {
    flex: 1,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarWrapper: {
    marginBottom: spacing.xs,
  },
  weekLabelRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayCell: {
    width: cellSize - 6,
    height: cellSize - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  reflectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  reflectionsHeaderText: {
    flex: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

const detailStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  saveBtn: {
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
