# Bugs + User Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UI/voice bugs, replace device-UUID auth with Supabase magic-link auth (email + DOB), and wipe test data.

**Architecture:** Bugs are self-contained edits to existing files. Auth replaces `lib/auth.ts`'s UUID generator with `supabase.auth.getSession()`, adds a new `AuthScreen`, wires deep-link handling in `App.tsx`, and uses `supabase.auth.onAuthStateChange` to reactively update login state. No new dependencies needed — `expo-linking` and Supabase Auth are already present.

**Tech Stack:** React Native (Expo), TypeScript, Supabase Auth, expo-linking, react-native-url-polyfill (already imported in App.tsx)

**Note:** Magic-link deep links require a development build, not Expo Go. Use `npx expo run:android` / `npx expo run:ios` or an EAS build to test Tasks 6–8.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `screens/HomeScreen.tsx` | Modify | Remove noop-tapped tiles' TouchableOpacity wrappers; trim Props type |
| `App.tsx` | Modify | `onPageSelected` clears voice refs + stops recording; add `sessionVoiceSubmitRef`; fix `stopVoiceRecording` routing; add Linking handler; wire `AuthScreen`; add profiles deletion to devWipe |
| `screens/SessionScreen.tsx` | Modify | Accept + register `sessionVoiceSubmitRef`; mic button toggles recording |
| `screens/JournalScreen.tsx` | Modify | Dual calendar dots (session dot + journal dot) |
| `app.json` | Modify | Add `scheme: "unpack"` |
| `lib/auth.ts` | Modify | Replace UUID generation with Supabase session; add `setAuthUser`, `signOut` |
| `screens/AuthScreen.tsx` | Create | Email input → send magic link → "check your email" state |

---

## Task 1: Fix untappable tiles — remove noop TouchableOpacity wrappers

**Files:**
- Modify: `screens/HomeScreen.tsx`

The streak tile, personality wheel tiles (×2), and weekly wheel tile all call props that App.tsx wires as `() => {}`. Remove their `TouchableOpacity` wrappers so they render as plain `View` with no tap handling. Also trim the Props type so the noop props don't exist.

- [ ] **Step 1: Update HomeScreen Props type**

In `screens/HomeScreen.tsx`, replace the Props type block (lines 13–42):

```tsx
type Props = {
  streakDays: number;
  sessionCount: number;
  sessionCountLoaded: boolean;
  hasSessionToday: boolean;
  insight: string;
  insightShort: string;
  traits: Record<string, number> | null;
  weeklyTraits: Record<string, number> | null;
  topic: string;
  therapyPreview: string | null;
  dayNote: string;
  freshSession: boolean;
  streakDisplayValue: number;
  showFireEmoji: boolean;
  fireFloatAnim: Animated.Value;
  fireOpacityAnim: Animated.Value;
  streakScaleAnim: Animated.Value;
  onStartSession: () => void;
  onOpenTalk: () => void;
  onOpenJournal: () => void;
  onOpenAnswers: () => void;
  onDevWipe: () => void;
  userId: string | null;
};
```

Update the destructure at the top of the function to match (remove `onOpenWheel`, `onOpenInsight`, `onOpenWeeklyWheel`, `onOpenStreak`):

```tsx
export function HomeScreen({
  streakDays, sessionCount, sessionCountLoaded, hasSessionToday,
  insight, insightShort, traits, weeklyTraits, topic, therapyPreview, dayNote,
  freshSession, streakDisplayValue, showFireEmoji, fireFloatAnim, fireOpacityAnim,
  streakScaleAnim, onStartSession, onOpenTalk, onOpenJournal,
  onOpenAnswers, onDevWipe, userId,
}: Props) {
```

- [ ] **Step 2: Make streak tile non-interactive**

Find the streak tile (the `TouchableOpacity` with `onPress={onOpenStreak}`). Change it from:

```tsx
<TouchableOpacity onPress={onOpenStreak} activeOpacity={0.8} style={styles.wideTileWrapper}>
  <BlurCard style={styles.wideTile}>
```

to:

```tsx
<View style={styles.wideTileWrapper}>
  <BlurCard style={styles.wideTile}>
```

And close with `</View>` instead of `</TouchableOpacity>`.

- [ ] **Step 3: Make wheel + top-trait tiles non-interactive**

Row 3 left tile (`onPress={onOpenWheel}`, the "WHEEL" tile):

```tsx
// Before
<TouchableOpacity onPress={onOpenWheel} activeOpacity={0.8} style={styles.halfTileWrapper}>
// After
<View style={styles.halfTileWrapper}>
```

(close tag → `</View>`)

Row 5 left tile (`onPress={onOpenWheel}`, the "TOP TRAIT" tile) — same change.

Row 5 right tile (`onPress={onOpenWeeklyWheel}`, the "WEEKLY WHEEL" tile) — same change.

- [ ] **Step 4: Remove noop props from App.tsx**

In `App.tsx`, find the `<HomeScreen` JSX block and remove these four props:

```tsx
onOpenWheel={() => {}}
onOpenInsight={() => {}}
onOpenWeeklyWheel={() => {}}
onOpenStreak={() => {}}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /c/Users/sador/unpack2 && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to HomeScreen props.

- [ ] **Step 6: Commit**

```bash
git add screens/HomeScreen.tsx App.tsx
git commit -m "fix: remove noop tile tap handlers from HomeScreen"
```

---

## Task 2: Fix auto-recording on tab switch

**Files:**
- Modify: `App.tsx`

When the user swipes to a different PagerView page without exiting a session, `sessionVoiceModeRef` stays `true`. The silence-detection loop eventually fires, `stopVoiceRecording` runs, and because the ref is still `true` it tries to restart recording — even on the wrong tab. Fix: clear both voice refs and stop any live recording on every page change.

- [ ] **Step 1: Update onPageSelected in App.tsx**

Find the `<PagerView` JSX. Change:

```tsx
onPageSelected={e => setActiveTab(e.nativeEvent.position as TabId)}
```

to:

```tsx
onPageSelected={e => {
  const tab = e.nativeEvent.position as TabId;
  setActiveTab(tab);
  sessionVoiceModeRef.current = false;
  therapyVoiceModeRef.current = false;
  if (recordingRef.current) stopVoiceRecording(recordingSetterRef.current);
}}
```

Setting the refs to `false` first ensures that when `stopVoiceRecording` finishes transcribing, its restart branches won't fire.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "fix: clear voice refs and stop recording on PagerView page change"
```

---

## Task 3: Fix mic unresponsive after sending a voice answer

**Files:**
- Modify: `App.tsx`
- Modify: `screens/SessionScreen.tsx`

**Root cause:** `stopVoiceRecording` in App.tsx has `if (sessionVoiceModeRef.current) submitAnswer(text)` which calls App.tsx's OLD `submitAnswer` (uses App.tsx's local state, not SessionScreen's). SessionScreen never gets the transcribed text, never advances to the next question, and never restarts recording. The mic shows as idle, and tapping it does nothing because `onPress` only calls `onStopVoiceRecording` when `isRecording` is already `true`.

**Fix:** Add `sessionVoiceSubmitRef` to App.tsx, route transcribed text through it, and make the mic button toggle start/stop.

- [ ] **Step 1: Add sessionVoiceSubmitRef to App.tsx**

In `App.tsx`, find the refs block (near `sessionVoiceModeRef`). Add immediately after it:

```tsx
const sessionVoiceSubmitRef = useRef<((text: string) => void) | null>(null);
```

- [ ] **Step 2: Fix stopVoiceRecording routing in App.tsx**

Find the `stopVoiceRecording` function in `App.tsx`. There are three places that reference `sessionVoiceModeRef.current` — change all three:

**On Whisper error (restart):**
```tsx
// Before
if (sessionVoiceModeRef.current) startVoiceRecording(setInput);
// After
if (sessionVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);
```

**On successful transcription (submit):**
```tsx
// Before
if (sessionVoiceModeRef.current) submitAnswer(text);
// After
if (sessionVoiceModeRef.current) sessionVoiceSubmitRef.current?.(text);
```

**On empty transcription (restart):**
```tsx
// Before
if (sessionVoiceModeRef.current) startVoiceRecording(setInput);
// After
if (sessionVoiceModeRef.current) startVoiceRecording(recordingSetterRef.current);
```

- [ ] **Step 3: Pass sessionVoiceSubmitRef to SessionScreen in App.tsx**

In the `<SessionScreen` JSX, add the prop:

```tsx
sessionVoiceSubmitRef={sessionVoiceSubmitRef}
```

- [ ] **Step 4: Accept sessionVoiceSubmitRef in SessionScreen**

In `screens/SessionScreen.tsx`, add to the `Props` type:

```tsx
sessionVoiceSubmitRef: React.MutableRefObject<((text: string) => void) | null>;
```

Add to the destructure:

```tsx
export function SessionScreen({
  ..., sessionVoiceSubmitRef,
}: Props) {
```

- [ ] **Step 5: Register submitAnswer into the ref**

In `SessionScreen`, add a ref to always point to the latest `submitAnswer`, then register it. Add these two blocks directly inside the component body, before the return:

```tsx
const submitAnswerRef = useRef(submitAnswer);
useEffect(() => { submitAnswerRef.current = submitAnswer; });

useEffect(() => {
  sessionVoiceSubmitRef.current = (text: string) => submitAnswerRef.current(text);
  return () => { sessionVoiceSubmitRef.current = null; };
}, []);
```

- [ ] **Step 6: Make mic button toggle start/stop in SessionScreen**

In the `question` view render, find the mic `TouchableOpacity`:

```tsx
// Before
<TouchableOpacity
  onPress={() => { if (isRecording) onStopVoiceRecording(setInput); }}
  activeOpacity={isRecording ? 0.6 : 1}
>
// After
<TouchableOpacity
  onPress={() => {
    if (isRecording) onStopVoiceRecording(setInput);
    else onStartVoiceRecording(setInput);
  }}
  activeOpacity={0.6}
>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add App.tsx screens/SessionScreen.tsx
git commit -m "fix: route voice transcript to SessionScreen via sessionVoiceSubmitRef; mic button toggles"
```

---

## Task 4: Fix calendar showing 1 dot instead of 2

**Files:**
- Modify: `screens/JournalScreen.tsx`

`calendarSessions[key]` exists for days with a session (`id` is set) AND for days with only a journal note (`id` is null, `hasNote: true`). The current `hasSession = !!calendarSessions[key]` is `true` for both cases, and only one dot is rendered.

- [ ] **Step 1: Separate hasSession and hasNote in the calendar grid**

In `JournalScreen`, find the calendar grid render block inside `buildCalendarCells().map(...)`. Change:

```tsx
// Before
const hasSession = !!calendarSessions[key];
const isToday = key === today;
const isSelected = selectedDay?.date === key;
return (
  <TouchableOpacity key={key} onPress={() => tapDay(d)} style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.dayCell, isSelected && styles.dayCellSelected]}>
      <Text style={[styles.dayNum, hasSession && styles.dayNumActive, isToday && !hasSession && styles.dayNumToday]}>{d}</Text>
      {hasSession && <View style={styles.sessionDot} />}
    </View>
  </TouchableOpacity>
);

// After
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
          {hasSession && <View style={styles.sessionDot} />}
          {hasNote && <View style={styles.noteDot} />}
        </View>
      )}
    </View>
  </TouchableOpacity>
);
```

- [ ] **Step 2: Add dotsRow and noteDot styles**

In the `StyleSheet.create({...})` at the bottom of `JournalScreen.tsx`, add two entries:

```tsx
dotsRow: { flexDirection: 'row', gap: 3, marginTop: 1 },
noteDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textGhost },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add screens/JournalScreen.tsx
git commit -m "fix: show separate session dot and journal dot in calendar"
```

---

## Task 5: Prep for auth — add scheme to app.json and profiles to devWipe

**Files:**
- Modify: `app.json`
- Modify: `App.tsx`

- [ ] **Step 1: Add URL scheme to app.json**

In `app.json`, inside the `"expo"` object, add `"scheme"` after `"version"`:

```json
"scheme": "unpack",
```

Full context for placement:

```json
{
  "expo": {
    "name": "unpack2",
    "slug": "unpack2",
    "version": "1.0.0",
    "scheme": "unpack",
    "orientation": "portrait",
```

- [ ] **Step 2: Add profiles deletion to devWipe in App.tsx**

Find the `devWipe` function in `App.tsx`. Inside the `onPress: async () => {` block, add profiles deletion right after the `day_notes` deletion line:

```tsx
await supabase.from('sessions').delete().eq('user_id', userId);
await supabase.from('day_notes').delete().eq('user_id', userId);
await supabase.from('profiles').delete().eq('user_id', userId);  // add this line
```

- [ ] **Step 3: Commit**

```bash
git add app.json App.tsx
git commit -m "feat: add unpack URL scheme; devWipe also clears profiles"
```

---

## Task 6: Create AuthScreen

**Files:**
- Create: `screens/AuthScreen.tsx`

A minimal screen: email input → "SEND MAGIC LINK" → loading state → "check your email" state. No password. Same dark aesthetic as existing screens.

- [ ] **Step 1: Create screens/AuthScreen.tsx**

```tsx
// screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { colors, spacing, fontFamilies } from '../theme';

type Props = {
  onAuthComplete?: () => void;
};

type Step = 'email' | 'sending' | 'sent' | 'error';

export function AuthScreen({ onAuthComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [errorMsg, setErrorMsg] = useState('');

  async function sendMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      setStep('error');
      return;
    }
    setStep('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: 'unpack://auth' },
    });
    if (error) {
      setErrorMsg(error.message);
      setStep('error');
    } else {
      setStep('sent');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.wordmark}>UNPACK</Text>

        {step === 'sent' ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentTitle}>check your email</Text>
            <Text style={styles.sentSub}>
              we sent a sign-in link to{'\n'}{email.trim().toLowerCase()}
            </Text>
            <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: spacing.xl }}>
              <Text style={styles.ghostText}>WRONG EMAIL? START OVER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.heading}>sign in</Text>
            <Text style={styles.sub}>enter your email — we'll send you a magic link.</Text>

            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textGhost}
              value={email}
              onChangeText={t => { setEmail(t); if (step === 'error') setStep('email'); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={sendMagicLink}
              editable={step !== 'sending'}
            />

            {step === 'error' && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            {step === 'sending' ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            ) : (
              <TouchableOpacity style={styles.btn} onPress={sendMagicLink}>
                <Text style={styles.btnText}>SEND MAGIC LINK</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: colors.textMuted, fontSize: 11, letterSpacing: 6, marginBottom: spacing.xxl },
  heading: { fontFamily: fontFamilies.serifItalic, fontSize: 28, color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  sub: { color: colors.textGhost, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  input: {
    width: '100%', color: colors.textPrimary, fontSize: 15,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: spacing.md, textAlign: 'center', letterSpacing: 1,
  },
  btn: {
    marginTop: spacing.xl, borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)',
    borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xxl,
  },
  btnText: { color: colors.accent, fontSize: 11, letterSpacing: 6 },
  ghostText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  errorText: { color: '#c0614a', fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  sentBox: { alignItems: 'center', gap: spacing.md },
  sentTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 24, color: colors.textPrimary },
  sentSub: { color: colors.textGhost, fontSize: 13, textAlign: 'center', lineHeight: 22 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/AuthScreen.tsx
git commit -m "feat: add AuthScreen with magic link email flow"
```

---

## Task 7: Replace initAuth with Supabase Auth session

**Files:**
- Modify: `lib/auth.ts`

Replace UUID generation with `supabase.auth.getSession()`. Add `setAuthUser` (called by App.tsx's `onAuthStateChange`) and `signOut`.

- [ ] **Step 1: Rewrite lib/auth.ts**

Replace the entire contents of `lib/auth.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

let _userId: string | null = null;

export function getUserId(): string | null {
  return _userId;
}

export function setAuthUser(uid: string | null) {
  _userId = uid;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  _userId = null;
}

type Profile = { name: string; dob: string } | null;
type AuthResult = { userId: string | null; profile: Profile };

export async function initAuth(): Promise<AuthResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { userId: null, profile: null };
  _userId = session.user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, dob')
    .eq('user_id', _userId)
    .maybeSingle();
  return { userId: _userId, profile: profile ?? null };
}

const ZODIAC_CONTEXTS: Record<string, string> = {
  Aries: 'The user is an Aries (March 21 – April 19). They are driven and impulsive, often acting before thinking. They crave action and resist being told what to do. Use this silently to inform your framing — never mention astrology.',
  Taurus: 'The user is a Taurus (April 20 – May 20). They resist change and can be stubborn, but are deeply loyal and motivated by security and comfort. Use this silently to inform your framing — never mention astrology.',
  Gemini: 'The user is a Gemini (May 21 – June 20). They are curious and adaptable but can be scattered or inconsistent, often avoiding depth by jumping between interests. Use this silently to inform your framing — never mention astrology.',
  Cancer: 'The user is a Cancer (June 21 – July 22). They are deeply emotional and protective, often retreating inward when hurt. They may struggle to set boundaries with people they love. Use this silently to inform your framing — never mention astrology.',
  Leo: 'The user is a Leo (July 23 – August 22). They are confident and generous but have a strong need for validation and recognition. Pride can prevent them from admitting mistakes. Use this silently to inform your framing — never mention astrology.',
  Virgo: 'The user is a Virgo (August 23 – September 22). They are analytical and self-critical, often holding themselves and others to impossibly high standards. Anxiety often shows up as perfectionism. Use this silently to inform your framing — never mention astrology.',
  Libra: 'The user is a Libra (September 23 – October 22). They avoid conflict at all costs and often people-please to keep the peace, sometimes losing their own perspective in the process. Use this silently to inform your framing — never mention astrology.',
  Scorpio: 'The user is a Scorpio (October 23 – November 21). They are intense and private, rarely showing vulnerability. They hold onto grievances and may struggle to trust. Use this silently to inform your framing — never mention astrology.',
  Sagittarius: 'The user is a Sagittarius (November 22 – December 21). They crave freedom and new experiences, often escaping discomfort through movement or distraction. Commitment can feel like a cage. Use this silently to inform your framing — never mention astrology.',
  Capricorn: 'The user is a Capricorn (December 22 – January 19). They are disciplined and goal-oriented but can suppress emotions in favor of productivity. They may tie their self-worth entirely to achievement. Use this silently to inform your framing — never mention astrology.',
  Aquarius: 'The user is an Aquarius (January 20 – February 18). They value independence and original thinking but can be emotionally detached, preferring ideas over feelings. Use this silently to inform your framing — never mention astrology.',
  Pisces: 'The user is a Pisces (February 19 – March 20). They tend to be emotionally intuitive and empathetic but may struggle with escapism, avoiding hard truths, and setting boundaries. They likely have a rich inner life they rarely share fully. Use this silently to inform your framing — never mention astrology.',
};

function getZodiacSign(month: number, day: number): string {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

export function buildHoroscopeContext(dob: string | null | undefined): string {
  if (!dob) return '';
  const d = new Date(dob + 'T12:00:00');
  const sign = getZodiacSign(d.getMonth() + 1, d.getDate());
  return ZODIAC_CONTEXTS[sign] || '';
}

export async function saveProfile(name: string, dob: string): Promise<void> {
  await supabase.from('profiles').upsert({ user_id: _userId, name, dob });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If there are errors about removed `generateUUID` or old exports, confirm nothing else in the codebase imports them:

```bash
grep -r "generateUUID\|device_user_id" /c/Users/sador/unpack2 --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Expected: no results.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: replace UUID device auth with Supabase session in initAuth"
```

---

## Task 8: Wire auth flow and deep-link handling in App.tsx

**Files:**
- Modify: `App.tsx`

Add `Linking` import, subscribe to `onAuthStateChange`, handle deep links for magic-link callback, and conditionally render `AuthScreen` when there's no authenticated user.

- [ ] **Step 1: Add Linking import to App.tsx**

At the top of `App.tsx`, add `Linking` to the react-native import list:

```tsx
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Share,
  Animated, Keyboard, TouchableWithoutFeedback, BackHandler, Linking,
} from 'react-native';
```

- [ ] **Step 2: Import AuthScreen and setAuthUser**

Add to the existing import block in `App.tsx`:

```tsx
import { AuthScreen } from './screens/AuthScreen';
import { initAuth, buildHoroscopeContext, setAuthUser } from './lib/auth';
```

(`setAuthUser` is added to the existing `initAuth, buildHoroscopeContext` import.)

- [ ] **Step 3: Add handleDeepLink function to App.tsx**

Add this function inside the App component, near the other async helpers (e.g. after `initAuth` effect):

```tsx
async function handleDeepLink(url: string | null) {
  if (!url) return;
  // Magic link redirect lands as: unpack://auth#access_token=...&refresh_token=...
  const hashPart = url.includes('#') ? url.split('#')[1] : url.split('?')[1] || '';
  const params = new URLSearchParams(hashPart);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
    // onAuthStateChange will fire and update userId state automatically
  }
}
```

- [ ] **Step 4: Subscribe to onAuthStateChange and handle deep links**

Replace the existing `initAuth` useEffect in App.tsx:

```tsx
// Before (approximate):
useEffect(() => {
  initAuth().then(async ({ userId: uid, profile }) => {
    setUserId(uid);
    if (!profile) {
      setNeedsOnboarding(true);
    } else {
      setHoroscopeContext(buildHoroscopeContext(profile.dob));
      const seen = await AsyncStorage.getItem('hasSeenWelcome');
      if (!seen) setShowWelcome(true);
    }
    setAuthReady(true);
  }).catch(() => setAuthReady(true));
}, []);

// After:
useEffect(() => {
  // Subscribe to auth state changes (fires on magic-link callback too)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      setAuthUser(session.user.id);
      setUserId(session.user.id);
    } else {
      setAuthUser(null);
      setUserId(null);
    }
  });

  // Handle magic-link deep link on cold start
  Linking.getInitialURL().then(handleDeepLink);
  // Handle magic-link deep link while app is foregrounded
  const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

  // Run initAuth to restore existing session from AsyncStorage
  initAuth().then(async ({ userId: uid, profile }) => {
    if (uid) {
      setUserId(uid);
      if (!profile) {
        setNeedsOnboarding(true);
      } else {
        setHoroscopeContext(buildHoroscopeContext(profile.dob));
        const seen = await AsyncStorage.getItem('hasSeenWelcome');
        if (!seen) setShowWelcome(true);
      }
    }
    setAuthReady(true);
  }).catch(() => setAuthReady(true));

  return () => {
    subscription.unsubscribe();
    linkSub.remove();
  };
}, []);
```

- [ ] **Step 5: Add AuthScreen to the conditional render**

In App.tsx's return block, after the `if (!fontsLoaded || !authReady)` guard and before `if (needsOnboarding)`, add:

```tsx
if (!userId) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent />
        <AuthScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

So the order becomes:
1. `if (!fontsLoaded || !authReady)` → blank loading view
2. `if (!userId)` → AuthScreen
3. `if (needsOnboarding)` → OnboardingScreen
4. `if (showWelcome)` → WelcomeScreen
5. default → PagerView

- [ ] **Step 6: Handle profile load after onAuthStateChange fires**

When `onAuthStateChange` fires with a new session (after magic-link tap), `userId` changes but `needsOnboarding` hasn't been evaluated yet. Add a `useEffect` that loads the profile whenever `userId` changes (and `authReady` is true):

```tsx
useEffect(() => {
  if (!authReady || !userId) return;
  supabase
    .from('profiles')
    .select('name, dob')
    .eq('user_id', userId)
    .maybeSingle()
    .then(({ data: profile }) => {
      if (!profile) {
        setNeedsOnboarding(true);
      } else {
        setHoroscopeContext(buildHoroscopeContext(profile.dob));
        AsyncStorage.getItem('hasSeenWelcome').then(seen => {
          if (!seen) setShowWelcome(true);
        });
      }
    });
}, [userId, authReady]);
```

Remove the profile-check logic from inside the `initAuth().then(...)` block (it now lives in this effect), keeping only the `setUserId` and `setAuthReady` calls there.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Configure Supabase redirect URL**

In the Supabase dashboard → Authentication → URL Configuration → Redirect URLs, add:

```
unpack://auth
```

This step is manual — it must be done in the Supabase web UI before testing magic links.

- [ ] **Step 9: Commit**

```bash
git add App.tsx screens/AuthScreen.tsx lib/auth.ts app.json
git commit -m "feat: wire Supabase magic-link auth with deep-link handling"
```

---

## Task 9: Wipe test data and verify end-to-end

- [ ] **Step 1: Run the existing devWipe**

Open the app (using a dev build, not Expo Go). Tap the faint "DEV WIPE" button at the bottom of the Home screen. Confirm the alert. This deletes all sessions, answers, day_notes, and profiles for the current (old UUID) user.

- [ ] **Step 2: Verify tables are empty**

In the Supabase dashboard → Table Editor, confirm sessions, answers, day_notes, and profiles tables have no rows for the old UUID.

- [ ] **Step 3: Test auth flow**

1. Kill and reopen the app — AuthScreen should appear.
2. Enter your email → tap "SEND MAGIC LINK".
3. "check your email" state should appear.
4. Open the magic link in the email on the same device.
5. App should open, run onboarding (name + DOB), then enter the main app.
6. Kill and reopen the app — should skip AuthScreen and go straight to main app (session persisted).

- [ ] **Step 4: Final TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final wipe + auth integration complete"
```
