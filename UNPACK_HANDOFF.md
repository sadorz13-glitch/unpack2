# Unpack — Full Project Handoff

> **Reading this as Claude.ai (not Claude Code)?** This document covers both the technical codebase and the broader launch checklist. Sections marked 🤖 are primarily for Claude Code. Sections marked 💬 are for drafting copy, policy, or manual setup steps. All sections are useful as context.

---

## What is Unpack?

A journaling app. Tagline: "The new way to journal." Not marketed as a therapy app — leads with journaling because that market is larger. The AI analysis and therapy features are what surprise and retain users after downloading.

**Core insight:** Most people want to journal but don't because the blank page is too much work. Unpack removes that friction — the app asks the questions, you just answer honestly.

**Tone:** Like a warm, direct, slightly confrontational middle-aged woman therapist. Not fluffy. Not clinical. Honest.

**Design:** Black (#0a0a0a background), gold (#b48c5a accents). Dark, minimal, premium. Italic serif for headlines, small caps for labels.

**Owner/Developer:** Based in the Netherlands (EU). Google account: valecrestgroup. Apple Developer account: registered (pending ID verification as of 2026-04-30).

---

## Tech Stack

- **Frontend:** React Native with Expo (SDK 54), tested via Expo Go on iPhone 14 Pro (iOS)
- **Backend:** Supabase (PostgreSQL, free tier) — project ref `dehnyyneriiiwetvkjnj`
- **AI:** Anthropic Claude API (`claude-sonnet-4-5`), routed through Supabase Edge Functions
- **Speech-to-text:** OpenAI Whisper, routed through Supabase Edge Function
- **Text-to-speech:** ElevenLabs, routed through Supabase Edge Function
- **Auth:** Supabase Auth — Sign in with Apple + Google Sign-In (passwordless, no email/password)
- **Analytics:** Mixpanel (EU data region, GDPR-compliant)
- **Crash reporting:** Sentry ✅ (`@sentry/react-native` ^8.10.0, EU region, DSN in `.env`)
- **Subscriptions:** RevenueCat (planned, blocked on Apple verification)
- **Domain:** letsunpack.app (purchased on Porkbun, pending ID verification)
- **Privacy/Terms:** Termly (HTML embed, will live at letsunpack.app/privacy and letsunpack.app/terms)

### 🤖 Dependencies (package.json — key entries)

```json
{
  "@anthropic-ai/sdk": "^0.82.0",
  "@react-native-async-storage/async-storage": "2.2.0",
  "@react-native-google-signin/google-signin": "...",
  "@react-native-voice/voice": "^3.2.4",
  "@supabase/supabase-js": "^2.101.1",
  "expo": "~54.0.33",
  "expo-apple-authentication": "...",
  "expo-av": "...",
  "expo-notifications": "...",
  "@sentry/react-native": "^8.10.0",
  "mixpanel-react-native": "...",
  "react-native-purchases": "...",
  "react-native-pager-view": "^6.5.1",
  "react-native-svg": "15.12.1"
}
```

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
    "newArchEnabled": false,
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
      ["expo-build-properties", { "android": { "enableJetifier": true } }],
      "expo-font",
      "expo-apple-authentication",
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
PagerView with 5 tabs (Home, Questions, Vent, Look Back, Write), managed by `activeTab` state in `App.tsx`. `BottomTabBar` component handles tab switching. All tabs stay mounted — data is loaded per-screen on mount, not on tab focus.

### Screens
| File | Tab | Description |
|------|-----|-------------|
| `screens/AuthScreen.tsx` | — | Apple + Google sign-in (shown when no session) |
| `screens/HomeScreen.tsx` | 0 "Home" | Dashboard tiles: streak, calendar, insight, etc. |
| `screens/SessionScreen.tsx` | 1 "Questions" | 3-question AI session with voice support + flame celebration |
| `screens/TalkScreen.tsx` | 2 "Vent" | Talk It Out therapy chat |
| `screens/JournalScreen.tsx` | 3 "Look Back" | Calendar + daily journal |
| `screens/WritingScreen.tsx` | 4 "Write" | Free-write journal with AI prompt + mic button |
| `screens/WelcomeScreen.tsx` | — | First-launch welcome (shown once after onboarding) |
| `components/OnboardingScreen.tsx` | — | Name + DOB collection on first sign-in |

### Render Guard Order (App.tsx)
1. `!fontsLoaded || !authReady` → blank black screen
2. `!userId` → AuthScreen
3. `needsOnboarding` → OnboardingScreen
4. `showWelcome` → WelcomeScreen
5. Main PagerView

### Dashboard Tiles (HomeScreen, in order)
1. **Personality Wheel** — radar chart, 5 traits, current session only
2. **Journal Calendar** — full month view, dots per day
3. **My Answers** — all answers ever given, grouped by session
4. **Your Insight** — AI-generated insight, shareable
5. **Your Journal** — multi-entry journaling with timestamps
6. **Top Trait** — highest scoring personality trait from last session
7. **Streak** — consecutive days of activity (sessions OR journal entries)
8. **Weekly Wheel** — averaged radar chart across last 7 days, unlocks at 5 sessions
9. **Talk It Out** — full-width AI therapy chat

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
| `generateQuestion()` | AI-generated personalised question | claude-sonnet-4-5 | 60 |
| `openTherapySession()` | Talk It Out opening message | claude-sonnet-4-5 | 200 |
| `sendTherapyMessage()` | Talk It Out reply | claude-sonnet-4-5 | 80 |
| `loadTherapyPreview()` | Tile + banner preview line | claude-sonnet-4-5 | 60 |
| Topic extraction (×2) | Extract topic label from message | claude-sonnet-4-5 | 15 |

All AI calls route through Supabase Edge Functions (claude-proxy, whisper-proxy, elevenlabs-proxy). Keys are server-side only.

### Data Functions
- `saveSession()` — saves session, answers, insight, traits, insight_short to Supabase
- `loadStreakAndCount()` — calculates streak from BOTH sessions AND day_notes dates
- `loadAllAnswers()` — loads all sessions + answers grouped by date
- `loadCalendarMonth()` — fetches sessions + day_notes for a month in parallel (Promise.all), returns map with dots
- `saveJournalEntry()` — inserts new row into day_notes
- `loadJournalEntries(date)` — fetches all journal entries for a specific date
- `loadWeeklyTraits()` — averages trait scores across last 7 days, only returns data if 5+ sessions exist

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
- Planned entitlement: `premium` (Talk It Out unlimited, voice AI analysis, Weekly Wheel)
- Paywall placement: wired into onboarding flow

### Sentry (crash reporting) — ✅ FULLY INTEGRATED
- Account: Valecrest org, EU region (`ingest.de.sentry.io`)
- `@sentry/react-native` ^8.10.0 installed; Expo config plugin in `app.json`
- Init in `index.ts` before `registerRootComponent` — wraps `App` via `Sentry.wrap()`
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
theme.ts              — colors, spacing, font families
index.ts              — registerRootComponent entry point
App.tsx               — root component, auth init, tab navigation, voice recording engine
lib/
  auth.ts             — Supabase auth, profile fetch, horoscope context, zodiac logic
  supabase.ts         — data functions (saveSession, loadStreakAndCount, etc.)
  supabaseClient.ts   — Supabase client singleton
  api.ts              — Claude API calls (routed through edge functions)
  talkHelpers.ts      — Talk It Out helpers
  journalHelpers.ts   — day_notes CRUD
  calendarHelpers.ts  — calendar month query (parallel fetches)
  analytics.ts        — Mixpanel event tracking
  iap.ts              — RevenueCat in-app purchase logic
screens/
  AuthScreen.tsx      — Apple + Google sign-in
  HomeScreen.tsx      — dashboard tiles
  SessionScreen.tsx   — question session + voice
  TalkScreen.tsx      — therapy chat
  JournalScreen.tsx   — calendar + journal
  WelcomeScreen.tsx   — first-launch welcome
components/
  Radar.tsx           — radar chart (MiniRadar, FullRadar)
  ShimmerTile.tsx     — loading shimmer
  OnboardingScreen.tsx — name + DOB onboarding (+ paywall)
  BottomTabBar.tsx    — tab navigation bar
```

---

## What's Working ✅

- Sign in with Apple + Google (code complete — needs dev build to test)
- Onboarding (name + DOB) on first sign-in, welcome screen on first launch
- Horoscope context derived from DOB, injected into all AI prompts
- Home screen with 5-tab PagerView navigation
- 3-question session flow with AI bridges between questions
- AI-generated personalised questions (after 3 sessions, static fallback before)
- Voice input throughout session — mic button toggles start/stop
- Post-session flame celebration screen with streak reveal and animated flame burst
- Tab titles — italic gold serif: "Home", "Questions", "Vent", "Look Back", "Write"
- All 9 dashboard tiles
- Personality Wheel (radar chart, current session only)
- Journal Calendar — month navigation, colour-coded dots (blue=session, red=journal, gold=both)
- My Answers — all history, today's editable, SAVE button with checkmark
- Your Insight — full screen, share button
- Your Journal — multi-entry per day, timestamps, "Previously written" archive
- Top Trait tile
- Streak tile — counts both sessions and journal entries, gold when active today
- Weekly Wheel — unlocks at 5 sessions, averages traits
- Talk It Out — full therapy chat, topic memory, flagged topics, long-press to mark done
- Talk It Out tile preview + banner (slides in on dashboard, tappable)
- Insight tile shows short emoji version (insight_short from Supabase)
- Rate limiting on all AI endpoints (per-user hourly cap)
- Mixpanel analytics events firing
- Paywall in onboarding flow (RevenueCat logic wired, not yet live)
- Dev wipe button — on HomeScreen (bottom right, faint) and AuthScreen; clears all data
- Account deletion — Settings gear on HomeScreen → SettingsSheet → "Delete account" → warning step → type "DELETE" → wipes all data + auth user
- Offline handling — all screens degrade gracefully when offline
- Sentry crash reporting — init in `index.ts`, screen ErrorBoundaries, captureException across all critical paths, user context tagging on auth: AuthScreen blocks sign-in, SessionScreen blocks session start, TalkScreen dims starter bubble, JournalScreen queues writes to AsyncStorage, WritingScreen blocks AI. OfflineBanner shown app-wide. Home cache serves stale data while loading. Pending session retries on reconnect.

---

## Known Bugs 🐛

- **ElevenLabs TTS silent** — API call succeeds (base64 length 68604 confirmed), but audio doesn't play. Bug is in the `writeAsStringAsync` → `Audio.Sound.createAsync` → `playAsync` chain. Next step: add logs after each step to find which silently fails. (`speakAndWait` in App.tsx, around line 550)

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
| RevenueCat setup | Create account → App Store Connect products → RevenueCat dashboard → add EXPO_PUBLIC_REVENUECAT_IOS_KEY |
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

### Now — unblocked code work
1. ✅ RLS on all tables — done 2026-04-30
2. ✅ Account deletion — done 2026-04-30
3. ✅ Offline handling — done 2026-04-30
4. ✅ Sentry crash reporting — fully integrated (May 1)
5. ❌ ElevenLabs TTS audio playback bug (see Known Bugs)

### Blocked (unblock order: Apple verification → dev build → test auth)
1. Test Sign in with Apple + Google Sign-In end-to-end
2. RevenueCat — configure products in App Store Connect → RevenueCat dashboard → test paywall
3. EAS dev build — push notifications, streak fire animation, magic link deep links

### Pre-launch
1. ✅ RLS on all tables
2. ✅ Privacy Policy drafted (Termly, saved locally)
3. ✅ Terms & Conditions drafted (Termly, saved locally)
4. Get domain live → host policy pages → update PRIVACY_POLICY_URL and TERMS_URL in constants.ts
5. Set up support@letsunpack.app → add to app UI for data requests
6. ✅ Sentry integrated — add `SENTRY_AUTH_TOKEN` to EAS Secrets before first EAS build (sourcemap upload)

### Post-launch (V2)
1. Retroactive voice note analysis on upgrade
2. Streak revival purchase ("Reclaim This Day")
3. "Tell me more" deep dive screen (from banner tap — planned but not built)
4. Weekly Wheel based on actual days not just session count
5. Cross-session memory improvements in Talk It Out

---

## Token Cost Audit (TODO)
- `openTherapySession()` pulls 3 sessions + 9 answers every open — could cache
- `loadTherapyPreview()` runs on every app mount AND after every session — expensive
- Topic extraction makes a separate Claude call after every Talk It Out opening — could be combined
- `generateQuestion()` pre-generates questions in background — good pattern but adds calls

---

## Testing Notes
- All testing on iPhone 14 Pro via Expo Go
- Auth not testable in Expo Go — shows Apple/Google buttons but requires dev build
- Dev wipe: bottom-right of HomeScreen (faint "DEV WIPE") or AuthScreen — clears all Supabase data + AsyncStorage
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
