# Sentry Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sentry crash reporting and error tracking to the unpack2 Expo app with user context, selective performance monitoring, and targeted captureException calls in the existing silent-failure catch blocks.

**Architecture:** Sentry initializes in `index.ts` before the root component registers, wraps the App component tree in a native ErrorBoundary for render crashes, and adds `captureException` calls in the 15+ silent catch blocks across auth, AI, database, and storage layers. User identity is set on auth state changes in `App.tsx`. Performance monitoring is enabled at 20% sampling. Session Replay is explicitly disabled (mental health app — sensitive content).

**Tech Stack:** `@sentry/react-native` (Expo-native SDK, replaces deprecated `sentry-expo`), Expo config plugin, EAS Secrets for auth token, `EXPO_PUBLIC_SENTRY_DSN` in `.env`.

---

## Proposal: Answers to Your 6 Questions

### 1. Where to initialize Sentry

**`index.ts` — before `registerRootComponent(App)`.**

`index.ts` is the absolute first JS that executes. Initializing here (not in `App.tsx`) means Sentry catches errors that happen during app startup, before React has mounted anything. `App.tsx` is already 536 lines and manages a lot of state — init code doesn't belong there.

```typescript
// index.ts (current)
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);

// After: Sentry init goes above registerRootComponent
```

### 2. What to wrap in a Sentry error boundary

**Two levels of wrapping in `App.tsx`:**

**Level 1 — root boundary** (required): Wrap the entire `App` return value. The codebase has no error boundaries at all today. Without this, any unhandled render error crashes the whole app silently.

**Level 2 — screen-level** (recommended): Wrap each of the 5 `PagerView` children (`HomeScreen`, `SessionScreen`, `TalkScreen`, `JournalScreen`, `WritingScreen`) individually. This means a crash in `SessionScreen` (e.g., during AI generation render) won't kill `HomeScreen`. Given `SessionScreen` and `TalkScreen` are the riskiest (Claude calls, complex state), this is worth doing.

`@sentry/react-native` exports `Sentry.ErrorBoundary` — use that rather than writing a custom class component.

### 3. Where to add `captureException` calls

The codebase has 15+ silent catch blocks. Here is the priority-ordered list — all currently swallow errors completely:

**Tier 1 — add captureException (errors users will notice):**
- `lib/ai/client.ts` — `callClaude()` and `callClaudeChat()` — fetch failures to the claude-proxy edge function; these cause blank session responses
- `lib/ai/session.ts:37` — `generateInsightAndTraits()` — has **no try/catch at all** today; a thrown error here will propagate uncaught and crash; needs try/catch + captureException added
- `screens/AuthScreen.tsx:27-45` — Apple Sign-In `catch (e: any)` and Google Sign-In catch — auth failures are high-value signals
- `lib/auth.ts` — `deleteAccount()` edge function call already throws on error; add `captureException` to the caller's catch in `App.tsx`/`SettingsSheet`

**Tier 2 — add captureException (silent data failures):**
- `lib/supabase/index.ts:43-211` — all 4 functions (`loadStreakAndCount`, `loadAllAnswers`, `loadWeeklyTraits`, `loadLastSession`) silently return empty/null on DB failure
- `lib/offlineQueue.ts:9-14` — `getQueue()` silently returns `[]` if AsyncStorage fails
- `lib/journalHelpers.ts:5-27` — all 3 functions have empty `catch (e) {}` blocks

**Tier 3 — skip or use breadcrumb only (expected/non-actionable failures):**
- `lib/iap.ts:14` — `Purchases.logOut()` — RevenueCat logout failures are non-critical
- `hooks/useSubscription.ts:14,30` — `.catch(() => false)` — premium check fallback is intentional graceful degradation
- `lib/analytics.ts:4` — Mixpanel init `.catch(() => {})` — analytics failure should never surface
- `lib/notifications.ts:28-52` — empty notification catch — acceptable; use a Sentry breadcrumb here instead of captureException

### 4. How to handle the DSN

**Yes — `EXPO_PUBLIC_SENTRY_DSN` in `.env`.**

The `EXPO_PUBLIC_` prefix bakes it into the JS bundle at build time (required for Expo — there's no runtime env access). This is standard practice for Sentry DSNs; the DSN is not a secret (it's visible in any installed app). Your `.env.example` already uses this pattern for Supabase URL, anon key, Mixpanel token, etc.

Add two vars:
```
EXPO_PUBLIC_SENTRY_DSN=https://...@o....ingest.eu.sentry.io/...  # Your EU DSN
SENTRY_AUTH_TOKEN=sntrys_...  # Build-time only, for sourcemap upload — NOT EXPO_PUBLIC_
```

`SENTRY_AUTH_TOKEN` should go in EAS Secrets (`eas secret:create --name SENTRY_AUTH_TOKEN --value ...`) — it never touches the bundle.

### 5. Optional features

**Enable: Performance monitoring** — yes, at `tracesSampleRate: 0.1` (10%). The app makes Claude proxy calls, Supabase queries, and session saves that are worth timing. Keep the sample rate low in production to avoid hitting Sentry's quota.

**Enable: User context tagging** — yes, strongly. `lib/auth.ts` exports `getUserId()`. In `App.tsx`, the `onAuthStateChange` listener already fires on sign-in/sign-out — add `Sentry.setUser({ id: userId })` on sign-in and `Sentry.setUser(null)` on sign-out. This makes every error report linkable to a specific user without storing PII.

**Do NOT enable: Session Replay** — this app records therapy sessions, journal entries, and mental health answers. Sentry Session Replay captures screen recordings of the app. Enabling it would capture user's raw therapy content and potentially violate your privacy policy. Skip it entirely.

**Enable: Offline caching** — `@sentry/react-native` caches events when offline and flushes them on reconnect. This is on by default and valuable for a mobile app with your existing offline-first architecture.

### 6. Expo-specific setup

**Package:** Use `@sentry/react-native` directly — **not** `sentry-expo`. `sentry-expo` was a thin wrapper that was deprecated in 2024; Sentry's official Expo support is now built into `@sentry/react-native`.

**Config plugin in `app.json`:** Add to the `plugins` array:
```json
["@sentry/react-native/expo", {
  "organization": "valecrest-org",
  "project": "react-native"
}]
```

**Sourcemap upload:** The config plugin handles this automatically during `eas build`. You need `SENTRY_AUTH_TOKEN` in EAS Secrets (see above). Without sourcemaps, stack traces in Sentry will show minified/bundled code — unreadable. This is worth setting up.

**New Architecture:** `app.json` has `"newArchEnabled": false` — no special Sentry config needed for old arch.

**`@sentry/wizard`:** Sentry provides `npx @sentry/wizard@latest -i reactNative` which auto-patches `index.ts`, `app.json`, and `.env`. You can use it, but it tends to be aggressive — review every change it makes before committing.

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `@sentry/react-native` |
| `app.json` | Add `@sentry/react-native/expo` config plugin |
| `.env` + `.env.example` | Add `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| `index.ts` | Sentry.init() before registerRootComponent |
| `App.tsx` | Root ErrorBoundary + screen-level boundaries + setUser on auth change |
| `lib/ai/client.ts` | captureException in Claude fetch error handler |
| `lib/ai/session.ts` | Add try/catch + captureException to generateInsightAndTraits |
| `lib/supabase/index.ts` | captureException in 4 silent catch blocks |
| `lib/offlineQueue.ts` | captureException in getQueue catch |
| `lib/journalHelpers.ts` | captureException in 3 empty catch blocks |
| `lib/notifications.ts` | Sentry.addBreadcrumb in notification catch |
| `screens/AuthScreen.tsx` | captureException in Apple/Google auth catch |

---

## Task Breakdown (pending your approval)

### Task 1: Install dependencies and configure Expo plugin
- Install `@sentry/react-native`
- Add config plugin to `app.json`
- Add DSN vars to `.env` and `.env.example`

### Task 2: Initialize Sentry in `index.ts`
- `Sentry.init()` with DSN, environment, tracesSampleRate: 0.1

### Task 3: Add root + screen-level Error Boundaries in `App.tsx`
- Wrap return in `<Sentry.ErrorBoundary>`
- Wrap each of the 5 screen components individually

### Task 4: Wire user context to auth state in `App.tsx`
- `Sentry.setUser({ id })` on sign-in in `onAuthStateChange`
- `Sentry.setUser(null)` on sign-out

### Task 5: Add captureException to Tier 1 silent failures
- `lib/ai/client.ts` — Claude proxy fetch errors
- `lib/ai/session.ts` — add missing try/catch + captureException

### Task 6: Add captureException to Tier 2 silent failures
- `lib/supabase/index.ts` (4 functions)
- `lib/offlineQueue.ts`
- `lib/journalHelpers.ts`
- `lib/notifications.ts` (breadcrumb)
- `screens/AuthScreen.tsx`

### Task 7: Verify + commit
- Run `npx expo start` and confirm no init errors
- Test error boundary by triggering a throw in dev
- Commit and confirm sourcemaps upload on next EAS build
