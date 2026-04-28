# TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all 13 source files from `.js`/`.jsx` to `.ts`/`.tsx`, enable `strict: true`, and add type annotations to all function signatures, component props, and state — using `any` only for raw Supabase/Anthropic response shapes.

**Architecture:** Single-pass migration, smallest-to-largest. Each file is renamed and typed in isolation before moving to the next. `App.tsx` is tackled last. No logic changes anywhere.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, Supabase JS v2, Anthropic fetch API

---

## Shared Types Reference

These types are used across multiple tasks. Define them mentally before you start — they're written inline in each task that needs them.

```ts
// Used in calendarHelpers.ts and App.tsx
type CalendarDay = {
  id: string | null;
  insight: string | null;
  topic: string | null;
  hasNote: boolean;
};

// Used in api.ts and App.tsx
type TraitScores = {
  Openness: number;
  'Self-awareness': number;
  Avoidance: number;
  Ambition: number;
  Resilience: number;
};

type InsightResult = {
  insight: string;
  insightShort: string;
  traits: TraitScores;
  topic: string;
};

// Used in supabase.ts
type StreakResult = { streak: number; total: number };

type QAPair = { question: string; answer: string };
```

---

## Task 1: Update tsconfig.json

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Update tsconfig**

Replace the full file content with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "feat: enable strict TypeScript"
```

---

## Task 2: Migrate index.js → index.ts

**Files:**
- Rename: `index.js` → `index.ts`

- [ ] **Step 1: Rename the file**

```bash
mv index.js index.ts
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only errors in other files — those will be fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add index.ts
git commit -m "feat: migrate index.js to TypeScript"
```

---

## Task 3: Migrate constants.js → constants.ts

**Files:**
- Rename: `constants.js` → `constants.ts`

- [ ] **Step 1: Rename the file**

```bash
mv constants.js constants.ts
```

- [ ] **Step 2: Add explicit types to exported arrays**

The file exports `TRAITS`, `QUESTIONS`, and API key constants. Add types to the arrays so callers get proper inference. Find the `TRAITS` and `QUESTIONS` declarations and add `as const` or explicit type annotations:

```ts
export const TRAITS: string[] = ['Openness', 'Self-awareness', 'Avoidance', 'Ambition', 'Resilience'];
export const QUESTIONS: string[] = [
  // existing questions unchanged
];
```

Leave `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_KEY` as-is — TypeScript infers `string` from literals.

- [ ] **Step 3: Verify no new errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add constants.ts
git commit -m "feat: migrate constants.js to TypeScript"
```

---

## Task 4: Migrate lib/supabaseClient.js → lib/supabaseClient.ts

**Files:**
- Rename: `lib/supabaseClient.js` → `lib/supabaseClient.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/supabaseClient.js lib/supabaseClient.ts
```

No type changes needed — `createClient` from `@supabase/supabase-js` is already fully typed.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabaseClient.ts
git commit -m "feat: migrate lib/supabaseClient.js to TypeScript"
```

---

## Task 5: Migrate lib/journalHelpers.js → lib/journalHelpers.ts

**Files:**
- Rename: `lib/journalHelpers.js` → `lib/journalHelpers.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/journalHelpers.js lib/journalHelpers.ts
```

- [ ] **Step 2: Add function signatures**

Replace the three function declarations with typed versions:

```ts
export async function saveJournalEntry(date: string, note: string, timeLabel: string): Promise<void> {
```

```ts
export async function updateJournalEntry(id: string, note: string): Promise<void> {
```

```ts
export async function loadJournalEntries(date: string): Promise<any[]> {
```

(`any[]` for the returned rows — Supabase shapes are `any` per the design spec.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add lib/journalHelpers.ts
git commit -m "feat: migrate lib/journalHelpers.js to TypeScript"
```

---

## Task 6: Migrate lib/talkHelpers.js → lib/talkHelpers.ts

**Files:**
- Rename: `lib/talkHelpers.js` → `lib/talkHelpers.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/talkHelpers.js lib/talkHelpers.ts
```

- [ ] **Step 2: Add function signature**

```ts
export async function loadTherapyPreview(avoidTopics: string[] = []): Promise<string> {
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add lib/talkHelpers.ts
git commit -m "feat: migrate lib/talkHelpers.js to TypeScript"
```

---

## Task 7: Migrate lib/calendarHelpers.js → lib/calendarHelpers.ts

**Files:**
- Rename: `lib/calendarHelpers.js` → `lib/calendarHelpers.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/calendarHelpers.js lib/calendarHelpers.ts
```

- [ ] **Step 2: Add CalendarDay type and function signatures**

At the top of the file (after imports), add:

```ts
type CalendarDay = {
  id: string | null;
  insight: string | null;
  topic: string | null;
  hasNote: boolean;
};
```

Then add signatures:

```ts
export async function loadDayNote(date: string): Promise<string> {
```

```ts
export async function loadCalendarMonth(year: number, month: number): Promise<Record<string, CalendarDay>> {
```

Inside `loadCalendarMonth`, the local `map` variable needs a type annotation:

```ts
const map: Record<string, CalendarDay> = {};
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add lib/calendarHelpers.ts
git commit -m "feat: migrate lib/calendarHelpers.js to TypeScript"
```

---

## Task 8: Migrate lib/auth.js → lib/auth.ts

**Files:**
- Rename: `lib/auth.js` → `lib/auth.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/auth.js lib/auth.ts
```

- [ ] **Step 2: Add types**

Add a type for the profile shape returned by `initAuth`:

```ts
type Profile = { name: string; dob: string } | null;
type AuthResult = { userId: string; profile: Profile };
```

Add these after the imports, before `let _userId`.

Update `_userId` declaration:

```ts
let _userId: string | null = null;
```

Update function signatures:

```ts
export function getUserId(): string | null {
```

```ts
export function buildHoroscopeContext(dob: string | null | undefined): string {
```

```ts
export async function initAuth(): Promise<AuthResult> {
```

```ts
export async function saveProfile(name: string, dob: string): Promise<void> {
```

Update `getZodiacSign` (internal helper):

```ts
function getZodiacSign(month: number, day: number): string {
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors TypeScript surfaces — common ones here:
- `data.user` might be typed as possibly `null` by Supabase — add a non-null assertion `data.user!.id` or a null check.

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: migrate lib/auth.js to TypeScript"
```

---

## Task 9: Migrate lib/api.js → lib/api.ts

**Files:**
- Rename: `lib/api.js` → `lib/api.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/api.js lib/api.ts
```

- [ ] **Step 2: Add types**

Add types after the import:

```ts
type TraitScores = {
  Openness: number;
  'Self-awareness': number;
  Avoidance: number;
  Ambition: number;
  Resilience: number;
};

type InsightResult = {
  insight: string;
  insightShort: string;
  traits: TraitScores;
  topic: string;
};

type QAPair = { question: string; answer: string };
```

Update function signatures:

```ts
export async function getTransition(
  question: string,
  answer: string,
  nextQuestion: string,
  horoscopeContext: string = ''
): Promise<string> {
```

```ts
export async function generateInsightAndTraits(
  answers: QAPair[],
  horoscopeContext: string = ''
): Promise<InsightResult> {
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat: migrate lib/api.js to TypeScript"
```

---

## Task 10: Migrate lib/supabase.js → lib/supabase.ts

**Files:**
- Rename: `lib/supabase.js` → `lib/supabase.ts`

- [ ] **Step 1: Rename the file**

```bash
mv lib/supabase.js lib/supabase.ts
```

- [ ] **Step 2: Add types**

Add after imports:

```ts
type QAPair = { question: string; answer: string };
type StreakResult = { streak: number; total: number };
```

Update function signatures:

```ts
export async function saveSession(
  answers: QAPair[],
  insight: string,
  traits: Record<string, number>,
  topic: string,
  insightShort: string = '',
  userIdOverride: string | null = null
): Promise<void> {
```

```ts
export async function loadStreakAndCount(
  forceToday: boolean = false,
  userIdOverride: string | null = null
): Promise<StreakResult> {
```

```ts
export async function loadAllAnswers(userIdOverride: string | null = null): Promise<Record<string, any>> {
```

(Return type is `Record<string, any>` because the map shape is complex and varies — use `any` per design spec.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors. Common issues in this file:
- `count` from Supabase `select(..., { count: 'exact' })` is typed as `number | null` — replace `count || 0` with `(count ?? 0)` if TypeScript complains.
- The `e` in catch blocks is typed `unknown` under strict mode — change `Alert.alert('Catch error', e.message)` to `Alert.alert('Catch error', (e as Error).message)`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: migrate lib/supabase.js to TypeScript"
```

---

## Task 11: Migrate components/ShimmerTile.js → components/ShimmerTile.tsx

**Files:**
- Rename: `components/ShimmerTile.js` → `components/ShimmerTile.tsx`

- [ ] **Step 1: Rename the file**

```bash
mv components/ShimmerTile.js components/ShimmerTile.tsx
```

- [ ] **Step 2: Add Props type**

```ts
type Props = { size?: number };

export function ShimmerTile({ size }: Props) {
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add components/ShimmerTile.tsx
git commit -m "feat: migrate components/ShimmerTile.js to TypeScript"
```

---

## Task 12: Migrate components/Radar.js → components/Radar.tsx

**Files:**
- Rename: `components/Radar.js` → `components/Radar.tsx`

- [ ] **Step 1: Rename the file**

```bash
mv components/Radar.js components/Radar.tsx
```

- [ ] **Step 2: Add Props types**

```ts
type MiniRadarProps = { traits: Record<string, number>; size?: number };
type FullRadarProps = { traits: Record<string, number> };
```

Update function declarations:

```ts
export function MiniRadar({ traits, size = 80 }: MiniRadarProps) {
```

```ts
export function FullRadar({ traits }: FullRadarProps) {
```

Also type the internal `getPoint` helper in both components:

```ts
function getPoint(index: number, value: number): { x: number; y: number } {
```

And `getLabelPoint` in `FullRadar`:

```ts
function getLabelPoint(index: number): { x: number; y: number } {
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add components/Radar.tsx
git commit -m "feat: migrate components/Radar.js to TypeScript"
```

---

## Task 13: Migrate components/OnboardingScreen.js → components/OnboardingScreen.tsx

**Files:**
- Rename: `components/OnboardingScreen.js` → `components/OnboardingScreen.tsx`

- [ ] **Step 1: Rename the file**

```bash
mv components/OnboardingScreen.js components/OnboardingScreen.tsx
```

- [ ] **Step 2: Add Props type**

```ts
type ProfileData = { name: string; dob: string };
type Props = { onComplete: (profile: ProfileData) => void };

export function OnboardingScreen({ onComplete }: Props) {
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add components/OnboardingScreen.tsx
git commit -m "feat: migrate components/OnboardingScreen.js to TypeScript"
```

---

## Task 14: Migrate App.js → App.tsx

This is the largest file (2,066 lines). The strategy is: rename, run tsc, fix errors one by one. Most fixes will be adding types to `useState`, `useRef`, and catch blocks.

**Files:**
- Rename: `App.js` → `App.tsx`

- [ ] **Step 1: Rename the file**

```bash
mv App.js App.tsx
```

- [ ] **Step 2: Run tsc and capture all errors**

```bash
npx tsc --noEmit 2>&1
```

Work through errors top-to-bottom. The most common categories and their fixes:

**`useState` without inference** — TypeScript can't infer the type from `null` or `[]` initial values. Fix by adding generics:

```ts
// Before
const [therapyPreview, setTherapyPreview] = useState(null);
const [journalEntries, setJournalEntries] = useState([]);
const [calendarSessions, setCalendarSessions] = useState({});
const [handledTopics, setHandledTopics] = useState([]);
const [weeklyTraits, setWeeklyTraits] = useState(null);

// After
const [therapyPreview, setTherapyPreview] = useState<string | null>(null);
const [journalEntries, setJournalEntries] = useState<any[]>([]);
const [calendarSessions, setCalendarSessions] = useState<Record<string, any>>({});
const [handledTopics, setHandledTopics] = useState<string[]>([]);
const [weeklyTraits, setWeeklyTraits] = useState<Record<string, number> | null>(null);
```

Other state that needs explicit generics (add `<type>` as needed for any that TypeScript flags):

```ts
const [sessionCount, setSessionCount] = useState<number>(0);
const [sessionCountLoaded, setSessionCountLoaded] = useState<boolean>(false);
const [streakDays, setStreakDays] = useState<number>(0);
const [hasSessionToday, setHasSessionToday] = useState<boolean>(false);
const [currentEntry, setCurrentEntry] = useState<string>('');
```

**`useRef` without inference** — Fix by adding generics:

```ts
// Recording ref
const recordingRef = useRef<any>(null);

// Session voice mode ref  
const sessionVoiceModeRef = useRef<boolean>(false);

// Any other refs that hold nullable values
const someRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**Catch block `unknown` errors** — Under strict mode, `e` in catch is `unknown`, not `Error`. Fix each catch:

```ts
// Before
} catch (e) {
  console.log(e.message);
}

// After
} catch (e) {
  console.log((e as Error).message);
}
```

**Implicit `any` in callbacks** — Fix by annotating the parameter:

```ts
// Before
messages.filter(m => m.role === 'assistant')

// After — only needed if TypeScript flags it; usually it infers from context
```

- [ ] **Step 3: Run tsc again until clean**

```bash
npx tsc --noEmit 2>&1
```

Repeat until zero errors. Only use `any` as a last resort for shapes that are genuinely dynamic or come from external APIs.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: migrate App.js to TypeScript"
```

---

## Task 15: Final verification

- [ ] **Step 1: Full clean tsc check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Verify no old .js source files remain**

```bash
ls *.js lib/*.js components/*.js 2>&1
```

Expected: `No such file or directory` for all (only `index.js` etc. should be gone — `node_modules` doesn't count).

- [ ] **Step 3: Start the app and confirm it runs**

```bash
npx expo start
```

Open in Expo Go or simulator. Verify the app loads normally and core flows work (journal, session, dashboard).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete TypeScript migration — all 13 files migrated, strict mode enabled"
```
