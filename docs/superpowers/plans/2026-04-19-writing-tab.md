# Writing Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th tab ("Write") — a dedicated, distraction-free journaling editor with AI writing prompts, post-save reflection, voice-to-text, and a scrollable history view.

**Architecture:** New `WritingScreen.tsx` receives `insight`, `topic`, `horoscopeContext`, and `streakDays` from App.tsx, displays them via two new Claude calls in `lib/journalAi.ts`. Saves to the existing `day_notes` Supabase table via `lib/journalHelpers.ts`. BottomTabBar expands from 4 to 5 tabs.

**Tech Stack:** React Native, Expo, @react-native-voice/voice (already installed), Anthropic Claude API (fetch pattern matching lib/api.ts), Supabase day_notes table.

---

### Task 1: Create lib/journalAi.ts

**Files:**
- Create: `lib/journalAi.ts`

- [ ] **Step 1: Create the file with both Claude API functions**

```typescript
import { ANTHROPIC_KEY } from '../constants';

export async function generateJournalPrompt(
  insight: string,
  topic: string,
  horoscopeContext: string
): Promise<string> {
  const context = insight
    ? `The person's latest session insight: "${insight}". Session topic: "${topic}".`
    : 'No recent session data available.';
  const prompt =
    horoscopeContext +
    '\n\n' +
    context +
    '\n\nWrite ONE journaling prompt for this person. It should invite honest reflection — specific, slightly uncomfortable, personal. No preamble. Max 20 words. Just the question.';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? '';
}

export async function generateJournalReflection(
  entry: string,
  horoscopeContext: string
): Promise<string> {
  const prompt =
    horoscopeContext +
    '\n\nYou are a sharp, warm therapist. Someone just wrote this journal entry:\n\n"' +
    entry +
    '"\n\nWrite ONE observation about what they wrote. Be direct, specific, a little confrontational — not fluffy. Max 30 words. No preamble.';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? '';
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls /c/Users/sador/unpack2/lib/journalAi.ts`
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git -c user.email="dev@unpack2.app" -c user.name="unpack2" add lib/journalAi.ts
git -c user.email="dev@unpack2.app" -c user.name="unpack2" commit -m "feat: add journalAi helpers for writing prompt and reflection"
```

---

### Task 2: Expand BottomTabBar to 5 tabs

**Files:**
- Modify: `components/BottomTabBar.tsx`

- [ ] **Step 1: Add TabId 4 and PenIcon**

In `components/BottomTabBar.tsx`, change line 7:
```typescript
// OLD
export type TabId = 0 | 1 | 2 | 3;
// NEW
export type TabId = 0 | 1 | 2 | 3 | 4;
```

- [ ] **Step 2: Add PenIcon SVG function after JournalIcon**

Add this function before the `const ICONS` line:
```typescript
function PenIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 3: Add PenIcon to ICONS array**

Change the ICONS line:
```typescript
// OLD
const ICONS = [HomeIcon, SessionIcon, TalkIcon, JournalIcon];
// NEW
const ICONS = [HomeIcon, SessionIcon, TalkIcon, JournalIcon, PenIcon];
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors (or only pre-existing errors unrelated to BottomTabBar).

- [ ] **Step 5: Commit**

```bash
git -c user.email="dev@unpack2.app" -c user.name="unpack2" add components/BottomTabBar.tsx
git -c user.email="dev@unpack2.app" -c user.name="unpack2" commit -m "feat: expand BottomTabBar to 5 tabs, add PenIcon for Writing tab"
```

---

### Task 3: Create screens/WritingScreen.tsx

**Files:**
- Create: `screens/WritingScreen.tsx`

The screen has two views toggled by a header button:
- **Editor view** — prompt banner, full-screen TextInput, word count, mic button, save button
- **History view** — ScrollView of all past day_notes grouped by date

- [ ] **Step 1: Create WritingScreen.tsx**

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Voice from '@react-native-voice/voice';
import { colors } from '../theme';
import { saveJournalEntry, loadJournalEntries } from '../lib/journalHelpers';
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
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export function WritingScreen({ userId, horoscopeContext, insight, topic, streakDays }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [view, setView] = useState<'editor' | 'history'>('editor');

  // Editor state
  const [entry, setEntry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI prompt
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  // AI reflection (shown after save)
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);

  // Voice
  const [isListening, setIsListening] = useState(false);

  // History
  const [history, setHistory] = useState<DayNote[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load prompt on mount
  useEffect(() => {
    fetchPrompt();
    return () => { Voice.destroy().then(Voice.removeAllListeners); };
  }, []);

  // Wire voice handlers
  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0] ?? '';
      if (text) setEntry(prev => prev ? prev + ' ' + text : text);
      setIsListening(false);
    };
    Voice.onSpeechError = () => setIsListening(false);
    return () => { Voice.removeAllListeners(); };
  }, []);

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
    setIsSaving(true);
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const timeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    await saveJournalEntry(date, text, timeLabel);
    setIsSaving(false);

    // Show reflection
    setReflectionLoading(true);
    setEntry('');
    try {
      const r = await generateJournalReflection(text, horoscopeContext);
      setReflection(r);
    } catch {
      setReflection(null);
    } finally {
      setReflectionLoading(false);
    }
  }

  async function handleMic() {
    if (isListening) {
      await Voice.stop();
      setIsListening(false);
    } else {
      try {
        await Voice.start('en-US');
        setIsListening(true);
      } catch {
        Alert.alert('Microphone unavailable');
      }
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('day_notes')
        .select('id, note, time_label, created_at, date')
        .eq('user_id', getUserId())
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory(data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function switchView(next: 'editor' | 'history') {
    setView(next);
    if (next === 'history') loadHistory();
  }

  const wc = wordCount(entry);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
          {/* AI Prompt or Reflection banner */}
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
            </TouchableOpacity>
          ) : null}

          {/* Editor */}
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
            scrollEnabled
          />

          {/* Bottom toolbar */}
          <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom + 80, 100) }]}>
            <TouchableOpacity onPress={handleMic} style={styles.micBtn} activeOpacity={0.7}>
              <Text style={[styles.micIcon, isListening && styles.micIconActive]}>
                {isListening ? '⏹' : '🎤'}
              </Text>
            </TouchableOpacity>
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
        </KeyboardAvoidingView>
      ) : (
        /* History view */
        <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent}>
          {historyLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Start writing.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                  <Text style={styles.historyTime}>{item.time_label}</Text>
                </View>
                <Text style={styles.historyNote} numberOfLines={4}>{item.note}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
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
  reflectionText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 21 },
  newPromptBtn: { marginTop: 10, alignSelf: 'flex-start' },
  newPromptText: { fontSize: 12, color: colors.accent, textDecorationLine: 'underline' },
  editor: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 17,
    color: '#fff',
    lineHeight: 28,
    fontFamily: undefined,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  micBtn: { padding: 6 },
  micIcon: { fontSize: 22 },
  micIconActive: { opacity: 0.5 },
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
  historyScroll: { flex: 1 },
  historyContent: { padding: 20, paddingBottom: 120, gap: 16 },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(180,140,90,0.15)',
  },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  historyDate: { fontSize: 12, color: colors.accent, letterSpacing: 0.3 },
  historyTime: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  historyNote: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  emptyText: { textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.3)', fontSize: 15 },
});
```

- [ ] **Step 2: Verify file exists**

Run: `ls /c/Users/sador/unpack2/screens/WritingScreen.tsx`
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git -c user.email="dev@unpack2.app" -c user.name="unpack2" add screens/WritingScreen.tsx
git -c user.email="dev@unpack2.app" -c user.name="unpack2" commit -m "feat: add WritingScreen — editor, AI prompt, reflection, voice, history"
```

---

### Task 4: Wire WritingScreen into App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add WritingScreen import**

After line 31 (`import { JournalScreen }...`), add:
```typescript
import { WritingScreen } from './screens/WritingScreen';
```

- [ ] **Step 2: Add Tab 4 View inside PagerView**

Find the closing `</View>` of Tab 3 (Journal) and add after it, before `</PagerView>`:
```typescript
{/* Tab 4: Write */}
<View key="4" style={{ flex: 1 }}>
  <WritingScreen
    userId={userId ?? ''}
    horoscopeContext={horoscopeContext}
    insight={insight}
    topic={topic}
    streakDays={streakDays}
  />
</View>
```

- [ ] **Step 3: Verify `streakDays` state name in App.tsx**

Run: `grep -n "streakDays\|setStreakDays" /c/Users/sador/unpack2/App.tsx | head -5`

If it's named differently (e.g. `streak`), update the prop in Step 2 accordingly.

- [ ] **Step 4: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no new errors introduced by this change.

- [ ] **Step 5: Commit**

```bash
git -c user.email="dev@unpack2.app" -c user.name="unpack2" add App.tsx
git -c user.email="dev@unpack2.app" -c user.name="unpack2" commit -m "feat: wire WritingScreen as tab 4 in App.tsx"
```

---

## Testing Checklist

After all tasks complete, test on device via Expo Go:

1. **Tab bar** — 5 icons visible, pen icon active on tab 4 (gold), others dimmed
2. **Editor loads** — prompt banner appears at top with italic question
3. **Type and save** — word count updates live; Save button enabled; after save entry clears and reflection appears
4. **Tap prompt** — new prompt generates (loading spinner shown briefly)
5. **"Write more" after reflection** — clears reflection, fetches new prompt
6. **Mic button** — tap starts listening, speech appears in editor, tap again or speech ends → stops
7. **History tab** — past entries listed newest first with date and time
8. **Streak indicator** — shows "N day streak" in header when streakDays > 0
9. **No session yet** — prompt still generates (fallback to generic question)
