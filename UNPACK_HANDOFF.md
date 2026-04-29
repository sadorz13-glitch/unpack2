# Unpack — Full Project Handoff

_Last updated: 2026-04-29 6:55pm GMT+2_

---

## What this app is

Unpack is a React Native / Expo mental wellness app. Users do guided journaling sessions (SessionScreen), free-form voice journaling (WritingScreen), a weekly reflection wheel (HomeScreen), and AI therapy-style conversations (TalkScreen). Auth is Apple Sign-In + Google Sign-In via Supabase. All AI calls (Claude, Whisper, ElevenLabs) go through Supabase Edge Function proxies — no API keys in the client bundle.

---

## Current branch state

**Branch:** `main`  
**Last commits:**
- `64e6f8e` big stuff — paywall, IAP, analytics, offline queue _(from laptop)_
- `f915119` step1 complete — TalkScreen migration, App.tsx refactor
- `dcba2f2` feat: replace magic link with Sign in with Apple + Google Sign-In
- `c5d7ad6` fix: auth hardening — explicit answer filter, null guards

---

## What was completed today (Apr 29)

### Phase 1 refactor (desktop session)
- **TalkScreen** is now fully self-contained: owns all therapy session state and AI logic. App.tsx no longer has `openTherapySession` or `sendTherapyMessage`.
- **App.tsx** reduced from ~1298 lines → 448 lines.
- Shared AI lib: `lib/ai/client.ts`, `lib/ai/session.ts`, `lib/ai/therapy.ts`, `lib/ai/journal.ts`
- Shared Supabase lib: `lib/supabase/client.ts`, `lib/supabase/index.ts`
- Custom hooks extracted: `hooks/useVoice.ts`, `hooks/useTTS.ts`, `hooks/useStreak.ts`

### "Big stuff" commit (laptop session)
- **PaywallScreen** (`screens/PaywallScreen.tsx`) — modal paywall with annual ($34.99, 7-day trial) and monthly ($6.99) plans. Tracks `paywall_seen`, `paywall_dismissed`, `subscription_started`, `subscription_restored` via Mixpanel.
- **RevenueCat IAP** (`lib/iap.ts`) — `initIAP`, `loginIAP`, `logoutIAP`, `getOfferings`, `purchasePackage`, `restorePurchases`, `checkPremiumStatus`.
- **`useSubscription` hook** — manages `isPremium` state (via RevenueCat), `ventMessagesUsed` (AsyncStorage), exposes `canUseVent`, `freeMessagesRemaining`, `incrementVentMessages`, `refreshPremiumStatus`.
- **Mixpanel analytics** (`lib/analytics.ts`) — `track`, `identifyUser`, `resetAnalytics`. Voice recording context tracked on start.
- **Offline support** — `hooks/useNetworkStatus.ts` (NetInfo), `lib/offlineQueue.ts` (queues journal writes to AsyncStorage), `components/OfflineBanner.tsx` (shown when disconnected). Pending entries flush automatically when connectivity restores.
- **App.tsx wired up:** IAP init at module level, `identifyUser`/`loginIAP` on auth, `resetAnalytics`/`logoutIAP` on sign-out, `sign_up`/`login` events, offline flush effect.
- Old plan/spec docs in `docs/superpowers/` cleaned out.

---

## Environment variables needed

Set in `.env` (client-safe) — see `.env.example`:

| Key | Status | Notes |
|-----|--------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ set | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ set | |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ✅ set | |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | ✅ set | |
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | ⏳ needs token | Get from Mixpanel project settings |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | ⏳ needs key | Get from RevenueCat dashboard → Apps → iOS public SDK key |

Server-side (Supabase Edge Function secrets — already set):
- `ANTHROPIC_KEY`, `OPENAI_KEY`, `ELEVENLABS_KEY`, `ELEVENLABS_VOICE_ID`

---

## Manual setup still needed (RevenueCat / IAP)

1. **RevenueCat project** — create app, set iOS bundle ID, paste public SDK key into `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
2. **App Store Connect** — create two subscription products:
   - Annual: `REVENUECAT_ENTITLEMENT_ID`-scoped, $34.99/yr, 7-day free trial
   - Monthly: same entitlement, $6.99/mo
3. **RevenueCat entitlement** — create entitlement called whatever `REVENUECAT_ENTITLEMENT_ID` is set to in `constants.ts`, attach both products
4. **RevenueCat offering** — create default offering with both packages (`ANNUAL`, `MONTHLY`)
5. **Paywall gating** — `useSubscription` has `canUseVent` and `freeMessagesRemaining` wired up. TalkScreen (Vent) and HomeScreen (Weekly Wheel) need to check `canUseVent` and show `PaywallScreen` when limit hit — **not yet wired in those screens**

---

## Known open issues / next tasks

- [ ] Wire paywall gate into TalkScreen — when `!canUseVent`, show `PaywallScreen` before letting user start a vent session
- [ ] Wire paywall gate into HomeScreen weekly wheel (if that's a premium feature)
- [ ] Call `incrementVentMessages` each time a vent message is sent in TalkScreen
- [ ] ElevenLabs audio bug on iOS — audio routes to earpiece instead of loudspeaker; fix with `Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })` before playback (see `hooks/useTTS.ts`)
- [ ] Mixpanel: add `identifyUser` traits (name, DOB bucket) after onboarding completes
- [ ] Android: RevenueCat Android key will need `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` when going cross-platform

---

## File structure (key files)

```
App.tsx                          — root, auth, navigation, voice router (~448 lines)
screens/
  TalkScreen.tsx                 — AI therapy/vent session (self-contained)
  SessionScreen.tsx              — guided journaling
  WritingScreen.tsx              — free-form voice journal
  HomeScreen.tsx                 — streak, weekly wheel
  PaywallScreen.tsx              — subscription paywall modal
  AuthScreen.tsx                 — Apple/Google sign-in
  OnboardingScreen.tsx           — name + DOB capture
lib/
  ai/client.ts                   — callClaude / callClaudeChat helpers
  ai/session.ts                  — getTransition, generateInsightAndTraits
  ai/therapy.ts                  — loadTherapyPreview
  ai/journal.ts                  — generateJournalPrompt/Reflection
  supabase/index.ts              — all Supabase data functions
  iap.ts                         — RevenueCat IAP wrapper
  analytics.ts                   — Mixpanel track/identify/reset
  offlineQueue.ts                — queue journal writes when offline
  auth.ts                        — initAuth, buildHoroscopeContext
hooks/
  useVoice.ts                    — mic recording, Whisper transcription
  useTTS.ts                      — ElevenLabs TTS + expo-speech fallback
  useStreak.ts                   — streak fire animation
  useSubscription.ts             — isPremium, canUseVent, freeMessagesRemaining
  useNetworkStatus.ts            — NetInfo connectivity
components/
  OfflineBanner.tsx              — shown when isConnected === false
```
