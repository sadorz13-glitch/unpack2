# Unpack UI Redesign — Design Spec
**Date:** 2026-04-15  
**Scope:** Full redesign — layout, navigation, visual system, screen structure  
**Theme preserved:** Dark luxury, warm black, gold accent `#b48c5a`, off-white text

---

## 1. Design System — `theme.ts`

A single source of truth. All screens import from this file. No hardcoded style values anywhere else.

### Colors
```ts
colors: {
  bg:             '#0a0a0a',        // app background
  surface:        'rgba(17,17,17,0.7)', // frosted card fill
  surfaceBorder:  'rgba(180,140,90,0.15)', // card border
  accent:         '#b48c5a',        // gold — numbers, CTAs, highlights
  textPrimary:    '#e8e4dc',        // main text
  textSecondary:  '#8a8480',        // tile labels, secondary info (brighter than before)
  textMuted:      '#6b6560',        // timestamps, hints
  textGhost:      '#3a3530',        // locked states, placeholders
  border:         '#1e1e1e',        // subtle dividers
}
```

### Typography — DM Serif Display
Loaded via `expo-font` before first render. No flash.

```ts
fonts: {
  display:  { family: 'DMSerifDisplay_400Italic', size: 28, lineHeight: 38 }, // questions, insights
  heading:  { family: 'DMSerifDisplay_400Regular', size: 20, lineHeight: 28 }, // screen titles
  body:     { family: 'System', size: 14, lineHeight: 22 },                   // chat, descriptions
  label:    { family: 'System', size: 9, letterSpacing: 4 },                  // ALL-CAPS labels
  number:   { family: 'DMSerifDisplay_400Italic', size: 36 },                 // streak, big stats
}
```

### Spacing scale
`4 · 8 · 12 · 16 · 24 · 32 · 48` — nothing outside this scale.

### Cards / Surfaces
- `expo-blur` `BlurView` wrapping every card. `intensity={18}`, `tint="dark"`
- Border: `rgba(180,140,90,0.15)`, `borderRadius: 10`
- No elevation shadows — the blur provides depth

---

## 2. Navigation

### Structure
- **Fixed bottom tab bar** — 4 tabs, icon only, gold active dot indicator beneath active icon
- **Horizontal swipe** between tabs via `react-native-pager-view`
- Tab bar is the only navigation chrome — no system nav bar

### Tabs & Icons
| Tab | Icon | Screen |
|-----|------|--------|
| Home | 🏠 | Dashboard |
| Sessions | ✦ | Session flow |
| Talk | 🗣️ | Talk It Out chat |
| Journal | 📅 | Calendar + answers |

The Sessions icon (✦) is a placeholder — can be swapped for a custom SVG glyph before build.

### Fullscreen (edge-to-edge)
- **Android:** `expo-navigation-bar` hides the system nav bar on mount. App is fullscreen. Older Android users can still swipe up from the very bottom to summon the system nav — the OS handles this, the app doesn't fight it.
- **iOS:** Standard behaviour — status bar transparent, content respects safe area.
- **Safe areas:** `useSafeAreaInsets` from `react-native-safe-area-context` used on all screens. Content clears the notch at top; tab bar clears the home indicator at bottom. Background color extends to true screen edges.
- **Status bar:** Translucent on both platforms, light content.

### Gesture Map
| Gesture | Action |
|---------|--------|
| Swipe left edge (0–20px) → right | Go back / close current screen |
| Swipe left or right anywhere on main tabs | Navigate between tabs |
| Swipe up from bottom edge (Android) | System gesture nav (OS handles) |

Edge swipe back uses `react-native-gesture-handler` `PanGestureHandler` listening on the left 20px of the screen. If a swipe starts within that zone and moves right, it triggers navigation back. Mid-session swipe-out re-queues the current question (see Session Flow).

---

## 3. Screens

### 3a. App.tsx (shell only)
After refactor, App.tsx does three things only:
1. Loads fonts via `expo-font`
2. Runs auth init (`initAuth`)
3. Renders the `PagerView` navigator + `BottomTabBar`

All screen logic moves to `screens/`.

### 3b. HomeScreen — Bento Dashboard
**File:** `screens/HomeScreen.tsx`

Asymmetric bento grid. Card sizing signals priority — wider = more important.

| Row | Tile | Width |
|-----|------|-------|
| 1 | Streak (days + session count) | Full width |
| 2 | Talk It Out preview | Full width |
| 3 | Personality Wheel + Journal | Half + Half |
| 4 | Weekly Wheel (locked until 5 sessions) | Full width |

Additional tiles (My Answers, Horoscope, etc.) scroll below the fold.

Tapping any tile opens a full-screen detail view (Personality Wheel expanded, full journal, My Answers history, etc.). Edge swipe from left closes the detail and returns to Home. There is no separate Insights tab — all detail views are reached by tapping tiles.

### 3c. SessionScreen
**File:** `screens/SessionScreen.tsx`

**Flow:**
1. Question displayed in `display` font, centered, italic
2. User types answer in minimal underline input
3. "Next Question" advances. Progress shown as `Q{n}` in header right.
4. After every 3 questions → **Insight Card** screen:
   - AI-generated insight in bordered card
   - "Keep going →" — loads 3 more questions, continues indefinitely
   - "I'm done for now" — saves session, returns to Home
5. EXIT SESSION button visible from Q1 onwards — saves whatever answers exist (no insight generated), returns to Home
6. **Swipe-out mid-question:** if user swipes back from the left edge during a question, that question is pushed back to the front of the question queue and will be the first question next session.

### 3d. TalkScreen
**File:** `screens/TalkScreen.tsx`

Chat interface. No structural changes to logic — visual redesign only:
- Messages use `BlurView` surface
- AI messages italic, user messages plain
- Input area: underline text field + MIC label + SEND label
- Header shows "TALK IT OUT" wordmark

### 3e. JournalScreen
**File:** `screens/JournalScreen.tsx`

- Month calendar at top with gold-highlighted active days, today has gold border
- Tapping a day loads that day's answers below
- Editable if today, read-only otherwise
- Header right shows month/year, tappable to navigate months

---

## 4. File Structure After Refactor

```
unpack2/
├── App.tsx                  ← shell only: fonts, auth, navigator
├── theme.ts                 ← NEW: design system tokens
├── screens/
│   ├── HomeScreen.tsx       ← NEW: bento dashboard
│   ├── SessionScreen.tsx    ← NEW: session + continuation flow
│   ├── TalkScreen.tsx       ← NEW: therapy chat
│   └── JournalScreen.tsx    ← NEW: calendar + answers
├── components/
│   ├── BottomTabBar.tsx     ← NEW: fixed icon tab bar
│   ├── BlurCard.tsx         ← NEW: reusable frosted card wrapper
│   ├── Radar.tsx            ← existing
│   ├── ShimmerTile.tsx      ← existing
│   └── OnboardingScreen.tsx ← existing
├── lib/                     ← unchanged
└── constants.ts             ← unchanged
```

---

## 5. Dependencies to Add

| Package | Purpose |
|---------|---------|
| `@expo-google-fonts/dm-serif-display` | DM Serif Display font |
| `expo-blur` | BlurView for frosted cards |
| `expo-navigation-bar` | Hide Android system nav bar |
| `react-native-pager-view` | Horizontal tab swipe |
| `react-native-gesture-handler` | Edge swipe back gesture |

`react-native-safe-area-context` is already installed.

---

## 6. What Does Not Change

- All AI logic (`lib/api.ts`, `lib/talkHelpers.ts`)
- Supabase schema and all data helpers
- Auth flow (`lib/auth.ts`)
- Streak, session count, weekly wheel unlock logic
- Onboarding screen (visual refresh only, no logic changes)
- Voice input / TTS implementation
