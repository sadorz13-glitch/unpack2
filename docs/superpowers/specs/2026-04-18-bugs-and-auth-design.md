# unpack2 — Bug Fixes + User Auth Design
**Date:** 2026-04-18  
**Branch:** feat/typescript-migration

---

## Overview

Four bugs to fix, one feature (user auth via magic link), and a one-time database wipe of test data.

---

## Section 1: Bug Fixes

### Bug 1 — Untappable tiles on HomeScreen

**Cause:** `onOpenStreak`, `onOpenWheel`, `onOpenWeeklyWheel` props passed to `HomeScreen` in `App.tsx` are empty no-ops (`() => {}`). The tiles render and accept taps but do nothing.

**Fix:** Remove the touch handler from those tiles so they render as non-interactive visuals (no `TouchableOpacity` wrapper). Do not implement navigation for them — the features don't exist yet.

**Files:** `App.tsx` (remove no-op props), `screens/HomeScreen.tsx` (make those tiles non-interactive).

---

### Bug 2 — Auto-recording when screens open

**Cause:** `sessionVoiceModeRef` and `therapyVoiceModeRef` are not cleared when the user swipes between PagerView tabs. If the user leaves a tab mid-session without pressing EXIT, the refs stay `true`. The silence-auto-stop loop in `startVoiceRecording` fires, transcribes (possibly empty audio), and restarts recording — even on a different tab.

**Fix:** In `App.tsx`'s `onPageSelected` handler, call `stopVoiceRecording` if `recordingRef.current` is active, then set both `sessionVoiceModeRef.current = false` and `therapyVoiceModeRef.current = false`.

**Files:** `App.tsx` (onPageSelected handler).

---

### Bug 3 — Mic untappable after speaking and sending

**Cause:** `App.tsx`'s `stopVoiceRecording` has a routing branch:
```js
if (sessionVoiceModeRef.current) submitAnswer(text); // App.tsx's OLD submitAnswer
```
This calls App.tsx's own `submitAnswer` (which uses stale App.tsx state — not SessionScreen's). SessionScreen never gets the text, never progresses, and never restarts recording. The mic then shows as idle but does nothing on tap because its `onPress` only calls `onStopVoiceRecording` when `isRecording` is true.

**Fix:**
1. In `App.tsx`'s `stopVoiceRecording`: remove the `sessionVoiceModeRef.current` routing branch. Add a `sessionVoiceSubmitRef = useRef<((text: string) => void) | null>(null)` to App.tsx. When `sessionVoiceModeRef.current` is true, call `sessionVoiceSubmitRef.current?.(text)` instead.
2. Pass `sessionVoiceSubmitRef` as a prop to `SessionScreen`. `SessionScreen` sets `sessionVoiceSubmitRef.current = submitAnswer` in a `useEffect`.
3. Make the mic button in `SessionScreen` toggle: tap when idle → `onStartVoiceRecording(setInput)`; tap when recording → `onStopVoiceRecording(setInput)`.

**Files:** `App.tsx`, `screens/SessionScreen.tsx`.

---

### Bug 4 — Calendar shows 1 dot instead of 2

**Cause:** `JournalScreen` computes `hasSession = !!calendarSessions[key]` which is `true` for both real sessions (with `id`) and journal-note-only days. Only one `sessionDot` is rendered regardless of whether both a session and a note exist.

**Fix:**
- `const hasSession = !!calendarSessions[key]?.id` — true only when a real Q&A session was completed
- `const hasNote = !!calendarSessions[key]?.hasNote` — true when a journal note exists for that day
- Render two dots side by side: gold (`colors.accent`) for session, muted (`colors.textGhost`) for journal note. Show each independently.

**Files:** `screens/JournalScreen.tsx`.

---

## Section 2: User Auth — Magic Link + DOB

### Auth Flow

```
App opens
  └─ supabase.auth.getSession()
       ├─ valid session → check profiles table for DOB
       │     ├─ profile exists → enter app (horoscope context from DOB)
       │     └─ no profile → OnboardingScreen (name + DOB) → save profile → enter app
       └─ no session → AuthScreen
             └─ user enters email → signInWithOtp()
                   └─ "check your email" state shown
                         └─ user taps magic link → deep link opens app
                               └─ parse URL → session established
                                     └─ check profile → (same as above)
```

### Deep Link Setup

- Add `"scheme": "unpack"` to `app.json` under `expo`.
- Supabase dashboard: add `unpack://auth` as allowed redirect URL.
- In `App.tsx`: use `expo-linking` to subscribe to URL events on mount and read `Linking.getInitialURL()` for cold-start links.
- On link received: extract `access_token` + `refresh_token` from URL hash, call `supabase.auth.setSession({ access_token, refresh_token })`.

### AuthScreen (new file: `screens/AuthScreen.tsx`)

- Single email `TextInput` with "SEND MAGIC LINK" button.
- On submit: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'unpack://auth' } })`.
- After submit: show "check your email" message with a "resend" link.
- No password. No confirmation UI beyond the email state.
- Same visual style as existing screens: black background, DM Serif, accent gold.

### Replace `initAuth()`

`lib/auth.ts` currently generates a device UUID and stores it in AsyncStorage. Replace with:

```ts
export async function initAuth(): Promise<AuthResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { userId: null, profile: null };
  _userId = session.user.id;
  const { data: profile } = await supabase.from('profiles').select('name, dob').eq('user_id', _userId).maybeSingle();
  return { userId: _userId, profile };
}
```

`getUserId()` continues to return `_userId` (now a Supabase Auth UID instead of device UUID). All existing `supabase` queries using `getUserId()` work unchanged.

### OnboardingScreen Changes

The existing `OnboardingScreen` asks for name + DOB. With auth, the email is already known. No changes needed to OnboardingScreen — it still collects name + DOB and calls `onComplete({ name, dob })`. App.tsx's `onComplete` handler saves to profiles via `saveProfile(name, dob)`.

### Session Persistence

`supabaseClient.ts` already configures `persistSession: true` with AsyncStorage. Returning users will have their session restored automatically — no changes needed.

---

## Section 3: Database Wipe

The existing `devWipe()` function in `App.tsx` already deletes `sessions`, `answers`, and `day_notes` for the current `userId`. 

**One addition:** also delete from `profiles` table:
```js
await supabase.from('profiles').delete().eq('user_id', userId);
```

**Trigger:** The user runs devWipe via the existing button on HomeScreen before switching to the new auth flow. This clears the old device-UUID data. After auth migration, `userId` will be a Supabase Auth UID — orphaned old data under the old UUID remains but is inaccessible and will not affect the app.

---

## Files Changed

| File | Change |
|------|--------|
| `app.json` | Add `scheme: "unpack"` |
| `App.tsx` | onPageSelected clears voice refs; `sessionVoiceSubmitRef`; wipe adds profiles; Linking handler; auth init replaced |
| `lib/auth.ts` | Replace UUID generation with Supabase session check |
| `screens/AuthScreen.tsx` | New — email input + magic link send |
| `screens/SessionScreen.tsx` | Accept + set `sessionVoiceSubmitRef`; mic button toggle |
| `screens/HomeScreen.tsx` | Remove TouchableOpacity from noop tiles |
| `screens/JournalScreen.tsx` | Dual calendar dots |

---

## Out of Scope

- OAuth providers (Google, Apple)
- Sign-out / account deletion UI
- Migrating old UUID data to new auth UID
- Streak detail, personality wheel, weekly wheel screens (tiles remain non-interactive)
