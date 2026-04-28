# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Unpack's entire UI with a theme.ts design system, bento dashboard, DM Serif Display font, frosted BlurView cards, fixed bottom tab bar, and extracted screen files — while leaving all AI/Supabase/auth logic untouched.

**Architecture:** App.tsx becomes a thin shell (fonts + auth + PagerView navigator). All screens live in `screens/`. A single `theme.ts` exports every color, font, and spacing token. Shared UI primitives live in `components/`.

**Tech Stack:** Expo SDK, react-native-pager-view (tab swipe), expo-blur (frosted cards), expo-navigation-bar (Android fullscreen), react-native-gesture-handler (edge-swipe back), @expo-google-fonts/dm-serif-display, react-native-safe-area-context (already installed), jest-expo (tests)

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `theme.ts` | CREATE | All design tokens: colors, fonts, spacing, radius |
| `components/BlurCard.tsx` | CREATE | Reusable frosted-glass card wrapper |
| `components/BottomTabBar.tsx` | CREATE | Fixed 4-icon tab bar with gold active dot |
| `screens/HomeScreen.tsx` | CREATE | Bento dashboard — all 9 tiles |
| `screens/SessionScreen.tsx` | CREATE | Session flow: questions → insight → continue/done |
| `screens/TalkScreen.tsx` | CREATE | Talk It Out chat UI (logic unchanged) |
| `screens/JournalScreen.tsx` | CREATE | Calendar + journal + answers detail |
| `App.tsx` | MODIFY | Thin shell: fonts, auth, PagerView, fullscreen |
| `components/ShimmerTile.tsx` | MODIFY | Use theme tokens |
| `components/Radar.tsx` | NO CHANGE | Already standalone |
| `components/OnboardingScreen.tsx` | NO CHANGE | Visual refresh deferred |
| `lib/*`, `constants.ts` | NO CHANGE | All logic untouched |
| `package.json` | MODIFY | Add deps + jest config |

---

## Task 1: Install dependencies + test setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new runtime dependencies**

```bash
cd C:/Users/sador/unpack2
npx expo install expo-blur expo-navigation-bar react-native-pager-view react-native-gesture-handler @expo-google-fonts/dm-serif-display expo-font
```

Expected: packages added to node_modules and package.json.

- [ ] **Step 2: Install test dependencies**

```bash
npx expo install jest-expo @testing-library/react-native @types/jest --dev
```

- [ ] **Step 3: Add jest config and test script to package.json**

Open `package.json`. Add `"test": "jest"` to `scripts`, and add the `jest` block:

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "test": "jest --watchAll=false"
},
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 4: Verify test runner works**

Create `__tests__/smoke.test.ts`:

```ts
describe('smoke', () => {
  it('passes', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`  
Expected output: `Tests: 1 passed`

- [ ] **Step 5: Commit**

```bash
git add package.json __tests__/smoke.test.ts
git commit -m "chore: add test setup and new UI dependencies"
```

---

## Task 2: Create theme.ts

**Files:**
- Create: `theme.ts`

- [ ] **Step 1: Create the file**

```ts
// theme.ts
import { Dimensions } from 'react-native';

export const colors = {
  bg:            '#0a0a0a',
  surface:       'rgba(17,17,17,0.7)',
  surfaceBorder: 'rgba(180,140,90,0.15)',
  accent:        '#b48c5a',
  textPrimary:   '#e8e4dc',
  textSecondary: '#8a8480',
  textMuted:     '#6b6560',
  textGhost:     '#3a3530',
  border:        '#1e1e1e',
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   24,
  xl:   32,
  xxl:  48,
} as const;

export const radius = {
  card:   10,
  button: 2,
  dot:    2,
} as const;

// Font family names from @expo-google-fonts/dm-serif-display
export const fontFamilies = {
  serifRegular: 'DMSerifDisplay_400Regular',
  serifItalic:  'DMSerifDisplay_400Italic',
} as const;

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 2-column bento grid: 24px padding each side, 12px gap between columns
export const CARD_SIZE = (SCREEN_WIDTH - 48 - 12) / 2;
```

- [ ] **Step 2: Commit**

```bash
git add theme.ts
git commit -m "feat: add theme.ts design system tokens"
```

---

## Task 3: Create BlurCard component

**Files:**
- Create: `components/BlurCard.tsx`
- Create: `__tests__/BlurCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/BlurCard.test.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { BlurCard } from '../components/BlurCard';

jest.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

describe('BlurCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <BlurCard><Text>hello</Text></BlurCard>
    );
    expect(getByText('hello')).toBeTruthy();
  });
});
```

Run: `npm test -- --testPathPattern=BlurCard`  
Expected: FAIL — `Cannot find module '../components/BlurCard'`

- [ ] **Step 2: Implement BlurCard**

Create `components/BlurCard.tsx`:

```tsx
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
};

export function BlurCard({ children, style, intensity = 18 }: Props) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- --testPathPattern=BlurCard`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/BlurCard.tsx __tests__/BlurCard.test.tsx
git commit -m "feat: add BlurCard frosted-glass component"
```

---

## Task 4: Create BottomTabBar component

**Files:**
- Create: `components/BottomTabBar.tsx`
- Create: `__tests__/BottomTabBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/BottomTabBar.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomTabBar } from '../components/BottomTabBar';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

describe('BottomTabBar', () => {
  it('renders all 4 tab icons', () => {
    const { getAllByText } = render(
      <BottomTabBar activeTab={0} onTabPress={jest.fn()} />
    );
    expect(getAllByText('🏠').length).toBe(1);
    expect(getAllByText('✦').length).toBe(1);
    expect(getAllByText('🗣️').length).toBe(1);
    expect(getAllByText('📅').length).toBe(1);
  });

  it('calls onTabPress with correct index', () => {
    const onTabPress = jest.fn();
    const { getAllByRole } = render(
      <BottomTabBar activeTab={0} onTabPress={onTabPress} />
    );
    fireEvent.press(getAllByRole('button')[2]); // Talk tab
    expect(onTabPress).toHaveBeenCalledWith(2);
  });
});
```

Run: `npm test -- --testPathPattern=BottomTabBar`  
Expected: FAIL — `Cannot find module '../components/BottomTabBar'`

- [ ] **Step 2: Implement BottomTabBar**

Create `components/BottomTabBar.tsx`:

```tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export type TabId = 0 | 1 | 2 | 3;

const TABS: { icon: string }[] = [
  { icon: '🏠' },
  { icon: '✦' },
  { icon: '🗣️' },
  { icon: '📅' },
];

type Props = {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
};

export function BottomTabBar({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab, index) => {
        const isActive = activeTab === index;
        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            style={styles.tab}
            onPress={() => onTabPress(index as TabId)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, !isActive && styles.iconDim]}>{tab.icon}</Text>
            <View style={[styles.dot, isActive && styles.dotActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(10,10,10,0.97)',
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  iconDim: {
    opacity: 0.3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --testPathPattern=BottomTabBar`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/BottomTabBar.tsx __tests__/BottomTabBar.test.tsx
git commit -m "feat: add BottomTabBar with 4 tabs and gold active indicator"
```

---

## Task 5: Create HomeScreen (bento dashboard)

**Files:**
- Create: `screens/HomeScreen.tsx`

This screen receives all dashboard data as props from App.tsx. It does not fetch data itself.

- [ ] **Step 1: Create HomeScreen.tsx**

```tsx
// screens/HomeScreen.tsx
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurCard } from '../components/BlurCard';
import { MiniRadar } from '../components/Radar';
import { ShimmerTile } from '../components/ShimmerTile';
import { colors, spacing, fontFamilies, CARD_SIZE } from '../theme';
import { TRAITS } from '../constants';

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
  onOpenWheel: () => void;
  onOpenJournal: () => void;
  onOpenAnswers: () => void;
  onOpenInsight: () => void;
  onOpenWeeklyWheel: () => void;
  onOpenStreak: () => void;
  onDevWipe: () => void;
  userId: string | null;
};

export function HomeScreen({
  streakDays, sessionCount, sessionCountLoaded, hasSessionToday,
  insight, insightShort, traits, weeklyTraits, topic, therapyPreview, dayNote,
  freshSession, streakDisplayValue, showFireEmoji, fireFloatAnim, fireOpacityAnim,
  streakScaleAnim, onStartSession, onOpenTalk, onOpenWheel, onOpenJournal,
  onOpenAnswers, onOpenInsight, onOpenWeeklyWheel, onOpenStreak, onDevWipe, userId,
}: Props) {
  const insets = useSafeAreaInsets();
  const topTrait = traits ? TRAITS.reduce((a: string, b: string) => ((traits[a] ?? 0) > (traits[b] ?? 0) ? a : b)) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.base, paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>UNPACK</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
          </Text>
        </View>

        {/* Start Session CTA */}
        <TouchableOpacity style={styles.sessionCta} onPress={onStartSession}>
          <Text style={styles.sessionCtaText}>START SESSION</Text>
        </TouchableOpacity>

        {/* Bento Grid */}
        <View style={styles.bento}>

          {/* Row 1: Streak — full width */}
          <TouchableOpacity onPress={onOpenStreak} activeOpacity={0.8} style={styles.wideTileWrapper}>
            <BlurCard style={styles.wideTile}>
              <View style={styles.streakInner}>
                <View>
                  <Text style={styles.tileLabel}>STREAK</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                    {showFireEmoji && (
                      <Animated.Text style={[styles.fireEmoji, { transform: [{ translateY: fireFloatAnim }], opacity: fireOpacityAnim }]}>🔥</Animated.Text>
                    )}
                    <Animated.Text style={[styles.streakNumber, { transform: [{ scale: streakScaleAnim }], color: hasSessionToday && streakDays > 0 ? colors.accent : colors.textGhost }]}>
                      {streakDisplayValue || streakDays}
                    </Animated.Text>
                    <Text style={styles.tileSubLabel}>DAYS</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tileLabel}>SESSIONS</Text>
                  <Text style={styles.sessionCountNumber}>{sessionCount}</Text>
                </View>
              </View>
            </BlurCard>
          </TouchableOpacity>

          {/* Row 2: Talk It Out — full width */}
          <TouchableOpacity
            onPress={() => { if (sessionCountLoaded && sessionCount === 0) return; onOpenTalk(); }}
            activeOpacity={0.8}
            style={styles.wideTileWrapper}
          >
            <BlurCard style={styles.wideTile}>
              <Text style={styles.tileLabel}>TALK IT OUT</Text>
              {sessionCountLoaded && sessionCount === 0 ? (
                <Text style={styles.lockedText}>🔒  Complete a session to unlock.</Text>
              ) : therapyPreview === null ? (
                <ShimmerTile size={CARD_SIZE * 0.5} />
              ) : therapyPreview === '' ? (
                <Text style={styles.previewText}>Complete a session to unlock your first preview.</Text>
              ) : (
                <Text style={[styles.previewText, { color: colors.accent, fontFamily: fontFamilies.serifItalic, fontSize: 13 }]} numberOfLines={3}>
                  {therapyPreview}
                </Text>
              )}
            </BlurCard>
          </TouchableOpacity>

          {/* Row 3: Wheel + Journal — half each */}
          <View style={styles.halfRow}>
            <TouchableOpacity onPress={onOpenWheel} activeOpacity={0.8} style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>WHEEL</Text>
                <View style={styles.tileCenter}>
                  {freshSession && traits
                    ? <MiniRadar traits={traits} />
                    : <Text style={styles.previewText}>Complete{'\n'}a session</Text>
                  }
                </View>
              </BlurCard>
            </TouchableOpacity>

            <TouchableOpacity onPress={onOpenJournal} activeOpacity={0.8} style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>JOURNAL</Text>
                <Text style={styles.previewText} numberOfLines={3}>
                  {dayNote || 'Tap to write...'}
                </Text>
              </BlurCard>
            </TouchableOpacity>
          </View>

          {/* Row 4: My Answers — full width */}
          <TouchableOpacity onPress={onOpenAnswers} activeOpacity={0.8} style={styles.wideTileWrapper}>
            <BlurCard style={styles.wideTile}>
              <Text style={styles.tileLabel}>MY ANSWERS</Text>
              <Text style={styles.previewText} numberOfLines={2}>
                {insight ? (insightShort || insight.split(' ').slice(0, 10).join(' ') + '...') : 'Complete a session'}
              </Text>
            </BlurCard>
          </TouchableOpacity>

          {/* Row 5: Top Trait + Weekly Wheel */}
          <View style={styles.halfRow}>
            <TouchableOpacity onPress={onOpenWheel} activeOpacity={0.8} style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>TOP TRAIT</Text>
                {traits && topTrait ? (
                  <View style={styles.tileCenter}>
                    <Text style={styles.bigNumber}>{traits[topTrait]}%</Text>
                    <Text style={[styles.tileSubLabel, { marginTop: 2 }]}>{topTrait.toUpperCase()}</Text>
                  </View>
                ) : (
                  <Text style={styles.previewText}>Complete{'\n'}a session</Text>
                )}
              </BlurCard>
            </TouchableOpacity>

            <TouchableOpacity onPress={onOpenWeeklyWheel} activeOpacity={0.8} style={styles.halfTileWrapper}>
              <BlurCard style={styles.halfTile}>
                <Text style={styles.tileLabel}>WEEKLY WHEEL</Text>
                {weeklyTraits ? (
                  <MiniRadar traits={weeklyTraits} />
                ) : (
                  <Text style={styles.lockedText}>
                    {'Unlocks after\n5 sessions\n\n'}{Math.max(0, 5 - sessionCount)} to go
                  </Text>
                )}
              </BlurCard>
            </TouchableOpacity>
          </View>

        </View>

        {/* Dev wipe (very faint) */}
        <TouchableOpacity onPress={onDevWipe} style={styles.devWipe}>
          <Text style={styles.devWipeText}>DEV WIPE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  wordmark: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 6,
    fontFamily: undefined,
  },
  headerDate: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 3,
  },
  sessionCta: {
    borderWidth: 1,
    borderColor: 'rgba(180,140,90,0.4)',
    borderRadius: 2,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sessionCtaText: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 6,
  },
  bento: { gap: spacing.md },
  wideTileWrapper: { width: '100%' },
  wideTile: { padding: spacing.base },
  halfRow: { flexDirection: 'row', gap: spacing.md },
  halfTileWrapper: { flex: 1 },
  halfTile: { padding: spacing.base, minHeight: CARD_SIZE },
  tileLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  tileSubLabel: {
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: 2,
  },
  tileCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  streakInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  streakNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 40,
    lineHeight: 44,
    color: colors.accent,
  },
  sessionCountNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 24,
    color: colors.textPrimary,
  },
  bigNumber: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 32,
    color: colors.accent,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  lockedText: {
    color: colors.textGhost,
    fontSize: 11,
    lineHeight: 18,
  },
  fireEmoji: {
    fontSize: 32,
    position: 'absolute',
    top: -16,
  },
  devWipe: { marginTop: spacing.xl, alignSelf: 'flex-end', opacity: 0.25 },
  devWipeText: { color: colors.textMuted, fontSize: 9, letterSpacing: 2 },
});
```

- [ ] **Step 2: Commit**

```bash
git add screens/HomeScreen.tsx
git commit -m "feat: add HomeScreen bento dashboard"
```

---

## Task 6: Create SessionScreen (with continuation flow)

**Files:**
- Create: `screens/SessionScreen.tsx`
- Create: `__tests__/sessionUtils.test.ts`

The session continuation logic is pure and testable. Extract it first.

- [ ] **Step 1: Write tests for session batch logic**

Create `__tests__/sessionUtils.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { saveRequeuedQuestion, loadAndClearRequeuedQuestion } from '../screens/SessionScreen';

describe('session requeue logic', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and retrieves a requeued question', async () => {
    await saveRequeuedQuestion('What are you avoiding?');
    const result = await loadAndClearRequeuedQuestion();
    expect(result).toBe('What are you avoiding?');
  });

  it('clears the question after loading', async () => {
    await saveRequeuedQuestion('What are you avoiding?');
    await loadAndClearRequeuedQuestion();
    const result = await loadAndClearRequeuedQuestion();
    expect(result).toBeNull();
  });

  it('returns null when no question is queued', async () => {
    const result = await loadAndClearRequeuedQuestion();
    expect(result).toBeNull();
  });
});
```

Run: `npm test -- --testPathPattern=sessionUtils`  
Expected: FAIL — `Cannot find module '../screens/SessionScreen'`

- [ ] **Step 2: Create SessionScreen.tsx with exported utility functions**

Create `screens/SessionScreen.tsx`:

```tsx
// screens/SessionScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies } from '../theme';
import { QUESTIONS, ANTHROPIC_KEY } from '../constants';
import { getTransition, generateInsightAndTraits } from '../lib/api';
import { saveSession, loadStreakAndCount } from '../lib/supabase';

// ─── Exported utilities (tested) ─────────────────────────────────────────────

const REQUEUE_KEY = 'requeuedQuestion';

export async function saveRequeuedQuestion(question: string): Promise<void> {
  await AsyncStorage.setItem(REQUEUE_KEY, question);
}

export async function loadAndClearRequeuedQuestion(): Promise<string | null> {
  const val = await AsyncStorage.getItem(REQUEUE_KEY);
  if (val) await AsyncStorage.removeItem(REQUEUE_KEY);
  return val;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  userId: string | null;
  sessionCount: number;
  horoscopeContext: string;
  topic: string;
  traits: Record<string, number> | null;
  isRecording: boolean;
  isTranscribing: boolean;
  micPulseAnim: Animated.Value;
  meteringLevelAnim: Animated.Value;
  ttsEnabled: boolean;
  onSessionComplete: (params: {
    answers: { question: string; answer: string }[];
    insight: string;
    insightShort: string;
    traits: Record<string, number>;
    topic: string;
    streak: number;
    total: number;
  }) => void;
  onExit: () => void;
  onStartVoiceRecording: (setter: (t: string) => void) => void;
  onStopVoiceRecording: (setter: (t: string) => void) => void;
  onStopTTS: () => void;
  onSpeakAndWait: (text: string) => Promise<void>;
  sessionVoiceModeRef: React.MutableRefObject<boolean>;
};

type SessionView = 'question' | 'insight' | 'loading';

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionScreen({
  userId, sessionCount, horoscopeContext, topic, traits, isRecording, isTranscribing,
  micPulseAnim, meteringLevelAnim, ttsEnabled, onSessionComplete, onExit,
  onStartVoiceRecording, onStopVoiceRecording, onStopTTS, onSpeakAndWait, sessionVoiceModeRef,
}: Props) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<SessionView>('question');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [transitioning, setTransitioning] = useState(false);
  const [transition, setTransition] = useState('');
  const [batchAnswers, setBatchAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [allAnswers, setAllAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [insight, setInsight] = useState('');
  const [insightShort, setInsightShort] = useState('');
  const [currentTraits, setCurrentTraits] = useState<Record<string, number> | null>(null);
  const [currentTopic, setCurrentTopic] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1); // overall question count
  const [pregeneratedQuestion, setPregeneratedQuestion] = useState<string | null>(null);
  const answersRef = useRef<{ question: string; answer: string }[]>([]);
  const currentQuestionRef = useRef('');
  const batchAnswersRef = useRef<{ question: string; answer: string }[]>([]);

  // Load first question on mount
  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    const requeued = await loadAndClearRequeuedQuestion();
    const first = requeued || getNextQuestion([]);
    setCurrentQuestion(first);
    currentQuestionRef.current = first;
    setUsedQuestions([first]);
    generateNextQuestion([first], []).then(q => setPregeneratedQuestion(q));
    if (sessionVoiceModeRef) {
      sessionVoiceModeRef.current = true;
      await new Promise(r => setTimeout(r, 400));
      await Promise.race([onSpeakAndWait(first), new Promise(r => setTimeout(r, 10000))]);
      onStartVoiceRecording(setInput);
    }
  }

  function getNextQuestion(used: string[]): string {
    const available = QUESTIONS.filter((q: string) => !used.includes(q));
    if (available.length === 0) return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    return available[Math.floor(Math.random() * available.length)];
  }

  async function generateNextQuestion(used: string[], answersSoFar: { question: string; answer: string }[]): Promise<string> {
    try {
      const recentTopics = topic ? `Recent session topic: ${topic}. ` : '';
      const traitContext = traits ? `Traits: ${Object.entries(traits).map(([k,v]) => `${k} ${v}%`).join(', ')}. ` : '';
      const answeredSoFar = answersSoFar.length > 0
        ? 'Already answered this session:\n' + answersSoFar.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n') + '\n\n'
        : '';
      const usedList = used.length > 0 ? 'Do not ask any of these:\n' + used.join('\n') + '\n\n' : '';
      const prompt = horoscopeContext + `\n\nGenerate ONE powerful journaling question for this person. ${recentTopics}${traitContext}${answeredSoFar}${usedList}Style: direct, slightly confrontational, introspective. Max 15 words. No preamble, just the question.`;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 60, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await response.json();
      return data.content[0].text.trim().replace(/^["']|["']$/g, '');
    } catch {
      return getNextQuestion(used);
    }
  }

  async function submitAnswer(answerText?: string) {
    const userAnswer = (answerText ?? input).trim();
    if (!userAnswer || transitioning) return;

    const newBatchAnswers = [...batchAnswersRef.current, { question: currentQuestionRef.current, answer: userAnswer }];
    batchAnswersRef.current = newBatchAnswers;
    setBatchAnswers(newBatchAnswers);
    setInput('');
    setInputMode('voice');
    setQuestionNumber(q => q + 1);

    const newAllAnswers = [...answersRef.current, { question: currentQuestionRef.current, answer: userAnswer }];
    answersRef.current = newAllAnswers;
    setAllAnswers(newAllAnswers);

    if (newBatchAnswers.length >= 3) {
      // End of batch — generate insight
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
    } else {
      // Next question in batch
      const next = pregeneratedQuestion || getNextQuestion(usedQuestions);
      setPregeneratedQuestion(null);
      const newUsed = [...usedQuestions, next];
      setUsedQuestions(newUsed);
      setTransitioning(true);
      setTransition('...');
      generateNextQuestion(newUsed, newAllAnswers).then(q => setPregeneratedQuestion(q));
      try {
        const bridge = await getTransition(currentQuestionRef.current, userAnswer, next, horoscopeContext);
        setTransition(bridge);
        if (sessionVoiceModeRef?.current) {
          await Promise.race([onSpeakAndWait(bridge), new Promise(r => setTimeout(r, 10000))]);
        } else {
          await new Promise(r => setTimeout(r, 2800));
        }
      } catch {
        if (!sessionVoiceModeRef?.current) await new Promise(r => setTimeout(r, 2800));
      }
      setCurrentQuestion(next);
      currentQuestionRef.current = next;
      setTransition('');
      setTransitioning(false);
      if (sessionVoiceModeRef?.current) {
        await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, 10000))]);
        onStartVoiceRecording(setInput);
      }
    }
  }

  async function handleKeepGoing() {
    // Reset batch, continue with more questions
    batchAnswersRef.current = [];
    setBatchAnswers([]);
    const next = pregeneratedQuestion || getNextQuestion(usedQuestions);
    setPregeneratedQuestion(null);
    const newUsed = [...usedQuestions, next];
    setUsedQuestions(newUsed);
    setCurrentQuestion(next);
    currentQuestionRef.current = next;
    setView('question');
    generateNextQuestion(newUsed, answersRef.current).then(q => setPregeneratedQuestion(q));
    if (sessionVoiceModeRef) {
      sessionVoiceModeRef.current = true;
      await Promise.race([onSpeakAndWait(next), new Promise(r => setTimeout(r, 10000))]);
      onStartVoiceRecording(setInput);
    }
  }

  async function handleDone() {
    if (!insight) return;
    try {
      await saveSession(answersRef.current, insight, currentTraits, currentTopic, insightShort, userId);
      const { streak, total } = await loadStreakAndCount(true, userId);
      onSessionComplete({
        answers: answersRef.current, insight, insightShort,
        traits: currentTraits || {}, topic: currentTopic, streak, total,
      });
    } catch (e) {
      onSessionComplete({
        answers: answersRef.current, insight, insightShort,
        traits: currentTraits || {}, topic: currentTopic, streak: 0, total: 0,
      });
    }
  }

  async function handleExit() {
    if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
    onStopTTS();
    // Save partial if we have any answers
    if (answersRef.current.length > 0 && insight) {
      try {
        await saveSession(answersRef.current, insight, currentTraits, currentTopic, insightShort, userId);
      } catch { /* best effort */ }
    }
    onExit();
  }

  // Edge swipe from left = exit + requeue current question
  function handleEdgeSwipe({ nativeEvent }: any) {
    if (
      nativeEvent.state === State.END &&
      nativeEvent.x0 < 25 &&
      nativeEvent.translationX > 60 &&
      view === 'question'
    ) {
      saveRequeuedQuestion(currentQuestionRef.current).then(() => {
        if (sessionVoiceModeRef) sessionVoiceModeRef.current = false;
        onStopTTS();
        onExit();
      });
    }
  }

  if (view === 'loading') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl, backgroundColor: colors.bg }]}>
        <Text style={styles.wordmark}>UNPACK</Text>
        <ActivityIndicator color={colors.accent} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.loadingText}>reading between the lines...</Text>
      </View>
    );
  }

  if (view === 'insight') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, backgroundColor: colors.bg }]}>
        <Text style={styles.wordmark}>UNPACK</Text>
        <Text style={[styles.question, { marginBottom: spacing.xl }]}>
          I can work with that, let's unpack.
        </Text>
        <BlurCard style={{ padding: spacing.xl, marginBottom: spacing.xl }}>
          <Text style={styles.insightLabel}>YOUR INSIGHT</Text>
          <Text style={styles.insightText}>{insight}</Text>
        </BlurCard>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleKeepGoing}>
          <Text style={styles.primaryBtnText}>KEEP GOING →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: spacing.lg, alignSelf: 'center' }} onPress={handleDone}>
          <Text style={styles.ghostText}>I'M DONE FOR NOW</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // view === 'question'
  return (
    <PanGestureHandler onHandlerStateChange={handleEdgeSwipe}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}
      >
        <ScrollView
          contentContainerStyle={[styles.questionScroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.sessionHeader}>
            <TouchableOpacity onPress={handleExit}>
              <Text style={styles.exitText}>EXIT SESSION</Text>
            </TouchableOpacity>
            <Text style={styles.qProgress}>Q{questionNumber}</Text>
          </View>

          {/* Question or transition */}
          {transitioning ? (
            <>
              <Text style={styles.transition}>{transition}</Text>
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
            </>
          ) : (
            <Text style={styles.question}>Tell me... {currentQuestion}</Text>
          )}

          {/* Input */}
          {!transitioning && (
            inputMode === 'voice' ? (
              <View style={styles.voiceArea}>
                <TouchableOpacity
                  onPress={() => { if (isRecording) onStopVoiceRecording(setInput); }}
                  activeOpacity={isRecording ? 0.6 : 1}
                >
                  <Animated.View style={[styles.micRing, { borderColor: isRecording ? 'rgba(180,140,90,0.5)' : colors.border, transform: [{ scale: micPulseAnim }] }]}>
                    <Animated.View style={[styles.micDot, { backgroundColor: isRecording ? colors.accent : '#2a2822', transform: [{ scale: meteringLevelAnim }] }]} />
                  </Animated.View>
                </TouchableOpacity>
                {isTranscribing
                  ? <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: spacing.base }} />
                  : <Text style={styles.listeningText}>{isRecording ? 'TAP TO SEND' : ''}</Text>
                }
                {!isRecording && !isTranscribing && (
                  <TouchableOpacity onPress={() => { if (sessionVoiceModeRef) sessionVoiceModeRef.current = false; setInputMode('type'); }} style={{ marginTop: spacing.lg }}>
                    <Text style={styles.ghostText}>TYPE INSTEAD</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <TextInput
                  style={styles.textInput}
                  placeholder="be honest..."
                  placeholderTextColor={colors.textGhost}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  blurOnSubmit={false}
                />
                <View style={styles.textInputActions}>
                  <TouchableOpacity onPress={() => setInputMode('voice')}>
                    <Text style={styles.ghostText}>USE MIC</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => submitAnswer()}>
                    <Text style={styles.primaryBtnText}>CONTINUE →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  questionScroll: { alignItems: 'center', paddingHorizontal: spacing.xl, flexGrow: 1 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.xl },
  wordmark: { color: colors.textMuted, fontSize: 11, letterSpacing: 6, textAlign: 'center', marginBottom: spacing.xl },
  qProgress: { color: colors.textGhost, fontSize: 9, letterSpacing: 4 },
  exitText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  question: { fontFamily: fontFamilies.serifItalic, fontSize: 22, color: colors.textPrimary, textAlign: 'center', lineHeight: 32, marginBottom: spacing.xl },
  transition: { fontFamily: fontFamilies.serifItalic, fontSize: 18, color: colors.accent, textAlign: 'center', lineHeight: 28 },
  voiceArea: { alignItems: 'center', width: '100%', paddingVertical: spacing.base },
  micRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  micDot: { width: 7, height: 7, borderRadius: 3.5 },
  listeningText: { color: colors.accent, fontSize: 9, letterSpacing: 3, marginTop: spacing.md },
  textInput: {
    color: colors.textPrimary, fontSize: 15,
    borderBottomWidth: 1, borderBottomColor: colors.textGhost,
    paddingVertical: spacing.md, marginBottom: spacing.base,
    minHeight: 60, maxHeight: 160, textAlignVertical: 'top', alignSelf: 'stretch',
  },
  textInputActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  primaryBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.4)', borderRadius: 2, paddingVertical: spacing.base, paddingHorizontal: spacing.xl },
  primaryBtnText: { color: colors.accent, fontSize: 11, letterSpacing: 6 },
  ghostText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  insightLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 4, marginBottom: spacing.lg },
  insightText: { fontFamily: fontFamilies.serifItalic, fontSize: 18, color: colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  loadingText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
```

- [ ] **Step 3: Run the session tests**

Run: `npm test -- --testPathPattern=sessionUtils`  
Expected: PASS — 3 tests pass

- [ ] **Step 4: Commit**

```bash
git add screens/SessionScreen.tsx __tests__/sessionUtils.test.ts
git commit -m "feat: add SessionScreen with batch continuation and swipe-out requeue"
```

---

## Task 7: Create TalkScreen

**Files:**
- Create: `screens/TalkScreen.tsx`

Visual redesign only — all therapy logic (openTherapySession, sendTherapyMessage) is passed in as props from App.tsx, unchanged.

- [ ] **Step 1: Create TalkScreen.tsx**

```tsx
// screens/TalkScreen.tsx
import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies } from '../theme';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  chatMessages: Message[];
  therapyInput: string;
  therapyLoading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  inputMode: 'voice' | 'type';
  micPulseAnim: Animated.Value;
  meteringLevelAnim: Animated.Value;
  ttsEnabled: boolean;
  sessionCount: number;
  sessionCountLoaded: boolean;
  therapyPreview: string | null;
  pinnedTherapyTopic: string;
  onSendMessage: (text?: string) => void;
  onSetTherapyInput: (text: string) => void;
  onSetInputMode: (mode: 'voice' | 'type') => void;
  onOpenTherapy: (topic?: string) => void;
  onStopVoiceRecording: (setter: (t: string) => void) => void;
  therapyVoiceModeRef: React.MutableRefObject<boolean>;
};

export function TalkScreen({
  chatMessages, therapyInput, therapyLoading, isRecording, isTranscribing,
  inputMode, micPulseAnim, meteringLevelAnim, sessionCount, sessionCountLoaded,
  therapyPreview, pinnedTherapyTopic, onSendMessage, onSetTherapyInput,
  onSetInputMode, onOpenTherapy, onStopVoiceRecording, therapyVoiceModeRef,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-open therapy on first mount if there are no messages yet
    if (chatMessages.length === 0 && sessionCount > 0) {
      therapyVoiceModeRef.current = true;
      onOpenTherapy(pinnedTherapyTopic);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatMessages]);

  if (sessionCountLoaded && sessionCount === 0) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.bg }]}>
        <Text style={styles.lockedTitle}>Talk It Out</Text>
        <Text style={styles.lockedSub}>Complete a session to unlock.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={40}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.wordmark}>TALK IT OUT</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {chatMessages.map((msg, i) => (
          <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
            <BlurCard
              intensity={msg.role === 'user' ? 8 : 18}
              style={[
                styles.msgBubble,
                msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAI,
              ]}
            >
              <Text style={[styles.msgText, msg.role === 'assistant' && styles.msgTextAI]}>
                {msg.content}
              </Text>
            </BlurCard>
          </View>
        ))}
        {therapyLoading && (
          <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }} />
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        {inputMode === 'voice' ? (
          <View style={styles.voiceRow}>
            <TouchableOpacity onPress={() => { if (isRecording) onStopVoiceRecording(onSetTherapyInput); }} activeOpacity={isRecording ? 0.6 : 1}>
              <Animated.View style={[styles.micRing, { borderColor: isRecording ? 'rgba(180,140,90,0.5)' : colors.border, transform: [{ scale: micPulseAnim }] }]}>
                <Animated.View style={[styles.micDot, { backgroundColor: isRecording ? colors.accent : '#2a2822', transform: [{ scale: meteringLevelAnim }] }]} />
              </Animated.View>
            </TouchableOpacity>
            {isTranscribing
              ? <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: spacing.md }} />
              : <Text style={styles.listeningLabel}>{isRecording ? 'LISTENING' : ''}</Text>
            }
            {!isRecording && !isTranscribing && (
              <TouchableOpacity onPress={() => { therapyVoiceModeRef.current = false; onSetInputMode('type'); }} style={{ marginTop: spacing.base }}>
                <Text style={styles.ghostText}>TYPE INSTEAD</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.typeRow}>
            <TouchableOpacity onPress={() => onSetInputMode('voice')} style={{ paddingVertical: spacing.md }}>
              <Text style={styles.ghostText}>MIC</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="reply..."
              placeholderTextColor={colors.textGhost}
              value={therapyInput}
              onChangeText={onSetTherapyInput}
              multiline
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={() => onSendMessage()} style={{ paddingVertical: spacing.md }}>
              <Text style={[styles.ghostText, { color: colors.accent, letterSpacing: 3 }]}>SEND</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingBottom: spacing.base, paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  wordmark: { color: colors.textSecondary, fontSize: 11, letterSpacing: 5 },
  msgRow: { alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: spacing.md },
  msgBubbleAI: {},
  msgBubbleUser: { borderColor: 'rgba(180,140,90,0.25)' },
  msgText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  msgTextAI: { fontStyle: 'italic' },
  inputArea: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.base, paddingHorizontal: spacing.lg,
  },
  voiceRow: { alignItems: 'center', paddingVertical: spacing.sm },
  micRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  micDot: { width: 7, height: 7, borderRadius: 3.5 },
  listeningLabel: { color: colors.accent, fontSize: 9, letterSpacing: 3, marginTop: spacing.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textInput: { flex: 1, color: colors.textPrimary, fontSize: 14, borderBottomWidth: 1, borderBottomColor: '#2a2822', paddingVertical: spacing.md },
  ghostText: { color: colors.textGhost, fontSize: 9, letterSpacing: 3 },
  lockedTitle: { fontFamily: fontFamilies.serifItalic, fontSize: 24, color: colors.textPrimary, marginBottom: spacing.base },
  lockedSub: { color: colors.textMuted, fontSize: 14 },
});
```

- [ ] **Step 2: Commit**

```bash
git add screens/TalkScreen.tsx
git commit -m "feat: add TalkScreen with BlurCard messages and redesigned input"
```

---

## Task 8: Create JournalScreen

**Files:**
- Create: `screens/JournalScreen.tsx`

Combines the calendar detail view, journal entry, and my answers screens — all previously in `cardDetail` in App.tsx.

- [ ] **Step 1: Create JournalScreen.tsx**

```tsx
// screens/JournalScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurCard } from '../components/BlurCard';
import { colors, spacing, fontFamilies, SCREEN_WIDTH } from '../theme';
import { supabase, loadAllAnswers } from '../lib/supabase';
import { loadDayNote, loadCalendarMonth } from '../lib/calendarHelpers';
import { saveJournalEntry, updateJournalEntry, loadJournalEntries } from '../lib/journalHelpers';

type Props = {
  userId: string | null;
  dayNote: string;
  onDayNoteChange: (note: string) => void;
};

type CalendarSession = { id: string; insight: string; topic: string; hasNote?: boolean };
type SelectedDay = { date: string; session: CalendarSession | null; answers: any[] | null; dayNote: string };

export function JournalScreen({ userId, dayNote, onDayNoteChange }: Props) {
  const insets = useSafeAreaInsets();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSessions, setCalendarSessions] = useState<Record<string, CalendarSession>>({});
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
  const [currentEntry, setCurrentEntry] = useState('');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [noteSaved, setNoteSaved] = useState(false);
  const [detailView, setDetailView] = useState<'journal' | 'answers' | null>(null);
  const [allAnswers, setAllAnswers] = useState<any[]>([]);
  const [allAnswersLoading, setAllAnswersLoading] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<number, string>>({});

  const today = new Date().toLocaleDateString('en-CA');
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cellSize = (SCREEN_WIDTH - 48) / 7;

  useEffect(() => {
    loadMonth(calendarMonth);
    loadTodayJournal();
  }, []);

  async function loadMonth(date: Date) {
    setCalendarLoading(true);
    const map = await loadCalendarMonth(date.getFullYear(), date.getMonth());
    setCalendarSessions(map as any);
    setCalendarLoading(false);
  }

  async function loadTodayJournal() {
    const entries = await loadJournalEntries(today);
    if (entries.length > 0) {
      setJournalEntries(entries.map((e: any) => ({ ...e, saved: true })));
      onDayNoteChange(entries[entries.length - 1].note);
    }
  }

  async function goMonth(dir: number) {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + dir, 1);
    setCalendarMonth(next);
    setSelectedDay(null);
    await loadMonth(next);
  }

  async function tapDay(d: number) {
    const key = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d).toLocaleDateString('en-CA');
    const session = calendarSessions[key] || null;
    const note = await loadDayNote(key);
    setSelectedDay({ date: key, session, answers: null, dayNote: note || '' });
    if (session?.id) {
      const { data } = await supabase.from('answers').select('question, answer').eq('session_id', session.id).order('id', { ascending: true });
      setSelectedDay(prev => prev ? { ...prev, answers: data || [] } : null);
    } else {
      setSelectedDay(prev => prev ? { ...prev, answers: [] } : null);
    }
  }

  async function saveEntry() {
    if (!currentEntry.trim()) return;
    await saveJournalEntry(today, currentEntry.trim());
    const entries = await loadJournalEntries(today);
    setJournalEntries(entries.map((e: any) => ({ ...e, saved: true })));
    onDayNoteChange(currentEntry.trim());
    setCurrentEntry('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function buildCalendarCells() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    const leading = (firstDow + 6) % 7;
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  const monthLabel = calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();

  // Detail views (journal write / all answers) pushed on top
  if (detailView === 'journal') {
    return (
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END && nativeEvent.x0 < 25 && nativeEvent.translationX > 60) {
            setDetailView(null);
          }
        }}
      >
        <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl }}>
          <TouchableOpacity onPress={() => setDetailView(null)} style={{ marginBottom: spacing.xl }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.sectionLabel}>TODAY — {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()}</Text>
          {journalEntries.map((entry, i) => (
            <BlurCard key={i} style={{ padding: spacing.base, marginBottom: spacing.md }}>
              <Text style={styles.entryTime}>{entry.time_label}</Text>
              <Text style={styles.entryText}>{entry.note}</Text>
            </BlurCard>
          ))}
          <TextInput
            style={styles.journalInput}
            placeholder="write something..."
            placeholderTextColor={colors.textGhost}
            value={currentEntry}
            onChangeText={setCurrentEntry}
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
            <Text style={styles.saveBtnText}>{noteSaved ? 'SAVED ✓' : 'SAVE'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </PanGestureHandler>
    );
  }

  if (detailView === 'answers') {
    return (
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END && nativeEvent.x0 < 25 && nativeEvent.translationX > 60) {
            setDetailView(null);
          }
        }}
      >
        <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl }}>
          <TouchableOpacity onPress={() => setDetailView(null)} style={{ marginBottom: spacing.xl }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.sectionLabel}>MY ANSWERS</Text>
          {allAnswersLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : allAnswers.map((session: any, si: number) => (
            <View key={si} style={{ marginBottom: spacing.xl }}>
              <Text style={styles.entryTime}>{session.date}{session.isToday ? ' — TODAY' : ''}</Text>
              {session.items.map((item: any, ii: number) => (
                <View key={ii} style={{ marginBottom: spacing.base }}>
                  <Text style={styles.answerQuestion}>{item.question}</Text>
                  <Text style={styles.answerText}>{editedAnswers[item.index] ?? item.answer}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </PanGestureHandler>
    );
  }

  // Main calendar view
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.calHeader, { paddingTop: insets.top + spacing.base }]}>
        <TouchableOpacity onPress={() => goMonth(-1)} style={styles.monthNav}>
          <Text style={styles.monthNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => goMonth(1)} style={styles.monthNav}>
          <Text style={styles.monthNavText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {/* Day labels */}
        <View style={styles.dayLabelRow}>
          {DAY_LABELS.map((l, i) => (
            <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
              <Text style={styles.dayLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {calendarLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {buildCalendarCells().map((d, i) => {
              if (!d) return <View key={`b${i}`} style={{ width: cellSize, height: cellSize }} />;
              const key = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d).toLocaleDateString('en-CA');
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
            })}
          </View>
        )}

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setDetailView('journal')}>
            <Text style={styles.actionBtnText}>WRITE JOURNAL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            setDetailView('answers');
            setAllAnswersLoading(true);
            loadAllAnswers(userId).then(data => { setAllAnswers(data); setAllAnswersLoading(false); });
          }}>
            <Text style={styles.actionBtnText}>MY ANSWERS</Text>
          </TouchableOpacity>
        </View>

        {/* Selected day detail */}
        {selectedDay && (
          <View style={{ marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg }}>
            <Text style={styles.sectionLabel}>
              {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </Text>
            {!selectedDay.session ? (
              <Text style={styles.entryTime}>No session this day.</Text>
            ) : selectedDay.answers === null ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                {selectedDay.session.insight ? (
                  <Text style={styles.insightPreview}>{selectedDay.session.insight}</Text>
                ) : null}
                {selectedDay.answers.map((a: any, i: number) => (
                  <View key={i} style={{ marginBottom: spacing.base }}>
                    <Text style={styles.answerQuestion}>{a.question}</Text>
                    <Text style={styles.answerText}>{a.answer}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  monthNav: { padding: spacing.sm },
  monthNavText: { color: colors.accent, fontSize: 22 },
  monthLabel: { color: colors.textPrimary, fontSize: 11, letterSpacing: 4 },
  dayLabelRow: { flexDirection: 'row', marginVertical: spacing.sm },
  dayLabel: { color: colors.textGhost, fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  dayCell: { width: cellSize - 6, height: cellSize - 6, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  dayCellSelected: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.5)', backgroundColor: 'rgba(180,140,90,0.08)' },
  dayNum: { color: '#2a2822', fontSize: 13 },
  dayNumActive: { color: colors.textPrimary, fontWeight: '600' },
  dayNumToday: { color: colors.textGhost },
  sessionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 1 },
  sectionLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 4, marginBottom: spacing.base },
  entryTime: { color: colors.textGhost, fontSize: 9, letterSpacing: 2, marginBottom: spacing.sm },
  entryText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  journalInput: { color: colors.textPrimary, fontSize: 14, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { borderWidth: 1, borderColor: 'rgba(180,140,90,0.3)', borderRadius: 2, paddingVertical: spacing.base, alignItems: 'center', marginTop: spacing.base },
  saveBtnText: { color: colors.accent, fontSize: 11, letterSpacing: 4 },
  backText: { color: colors.textMuted, fontSize: 14, letterSpacing: 2 },
  answerQuestion: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginBottom: spacing.sm },
  answerText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  insightPreview: { fontFamily: fontFamilies.serifItalic, color: colors.accent, fontSize: 15, lineHeight: 24, marginBottom: spacing.lg },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(180,140,90,0.25)', borderRadius: 2, paddingVertical: spacing.md, alignItems: 'center' },
  actionBtnText: { color: colors.textMuted, fontSize: 9, letterSpacing: 3 },
});

// Needed for StyleSheet reference inside styles object
const cellSize = (SCREEN_WIDTH - 48) / 7;
```

- [ ] **Step 2: Commit**

```bash
git add screens/JournalScreen.tsx
git commit -m "feat: add JournalScreen with calendar, journal write, and answers"
```

---

## Task 9: Refactor App.tsx into a thin shell

**Files:**
- Modify: `App.tsx`

App.tsx becomes: font loading → auth → `<PagerView>` with 4 screens + `<BottomTabBar>`. All existing logic functions (submitAnswer, openTherapySession, sendTherapyMessage, etc.) move into App.tsx as props passed down to screens. The screen state machine (`screen`, `activeCard`) is replaced by `activeTab`.

- [ ] **Step 1: Add GestureHandlerRootView wrapper and font loading**

Replace the entire top of App.tsx (imports through the `export default function App()` opening) with:

```tsx
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Alert, Animated, Platform, BackHandler } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, DMSerifDisplay_400Regular, DMSerifDisplay_400Italic } from '@expo-google-fonts/dm-serif-display';
import PagerView from 'react-native-pager-view';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { QUESTIONS, TRAITS, OPENAI_KEY, ANTHROPIC_KEY } from './constants';
import { supabase, saveSession, loadStreakAndCount, loadAllAnswers, loadWeeklyTraits, loadLastSession } from './lib/supabase';
import { initAuth, buildHoroscopeContext } from './lib/auth';
import { OnboardingScreen } from './components/OnboardingScreen';
import { getTransition, generateInsightAndTraits } from './lib/api';
import { loadTherapyPreview } from './lib/talkHelpers';
import { saveJournalEntry, updateJournalEntry, loadJournalEntries } from './lib/journalHelpers';
import { loadDayNote, loadCalendarMonth } from './lib/calendarHelpers';
import { MiniRadar, FullRadar } from './components/Radar';
import { ShimmerTile } from './components/ShimmerTile';
import { BottomTabBar, TabId } from './components/BottomTabBar';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { TalkScreen } from './screens/TalkScreen';
import { JournalScreen } from './screens/JournalScreen';
import { colors } from './theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

export default function App() {
```

- [ ] **Step 2: Add activeTab state and remove screen/activeCard state**

Find and replace these state lines in App.tsx:

Remove:
```tsx
const [screen, setScreen] = useState('home');
const [activeCard, setActiveCard] = useState<string | null>(null);
const [cameFromHome, setCameFromHome] = useState(false);
const [cameFromDone, setCameFromDone] = useState(false);
```

Add after the other useState declarations:
```tsx
const [activeTab, setActiveTab] = useState<TabId>(0);
const pagerRef = useRef<any>(null);
const [fontsLoaded] = useFonts({ DMSerifDisplay_400Regular, DMSerifDisplay_400Italic });
```

- [ ] **Step 3: Add fullscreen effect for Android**

Add this useEffect after the existing effects in App.tsx:

```tsx
useEffect(() => {
  if (Platform.OS === 'android') {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }
}, []);
```

- [ ] **Step 4: Replace the entire render return with the new shell**

Find the section starting at `if (!authReady)` and replace everything from that line to the end of the function with:

```tsx
  if (!fontsLoaded || !authReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (needsOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" translucent />
          <OnboardingScreen
            onComplete={({ name, dob }) => {
              setHoroscopeContext(buildHoroscopeContext(dob));
              setNeedsOnboarding(false);
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  function handleTabPress(tab: TabId) {
    setActiveTab(tab);
    pagerRef.current?.setPage(tab);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={0}
            onPageSelected={e => setActiveTab(e.nativeEvent.position as TabId)}
          >
            {/* Tab 0: Home */}
            <View key="0" style={{ flex: 1 }}>
              <HomeScreen
                streakDays={streakDays}
                sessionCount={sessionCount}
                sessionCountLoaded={sessionCountLoaded}
                hasSessionToday={hasSessionToday}
                insight={insight}
                insightShort={insightShort}
                traits={traits}
                weeklyTraits={weeklyTraits}
                topic={topic}
                therapyPreview={therapyPreview}
                dayNote={dayNote}
                freshSession={freshSession}
                streakDisplayValue={streakDisplayValue}
                showFireEmoji={showFireEmoji}
                fireFloatAnim={fireFloatAnim}
                fireOpacityAnim={fireOpacityAnim}
                streakScaleAnim={streakScaleAnim}
                onStartSession={() => { setActiveTab(1); pagerRef.current?.setPage(1); startSession(); }}
                onOpenTalk={() => { setActiveTab(2); pagerRef.current?.setPage(2); }}
                onOpenWheel={() => {}}
                onOpenJournal={() => { setActiveTab(3); pagerRef.current?.setPage(3); }}
                onOpenAnswers={() => { setActiveTab(3); pagerRef.current?.setPage(3); }}
                onOpenInsight={() => {}}
                onOpenWeeklyWheel={() => {}}
                onOpenStreak={() => {}}
                onDevWipe={devWipe}
                userId={userId}
              />
            </View>

            {/* Tab 1: Sessions */}
            <View key="1" style={{ flex: 1 }}>
              <SessionScreen
                userId={userId}
                sessionCount={sessionCount}
                horoscopeContext={horoscopeContext}
                topic={topic}
                traits={traits}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                micPulseAnim={micPulseAnim}
                meteringLevelAnim={meteringLevelAnim}
                ttsEnabled={ttsEnabled}
                onSessionComplete={({ answers, insight: ins, insightShort: insShort, traits: tr, topic: tp, streak, total }) => {
                  setInsight(ins); setInsightShort(insShort); setTraits(tr); setTopic(tp);
                  setStreakDays(streak); setSessionCount(total); setSessionCountLoaded(true);
                  setHasSessionToday(true); setFreshSession(true);
                  setActiveTab(0); pagerRef.current?.setPage(0);
                }}
                onExit={() => { setActiveTab(0); pagerRef.current?.setPage(0); }}
                onStartVoiceRecording={startVoiceRecording}
                onStopVoiceRecording={stopVoiceRecording}
                onStopTTS={stopTTS}
                onSpeakAndWait={speakAndWait}
                sessionVoiceModeRef={sessionVoiceModeRef}
              />
            </View>

            {/* Tab 2: Talk */}
            <View key="2" style={{ flex: 1 }}>
              <TalkScreen
                chatMessages={chatMessages}
                therapyInput={therapyInput}
                therapyLoading={therapyLoading}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                inputMode={inputMode as 'voice' | 'type'}
                micPulseAnim={micPulseAnim}
                meteringLevelAnim={meteringLevelAnim}
                ttsEnabled={ttsEnabled}
                sessionCount={sessionCount}
                sessionCountLoaded={sessionCountLoaded}
                therapyPreview={therapyPreview}
                pinnedTherapyTopic={pinnedTherapyTopic}
                onSendMessage={sendTherapyMessage}
                onSetTherapyInput={setTherapyInput}
                onSetInputMode={setInputMode}
                onOpenTherapy={openTherapySession}
                onStopVoiceRecording={stopVoiceRecording}
                therapyVoiceModeRef={therapyVoiceModeRef}
              />
            </View>

            {/* Tab 3: Journal */}
            <View key="3" style={{ flex: 1 }}>
              <JournalScreen
                userId={userId}
                dayNote={dayNote}
                onDayNoteChange={setDayNote}
              />
            </View>
          </PagerView>

          <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 5: Add devWipe helper function**

Find the wipe logic inline in the old `home` screen render and extract it as a named function in App.tsx (before the render return):

```tsx
async function devWipe() {
  Alert.alert('Wipe all data?', 'Deletes everything for test-user-1. Cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Wipe', style: 'destructive', onPress: async () => {
      await AsyncStorage.multiRemove(['handledTopics', 'flaggedTopics']);
      const { data: sessions } = await supabase.from('sessions').select('id').eq('user_id', userId);
      if (sessions?.length) await supabase.from('answers').delete().in('session_id', sessions.map((s: any) => s.id));
      await supabase.from('sessions').delete().eq('user_id', userId);
      await supabase.from('day_notes').delete().eq('user_id', userId);
      setInsight(''); setInsightShort(''); setTraits(null); setTopic('');
      setAnswers([]); setSessionCount(0); setStreakDays(0); setHasSessionToday(false);
      setJournalEntries([]); setCurrentEntry(''); setDayNote('');
      setHandledTopics([]); setFlaggedTopics([]); setTherapyPreview('');
      setWeeklyTraits(null); Alert.alert('Done', 'All data wiped.');
    }},
  ]);
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (or only pre-existing errors — do not fix new ones in this step).

- [ ] **Step 7: Commit**

```bash
git add App.tsx
git commit -m "refactor: extract screens into PagerView shell, add font loading and GestureHandlerRootView"
```

---

## Task 10: Update ShimmerTile to use theme tokens

**Files:**
- Modify: `components/ShimmerTile.tsx`

- [ ] **Step 1: Update ShimmerTile**

Replace the content of `components/ShimmerTile.tsx`:

```tsx
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { colors } from '../theme';

type Props = { size?: number };

export function ShimmerTile({ size }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.10] });
  return (
    <Animated.View style={{
      width: size || 40, height: 8, borderRadius: 4,
      backgroundColor: colors.accent, opacity, marginBottom: 6,
    }} />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ShimmerTile.tsx
git commit -m "refactor: ShimmerTile uses theme tokens"
```

---

## Task 11: Fullscreen polish — safe areas and status bar

**Files:**
- Modify: `App.tsx` (StatusBar already added in Task 9)

The `GestureHandlerRootView`, `SafeAreaProvider`, and `StatusBar` were added in Task 9. This task verifies them on-device and adds any missing safe-area padding.

- [ ] **Step 1: Verify safe area insets are applied**

Each screen uses `useSafeAreaInsets()`. Confirm:
- `HomeScreen`: `paddingTop: insets.top + spacing.base` ✓ (in scroll contentContainerStyle)
- `SessionScreen`: `paddingTop: insets.top + spacing.xl` ✓ (in question scroll)
- `TalkScreen`: `paddingTop: insets.top + spacing.base` ✓ (in header)
- `JournalScreen`: `paddingTop: insets.top + spacing.base` ✓ (in calHeader)
- `BottomTabBar`: `paddingBottom: Math.max(insets.bottom, 8)` ✓

If any screen is missing the top inset, add it to that screen's top-level container.

- [ ] **Step 2: Add expo-navigation-bar Android call**

Confirm the useEffect from Task 9 Step 3 is present in App.tsx:

```tsx
useEffect(() => {
  if (Platform.OS === 'android') {
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }
}, []);
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass (smoke + BlurCard + BottomTabBar + sessionUtils).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete UI redesign — bento grid, DM Serif, BlurCards, PagerView nav, fullscreen"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] theme.ts design tokens — Task 2
- [x] DM Serif Display font — Task 1 (install) + Task 9 (useFonts)
- [x] BlurView frosted cards — Task 3 (BlurCard)
- [x] Fixed bottom tab bar with gold dot — Task 4 (BottomTabBar)
- [x] Horizontal swipe between tabs — Task 9 (PagerView)
- [x] Bento dashboard — Task 5 (HomeScreen)
- [x] Session continuation (keep going / done) — Task 6 (SessionScreen)
- [x] Swipe-out mid-question requeues — Task 6 (handleEdgeSwipe + saveRequeuedQuestion)
- [x] EXIT SESSION button — Task 6 (handleExit)
- [x] Talk It Out redesign — Task 7 (TalkScreen)
- [x] Journal calendar + answers — Task 8 (JournalScreen)
- [x] App.tsx shell — Task 9
- [x] Android fullscreen (expo-navigation-bar) — Task 9 + Task 11
- [x] Edge swipe back gesture — Task 6 (SessionScreen) + Task 8 (JournalScreen detail views)
- [x] Safe area insets — Task 11

**Notes for implementer:**
- `startSession()` in App.tsx still exists from the original code — SessionScreen.tsx has its own `initSession()`. The `startSession()` call in HomeScreen's `onStartSession` prop just navigates to tab 1; the SessionScreen remounts and calls `initSession()` on its own useEffect.
- The `inputMode` state in App.tsx is shared between session and talk. Both screens receive it as a prop. When SessionScreen resets to 'voice', it calls the App.tsx `setInputMode` via the `onStartVoiceRecording` callback chain.
- Voice recording functions (`startVoiceRecording`, `stopVoiceRecording`, `speakAndWait`, `stopTTS`) remain in App.tsx and are passed down as props — they reference App.tsx refs and state directly.
