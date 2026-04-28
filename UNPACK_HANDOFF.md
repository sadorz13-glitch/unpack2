# Unpack — Full Project Handoff

## What is Unpack?
A journaling app. Tagline: "The new way to journal." Not marketed as a therapy app — leads with journaling because that market is larger. The AI analysis and therapy features are what surprise and retain users after downloading.

**Core insight:** Most people want to journal but don't because the blank page is too much work. Unpack removes that friction — the app asks the questions, you just answer honestly.

**Tone:** Like a warm, direct, slightly confrontational middle-aged woman therapist. Not fluffy. Not clinical. Honest.

**Design:** Black (#0a0a0a background), gold (#b48c5a accents). Dark, minimal, premium. Italic serif for headlines, small caps for labels.

---

## Tech Stack
- **Frontend:** React Native with Expo (SDK 54), tested via Expo Go on iPhone 14 Pro (iOS)
- **Backend:** Supabase (PostgreSQL, free tier)
- **AI:** Anthropic Claude API (`claude-sonnet-4-5`), pay as you go
- **Auth:** Supabase Auth — magic link email + 8-digit OTP code (passwordless)
- **Email:** Resend.com custom SMTP (bypasses Supabase free-tier rate limits)
- **Files:** `App.tsx` (~1300 lines) + extracted screens + lib modules (see Architecture)
- **Keys:** Stored in `.env` (gitignored) — see Keys section

### Dependencies (package.json)
```json
{
  "@anthropic-ai/sdk": "^0.82.0",
  "@react-native-async-storage/async-storage": "2.2.0",
  "@react-native-voice/voice": "^3.2.4",
  "@supabase/supabase-js": "^2.101.1",
  "expo": "~54.0.33",
  "expo-speech": "~14.0.8",
  "expo-status-bar": "~3.0.9",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-pager-view": "^6.5.1",
  "react-native-svg": "15.12.1",
  "react-native-url-polyfill": "^3.0.0",
  "react-native-voice": "^0.3.0"
}
```

### app.json
```json
{
  "expo": {
    "name": "unpack2",
    "slug": "unpack2",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "unpack",
    "newArchEnabled": true,
    "plugins": ["@react-native-voice/voice"],
    "ios": { "supportsTablet": true }
  }
}
```

---

## Keys

Keys live in `.env` (gitignored — never committed). Copy `.env.example` to `.env` and fill in values.

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_ANTHROPIC_KEY=...
EXPO_PUBLIC_OPENAI_KEY=...
EXPO_PUBLIC_ELEVENLABS_KEY=...
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=...
```

`constants.ts` reads these via `process.env.EXPO_PUBLIC_*`. Expo loads `.env` automatically on `expo start` — no extra packages needed.

**Important:** The old hardcoded keys were in git history before 2026-04-19. All keys were rotated after moving to `.env`.

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

**Important:** No Row Level Security on any table. All tables are public with anon key access.

---

## App Architecture

### Navigation
PagerView with 5 tabs (Home, Questions, Vent, Look Back, Write), managed by `activeTab` state in `App.tsx`. `BottomTabBar` component handles tab switching. All tabs stay mounted — data is loaded per-screen on mount, not on tab focus.

### Screens
| File | Tab | Description |
|------|-----|-------------|
| `screens/AuthScreen.tsx` | — | Email + OTP sign-in (shown when no session) |
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

## Auth Flow

Passwordless email auth via Supabase magic link:

1. User enters email on `AuthScreen` → `supabase.auth.signInWithOtp()` sends email
2. Email contains an 8-digit OTP code (template edited in Supabase dashboard to include `{{ .Token }}`)
3. User enters code in app → `supabase.auth.verifyOtp()` establishes session
4. `onAuthStateChange` fires in `App.tsx` → fetches profile → shows OnboardingScreen (first time) or main app
5. On subsequent opens, `initAuth()` calls `supabase.auth.getSession()` to restore session

**Email provider:** Resend.com custom SMTP configured in Supabase → Project Settings → Auth → SMTP. Sender: `onboarding@resend.dev`.

**Deep links:** `unpack://` scheme registered in app.json. Magic link redirects to `unpack://auth` (works in dev builds; in Expo Go, users enter the OTP code instead).

**lib/auth.ts exports:**
- `initAuth()` — call on app mount, returns `{ userId, profile }`
- `setAuthUser(uid)` — updates module-level `_userId` (used by data helpers)
- `getUserId()` — returns current `_userId` for use in data queries
- `signOut()` — signs out of Supabase and clears `_userId`
- `buildHoroscopeContext(dob)` — returns zodiac context string for AI prompts
- `saveProfile(name, dob)` — upserts profile row

---

## Silent Layers

### Horoscope Layer
DOB collected during onboarding. `buildHoroscopeContext(dob)` in `lib/auth.ts` derives the user's zodiac sign and returns a tailored context string. Injected silently into all Claude prompts via `horoscopeContext` state. Never shown to user.

### Topic Memory
- `handledTopics` — topics the user marked done, persisted in AsyncStorage
- `flaggedTopics` — topics where user said "I don't know", gets gentler tone in Talk It Out
- Both injected into Talk It Out opening prompt

---

## Key Functions

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

### Data Functions
- `saveSession()` — saves session, answers, insight, traits, insight_short to Supabase
- `loadStreakAndCount()` — calculates streak from BOTH sessions AND day_notes dates
- `loadAllAnswers()` — loads all sessions + answers grouped by date
- `loadCalendarMonth()` — fetches sessions + day_notes for a month in parallel (Promise.all), returns map with dots
- `saveJournalEntry()` — inserts new row into day_notes
- `loadJournalEntries(date)` — fetches all journal entries for a specific date
- `loadWeeklyTraits()` — averages trait scores across last 7 days, only returns data if 5+ sessions exist

---

## Refactor Status

Full TypeScript migration complete on `feat/typescript-migration` branch. All files are `.ts`/`.tsx`. Old `App.js` deleted.

### Module structure
```
constants.ts          — keys (via process.env), questions, traits, shared constants
theme.ts              — colors, spacing, font families
index.ts              — registerRootComponent entry point
App.tsx               — root component, auth init, tab navigation, voice recording engine
lib/
  auth.ts             — Supabase auth, profile fetch, horoscope context, zodiac logic
  supabase.ts         — data functions (saveSession, loadStreakAndCount, etc.)
  supabaseClient.ts   — Supabase client singleton
  api.ts              — Claude API calls
  talkHelpers.ts      — Talk It Out helpers
  journalHelpers.ts   — day_notes CRUD
  calendarHelpers.ts  — calendar month query (parallel fetches)
screens/
  AuthScreen.tsx      — email + OTP sign-in
  HomeScreen.tsx      — dashboard tiles
  SessionScreen.tsx   — question session + voice
  TalkScreen.tsx      — therapy chat
  JournalScreen.tsx   — calendar + journal
  WelcomeScreen.tsx   — first-launch welcome
components/
  Radar.tsx           — radar chart (MiniRadar, FullRadar)
  ShimmerTile.tsx     — loading shimmer
  OnboardingScreen.tsx — name + DOB onboarding
  BottomTabBar.tsx    — tab navigation bar
```

---

## What's Working ✅

- Supabase magic link auth — email OTP sign-in, session persists across app opens
- Onboarding (name + DOB) on first sign-in, welcome screen on first launch
- Horoscope context derived from DOB, injected into all AI prompts
- Home screen with 4-tab PagerView navigation (Home, Session, Talk, Journal)
- 3-question session flow with AI bridges between questions
- AI-generated personalised questions (after 3 sessions, static fallback before)
- Voice input throughout session — mic button toggles start/stop, stays tappable after submission
- Voice recording stops cleanly on tab switch
- Post-session flame celebration screen with streak reveal and animated flame burst
- Tab titles — italic gold serif: "Home", "Questions", "Vent", "Look Back", "Write"
- Dashboard with all 9 tiles
- Personality Wheel (radar chart, current session only)
- Journal Calendar — month navigation, dots per day:
  - Blue dot = session only
  - Red dot = journal entry only
  - Gold dot = both session and journal entry that day
  - Calendar reloads automatically after each completed session
- My Answers — all history, today's editable, SAVE button with checkmark
- Your Insight — full screen, share button
- Your Journal — multi-entry per day, timestamps, "Previously written" archive
- Top Trait tile
- Streak tile — counts both sessions and journal entries, gold when active today
- Weekly Wheel — unlocks at 5 sessions, averages traits
- Talk It Out — full therapy chat, topic memory, flagged topics, long-press to mark done
- Talk It Out tile preview + banner (slides in on dashboard, tappable)
- Insight tile shows short emoji version (insight_short from Supabase)
- Dev wipe button — on HomeScreen (bottom right, faint) and AuthScreen; clears all data

---

## Known Bugs / Things To Fix 🐛

- **ElevenLabs TTS silent** — API call succeeds (base64 length 68604 confirmed), but audio doesn't play. Bug is in the `writeAsStringAsync` → `Audio.Sound.createAsync` → `playAsync` chain. Next step: add logs after each step to find which silently fails. (`speakAndWait` in App.tsx, around line 550)

---

## What's Saved for Dev Build 🔧

These features require a proper EAS dev build (not Expo Go):

1. **Push notifications** — streak reminder near end of day. `expo-notifications` already in package.json but disabled in Expo Go
2. **Streak fire animation** — Duolingo-style fire animation on multi-day streaks
3. **Talk It Out voice output** — ElevenLabs wired up, API call works, playback silent (see Known Bugs)
4. **Share insight as image** — currently shares as text, needs `react-native-view-shot`
5. **Magic link deep link** — `unpack://auth` redirect works in dev build; Expo Go users use OTP code instead

---

## Roadmap

### Now — pre-launch
1. EAS dev build setup
2. Push notifications (streak reminders)
3. Streak fire animation
4. Weekly Wheel based on actual days not just session count
5. Cross-session memory improvements in Talk It Out
6. "Tell me more" deep dive screen (from banner tap — planned but not built)

### Pre-launch
1. Row Level Security on Supabase tables (currently all public — fine for dev, must fix before launch)
2. Rotate all API keys (Anthropic, OpenAI, Supabase) — old keys were in git history before 2026-04-19
3. Paywall / monetisation strategy

### Post-launch (V2)
1. Monetisation — paywall for Talk It Out, Weekly Wheel, voice analysis
2. Retroactive voice note analysis on upgrade
3. Streak revival purchase ("Reclaim This Day")
4. Premium tier: Talk It Out unlimited, voice AI analysis, Weekly Wheel

---

## Token Cost Audit (TODO)
- `openTherapySession()` pulls 3 sessions + 9 answers every open — could cache
- `loadTherapyPreview()` runs on every app mount AND after every session — expensive
- Topic extraction makes a separate Claude call after every Talk It Out opening — could be combined
- `generateQuestion()` pre-generates questions in background — good pattern but adds calls

---

## Testing Notes
- All testing on iPhone 14 Pro via Expo Go
- Auth: sign in with email → enter 8-digit code from email
- Dev wipe: bottom-right of HomeScreen (faint "DEV WIPE") or AuthScreen — clears all Supabase data + AsyncStorage
- Weekly Wheel needs 5 question sessions to unlock
- Personality Wheel only shows after completing a question session in the current app open

---

## Things Still On The "I'll Believe It" Watch List
- Streak correctly goes grey → gold when first session of a new day completes
- Talk It Out doesn't repeat handled topics across full app close/reopen
- "I don't know" flagging carries into next Talk It Out with softer tone
- Weekly Wheel averaging is correct across multiple days
- AI questions feel genuinely personalised after 3+ sessions
- Banner fires correctly after returning from a tile card

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
