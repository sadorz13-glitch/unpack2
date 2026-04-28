# Session Completion, Tab Titles & Mic Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dramatic flame-burst celebration screen after session completion, add italic serif gold titles to all 4 untitled tabs, and add a mic dot button to WritingScreen's toolbar.

**Architecture:** Task 1 modifies SessionScreen to add a `view === 'celebrate'` state that triggers a React Native Animated one-shot flame burst (screen flash + 5 tongue shapes + streak reveal), saving the session inline before showing the screen. Task 2 adds a single `<Text style={headerTitleStyle}>` line to each of the 4 untitled screens. Task 3 threads voice recording props from App.tsx into WritingScreen and adds a mic dot to the toolbar.

**Tech Stack:** React Native Animated, react-native-svg (available), TypeScript, Expo, Supabase

---

## File Map

| File | Change |
|------|--------|
| `screens/SessionScreen.tsx` | Task 1 — add `view === 'celebrate'`, flame animation, new states, modify submitAnswer/handleDone/handleExit |
| `screens/HomeScreen.tsx` | Task 2 — add "Home" title to header |
| `screens/TalkScreen.tsx` | Task 2 — rename "Talk It Out" → "Vent", fix style |
| `screens/JournalScreen.tsx` | Task 2 — add "Look Back" title above calHeader |
| `screens/WritingScreen.tsx` | Task 3 — add mic dot to toolbar, wire voice props |
| `App.tsx` | Task 3 — add `writingVoiceModeRef`, pass voice props to WritingScreen |

---

## Task 1: Flame Celebration Screen

After 3 questions are answered the current code shows `view === 'insight'`. This task replaces that with `view === 'celebrate'` which:
1. Saves the session and loads the streak **before** showing the screen (in `submitAnswer`)
2. Shows a one-shot flame burst animation using React Native Animated
3. Shows the streak number with a spring bounce-in
4. Shows the insight quote
5. Has "KEEP GOING →" (primary) and "I'M DONE FOR NOW" (ghost) buttons

**Files:**
- Modify: `screens/SessionScreen.tsx`

### Current code reference (lines to understand before editing)

`submitAnswer` function: lines ~158–225. When `newBatchAnswers.length >= 3`, it calls `generateInsightAndTraits` then `setView('insight')`.

`view === 'insight'` render block: lines ~316–334. Shows insight text, KEEP GOING → handleKeepGoing(), I'M DONE → handleDone().

`handleDone()`: lines ~246–261. Saves session, calls `loadStreakAndCount`, calls `onSessionComplete`.

`handleExit()`: lines ~263–273. Saves session as best-effort, calls `onExit()`.

`handleKeepGoing()`: lines ~228–245. Resets batch, continues to next questions.

- [ ] **Step 1: Add new state variables and animation refs at the top of SessionScreen component**

Locate the state declarations at lines ~81–84:
```tsx
const [insight, setInsight] = useState('');
const [insightShort, setInsightShort] = useState('');
const [currentTraits, setCurrentTraits] = useState<Record<string, number> | null>(null);
const [currentTopic, setCurrentTopic] = useState('');
```

Add immediately after those lines (or after the last existing useState):
```tsx
const [celebrationStreak, setCelebrationStreak] = useState(0);
const [celebrationTotal, setCelebrationTotal] = useState(0);
const sessionSavedRef = useRef(false);

// Flame animation values — created once, reused across celebration triggers
const flashAnim = useRef(new Animated.Value(0)).current;
const streakBounce = useRef(new Animated.Value(0)).current;
const streakOpacity = useRef(new Animated.Value(0)).current;
const tongueAnims = useRef(
  Array.from({ length: 5 }, () => ({
    translateY: new Animated.Value(200),
    opacity: new Animated.Value(0),
  }))
).current;
```

- [ ] **Step 2: Add the celebration animation trigger as a useEffect**

After the existing useEffects (around lines ~222–230), add:
```tsx
useEffect(() => {
  if (view !== 'celebrate') return;
  // Reset to start positions
  flashAnim.setValue(0);
  streakBounce.setValue(0);
  streakOpacity.setValue(0);
  tongueAnims.forEach(t => { t.translateY.setValue(200); t.opacity.setValue(0); });

  Animated.parallel([
    // Screen flash: fast orange bloom then fade
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]),
    // Flame tongues shoot up then dissolve (staggered)
    ...tongueAnims.map((t, i) =>
      Animated.sequence([
        Animated.delay(i * 45),
        Animated.parallel([
          Animated.spring(t.translateY, { toValue: 0, tension: 220, friction: 7, useNativeDriver: true }),
          Animated.timing(t.opacity, { toValue: 0.92, duration: 100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(t.translateY, { toValue: -220, duration: 750, useNativeDriver: true }),
          Animated.timing(t.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ])
    ),
    // Streak number: pop in with overshoot after brief delay
    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.spring(streakBounce, { toValue: 1.35, tension: 220, friction: 5, useNativeDriver: true }),
        Animated.timing(streakOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.spring(streakBounce, { toValue: 1.0, tension: 160, friction: 8, useNativeDriver: true }),
    ]),
  ]).start();
}, [view]);
```

- [ ] **Step 3: Modify `submitAnswer` to save session before entering celebrate view**

Find the block inside `submitAnswer` that starts with `if (newBatchAnswers.length >= 3) {`. It currently looks like:
```tsx
if (newBatchAnswers.length >= 3) {
  if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
  onStopTTS();
  setView('loading');
  try {
    const result = await generateInsightAndTraits(newAllAnswers, horoscopeContext);
    setInsight(result.insight);
    setInsightShort(result.insightShort || '');
    setCurrentTraits(result.traits);
    setCurrentTopic(result.topic);
    setView('insight');
  } catch {
    setInsight("Stop waiting for the right moment — it's not coming.");
    setCurrentTraits({ Openness: 60, 'Self-awareness': 50, Avoidance: 40, Ambition: 70, Resilience: 55 });
    setCurrentTopic('self reflection');
    setView('insight');
  }
}
```

Replace the entire `if (newBatchAnswers.length >= 3) { ... }` block with:
```tsx
if (newBatchAnswers.length >= 3) {
  if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
  onStopTTS();
  setView('loading');
  let insightText = "Stop waiting for the right moment — it's not coming.";
  let insightShortText = '';
  let traitsResult: Record<string, number> = { Openness: 60, 'Self-awareness': 50, Avoidance: 40, Ambition: 70, Resilience: 55 };
  let topicResult = 'self reflection';
  try {
    const result = await generateInsightAndTraits(newAllAnswers, horoscopeContext);
    insightText = result.insight;
    insightShortText = result.insightShort || '';
    traitsResult = result.traits;
    topicResult = result.topic;
  } catch { /* fallback values already set above */ }
  setInsight(insightText);
  setInsightShort(insightShortText);
  setCurrentTraits(traitsResult);
  setCurrentTopic(topicResult);
  // Save session + load streak before showing celebration
  let streakVal = 0;
  let totalVal = 0;
  try {
    await saveSession(newAllAnswers, insightText, traitsResult, topicResult, insightShortText, userId);
    const { streak, total } = await loadStreakAndCount(true, userId);
    streakVal = streak;
    totalVal = total;
    sessionSavedRef.current = true;
  } catch { /* streak stays 0, session unsaved — handleDone will retry */ }
  setCelebrationStreak(streakVal);
  setCelebrationTotal(totalVal);
  setView('celebrate');
}
```

- [ ] **Step 4: Update `handleDone` to skip re-saving when already saved**

Replace the existing `handleDone` function (lines ~246–261):
```tsx
async function handleDone() {
  if (!insight) return;
  if (sessionSavedRef.current) {
    onSessionComplete({
      answers: answersRef.current, insight, insightShort,
      traits: currentTraits || {}, topic: currentTopic,
      streak: celebrationStreak, total: celebrationTotal,
    });
    return;
  }
  // Fallback: session wasn't saved yet (e.g., API error path)
  try {
    await saveSession(answersRef.current, insight, currentTraits || {}, currentTopic, insightShort, userId);
    const { streak, total } = await loadStreakAndCount(true, userId);
    onSessionComplete({
      answers: answersRef.current, insight, insightShort,
      traits: currentTraits || {}, topic: currentTopic, streak, total,
    });
  } catch {
    onSessionComplete({
      answers: answersRef.current, insight, insightShort,
      traits: currentTraits || {}, topic: currentTopic, streak: 0, total: 0,
    });
  }
}
```

- [ ] **Step 5: Guard `handleExit` against double-save**

Replace the existing `handleExit` function (lines ~263–273):
```tsx
async function handleExit() {
  if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
  onStopTTS();
  if (!sessionSavedRef.current && answersRef.current.length > 0 && insight) {
    try {
      await saveSession(answersRef.current, insight, currentTraits || {}, currentTopic, insightShort, userId);
    } catch { /* best effort */ }
  }
  onExit();
}
```

- [ ] **Step 6: Reset `sessionSavedRef` in `handleKeepGoing`**

Find `handleKeepGoing` (lines ~228–245). Add `sessionSavedRef.current = false;` at the very top of the function, before any other statements:
```tsx
async function handleKeepGoing() {
  sessionSavedRef.current = false;
  batchAnswersRef.current = [];
  setBatchAnswers([]);
  // ... rest unchanged
```

- [ ] **Step 7: Add the tongue shape configuration constants and celebration view JSX**

The `TONGUE_CONFIGS` constant and celebration view JSX. Add the constant at module level (outside the component, after the imports section):
```tsx
const TONGUE_CONFIGS = [
  { width: 50, height: 150, color: '#ff6a00', deg: 0,    offsetX: 0 },
  { width: 36, height: 115, color: '#ff4500', deg: -14,  offsetX: -44 },
  { width: 36, height: 115, color: '#ff4500', deg: 14,   offsetX: 44 },
  { width: 24, height: 82,  color: '#cc2200', deg: -26,  offsetX: -80 },
  { width: 24, height: 82,  color: '#cc2200', deg: 26,   offsetX: 80 },
];
```

Then, in the component's render section, add the celebrate view block BEFORE the `view === 'question'` block (i.e., before the final `return` that renders the `PanGestureHandler`). Place it after the `view === 'loading'` block:
```tsx
if (view === 'celebrate') {
  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg, overflow: 'hidden' }]}>
      {/* Orange screen flash */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'rgba(255,70,0,0.22)', opacity: flashAnim },
        ]}
      />

      {/* Flame + streak centred in remaining space */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* Flame tongues — absolute inside a fixed-size container */}
        <View style={{ width: 220, height: 180, position: 'relative', alignItems: 'center' }}>
          {TONGUE_CONFIGS.map((cfg, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                bottom: 0,
                width: cfg.width,
                height: cfg.height,
                marginLeft: cfg.offsetX,
                backgroundColor: cfg.color,
                borderTopLeftRadius: cfg.width / 2,
                borderTopRightRadius: cfg.width / 2,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                shadowColor: '#ff6a00',
                shadowOpacity: 0.85,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
                transform: [
                  { rotate: `${cfg.deg}deg` },
                  { translateY: tongueAnims[i].translateY },
                ],
                opacity: tongueAnims[i].opacity,
              }}
            />
          ))}
        </View>

        {/* Streak number */}
        <Animated.Text
          style={[
            styles.celebrationNumber,
            { transform: [{ scale: streakBounce }], opacity: streakOpacity },
          ]}
        >
          {celebrationStreak}
        </Animated.Text>
        <Animated.Text style={[styles.celebrationLabel, { opacity: streakOpacity }]}>
          DAY STREAK
        </Animated.Text>

        {/* Insight quote */}
        {insight ? (
          <Text style={styles.celebrationInsight} numberOfLines={3}>
            "{insight}"
          </Text>
        ) : null}
      </View>

      {/* Buttons pinned to bottom */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleKeepGoing}>
          <Text style={styles.primaryBtnText}>KEEP GOING →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignSelf: 'center' }} onPress={handleDone}>
          <Text style={styles.ghostText}>I'M DONE FOR NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Step 8: Add celebration styles to the StyleSheet**

In the `StyleSheet.create({...})` at the bottom of SessionScreen, add these new keys:
```tsx
celebrationNumber: {
  fontFamily: fontFamilies.serifItalic,
  fontSize: 96,
  fontWeight: '900',
  color: '#fff',
  lineHeight: 100,
  letterSpacing: -4,
  marginTop: spacing.base,
},
celebrationLabel: {
  fontSize: 10,
  letterSpacing: 5,
  color: 'rgba(255,255,255,0.3)',
  textTransform: 'uppercase',
  marginBottom: spacing.xl,
},
celebrationInsight: {
  fontFamily: fontFamilies.serifItalic,
  fontSize: 14,
  color: 'rgba(255,255,255,0.4)',
  textAlign: 'center',
  lineHeight: 22,
  paddingHorizontal: spacing.xl,
  marginTop: spacing.base,
},
```

- [ ] **Step 9: Remove or repurpose the old `view === 'insight'` block**

Find and delete the `if (view === 'insight') { return (...); }` block entirely (lines ~316–334). It is replaced by `view === 'celebrate'`. The `handleDone` function is still present but no longer needs a separate insight-only view.

- [ ] **Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors. If you see "Property 'celebrationStreak' does not exist", you missed adding the state. If you see animation ref errors, check that `tongueAnims.forEach` is accessed correctly.

- [ ] **Step 11: Commit**

```bash
git add screens/SessionScreen.tsx
git commit -m "feat: flame celebration screen after session with streak reveal"
```

---

## Task 2: Tab Titles

Add the italic serif gold title to HomeScreen (Tab 0), SessionScreen (Tab 1), TalkScreen (Tab 2), and JournalScreen (Tab 3). WritingScreen already has "Write" ✓.

The canonical style from WritingScreen (`screens/WritingScreen.tsx:364`):
```tsx
{
  fontFamily: fontFamilies.serifItalic,  // 'DMSerifDisplay_400Regular_Italic'
  fontSize: 22,
  color: colors.accent,                  // '#b48c5a'
}
```

**Files:**
- Modify: `screens/HomeScreen.tsx` — add "Home"
- Modify: `screens/SessionScreen.tsx` — add "Questions"
- Modify: `screens/TalkScreen.tsx` — rename to "Vent", fix style
- Modify: `screens/JournalScreen.tsx` — add "Look Back"

### HomeScreen — "Home"

The header is at lines ~56–63:
```tsx
{/* Header */}
<View style={styles.header}>
  <Text style={styles.wordmark}>UNPACK</Text>
  <Text style={styles.headerDate}>...</Text>
</View>
```

- [ ] **Step 12: Add "Home" title to HomeScreen header**

Replace the `<Text style={styles.wordmark}>UNPACK</Text>` line with:
```tsx
<Text style={styles.tabTitle}>Home</Text>
```

Add to the StyleSheet in HomeScreen:
```tsx
tabTitle: {
  fontFamily: fontFamilies.serifItalic,
  fontSize: 22,
  color: colors.accent,
  flex: 1,
},
```

Verify the header still renders the date on the right (the `headerDate` style should have `textAlign: 'right'` or `alignSelf: 'flex-end'`).

### SessionScreen — "Questions"

The `view === 'entry'` block (lines ~288–302) currently shows `<Text style={styles.wordmark}>UNPACK</Text>` at the top. The `view === 'celebrate'` we added above also has no top-level title (it shows the streak number instead — that's intentional).

- [ ] **Step 13: Add "Questions" title to SessionScreen entry view**

In the `view === 'entry'` return block, replace:
```tsx
<Text style={styles.wordmark}>UNPACK</Text>
```
with:
```tsx
<Text style={styles.tabTitle}>Questions</Text>
```

Add to the StyleSheet in SessionScreen:
```tsx
tabTitle: {
  fontFamily: fontFamilies.serifItalic,
  fontSize: 22,
  color: colors.accent,
  alignSelf: 'flex-start',
  paddingHorizontal: spacing.lg,
},
```

### TalkScreen — "Vent"

TalkScreen has two places with the old title:

1. **Locked state** (lines ~57–63): `<Text style={styles.lockedTitle}>Talk It Out</Text>`
   - Style: `lockedTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 24, color: colors.textPrimary, marginBottom: spacing.base }`

2. **Active header** (lines ~72–74): `<Text style={styles.wordmark}>TALK IT OUT</Text>`

- [ ] **Step 14: Update TalkScreen title to "Vent" in both places with correct style**

Change the locked state line:
```tsx
<Text style={styles.lockedTitle}>Talk It Out</Text>
```
to:
```tsx
<Text style={styles.tabTitle}>Vent</Text>
```

Change the active header line:
```tsx
<Text style={styles.wordmark}>TALK IT OUT</Text>
```
to:
```tsx
<Text style={styles.tabTitle}>Vent</Text>
```

Add to the StyleSheet in TalkScreen (the `lockedTitle` can be left in the stylesheet for now, it won't be referenced):
```tsx
tabTitle: {
  fontFamily: fontFamilies.serifItalic,
  fontSize: 22,
  color: colors.accent,
},
```

### JournalScreen — "Look Back"

The main return (line ~216) starts with the calHeader:
```tsx
<View style={[styles.calHeader, { paddingTop: insets.top + spacing.base }]}>
  <TouchableOpacity onPress={() => goMonth(-1)}>‹</TouchableOpacity>
  <Text style={styles.monthLabel}>{monthLabel}</Text>
  <TouchableOpacity onPress={() => goMonth(1)}>›</TouchableOpacity>
</View>
```

- [ ] **Step 15: Add "Look Back" title above the calendar header in JournalScreen**

In the main return JSX of JournalScreen, find the `<View style={[styles.calHeader, ...]}` and add a title row immediately before it:
```tsx
{/* Tab title */}
<View style={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.base, paddingBottom: spacing.sm }}>
  <Text style={styles.tabTitle}>Look Back</Text>
</View>

<View style={[styles.calHeader, { paddingTop: spacing.base }]}>
```

Note: remove `paddingTop: insets.top + spacing.base` from `calHeader` since the title row now handles the top inset.

Add to the StyleSheet in JournalScreen:
```tsx
tabTitle: {
  fontFamily: fontFamilies.serifItalic,
  fontSize: 22,
  color: colors.accent,
},
```

- [ ] **Step 16: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 17: Commit**

```bash
git add screens/HomeScreen.tsx screens/SessionScreen.tsx screens/TalkScreen.tsx screens/JournalScreen.tsx
git commit -m "feat: add italic gold tab titles — Home, Questions, Vent, Look Back"
```

---

## Task 3: Mic Button in WritingScreen

Add a grey mic dot to the WritingScreen toolbar (next to the Save button). The mic pattern is identical to SessionScreen: a `micRing` containing a `micDot`. Tapping it toggles voice recording; transcribed text is appended to the `entry` state.

**Files:**
- Modify: `screens/WritingScreen.tsx` — add mic dot to toolbar, consume voice props
- Modify: `App.tsx` — add `writingVoiceModeRef`, pass voice props to WritingScreen

### App.tsx changes

Voice recording is routed via `startVoiceRecording(setterFn)`. App.tsx already has `sessionVoiceModeRef` and `therapyVoiceModeRef` for other modes. We add a third mode ref.

- [ ] **Step 18: Add `writingVoiceModeRef` to App.tsx**

Locate `sessionVoiceModeRef` declaration (line ~147-148):
```tsx
const sessionVoiceModeRef = useRef(false);
const therapyVoiceModeRef = useRef(false);
```

Add immediately after:
```tsx
const writingVoiceModeRef = useRef(false);
```

- [ ] **Step 19: Handle writingVoiceMode in the metering/restart loop in App.tsx**

Find the section that checks `sessionVoiceModeRef.current` and `therapyVoiceModeRef.current` for auto-restart (around lines ~492–506). It looks like:
```tsx
if (sessionVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);
else if (therapyVoiceModeRef.current) startVoiceRecording(setTherapyInput);
```
(these lines appear twice — once in the metering interval and once in a conditional).

Each occurrence: add `else if (writingVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);` — WritingScreen will set `recordingSetterRef.current` to its own setter via `onStartVoiceRecording`.

Find all 4 occurrences of `sessionVoiceModeRef.current` checks related to auto-restart and add the writing branch. They appear around line 492, 493, 505, 506. For each pair like:
```tsx
if (sessionVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);
else if (therapyVoiceModeRef.current) startVoiceRecording(setTherapyInput);
```
Change to:
```tsx
if (sessionVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);
else if (therapyVoiceModeRef.current) startVoiceRecording(setTherapyInput);
else if (writingVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);
```

- [ ] **Step 20: Pass voice recording props to WritingScreen in App.tsx**

Find the WritingScreen rendering (lines ~1115–1121):
```tsx
<WritingScreen
  userId={userId ?? ''}
  horoscopeContext={horoscopeContext}
  insight={insight}
  topic={topic}
  streakDays={streakDays}
  isActive={activeTab === 4}
/>
```

Replace with:
```tsx
<WritingScreen
  userId={userId ?? ''}
  horoscopeContext={horoscopeContext}
  insight={insight}
  topic={topic}
  streakDays={streakDays}
  isActive={activeTab === 4}
  isRecording={isRecording}
  isTranscribing={isTranscribing}
  micPulseAnim={micPulseAnim}
  meteringLevelAnim={meteringLevelAnim}
  onStartVoiceRecording={startVoiceRecording}
  onStopVoiceRecording={stopVoiceRecording}
  writingVoiceModeRef={writingVoiceModeRef}
/>
```

Also: when the tab changes away from Tab 4, stop voice recording. Find the `onPageSelected` handler in App.tsx (around line ~1011) which already does:
```tsx
if (recordingRef.current) stopVoiceRecording(recordingSetterRef.current);
```
After that line, add:
```tsx
writingVoiceModeRef.current = false;
```

### WritingScreen.tsx changes

- [ ] **Step 21: Update Props type in WritingScreen**

Find the `type Props = {` block (lines ~28–35) and add the new props:
```tsx
type Props = {
  userId: string;
  horoscopeContext: string;
  insight: string;
  topic: string;
  streakDays: number;
  isActive: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  micPulseAnim?: Animated.Value;
  meteringLevelAnim?: Animated.Value;
  onStartVoiceRecording?: (setterFn: (prev: string) => string) => void;
  onStopVoiceRecording?: (setterFn: (prev: string) => string) => void;
  writingVoiceModeRef?: React.MutableRefObject<boolean>;
};
```

- [ ] **Step 22: Add `Animated` to WritingScreen's react-native imports**

Current import (line ~2):
```tsx
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
```

Add `Animated` to the list:
```tsx
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform,
  Animated,
} from 'react-native';
```

- [ ] **Step 23: Destructure new props in WritingScreen component function signature**

Find (line ~60):
```tsx
export function WritingScreen({ userId, horoscopeContext, insight, topic, streakDays, isActive }: Props) {
```

Replace with:
```tsx
export function WritingScreen({
  userId, horoscopeContext, insight, topic, streakDays, isActive,
  isRecording, isTranscribing, micPulseAnim, meteringLevelAnim,
  onStartVoiceRecording, onStopVoiceRecording, writingVoiceModeRef,
}: Props) {
```

- [ ] **Step 24: Add mic dot to the toolbar JSX in WritingScreen**

Find the toolbar (lines ~244–258):
```tsx
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
```

Replace with:
```tsx
<View style={styles.toolbar}>
  <Text style={styles.wordCount}>{wc} {wc === 1 ? 'word' : 'words'}</Text>

  {/* Mic dot — only shown when voice props are wired */}
  {onStartVoiceRecording && micPulseAnim && meteringLevelAnim ? (
    <TouchableOpacity
      onPress={() => {
        if (!writingVoiceModeRef || !onStartVoiceRecording || !onStopVoiceRecording) return;
        if (isRecording) {
          writingVoiceModeRef.current = false;
          onStopVoiceRecording((prev: string) => prev);
        } else {
          writingVoiceModeRef.current = true;
          onStartVoiceRecording((text: string) =>
            setEntry(prev => (prev ? prev + ' ' + text : text))
          );
        }
      }}
      activeOpacity={0.6}
      style={{ marginRight: 10 }}
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
```

- [ ] **Step 25: Add mic ring/dot styles to WritingScreen's StyleSheet**

In the `StyleSheet.create({...})` at the bottom of WritingScreen, add:
```tsx
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
```

- [ ] **Step 26: Stop writing voice mode when leaving tab**

In the `isActive` useEffect in WritingScreen, find the `else` branch (tab deactivated). Currently it clears editor state. Add the voice cleanup at the start of the else branch:
```tsx
} else {
  if (writingVoiceModeRef) writingVoiceModeRef.current = false;
  if (isRecording && onStopVoiceRecording) onStopVoiceRecording((prev: string) => prev);
  setView('editor');
  setSearchQuery('');
  setEditingId(null);
  setEditingText('');
}
```

- [ ] **Step 27: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors. If you see "Type '(text: string) => void' is not assignable to parameter of type '(prev: string) => string'", check the setter function signatures — the voice setter in App.tsx expects `(prev: any) => string` generically (it appends); the WritingScreen passes a function that takes the transcribed text, not the previous state. Adjust the `onStartVoiceRecording` call:

```tsx
onStartVoiceRecording((text: string) => {
  setEntry(prev => (prev ? prev + ' ' + text : text));
  return '';  // return value is ignored by App.tsx's voice setter path
});
```

Actually, looking at App.tsx line 502: `setterFn((prev: any) => prev ? prev + ' ' + text : text)` — App.tsx CALLS the setter with a state-updater function. But `startVoiceRecording(setterFn)` stores `setterFn` as `recordingSetterRef.current` and then calls `recordingSetterRef.current((prev) => prev + text)` on transcription. So `setterFn` IS the React state setter (like `setEntry`, `setInput`, etc.).

So the correct call is:
```tsx
onStartVoiceRecording(setEntry);
```

And the setter type is `Dispatch<SetStateAction<string>>` which is `(value: string | ((prev: string) => string)) => void`. This is compatible since App.tsx calls it with a state updater `(prev) => ...`.

Update step 24's mic press handler:
```tsx
if (isRecording) {
  writingVoiceModeRef.current = false;
  onStopVoiceRecording(setEntry);
} else {
  writingVoiceModeRef.current = true;
  onStartVoiceRecording(setEntry);
}
```

And step 26's cleanup:
```tsx
if (isRecording && onStopVoiceRecording) onStopVoiceRecording(setEntry);
```

Make these corrections in steps 24 and 26 if you wrote `(text: string) => ...` instead.

- [ ] **Step 28: Commit**

```bash
git add screens/WritingScreen.tsx App.tsx
git commit -m "feat: mic dot in WritingScreen toolbar for voice-to-text entry"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Post-session flame burst animation with multiple tongues — Task 1
- ✅ Streak number displayed after session — Task 1 (`celebrationStreak`)
- ✅ "KEEP GOING →" and "I'M DONE FOR NOW" buttons on celebrate screen — Task 1
- ✅ HomeScreen title "Home" — Task 2
- ✅ SessionScreen title "Questions" — Task 2
- ✅ TalkScreen renamed to "Vent" with correct style — Task 2
- ✅ JournalScreen title "Look Back" — Task 2
- ✅ WritingScreen "Write" already exists — no change needed
- ✅ Mic dot in WritingScreen toolbar next to save — Task 3
- ✅ Mic dot same grey dot style as SessionScreen — Task 3 (micRing/micDot styles match)
- ✅ Voice transcription appends to journal entry — Task 3 (passes `setEntry`)

**Type consistency check:**
- `celebrationStreak` / `celebrationTotal` are `number` throughout
- `sessionSavedRef` is `useRef(false)` — `boolean`
- `tongueAnims` has `.translateY` and `.opacity` Animated.Values — accessed consistently in steps 2, 7
- Voice setter in WritingScreen: `setEntry` (type `Dispatch<SetStateAction<string>>`) — passed to `onStartVoiceRecording` and `onStopVoiceRecording`

**Placeholder scan:** No TBDs, all code is complete.
