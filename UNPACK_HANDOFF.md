# Unpack — Full Project Handoff

> **Reading this as Claude.ai (not Claude Code)?** This document covers both the technical codebase and the broader launch checklist. Sections marked 🤖 are primarily for Claude Code. Sections marked 💬 are for drafting copy, policy, or manual setup steps. All sections are useful as context.

---

## Project Structure (as of 2026-05-03)

All Valecrest projects now live under a single parent directory:

```
C:\Users\sador\valecrest\
├── apps/
│   ├── unpack/     ← this repo (React Native app, formerly unpack2/)
│   └── groundwork/ ← future app placeholder
├── agents/         ← Claude agent orchestration workspace (formerly valecrest-agents/)
└── site/           ← letsunpack.app website (formerly valecrest-agents/letsunpack-site/)
```

On laptop: same structure under `C:\Users\<username>\valecrest\`. Clone each repo fresh — do not copy from old paths.

---

## What is Unpack?

A journaling app. Tagline: "The new way to journal." Not marketed as a therapy app — leads with journaling because that market is larger. The AI analysis and therapy features are what surprise and retain users after downloading.

**Core insight:** Most people want to journal but don't because the blank page is too much work. Unpack removes that friction — the app asks the questions, you just answer honestly.

**Tone:** Like a warm, direct, slightly confrontational middle-aged woman therapist. Not fluffy. Not clinical. Honest.

**Design:** Editorial Minimalism — Ivory & Ink palette (light mode default: #fbf9f9 background with #1a1a1a ink). Dark mode preserves gold (#b48c5a) as primary accent. Italic serif headlines (Playfair Display), Inter for body. See DESIGN.md for the complete design system.

**Owner/Developer:** Based in the Netherlands (EU). Google account: valecrestgroup. Apple Developer account: verified, Team ID configured in Supabase Apple provider, Sign in with Apple live end-to-end.

---

## Tech Stack

- **Frontend:** React Native with Expo (SDK 54), tested via Expo Go on iPhone 14 Pro (iOS)
- **React Native Architecture:** New Architecture enabled (`newArchEnabled: true` in app.json) — required by react-native-reanimated 4.x + react-native-worklets; aligns with Expo SDK 54 / RN 0.81 direction
- **Design system:** See `DESIGN.md` at the unpack root for color tokens, typography, spacing, components, screen specs
- **Backend:** Supabase (PostgreSQL, free tier) — project ref `dehnyyneriiiwetvkjnj`
- **AI:** Anthropic Claude API (`claude-sonnet-4-5`), routed through Supabase Edge Functions
- **Speech-to-text:** OpenAI Whisper, routed through Supabase Edge Function
- **Text-to-speech:** ElevenLabs, routed through Supabase Edge Function
- **Auth:** Supabase Auth — Sign in with Apple + Google Sign-In (passwordless, no email/password)
- **Analytics:** Mixpanel (EU data region, GDPR-compliant)
- **Crash reporting:** Sentry ✅ (`@sentry/react-native` ^8.11.1, EU region, DSN in `.env`, production-only init)
- **Subscriptions:** RevenueCat — fully configured. Products: monthly ($6.99), annual ($34.99 with 7-day trial), revival ($0.99 consumable). Entitlement: premium.
- **Domain:** letsunpack.app — live, hosting privacy policy and terms via Termly embed
- **Privacy/Terms:** Hosted at letsunpack.app/privacy and letsunpack.app/terms. Support email support@letsunpack.app live.

### 🤖 Dependencies (package.json — key entries)

```json
{
  "@anthropic-ai/sdk": "^0.82.0",
  "@react-native-async-storage/async-storage": "2.2.0",
  "@react-native-google-signin/google-signin": "...",
  "@supabase/supabase-js": "^2.101.1",
  "@expo-google-fonts/playfair-display": "^0.4.2",
  "@expo-google-fonts/inter": "^0.4.2",
  "expo": "~54.0.33",
  "expo-apple-authentication": "~8.0.8",
  "expo-av": "...",
  "expo-build-properties": "~1.0.10",
  "expo-notifications": "...",
  "@sentry/react-native": "^8.11.1",
  "lucide-react-native": "^1.14.0",
  "mixpanel-react-native": "...",
  "react-native-purchases": "^8.0.0",
  "react-native-pager-view": "6.9.1",
  "react-native-reanimated": "~4.1.1 (installed 4.1.7)",
  "react-native-worklets": "0.5.1",
  "react-native-svg": "15.12.1"
}
```

Note: react-native-reanimated is no longer in expo.install.exclude — v4 is the Expo SDK 54 recommended version with New Architecture.

`npm install` has been run. `npm audit fix` run — cleared 1 high severity vuln. 21 remaining are all dev-only, not shipped.

### 🤖 app.json — current state

```json
{
  "expo": {
    "name": "unpack2",
    "slug": "unpack2",
    "version": "1.0.0",
    "scheme": "unpack",
    "orientation": "portrait",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.zute.unpack2"
    },
    "android": {
      "package": "com.zute.unpack2"
    },
    "plugins": [
      "expo-av",
      ["expo-notifications", { "icon": "./assets/icon.png", "color": "#b48c5a" }],
      ["expo-build-properties", {
        "ios": { "deploymentTarget": "15.1" },
        "android": { "enableJetifier": true }
      }],
      "expo-font",
      "expo-apple-authentication",
      "expo-secure-store",
      ["@react-native-google-signin/google-signin", {
        "iosUrlScheme": "com.googleusercontent.apps.REPLACE_WITH_REVERSED_IOS_CLIENT_ID"
      }],
      "@sentry/react-native/expo"
    ],
    "extra": { "eas": { "projectId": "d2a1e525-0ac7-4148-872a-9dd5a2233871" } },
    "owner": "zute"
  }
}
```

**Pending changes:** `name` should be changed from `"unpack2"` to `"Unpack"` before App Store submission. `iosUrlScheme` placeholder needs replacing once Google iOS client ID is available.

**withFollyCoroutinesFix:** Not referenced in the plugins array. withFollyCoroutinesFix.js kept on disk at plugins/withFollyCoroutinesFix.js for revert safety, but not referenced in plugins array.

**babel.config.js:** Just uses babel-preset-expo, no explicit reanimated plugin entry required.

---

## Keys

All secrets live in either `.env` (client-side, gitignored) or Supabase Edge Function secrets (server-side).

### .env (client-readable via `process.env.EXPO_PUBLIC_*`)

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_MIXPANEL_TOKEN=...           ← added, EU region token
EXPO_PUBLIC_SENTRY_DSN=...              ← added, EU region DSN (ingest.de.sentry.io)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...     ← placeholder, not yet filled
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...     ← placeholder, blocked on Apple verification
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...       ← placeholder, blocked on Apple verification
```

**Note:** `EXPO_PUBLIC_*` keys are bundled into the app binary and visible to anyone who downloads the app. All AI keys (Anthropic, OpenAI, ElevenLabs) have been moved to Supabase Edge Function secrets and are never in `.env`.

### Supabase Edge Function Secrets (server-side, safe)

These are set in Supabase Dashboard → Project `dehnyyneriiiwetvkjnj` → Settings → Edge Functions → Secrets. **Already added:**

- `ANTHROPIC_KEY`
- `OPENAI_KEY`
- `ELEVENLABS_KEY`
- `ELEVENLABS_VOICE_ID`

**Old hardcoded keys were in git history before 2026-04-19. All keys were rotated after moving to secrets.**

---

## Supabase Schema

### `sessions`
| Column | Type |
|--------|------|
| id | int8 (PK) |
| user_id | text |
| created_at | timestamp |
| insight | text |
| topic | text |
| traits | jsonb |
| insight_short | text |

### `answers`
| Column | Type |
|--------|------|
| id | int8 (PK) |
| session_id | int8 (FK → sessions.id) |
| question | text |
| answer | text |
| created_at | timestamp |

### `day_notes`
| Column | Type |
|--------|------|
| id | int8 (PK) |
| user_id | text |
| date | text (YYYY-MM-DD) |
| note | text |
| created_at | timestamptz |
| time_label | text |

### `profiles`
| Column | Type |
|--------|------|
| user_id | text (PK) |
| name | text |
| dob | text |
| vent_messages_used | integer (default 0) |

### `streak_revivals` ✅ (created 2026-05-03)
| Column | Type |
|--------|------|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| revived_date | date |
| created_at | timestamptz |

Unique constraint on `(user_id, revived_date)` — one revival per day. RLS enabled. `increment_vent_messages(user_uuid uuid)` PostgreSQL function is live — atomically increments and returns new count.

### `rate_limits` ✅ (created 2026-04-30)
| Column | Type |
|--------|------|
| user_id | uuid (PK composite) |
| endpoint | text (PK composite) |
| window_start | timestamptz (PK composite) |
| count | integer |

RLS enabled on `rate_limits`. The `increment_rate_limit` PostgreSQL function is live.

**RLS status:** All four tables have Row Level Security enabled (enabled 2026-04-30). Policies use `user_id::uuid = auth.uid()` to handle mixed column types across tables.

---

## App Architecture 🤖

### Navigation
PagerView with 4 tabs (Today, Talk, Journal, Analytics), managed by `activeTab` state in `App.tsx`. `BottomTabBar` component handles tab switching. All tabs stay mounted — data is loaded per-screen on mount, not on tab focus.

Sessions are no longer a tab — launched via the REFLECT NOW button on Today screen as a full-screen modal overlay. Settings is no longer a tab — opened from the gear icon on Today screen. WritingScreen is no longer a tab — opened via the FAB (pencil button) on Journal screen. Analytics is a new tab (replacing the old Write tab) that houses both the post-session insight reveal and a chronological archive of all past insights.

### Screens
| File | Tab/Modal | Description |
|------|-----------|-------------|
| `screens/AuthScreen.tsx` | — | Apple + Google sign-in (unchanged logic) |
| `screens/HomeScreen.tsx` (also exports `TodayScreen`) | 0 "Today" | Daily Feature + Talk-It-Out card + Membership card + Archive feed |
| `screens/SessionScreen.tsx` | Modal from Today | Intro screen + 3-question flow with new editorial UI |
| `screens/TalkScreen.tsx` | 1 "Talk" | Vent screen — "Speak into the ether" with reactive waveform |
| `screens/JournalScreen.tsx` | 2 "Journal" | Calendar + Monthly Highlights + Selected Reflections + FAB |
| `screens/AnalyticsScreen.tsx` | 3 "Analytics" | NEW — posterized insight quotes, share + deeper look, related entries, chronological archive |
| `screens/PaywallScreen.tsx` | Modal at gates | NEW — "Infinite Journal" branded paywall with Monthly/Annual cards |
| `screens/WritingScreen.tsx` | Modal from Journal FAB | Free-write journal (visual rewrite deferred to v1.1) |
| `screens/WelcomeScreen.tsx` | — | First-launch welcome (visual rewrite deferred to v1.1) |
| `components/OnboardingScreen.tsx` | — | 3-step onboarding (sign in → name → DOB) — fully redesigned |
| `components/SettingsSheet.tsx` | Modal from gear icon | Full settings + new Appearance theme picker (Light/Dark/System) |

### Render Guard Order (App.tsx)
1. `!fontsLoaded || !authReady` → blank black screen
2. `!userId` → AuthScreen
3. `needsOnboarding` → OnboardingScreen
4. `showWelcome` → WelcomeScreen
5. Main PagerView

### Today Screen Sections (HomeScreen, in order)
1. **Daily Feature** — editorial header with date + AI-themed title + hero image card with quote + REFLECT NOW button
2. **Talk-It-Out card** — entry point to Vent
3. **Membership card** (free users only) — Infinite Journal upsell with UNLOCK ACCESS button
4. **The Archive** — chronological list of past reflections with tags + read time

---

## Design System (Ivory & Ink) 🤖

The app uses a centralized design system defined in `DESIGN.md`. Key components:

- **`components/ui/`** — 18 typed primitives: PillButton, OutlinedPillButton, IconButton, Card, HeroImageCard, Tag, FAB, ProgressSegments, SectionDivider, MicButton, WaveformBar, TabBarItem, ListRow, ToggleSwitch, RadioButton, TextInput, PricingCard, Toast
- **`theme.ts`** — exports `useTheme()` hook, `ThemeProvider`, color tokens (light + dark), typography, spacing, radius, shadows
- **Theme mode** — stored in AsyncStorage as `theme_mode` (`'light' | 'dark' | 'system'`), default `'system'`. Settings → Appearance section to change.
- **Fonts** — Playfair Display Bold Italic (headlines) + Inter (body, labels, buttons)
- **Icons** — Lucide React Native, 24px outline, stroke weight 1.5

---

## Auth Flow 🤖

Passwordless social auth via Supabase:

1. User taps "Continue with Apple" or "Continue with Google" on `AuthScreen`
2. Apple: `expo-apple-authentication` → `AppleAuthentication.signInAsync()` → passes identity token to `supabase.auth.signInWithIdToken({ provider: 'apple' })`
3. Google: `@react-native-google-signin/google-signin` → `GoogleSignin.signIn()` → passes ID token to `supabase.auth.signInWithIdToken({ provider: 'google' })`
4. `onAuthStateChange` fires in `App.tsx` → fetches profile → shows OnboardingScreen (first time) or main app
5. On subsequent opens, `initAuth()` calls `supabase.auth.getSession()` to restore session

**Status:** Code is complete. Not testable in Expo Go — requires dev build + Apple/Google credentials configured. Blocked on Apple Developer ID verification.

**Google configured in AuthScreen:** `GoogleSignin.configure({ webClientId, iosClientId, scopes: ['profile', 'email'] })` — both client IDs come from `constants.ts` → `.env`.

**lib/auth.ts exports:**
- `initAuth()` — call on app mount, returns `{ userId, profile }`
- `setAuthUser(uid)` — updates module-level `_userId` (used by data helpers)
- `getUserId()` — returns current `_userId` for use in data queries
- `signOut()` — signs out of Supabase and clears `_userId`
- `deleteAccount()` — invokes delete-account edge function, then signs out and clears `_userId`
- `buildHoroscopeContext(dob)` — returns zodiac context string for AI prompts
- `saveProfile(name, dob)` — upserts profile row

---

## Silent Layers 🤖

### Horoscope Layer
DOB collected during onboarding. `buildHoroscopeContext(dob)` in `lib/auth.ts` derives the user's zodiac sign and returns a tailored context string. Injected silently into all Claude prompts via `horoscopeContext` state. Never shown to user.

### Topic Memory
- `handledTopics` — topics the user marked done, persisted in AsyncStorage
- `flaggedTopics` — topics where user said "I don't know", gets gentler tone in Talk It Out
- Both injected into Talk It Out opening prompt

---

## Key Functions 🤖

### AI Calls
| Function | Purpose | Model | Max Tokens |
|----------|---------|-------|-----------|
| `getTransition()` | Bridge between questions | claude-sonnet-4-5 | 60 |
| `generateInsightAndTraits()` | Post-session insight + trait scores + topic + insightShort | claude-sonnet-4-5 | 300 |
| `generateDeepDive()` | Deeper analysis — connects answers to traits + past themes | claude-sonnet-4-5 | 400 |
| `generateQuestion()` | AI-generated personalised question | claude-sonnet-4-5 | 60 |
| `openTherapySession()` | Talk It Out opening message | claude-sonnet-4-5 | 200 |
| `sendTherapyMessage()` | Talk It Out reply | claude-sonnet-4-5 | 80 |
| `loadTherapyPreview()` | Tile + banner preview line | claude-sonnet-4-5 | 60 |
| Topic extraction (×2) | Extract topic label from message | claude-sonnet-4-5 | 15 |

All AI calls route through Supabase Edge Functions (claude-proxy, whisper-proxy, elevenlabs-proxy). Keys are server-side only.

### Data Functions
- `saveSession()` — saves session, answers, insight, traits, insight_short to Supabase
- `loadStreakAndCount()` — calculates streak from sessions + day_notes + **streak_revivals** dates
- `loadAllAnswers()` — loads all sessions + answers grouped by date
- `loadCalendarMonth()` — fetches sessions + day_notes for a month in parallel (Promise.all), returns map with dots
- `saveJournalEntry()` — inserts new row into day_notes
- `loadJournalEntries(date)` — fetches all journal entries for a specific date
- `loadWeeklyTraits()` — averages trait scores across last 7 days, only returns data if 5+ sessions exist
- `getVentCount()` — reads `profiles.vent_messages_used` (server count, anti-reinstall-bypass)
- `incrementVentCount()` — calls `increment_vent_messages` RPC, returns new server count
- `recordStreakRevival(date)` — inserts row into `streak_revivals`

---

## Security Work Completed 🤖

Done as part of pre-launch hardening (commits from 2026-04-19 to 2026-04-30):

| Area | Status | What was done |
|------|--------|---------------|
| API key protection | ✅ | All AI keys moved to Supabase Edge Function secrets. Old keys rotated. |
| Input validation | ✅ | `sanitizeInput()` added, name maxLength, all therapy topics sanitized |
| Rate limiting | ✅ | Per-user hourly caps on claude-proxy, whisper-proxy, elevenlabs-proxy. Auth cooldown. `rate_limits` table live. |
| Auth hardening | ✅ | Explicit answer filter, null guards, `saveProfile` auth check |
| Sign in with Apple | ✅ code | Code complete. Infrastructure blocked on Apple ID verification. |
| Google Sign-In | ✅ code | Code complete. Web client still needs creating; iOS client blocked on Apple. |
| RLS — rate_limits | ✅ | Enabled, no client-read policy |
| RLS — main tables | ✅ | sessions, answers, day_notes, profiles all protected (2026-04-30) |
| Account deletion | ✅ | delete-account Edge Function deployed. SettingsSheet gear → two-step typed DELETE → wipes all rows + auth user. |
| Offline handling | ✅ | Full implementation across all screens (2026-04-30). Home cache, pending session retry, journal queue, AI feature gates. |

---

## Analytics & Monetization 🤖

### Mixpanel (analytics)
- Account created, EU data region, project "Unpack"
- Token in `.env` as `EXPO_PUBLIC_MIXPANEL_TOKEN` ✅
- `lib/analytics.ts` reads token at startup — silently disabled if missing
- Events tracked: activation, retention, session completion, paywall views (see `lib/analytics.ts`)

### RevenueCat (subscriptions) — BLOCKED ⏳
- Package `react-native-purchases` installed
- `lib/iap.ts` wired up — calls `Purchases.configure()` at module level with iOS key
- **Blocked on:** Apple Developer ID verification → then App Store Connect products → then RevenueCat dashboard setup
- Planned products:
  - `com.zute.unpack2.premium.monthly` — $6.99/month
  - `com.zute.unpack2.premium.annual` — $34.99/year, 7-day free trial
  - `com.zute.unpack2.revival` — $0.99 consumable, "Reclaim Your Streak" (restore one missed day)
- Planned entitlement: `premium` (Talk It Out unlimited, voice AI analysis, Weekly Wheel)
- Paywall placement: wired into onboarding flow
- Revival is a **consumable** IAP, not a subscription — needs separate product in App Store Connect

### Sentry (crash reporting) — ✅ FULLY INTEGRATED
- Account: Valecrest org, EU region (`ingest.de.sentry.io`)
- `@sentry/react-native` ^8.11.1 installed; Expo config plugin in `app.json`
- Init in `index.ts` before `registerRootComponent` — wraps `App` via `Sentry.wrap()`
- **Production-only** (`!__DEV__` guard) — no Sentry noise during local development
- 10% trace sampling; Session Replay **disabled** (sensitive mental health content)
- `Sentry.setUser()` called on auth state changes in `App.tsx`
- Screen-level `<Sentry.ErrorBoundary>` wraps each PagerView tab screen
- `captureException` in: `callClaude`, `callClaudeChat`, `generateInsightAndTraits`, Apple/Google auth catch blocks, all Supabase data functions, `offlineQueue`, `journalHelpers`
- Breadcrumb (not captureException) in `notifications.ts` — non-critical
- `EXPO_PUBLIC_SENTRY_DSN` in `.env` (DSN is not a secret — safe to bundle)
- `SENTRY_AUTH_TOKEN` should go in EAS Secrets for sourcemap upload at build time — **not yet added**

---

## Legal & Compliance 💬

### Privacy Policy
- Drafted via Termly ✅, saved as local text file
- Covers: GDPR, CCPA, and major US state laws
- Disclosures: Mixpanel analytics, Supabase, Anthropic AI processing, RevenueCat billing, push notifications, user inference/profiling (horoscope layer), EU-to-US data transfers via Standard Contractual Clauses
- Will be embedded at **letsunpack.app/privacy** via Termly HTML embed
- **Blocked on:** Porkbun domain ID verification going live

### Terms & Conditions
- Drafted via Termly ✅, saved as local text file
- Will be embedded at **letsunpack.app/terms**
- **Blocked on:** Porkbun domain ID verification going live

### Things the app must actually do (Privacy Policy says so)
These are **code tasks** — the policy describes them as features, so the app needs to implement them:

| Obligation | Status |
|-----------|--------|
| Delete all user data when account is deleted | ✅ Built — delete-account edge function deletes answers, sessions, day_notes, rate_limits, profiles, then auth user |
| Email opt-out mechanism | ❌ Not built |
| Data access/deletion request contact visible in app | ❌ Not built (needs support@letsunpack.app) |
| Update PRIVACY_POLICY_URL in constants.ts | ⏳ Blocked on domain going live |
| Update TERMS_URL in constants.ts | ⏳ Blocked on domain going live |
| Update support contact once domain email is live | ⏳ Blocked on domain email setup |
| Re-review privacy policy when Google Sign-In goes live | ⏳ After launch |

---

## Module Structure 🤖

```
constants.ts          — keys (via process.env), questions, traits, PRIVACY_POLICY_URL, TERMS_URL
theme.ts              — colors, spacing, font families, useTheme() hook, ThemeProvider
index.ts              — registerRootComponent entry point
App.tsx               — root component, auth init, tab navigation, voice recording engine
DESIGN.md             — complete design system reference (tokens, typography, components, screen specs)
lib/
  auth.ts             — Supabase auth, profile fetch, horoscope context, zodiac logic
  supabase/
    client.ts         — Supabase client singleton
    index.ts          — data functions (saveSession, loadStreakAndCount, etc.)
  api.ts              — Claude API calls (routed through edge functions)
  talkHelpers.ts      — Talk It Out helpers
  journalHelpers.ts   — day_notes CRUD
  calendarHelpers.ts  — calendar month query (parallel fetches)
  analytics.ts        — Mixpanel event tracking
  iap.ts              — RevenueCat in-app purchase logic
  dailyFeature.ts     — useDailyFeature() stub hook (returns hardcoded fallback, ready for CDN wiring)
  monthlyHighlights.ts — useMonthlyHighlights() stub hook (returns empty array, ready for Edge Function)
screens/
  AuthScreen.tsx      — Apple + Google sign-in
  HomeScreen.tsx      — Today screen (also exports TodayScreen alias)
  SessionScreen.tsx   — question session + voice
  TalkScreen.tsx      — vent screen with reactive waveform
  JournalScreen.tsx   — calendar + monthly highlights + journal
  AnalyticsScreen.tsx — posterized insight cards + chronological archive (NEW)
  PaywallScreen.tsx   — Infinite Journal paywall (NEW)
  WelcomeScreen.tsx   — first-launch welcome
components/
  ui/                 — 18 typed primitives (see Design System section)
  Radar.tsx           — radar chart (MiniRadar, FullRadar)
  ShimmerTile.tsx     — loading shimmer
  OnboardingScreen.tsx — 3-step onboarding (sign in → name → DOB)
  BottomTabBar.tsx    — 4-tab navigation bar (TODAY, TALK, JOURNAL, ANALYTICS)
  DeepDiveModal.tsx   — "DEEPER LOOK" full-screen modal, calls generateDeepDive()
  RevivalModal.tsx    — "Reclaim your streak" $0.99 IAP modal
  SettingsSheet.tsx   — settings + Appearance theme picker (Light/Dark/System)
```

---

## What's Working ✅

- Sign in with Apple + Google (code complete — needs dev build to test)
- Onboarding (name + DOB) on first sign-in, welcome screen on first launch
- Horoscope context derived from DOB, injected into all AI prompts
- 4-tab PagerView navigation (TODAY, TALK, JOURNAL, ANALYTICS) with active state dot
- Today screen: Daily Feature (editorial header + hero card + REFLECT NOW), Talk-It-Out card, Membership card (free users), The Archive feed
- 3-question session flow with AI bridges between questions
- AI-generated personalised questions (after 3 sessions, static fallback before)
- Voice input throughout session — mic button toggles start/stop
- Post-session flame celebration screen with streak reveal and animated flame burst
- Journal Calendar — month navigation, colour-coded dots (blue=session, red=journal, gold=both)
- My Answers — all history, today's editable, SAVE button with checkmark
- Your Insight — full screen, share button
- Your Journal — multi-entry per day, timestamps, "Previously written" archive
- Talk It Out — full therapy chat, topic memory, flagged topics, long-press to mark done
- Rate limiting on all AI endpoints (per-user hourly cap)
- Mixpanel analytics events firing
- Paywall in onboarding flow — RevenueCat fully configured (monthly, annual, revival products live)
- Account deletion — Settings gear on HomeScreen → SettingsSheet → "Delete account" → warning step → type "DELETE" → wipes all data + auth user
- Offline handling — all screens degrade gracefully when offline
- Sentry crash reporting — init in `index.ts`, screen ErrorBoundaries, captureException across all critical paths, user context tagging on auth (production-only)
- Notification time preferences — Settings gear → "Notification reminder" → adjustable hour/minute + enable/disable toggle, persisted in AsyncStorage
- "SHARE INSIGHT" button on session complete screen — native iOS Share sheet
- "READ MORE" → Deep Dive modal on session complete — AI analysis (400 tokens) cross-referencing answers, traits, and past insights
- Streak revival — "RECLAIM" button on streak tile when streak is 0 but yesterday had activity; $0.99 IAP via `RevivalModal`, records to `streak_revivals` table, streak recalculates immediately
- Vent count is now server-authoritative — `profiles.vent_messages_used` column + `increment_vent_messages` RPC prevent reinstall bypass
- Notification identifiers — daily reminder and streak reminders use named IDs, no longer call `cancelAllScheduledNotificationsAsync` (was wiping daily reminder): AuthScreen blocks sign-in, SessionScreen blocks session start, TalkScreen dims starter bubble, JournalScreen queues writes to AsyncStorage, WritingScreen blocks AI. OfflineBanner shown app-wide. Home cache serves stale data while loading. Pending session retries on reconnect.
- Premium gating fully wired — 1 session/day for free users (`hasSessionToday` gate in `beginSession()` + `handleKeepGoing()`), 5 Vent messages (`profiles.vent_messages_used` server count), no Deep Dive, no TTS audio (`guardedSpeakAndWait` no-ops for free users). `PaywallScreen` modal wired at all gates.
- Vent mic mode — hands-free conversational loop: mic auto-starts after TTS finishes, transcription auto-submits to `sendTherapyMessage`, TTS plays reply, repeat. 30s hard timeout with force-stop UI message. `therapyVoiceModeRef` / `therapyVoiceSubmitRef` route transcribed text to the vent bot.
- Vent bot probing questions — system prompt leads with hard rule ("You MUST end every response with a probing question. NO EXCEPTIONS.") in both `openTherapySession` and `sendTherapyMessage`. Contradicting instructions removed.
- Personality Wheel tap fixed — SVG was intercepting touches on iOS; wrapped `<MiniRadar>` in `<View pointerEvents="none">` so the parent `TouchableOpacity` receives the tap.
- Session gate on "Keep Going" — `handleKeepGoing()` in `SessionScreen.tsx` now checks `!isPremium && hasSessionToday` and shows paywall, matching the `beginSession()` gate.
- Streak animation fires once per day — guarded by `AsyncStorage` key `lastStreakAnimDate` (YYYY-MM-DD, manually constructed) + in-memory `streakAnimatedTodayRef` (prevents double-fire within the same launch).
- VAD ambient baseline + hysteresis — 1.5s calibration window at startup (resets if TTS is speaking), `baselineDb + 12` for both onset and silence thresholds, 3-consecutive-sample hysteresis before silence can be broken. `forceStopCount` state in `useVoice` surfaces 30s timeouts to the UI.
- Journal textbox iOS lineHeight — fixed displacement (text shifted down on first paint) by using `lineHeight: 22` on iOS instead of removing lineHeight entirely (which caused oversized text at system default).
- ✅ Editorial redesign complete — Ivory & Ink design system, 8 screens rebuilt (Today, Session, Talk, Journal, Analytics, Settings, Paywall, Onboarding) — 2026-05-11
- ✅ Theme system — light/dark/system mode with persisted preference, toggle in Settings → Appearance — 2026-05-11
- ✅ Reactive Vent waveform — animates to both user voice AND TTS playback amplitude — 2026-05-11
- ✅ Posterized Insight cards in Analytics — past insights chronologically archived — 2026-05-11
- ✅ Daily Feature stub on Today — `useDailyFeature()` hook with placeholder data, ready for production CDN fetch — 2026-05-11
- ✅ Monthly Highlights stub on Journal — `useMonthlyHighlights()` hook with empty array, ready for Edge Function wiring — 2026-05-11
- ✅ Onboarding 3-step flow — sign in → name → DOB with redesigned UI — 2026-05-11
- ✅ New 4-tab bottom bar (TODAY, TALK, JOURNAL, ANALYTICS) with active state indicator dot — 2026-05-11
- ✅ EAS build #11 succeeded — New Architecture + react-native-reanimated 4.1.7 + react-native-worklets 0.5.1 confirmed working on device (2026-05-12)
- ✅ EAS Build #11 — 2026-05-12 — reanimated 4 migration (New Architecture enabled), resolved persistent folly/coro build failure; tested on device
- ✅ Pre-submission blockers batch resolved — 2026-05-13 — crisis resources screen (6 countries, dialable rows), DOB/zodiac onboarding disclosure, AI-generated content labels across 5 surfaces (AILabel component), paywall trial conditional + disclosure text + Privacy link, WCAG AA fix on tab labels, status bar fix on cream backgrounds, official Google Sign-In button, voice audio persistence audit passed, DEV WIPE audit passed

---

## Known Bugs 🐛

- **VAD silence detection in noisy environments** — after +12 dB silence threshold + 3-sample hysteresis fix, watch to confirm silence detection fires reliably. If ambient noise is very high, may need further tuning or per-device calibration.
- **AnalyticsScreen passes placeholder answers/traits to DeepDiveModal** — placeholder fix logged in V1.1 roadmap; real data requires querying `answers` table by `session_id`.
- **WritingScreen modal has no in-app close button** — can only be closed via swipe gesture. Logged in V1.1 roadmap.
- **Hamburger icon on Today screen routes to onOpenJournal** — placeholder behaviour, needs a proper handler (settings sheet or navigation drawer).
- **Paywall fallback prices in PaywallScreen.tsx don't match actual RevenueCat products** — $39.99 hardcoded vs $34.99 actual, $7.99 hardcoded vs $6.99 actual. Logged in Pre-Submission Blockers item 3.

---

## Known TypeScript Baseline 🤖

The codebase has 3 pre-existing TypeScript errors that are intentionally left unfixed:

- `hooks/useTTS.ts:41` — `defaultToSpeakerphone` does not exist in `Partial<AudioMode>`
- `hooks/useVoice.ts:191` — same error
- `hooks/useVoice.ts:228` — same error

These stem from an expo-av API change. The voice/TTS logic works at runtime but the type signature is outdated. Fix is queued in V1.1 roadmap item 12. **Agents working on the codebase should ensure their changes keep error count at exactly 3 (these specific errors only). New errors = stop and report.**

---

## Blocked Pending External Verification

### Blocked on Apple Developer ID verification ⏳
Apple verification was submitted 2026-04-30. Once approved, unlocks:

| Task | Notes |
|------|-------|
| Apple Team ID visible | Needed for everything below |
| Sign in with Apple — Apple Developer Portal setup | Enable capability, create Services ID, create .p8 key |
| Sign in with Apple — Supabase Dashboard setup | Add Team ID, Key ID, .p8 contents to Supabase Apple provider |
| Google iOS client credential | Requires bundle ID (com.zute.unpack2) — bundle ID is already set |
| iosUrlScheme in app.json | Replace placeholder with reversed Google iOS client ID |
| EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env | Fill in once iOS client created |
| RevenueCat setup | Create account → App Store Connect products (monthly, annual, + `com.zute.unpack2.revival` consumable) → RevenueCat dashboard → add EXPO_PUBLIC_REVENUECAT_IOS_KEY |
| EAS build setup | Needed to test auth (won't work in Expo Go) |
| Add SENTRY_AUTH_TOKEN to EAS Secrets | For sourcemap upload — `eas secret:create --name SENTRY_AUTH_TOKEN --value <token>`. Generate at sentry.io → Settings → Auth Tokens |
| app.json name fix | Change "unpack2" → "Unpack" before App Store submission |

### Not blocked on Apple — can do now
| Task | Notes |
|------|-------|
| Google Web client credential | Google Cloud Console → Credentials → Web client → enter Supabase callback URL |
| Google Sign-In in Supabase | Dashboard → Auth → Providers → Google → enter Web client ID + secret |
| EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env | Fill in once Web client created |

### Blocked on Porkbun domain ID verification ⏳
Submitted 2026-04-30. Once domain is live, unlocks:

| Task | Notes |
|------|-------|
| Host Privacy Policy | Termly HTML embed at letsunpack.app/privacy |
| Host Terms & Conditions | Termly HTML embed at letsunpack.app/terms |
| Update PRIVACY_POLICY_URL in constants.ts | Replace placeholder URL |
| Update TERMS_URL in constants.ts | Replace placeholder URL |
| Set up support@letsunpack.app email | Needed for data request contact visible in app |

---

## Roadmap

### Pre-Submission Blockers (App Store rejection risk)

These must be resolved before submitting to App Store Connect. Discovered via audit on 2026-05-11 (see `valecrest/launch-prep/asr-guidelines-audit.md`, `hig-audit.md`, `accessibility-audit.md` for full details). Each item references Apple's App Store Review Guidelines (ASR) and/or GDPR sections. See `valecrest/launch-prep/asr-guidelines-audit.md` for full context.

**Critical — Code fixes**
1. Crisis resource disclosure — Talk It Out's therapist persona requires displaying crisis helpline numbers (988 US + EU equivalents) and a "not a substitute for professional care" disclaimer. Apple ASR §1.4.1. Suggested placement: dedicated screen during onboarding + a section in SettingsSheet. — ✅ RESOLVED (2026-05-13) — CrisisResourcesScreen created (6 countries + findahelpline.com), wired to SettingsSheet About section + OnboardingScreen step 1 + App.tsx modal
2. DOB/zodiac data use disclosure — currently silent. Apple ASR §5.1.2 + GDPR Art. 22. Add explanatory text on the DOB step of OnboardingScreen + update privacy policy in Termly. — ✅ RESOLVED (2026-05-13) — italic disclosure paragraph added to OnboardingScreen step 3 with Privacy Policy link
3. Paywall fallback prices wrong — `screens/PaywallScreen.tsx` hardcodes $39.99/$7.99 but actual RevenueCat products are $34.99/$6.99. Update fallback values to match.
4. StatusBar invisible on light backgrounds — `StatusBar style="light"` on #fbf9f9 background in AuthScreen + OnboardingScreen. Use `style="dark"` in light mode, `"light"` in dark mode (via theme hook). — ✅ RESOLVED (2026-05-13) — App.tsx: auth, onboarding, welcome states all changed "light" → "dark"
5. `allowFontScaling={false}` in WritingScreen:281 — remove. Direct accessibility violation under HIG.
6. PagerView swipe bypasses paywall — premium gate currently only fires from `handleTabPress` (tap), not swipe. Add same gate logic to PagerView's `onPageSelected` handler.
7. trialBadge hardcoded "7 DAYS FREE" — `PaywallScreen.tsx` shows badge regardless of whether RevenueCat offering actually has an intro offer. Conditionally render based on offering data. Apple ASR §3.1.1.
8. accent-gold fails WCAG AA in light mode active tab labels — BottomTabBar uses gold for active state which fails 4.5:1 contrast on cream background. Use text-primary in light mode, keep gold in dark mode (theme-dependent). — ✅ RESOLVED (2026-05-13) — TabBarItem.tsx: active label now text-primary in light (~21:1 AAA), accent-primary in dark (~7:1 AA)
9. AI-generated content labeling — Apple ASR §2.5.13 (2025 addition) requires AI outputs to be labeled. Add small "AI-generated" disclosure label to: AnalyticsScreen insight cards, Talk It Out reply bubbles, DeepDive content, Daily Feature theme. — ✅ RESOLVED (2026-05-13) — AILabel component created; labeled on 5 surfaces: AnalyticsScreen, VentScreen (assistant bubbles only), DeepDiveModal header, SessionScreen celebrate, HomeScreen Daily Feature

**Critical — Non-code**
10. Create Apple sandbox test account and populate `valecrest/launch-prep/reviewer-notes.md` placeholders with real credentials before submission.

**Critical — Code fixes (continued)**
11. Free trial length missing near paywall CTA — Apple ASR §3.1.3 requires "7-day free trial, then $34.99/year" inline next to the START FREE TRIAL button. Currently buried in footer. — ✅ RESOLVED (2026-05-13) — dynamic disclosure text added below CTA: "X-day free trial, then $price. Cancel anytime." with RevenueCat data or fallback
12. Privacy Policy link missing from paywall — `screens/PaywallScreen.tsx` footer links to Terms only. Add Privacy Policy link alongside. — ✅ RESOLVED (2026-05-13) — footer now "Restore Purchases | Terms | Privacy" using PRIVACY_POLICY_URL from constants.ts
13. Soften "You are a direct therapist" language in `lib/ai/therapy.ts` system prompts — Apple ASR §1.4.1. Replace word "therapist" with "warm, direct journaling companion" while preserving the warm/direct/confrontational tone. Brand voice unchanged, only clinical terminology removed.
14. Google Sign-In button uses custom `<Text>` element — replace with official Google Sign-In SDK button component from `@react-native-google-signin/google-signin` per Google brand guidelines. — ✅ RESOLVED (2026-05-13) — AuthScreen.tsx: GoogleSigninButton (Size.Wide, Light/Dark via isDark) replaces custom Text

**Critical — App Store Connect setup (do during submission)**
15. Complete App Store Connect privacy nutrition labels — must accurately list: name, email (from auth), DOB, journal content, voice data, usage data (Mixpanel), diagnostics (Sentry). Disclose DOB use under "Data Used to Profile You."
16. Set age rating to 12+ in App Store Connect questionnaire — default 4+ will likely be rejected given mental health themes, "slightly diss-y" AI tone, and probing emotional questions.
17. Verify `com.zute.unpack2.revival` IAP product is classified as "Consumable" in App Store Connect.

**Critical — Verification + investigation tasks**
18. Confirm raw voice audio is never persisted — verify Whisper Edge Function processes audio in-memory only, audio is not stored in Supabase Storage or persisted to OpenAI beyond the API call duration. — ✅ RESOLVED (2026-05-13) — Agent J audit: no persistence found. Audio path: OS tmp → FormData → HTTPS → whisper-proxy Deno RAM → OpenAI → text only. No Supabase Storage writes, no audio DB columns. Privacy policy should document OpenAI transient processing.
19. Confirm DEV WIPE button is `__DEV__`-gated in both HomeScreen and AuthScreen — verify it does NOT appear in production EAS builds. — ✅ RESOLVED (2026-05-13) — Agent K audit: "DEV WIPE" string does not exist in the codebase. Only dev UI is [DEV] Skip login in AuthScreen, double-guarded (__DEV__ in App.tsx + __DEV__ && onDevBypass in AuthScreen).

**Critical — Privacy Policy updates (Termly)**
20. Update Termly Privacy Policy to disclose: (a) DOB is used to derive zodiac sign which influences AI prompt personalization (automated profiling), (b) all insights, vent replies, transitions, and Deep Dives are AI-generated by Anthropic Claude, (c) automated decision-making notice per GDPR Article 22 if applicable. Then update letsunpack.app/privacy embed. — ✅ RESOLVED (2026-05-13)
21. Raise all sub-12pt text to 12pt minimum across SessionScreen, WritingScreen, DeepDiveModal, PersonalityBreakdownModal, and theme.ts labelSm token (HIG audit P0) — ✅ RESOLVED (Agent H 2026-05-12)
22. Add accessibilityLabel + accessibilityRole='button' to DeepDiveModal close button, RevivalModal action buttons, SessionScreen celebrate actions (HIG audit P1) — ✅ RESOLVED (Agent H 2026-05-12)
23. Add accessibilityViewIsModal={true} to RevivalModal overlay (HIG audit P1) — ✅ RESOLVED (Agent H 2026-05-12)

**Resolved**
- ~~Mixpanel ATT requirement check~~ — Resolved 2026-05-11. Mixpanel does not use IDFA and does not require ATT per official Mixpanel documentation ("Mixpanel does not use IDFA so it does not require user permission through the AppTrackingTransparency framework"). First-party analytics use case is exempt from Apple's tracking definition. Disclosure in App Store Connect privacy nutrition label (item 15) is the only remaining obligation.

### Post-redesign V1.1 tasks (unblocked — do these next)
0. Re-surface pre-redesign data features in new UI: streak counter, sessions count, personality wheel, weekly wheel, top trait. Data is still computed and stored in the database — needs to be added back somewhere in the new design (likely the Archive section or a stats sub-screen).
1. Pre-generate 365 daily themes via Claude.ai (one-time job) → host JSON at letsunpack.app/daily-features.json
2. Wire `lib/dailyFeature.ts` to fetch from the JSON CDN with AsyncStorage cache
3. Build Monthly Highlights Edge Function in Supabase (premium-gated, runs once per user per month)
4. Wire `lib/monthlyHighlights.ts` to call the Edge Function
5. Rebuild WritingScreen visually to match new design system
6. Rebuild WelcomeScreen visually to match new design system
7. Add icon prop support to OutlinedPillButton (for Eye icon on DEEPER LOOK)
8. Fix DeepDiveModal — currently receives placeholder answers/traits in AnalyticsScreen; needs real data wiring (query `answers` table by `session_id`)
9. WritingScreen modal close button — currently no in-app close, must close from gesture only
10. Hardcoded hex colors in InsightShareCard, PersonalityBreakdownModal, Radar — migrate to theme tokens
11. Dark mode QA pass — verify every screen renders correctly when `theme_mode` is `'dark'`
12. Fix pre-existing `defaultToSpeakerphone` TypeScript errors in `useTTS.ts` + `useVoice.ts` (expo-av API change — unrelated to redesign)

### Now — unblocked code work
1. ✅ RLS on all tables — done 2026-04-30
2. ✅ Account deletion — done 2026-04-30
3. ✅ Offline handling — done 2026-04-30
4. ✅ Sentry crash reporting — fully integrated (May 1)
5. ✅ ElevenLabs TTS audio playback — fixed (May 1)
6. ✅ Premium gating system — 1 session/day, 5 Vent messages, paywall at all gates (May 2026)
7. ✅ Vent mic mode — hands-free conversational loop with TTS (May 2026)
8. ✅ Vent bot always asks a probing question — prompt hardened (May 2026)
9. ✅ Session gate on "Keep Going" — `handleKeepGoing()` paywall check added (May 2026)
10. ✅ Personality Wheel tap fixed — SVG touch interception resolved (May 2026)
11. ✅ Streak animation once-per-day — AsyncStorage + in-memory ref guard (May 2026)
12. ✅ VAD improvements — +12 dB thresholds, 3-sample hysteresis, 30s hard timeout (May 2026)
13. ✅ Journal textbox iOS lineHeight fix — `lineHeight: 22` on iOS (May 2026)
14. ✅ Full editorial redesign — Ivory & Ink design system, 4-tab navigation, 8 screens rebuilt (2026-05-11)
15. ✅ New Architecture enabled — `newArchEnabled: true`, fixes reanimated folly/coro build failure (2026-05-11)

**Device-test bug batch — 2026-05-12:**
16. ✅ PagerView Session swipe bypass — paywall gate added to `onPageSelected` handler (was Pre-Submission Blocker #6)
17. ✅ TTS gate for free users removed — all users now get audio playback
18. ✅ Notification smart-skip logic — `cancelTodayReminder` implemented; wiring in App.tsx pending
19. ✅ Therapist language softening — "therapist" replaced with "warm, direct journaling companion" across `lib/ai/therapy.ts` system prompts (was Pre-Submission Blocker #13)
20. ✅ JournalScreen dark mode — full dark mode pass applied (Agent J follow-up)
21. ✅ Clinical language audit across full codebase — all clinical/therapy terminology softened (Agent K follow-up)

### Previously Blocked — now complete
1. ✅ Test Sign in with Apple + Google Sign-In end-to-end (2026-05-11)
2. ✅ RevenueCat — products configured in App Store Connect + RevenueCat dashboard, paywall tested (2026-05-11)
3. ✅ EAS dev build — push notifications, streak fire animation, magic link deep links (2026-05-11)

### Pre-launch
1. ✅ RLS on all tables
2. ✅ Privacy Policy drafted (Termly, saved locally)
3. ✅ Terms & Conditions drafted (Termly, saved locally)
4. ✅ Get domain live → host policy pages → update PRIVACY_POLICY_URL and TERMS_URL in constants.ts (2026-05-11)
5. ✅ Set up support@letsunpack.app → add to app UI for data requests (2026-05-11)
6. ✅ Sentry integrated — add `SENTRY_AUTH_TOKEN` to EAS Secrets before first EAS build (sourcemap upload)

### Post-launch (V2)
1. Retroactive voice note analysis on upgrade
2. ✅ Streak revival purchase ("Reclaim This Day") — built May 3
3. ✅ Deep Dive modal ("Tell me more") — built May 3
4. Weekly Wheel based on actual days not just session count
5. Cross-session memory improvements in Talk It Out
6. Remove 30s VAD hard timeout once VAD silence detection is confirmed stable in production
7. Promotional entitlement flow — free trial or promo code path for RevenueCat (post App Store launch)
8. Personality Wheel tap destination — build a breakdown screen (FullRadar + trait percentages + copy); currently navigates to JournalScreen as placeholder

---

## Token Cost Audit (TODO)
- `openTherapySession()` pulls 3 sessions + 9 answers every open — could cache
- `loadTherapyPreview()` runs on every app mount AND after every session — expensive
- Topic extraction makes a separate Claude call after every Talk It Out opening — could be combined
- `generateQuestion()` pre-generates questions in background — good pattern but adds calls

---

## Testing Notes
- All testing on iPhone 14 Pro via EAS dev build (auth, IAP, and reanimated all require dev build — Expo Go cannot run them).
- Auth not testable in Expo Go — shows Apple/Google buttons but requires dev build
- Dev bypass: [DEV] Skip login button in AuthScreen, double-guarded by __DEV__ — only visible in dev builds, never in production.
- Weekly Wheel needs 5 question sessions to unlock
- Personality Wheel only shows after completing a question session in the current app open

---

## Things Still On The "I'll Believe It" Watch List
- Sign in with Apple + Google work end-to-end in dev build
- Rate limiting actually blocks abuse (check Supabase rate_limits table after testing)
- Streak correctly goes grey → gold when first session of a new day completes
- Talk It Out doesn't repeat handled topics across full app close/reopen
- "I don't know" flagging carries into next Talk It Out with softer tone
- Weekly Wheel averaging is correct across multiple days
- AI questions feel genuinely personalised after 3+ sessions
- Banner fires correctly after returning from a tile card
- RevenueCat paywall renders and purchase flow completes (once live)
- Mixpanel events actually appear in Mixpanel dashboard (verify after first real use)
- Account deletion actually removes all rows from all tables — verify in Supabase dashboard after deleting a test account
- Offline gates show/hide correctly on all screens when toggling airplane mode
- Journal offline queue actually flushes and entries appear when reconnecting
- Pending session retry uploads the saved session correctly after going offline mid-session then reconnecting
- Streak revival eligibility (`computeCanRevive`) correctly detects yesterday activity + no prior revival for that date
- `increment_vent_messages` RPC uses `WHERE id = user_uuid` — verify the profiles PK column name matches (schema shows `user_id` but SQL says `id` — potential silent failure)
- Deep Dive modal generates meaningful personalised output, not generic filler
- Revival IAP shows "RECLAIM" button only when appropriate, disappears after successful purchase
- VAD silence detection fires reliably in mixed noise environments — +12dB threshold + 3-sample hysteresis added but not yet stress-tested in loud rooms; if ambient noise stays above baseline+12 the silence will never lock
- Vent mic auto-send loop: transcription → `sendTherapyMessage` → TTS → mic restart completes without getting stuck; 30s hard timeout fallback triggers `forceStopMsg` UI correctly
- Premium gate correctly blocks free users at: `beginSession()`, `handleKeepGoing()`, 6th Vent message, Deep Dive button, TTS audio — all paths exercised
- New design system renders correctly on actual device (light mode default)
- Dark mode toggle in Settings → Appearance actually persists and applies app-wide
- Theme picker "System" option correctly follows iPhone's system theme
- All premium gates still fire correctly through the new PaywallScreen
- Mic permission popup behavior unchanged in redesigned SessionScreen + TalkScreen
- Reactive WaveformBar in Talk actually responds to amplitude during both recording AND TTS playback
- Onboarding 3-step flow saves name + DOB to profiles table identically to before
- Existing data (sessions, day_notes, profiles, streaks) all renders correctly in new UI
- Pre-submission audit findings actually addressed before App Store submission — verify all 10 blockers in Pre-Submission Blockers section are resolved.

---

## Conversation Style Preferences
- Give decisive single-step instructions, not multiple options
- Make small targeted code changes, not full file rewrites
- When delivering code fixes, use Edit tool targeting specific functions/lines
- Always verify changes with grep before delivering
- Number test steps clearly
- At end of each session (when user says they're going to bed), update this handoff file
- Keep a running "I'll believe it" watchlist
- Quote fixes: always use double quotes for Alert strings containing apostrophes
- Claude Code handles all coding tasks. Claude.ai handles copy writing, policy drafting, and manual setup step guidance. Both read this document for context.
