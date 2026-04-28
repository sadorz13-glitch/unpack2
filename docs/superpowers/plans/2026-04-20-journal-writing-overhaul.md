# Journal & Writing Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix calendar dot color, add today's editable entry stack below the editor, proper history grouping by date, word-boundary search, WRITE JOURNAL tied to selected day, and calendar auto-refresh on tab focus.

**Architecture:** All changes are isolated to `screens/WritingScreen.tsx`, `screens/JournalScreen.tsx`, and one prop addition in `App.tsx`. No new files. No schema changes — `day_notes` and `sessions` tables are unchanged.

**Tech Stack:** React Native, Expo, TypeScript, Supabase, react-native-gesture-handler

---

## Files Modified

- `screens/WritingScreen.tsx` — today entries stack, history grouping, search fix + resize
- `screens/JournalScreen.tsx` — dot color, WRITE JOURNAL uses selected day, calendar refresh on focus
- `App.tsx` — pass `isActive={activeTab === 3}` to JournalScreen

---

### Task 1: Fix noteDot color to bright red

**Files:**
- Modify: `screens/JournalScreen.tsx` (style `noteDot`)

- [ ] **Step 1: Change noteDot backgroundColor from `#c0614a` to `#ff3b30`**

In `screens/JournalScreen.tsx`, find the StyleSheet and replace:
```tsx
noteDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#c0614a' },
```
with:
```tsx
noteDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ff3b30' },
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```
Expected: no errors (this is a string literal change only).

- [ ] **Step 3: Commit**

```bash
git add screens/JournalScreen.tsx
git commit -m "fix: noteDot color to bright red #ff3b30"
```

---

### Task 2: WritingScreen — today entries stack below toolbar

**Files:**
- Modify: `screens/WritingScreen.tsx`

Today's entries (same calendar date) are loaded on mount and after every save. They appear below the word-count/save toolbar as scrollable cards. Tapping a card opens an inline edit mode. Saving an edit calls `updateJournalEntry` and reloads. The whole Today view becomes a ScrollView so the stack is reachable by scrolling.

- [ ] **Step 1: Add imports for `updateJournalEntry`**

At the top of `screens/WritingScreen.tsx`, the import line for journalHelpers currently reads:
```tsx
import { saveJournalEntry } from '../lib/journalHelpers';
```
Replace with:
```tsx
import { saveJournalEntry, updateJournalEntry } from '../lib/journalHelpers';
```

- [ ] **Step 2: Add state for today entries and inline editing**

After the existing `const [searchQuery, setSearchQuery] = useState('');` line, add:
```tsx
const [todayEntries, setTodayEntries] = useState<DayNote[]>([]);
const [editingId, setEditingId] = useState<string | null>(null);
const [editingText, setEditingText] = useState('');
```

- [ ] **Step 3: Add `loadTodayEntries` and `saveEdit` functions**

After the `loadHistory` function, add:
```tsx
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
  if (!editingText.trim()) return;
  await updateJournalEntry(id, editingText.trim());
  setEditingId(null);
  await loadTodayEntries();
}
```

- [ ] **Step 4: Load today entries on mount and after save**

Change the first `useEffect` from:
```tsx
React.useEffect(() => {
  fetchPrompt();
}, []);
```
to:
```tsx
React.useEffect(() => {
  fetchPrompt();
  loadTodayEntries();
}, []);
```

In `handleSave`, after `setReflectionLoading(false);` (at the end of the try/catch/finally block), the function currently ends. Change the `handleSave` function so that `loadTodayEntries()` is called right after `setEntry('')`:
```tsx
async function handleSave() {
  const text = entry.trim();
  if (!text) return;
  setIsSaving(true);
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const timeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  await saveJournalEntry(date, text, timeLabel);
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
```

- [ ] **Step 5: Replace the editor view JSX with ScrollView + today entries stack**

Find the entire `{view === 'editor' ? (` block (lines ~156–209) and replace it with:

```tsx
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
                  <TouchableOpacity onPress={() => saveEdit(item.id)}>
                    <Text style={styles.saveEditText}>Save</Text>
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
```

- [ ] **Step 6: Update editor style (remove `flex:1`, add `minHeight`) and add new styles**

In the `StyleSheet.create({...})` block, replace the `editor` style:
```tsx
editor: {
  marginHorizontal: 20,
  marginTop: 12,
  fontSize: 17,
  color: '#fff',
  lineHeight: 28,
  minHeight: 150,
},
```

Replace the `toolbar` style (remove `paddingBottom` since ScrollView handles it now):
```tsx
toolbar: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 10,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: 'rgba(255,255,255,0.08)',
},
```

Add these new styles after `saveBtnText`:
```tsx
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
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```
Expected: no new errors (pre-existing AudioMode errors are acceptable).

- [ ] **Step 8: Commit**

```bash
git add screens/WritingScreen.tsx
git commit -m "feat: today entries stack below editor with inline editing"
```

---

### Task 3: WritingScreen — history excludes today, grouped by date

**Files:**
- Modify: `screens/WritingScreen.tsx`

- [ ] **Step 1: Add `formatHistoryLabel` helper function**

After the existing `wordCount` function (around line 47), add:
```tsx
function formatHistoryLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
```

- [ ] **Step 2: Exclude today from `loadHistory`**

Replace the `loadHistory` function with:
```tsx
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
```

- [ ] **Step 3: Replace history ScrollView content with grouped rendering**

Find the history view (`{view === 'history' ? ... }` block — the `<View style={{ flex: 1 }}>` section). Replace the inner ScrollView content (the IIFE `(() => { ... })()`) with grouped rendering:

```tsx
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
    <View key={date} style={{ marginBottom: 8 }}>
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
```

- [ ] **Step 4: Add `historyGroupLabel` style**

In the StyleSheet, after `historyScroll`, add:
```tsx
historyGroupLabel: {
  fontSize: 10,
  letterSpacing: 2,
  color: colors.accent,
  textTransform: 'uppercase',
  marginBottom: 10,
  marginTop: 4,
},
```

Also update `historyMeta` — since grouped history no longer shows date (it's in the header), update the card to not need a `historyDate` label. The `historyDate` style can remain (used in today entries if needed) but `historyMeta` in the history view now only shows time which is handled by `historyTime` directly.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add screens/WritingScreen.tsx
git commit -m "feat: history grouped by date, excludes today"
```

---

### Task 4: WritingScreen — search word-boundary fix + bigger bar

**Files:**
- Modify: `screens/WritingScreen.tsx`

The current search uses `.includes()` which matches "he" inside "the", "when", "where". Switching to `\b<query>` regex means "he" only matches at the start of a word: "he", "hello", "here" match; "the", "when", "where", "she" do not.

Note: Task 3 already introduced the regex filter in the history view. This task ensures the same fix is applied consistently and the search bar is visually larger.

- [ ] **Step 1: Verify the regex is already in place from Task 3**

The history view filter from Task 3 already uses:
```tsx
new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(i.note ?? '')
```
No additional change needed for filter logic.

- [ ] **Step 2: Enlarge the search bar styles**

In the StyleSheet, replace:
```tsx
searchBar: {
  marginHorizontal: 20,
  marginTop: 12,
  marginBottom: 4,
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 9,
},
searchInput: { color: '#fff', fontSize: 14 },
```
with:
```tsx
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
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

- [ ] **Step 4: Commit**

```bash
git add screens/WritingScreen.tsx
git commit -m "fix: search word-boundary match, bigger search bar"
```

---

### Task 5: JournalScreen — WRITE JOURNAL uses selected day

**Files:**
- Modify: `screens/JournalScreen.tsx`

When no day is selected, WRITE JOURNAL is greyed/disabled. When a day is tapped, WRITE JOURNAL opens a detail view with that day's journal entries. If the selected day is today → entries are editable and you can add a new one. If past → read-only list. Swipe right → back to calendar.

- [ ] **Step 1: Add `journalViewDate` state**

After `const [detailView, setDetailView] = useState<'journal' | 'answers' | null>(null);`, add:
```tsx
const [journalViewDate, setJournalViewDate] = useState<string>(today);
const [journalViewEntries, setJournalViewEntries] = useState<any[]>([]);
const [journalViewLoading, setJournalViewLoading] = useState(false);
```

- [ ] **Step 2: Add `openJournalForDay` function**

After the `saveEntry` function, add:
```tsx
async function openJournalForDay(date: string) {
  setJournalViewDate(date);
  setJournalViewLoading(true);
  setDetailView('journal');
  const entries = await loadJournalEntries(date);
  setJournalViewEntries(entries);
  setJournalViewLoading(false);
}
```

- [ ] **Step 3: Replace the `detailView === 'journal'` render block**

Find the entire `if (detailView === 'journal') { return (...) }` block (lines ~109–143) and replace with:

```tsx
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
            <BlurCard key={i} style={{ padding: spacing.base, marginBottom: spacing.md }}>
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
```

- [ ] **Step 4: Update the WRITE JOURNAL button**

Find the WRITE JOURNAL `TouchableOpacity` (around line 235):
```tsx
<TouchableOpacity style={styles.actionBtn} onPress={() => setDetailView('journal')}>
  <Text style={styles.actionBtnText}>WRITE JOURNAL</Text>
</TouchableOpacity>
```
Replace with:
```tsx
<TouchableOpacity
  style={[styles.actionBtn, !selectedDay && styles.actionBtnDisabled]}
  onPress={() => selectedDay && openJournalForDay(selectedDay.date)}
  disabled={!selectedDay}
>
  <Text style={[styles.actionBtnText, !selectedDay && styles.actionBtnTextDisabled]}>WRITE JOURNAL</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Add disabled button styles**

In the StyleSheet, after `actionBtnText`, add:
```tsx
actionBtnDisabled: { opacity: 0.3 },
actionBtnTextDisabled: { color: colors.textGhost },
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add screens/JournalScreen.tsx
git commit -m "feat: WRITE JOURNAL uses selected day, greyed when none selected"
```

---

### Task 6: JournalScreen + App.tsx — calendar refresh on tab focus

**Files:**
- Modify: `screens/JournalScreen.tsx`
- Modify: `App.tsx`

Currently the calendar only reloads when `sessionCount` changes. This means entries made in WritingScreen don't update the dots until a session is done. Passing `isActive` and reloading on focus fixes this.

- [ ] **Step 1: Add `isActive` to JournalScreen Props**

Find the `type Props = { ... }` block and add `isActive?: boolean`:
```tsx
type Props = {
  userId: string | null;
  sessionCount: number;
  dayNote: string;
  onDayNoteChange: (note: string) => void;
  isActive?: boolean;
};
```

Update the function signature to destructure it:
```tsx
export function JournalScreen({ userId, sessionCount, dayNote, onDayNoteChange, isActive }: Props) {
```

- [ ] **Step 2: Add effect to reload on focus**

After the existing `useEffect(() => { loadMonth(calendarMonth); }, [sessionCount]);`, add:
```tsx
React.useEffect(() => {
  if (isActive) loadMonth(calendarMonth);
}, [isActive]);
```

(Add `import React` usage — it's already imported as `import React, { useState, useEffect } from 'react';` in JournalScreen so `React.useEffect` works, or use the destructured `useEffect` directly.)

- [ ] **Step 3: Pass `isActive` from App.tsx**

In `App.tsx`, find the `<JournalScreen` block (around line 1103) and add the prop:
```tsx
<JournalScreen
  userId={userId}
  sessionCount={sessionCount}
  dayNote={dayNote}
  onDayNoteChange={setDayNote}
  isActive={activeTab === 3}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add screens/JournalScreen.tsx App.tsx
git commit -m "feat: calendar refreshes on journal tab focus"
```

---

## Self-Review

**Spec coverage check:**
- ✅ noteDot bright red — Task 1
- ✅ Today entries stack below toolbar — Task 2
- ✅ Inline editing of today entries — Task 2
- ✅ History excludes today — Task 3
- ✅ History grouped by date with smart labels — Task 3
- ✅ Search word-boundary fix — Task 3 (filter) + Task 4 (style)
- ✅ Bigger search bar — Task 4
- ✅ WRITE JOURNAL greyed when no day selected — Task 5
- ✅ WRITE JOURNAL shows selected day's entries — Task 5
- ✅ Past days read-only, today editable — Task 5
- ✅ Swipe right → back (already existed, preserved) — Task 5
- ✅ Calendar refreshes on tab focus — Task 6

**Placeholder scan:** None found.

**Type consistency:**
- `DayNote` type used consistently across Tasks 2 and 3 (defined in WritingScreen)
- `journalViewEntries` typed as `any[]` matching existing `journalEntries` pattern in JournalScreen
- `openJournalForDay(date: string)` called with `selectedDay.date` (string) — consistent
