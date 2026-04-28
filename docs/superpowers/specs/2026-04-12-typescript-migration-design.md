# TypeScript Migration Design

**Date:** 2026-04-12
**Project:** unpack2 (React Native / Expo journaling app)

## Goal

Migrate all source files from JavaScript to TypeScript using the middle-ground strictness strategy: `strict: true` for real bug-catching, with `any` used strategically for external API shapes that are validated at runtime.

## Config

Update `tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native"
  }
}
```

No other build config changes needed — Expo handles TypeScript out of the box.

## File Renames

| From | To |
|------|----|
| `index.js` | `index.ts` |
| `constants.js` | `constants.ts` |
| `lib/api.js` | `lib/api.ts` |
| `lib/auth.js` | `lib/auth.ts` |
| `lib/calendarHelpers.js` | `lib/calendarHelpers.ts` |
| `lib/journalHelpers.js` | `lib/journalHelpers.ts` |
| `lib/supabase.js` | `lib/supabase.ts` |
| `lib/supabaseClient.js` | `lib/supabaseClient.ts` |
| `lib/talkHelpers.js` | `lib/talkHelpers.ts` |
| `components/OnboardingScreen.js` | `components/OnboardingScreen.tsx` |
| `components/Radar.js` | `components/Radar.tsx` |
| `components/ShimmerTile.js` | `components/ShimmerTile.tsx` |
| `App.js` | `App.tsx` |

## What Gets Typed

- **Component props** — define a `Props` type for each component
- **React state** — type all `useState` calls with explicit generics
- **Refs** — type all `useRef` calls
- **Helper function signatures** — parameter types and return types in `lib/`
- **Local variables** where TypeScript cannot infer the type

## What Uses `any`

- Supabase row objects (raw query results)
- Anthropic API request/response payloads
- `AsyncStorage` values
- Any third-party shape that is validated at runtime rather than compile time

The intent is to tighten these over time, but not as part of this migration.

## Migration Order

Files are migrated smallest-to-largest so that breakage can be isolated quickly:

1. `index.ts` (4 lines — trivial)
2. `constants.ts` (72 lines)
3. `lib/supabaseClient.ts` (12 lines)
4. `lib/journalHelpers.ts` (28 lines)
5. `lib/talkHelpers.ts` (41 lines)
6. `lib/calendarHelpers.ts` (54 lines)
7. `lib/auth.ts` (68 lines)
8. `lib/api.ts` (77 lines)
9. `lib/supabase.ts` (182 lines)
10. `components/ShimmerTile.tsx` (16 lines)
11. `components/Radar.tsx` (64 lines)
12. `components/OnboardingScreen.tsx` (120 lines)
13. `App.tsx` (2,066 lines)

## Constraints

- **No logic changes.** This is a pure types migration. Behavior must be identical before and after.
- **Fix errors as they surface.** TypeScript errors flagged after each rename are addressed immediately. Some will be genuine latent bugs; those are fixed in place.
- **No new abstractions.** Do not refactor, extract, or restructure code during this migration.

## Success Criteria

- All 13 files renamed to `.ts` / `.tsx`
- `npx tsc --noEmit` passes with zero errors
- App runs identically to before the migration
