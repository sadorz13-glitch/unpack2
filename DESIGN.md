# Unpack: Ivory & Ink Design System (v1.0)

## 0. System Notes

This is the source-of-truth design system for the Unpack React Native app. AI coding agents must reference this file when building any screen or component. All values are objective and machine-readable.

**Platform:** React Native (Expo SDK 54), iOS-first
**Default mode:** Light (Ivory & Ink)
**Optional mode:** Dark (preserves gold accent)
**Font loading:** Playfair Display (700, 700italic), Inter (400, 500, 600, 700) — loaded via expo-font

---

## 1. Color Tokens

### Light Mode
```json
{
  "bg-primary": "#fbf9f9",
  "bg-secondary": "#ffffff",
  "bg-surface": "#f5f3f3",
  "bg-surface-variant": "#dbdad9",
  "text-primary": "#1a1a1a",
  "text-secondary": "#4a4a4a",
  "text-tertiary": "#7a7a7a",
  "text-on-primary": "#ffffff",
  "border-subtle": "rgba(26, 26, 26, 0.05)",
  "border-strong": "rgba(26, 26, 26, 0.15)",
  "accent-primary": "#1a1a1a",
  "accent-gold": "#b48c5a",
  "status-success": "#2e7d32",
  "status-warning": "#ed6c02",
  "status-danger": "#d32f2f",
  "overlay-scrim": "rgba(0, 0, 0, 0.4)"
}
```

### Dark Mode
```json
{
  "bg-primary": "#131314",
  "bg-secondary": "#1b1c1c",
  "bg-surface": "#1f2021",
  "bg-surface-variant": "#393939",
  "text-primary": "#ffffff",
  "text-secondary": "#dbdad9",
  "text-tertiary": "#9a9a9a",
  "text-on-primary": "#131314",
  "border-subtle": "rgba(255, 255, 255, 0.05)",
  "border-strong": "rgba(255, 255, 255, 0.15)",
  "accent-primary": "#b48c5a",
  "accent-gold": "#b48c5a",
  "status-success": "#4caf50",
  "status-warning": "#ff9800",
  "status-danger": "#f44336",
  "overlay-scrim": "rgba(0, 0, 0, 0.6)"
}
```

**Note:** In dark mode, `accent-primary` shifts to gold. This means primary buttons in dark mode are gold-filled, not black-filled.

---

## 2. Typography

| Token | Family | Weight | Size (px) | Line Height (px) | Letter Spacing (px) | Style |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **display** | Playfair Display | 700 | 48 | 56 | -1 | Italic |
| **h1** | Playfair Display | 700 | 36 | 44 | -0.5 | Italic |
| **h2** | Playfair Display | 700 | 28 | 34 | -0.2 | Italic |
| **h3** | Playfair Display | 600 | 22 | 28 | 0 | Italic |
| **body-large** | Inter | 400 | 18 | 26 | 0 | Regular |
| **body** | Inter | 400 | 16 | 24 | 0 | Regular |
| **caption** | Inter | 400 | 14 | 20 | 0.2 | Regular |
| **label-caps** | Inter | 600 | 12 | 16 | 1.5 | Uppercase |
| **label-sm** | Inter | 500 | 11 | 14 | 1.2 | Uppercase |
| **button-text** | Inter | 600 | 14 | 20 | 0.5 | Uppercase |

---

## 3. Spacing Scale
```json
{
  "xs": 4,
  "sm": 8,
  "md": 16,
  "lg": 24,
  "xl": 32,
  "2xl": 48,
  "3xl": 64,
  "margin-screen": 20
}
```

---

## 4. Border Radius Scale
```json
{
  "none": 0,
  "sm": 4,
  "md": 8,
  "lg": 16,
  "xl": 24,
  "full": 9999
}
```

---

## 5. Shadows / Elevation
```json
{
  "elevation-0": "none",
  "elevation-1": "0px 2px 4px 0px rgba(0, 0, 0, 0.05)",
  "elevation-2": "0px 4px 12px 0px rgba(0, 0, 0, 0.08)",
  "elevation-3": "0px 20px 40px 0px rgba(26, 26, 26, 0.04)"
}
```

React Native equivalent (use `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` on iOS; `elevation` on Android).

---

## 6. Component Specs

### PillButton (Primary)
- **Dimensions**: height 56px, width 100% of container
- **Padding**: 0px 32px
- **Border Radius**: `radius-full`
- **Background**: `accent-primary`
- **Text Style**: `button-text` in `text-on-primary`
- **Icon (optional)**: 18px, color `text-on-primary`, right-aligned with 8px gap from text
- **States**: default opacity 1.0 / pressed opacity 0.8 + scale 0.98 / disabled opacity 0.3

### OutlinedPillButton (Secondary)
- **Dimensions**: height 56px, width 100% of container
- **Padding**: 0px 32px
- **Border Radius**: `radius-full`
- **Background**: transparent
- **Border**: 1px solid `accent-primary`
- **Text Style**: `button-text` in `accent-primary`
- **States**: default opacity 1.0 / pressed opacity 0.6 / disabled opacity 0.3

### IconButton
- **Dimensions**: 44x44px touch target
- **Padding**: 10px
- **Icon**: 24px, color `text-primary`
- **Background**: transparent
- **States**: pressed = `bg-surface` background with `radius-full`

### Card (Default)
- **Min Height**: 120px
- **Padding**: 24px
- **Border Radius**: `radius-md` (8px)
- **Background**: `bg-secondary`
- **Border**: 1px solid `border-subtle`
- **Shadow**: `elevation-1`

### HeroImageCard
- **Height**: 240px (mobile), 320px (tablet)
- **Border Radius**: `radius-lg` (16px)
- **Background**: image (cover, top-aligned)
- **Overlay**: linear gradient `rgba(0,0,0,0)` top → `rgba(0,0,0,0.5)` bottom
- **Content Padding**: 24px
- **Quote text style**: `h3` in white, italic, centered, with optional quotation marks
- **CTA**: small `PillButton` variant at bottom (height 44px, padding 0 24px)

### Tag (Pill)
- **Padding**: 4px 10px
- **Height**: 24px
- **Border Radius**: `radius-full`
- **Background**: `bg-surface`
- **Text Style**: `label-sm` in `text-secondary`

### FAB (Floating Action Button)
- **Dimensions**: 56x56px
- **Border Radius**: `radius-lg` (16px) — NOT circular, matches editorial aesthetic
- **Background**: `accent-primary`
- **Icon**: 24px, color `text-on-primary`
- **Shadow**: `elevation-2`
- **Position**: absolute, bottom 24px + safe area bottom inset, right 20px
- **States**: pressed = scale 0.95

### ProgressSegments
- **Width**: 100% minus screen padding
- **Height**: 4px
- **Gap between segments**: 4px
- **Border Radius (per segment)**: `radius-full`
- **Active segment**: `accent-primary`
- **Inactive segment**: `bg-surface-variant`
- **Animation**: 200ms ease-out fill transition when advancing

### SectionDivider
- **Height**: 1px
- **Color**: `border-subtle`
- **Section gap before**: 32px
- **Section gap after**: 16px
- **Optional label above**: `label-caps` in `text-tertiary`, 8px margin between label and line

### MicButton (Large Square)
- **Dimensions**: 120x120px
- **Border Radius**: `radius-xl` (24px)
- **Background**: `accent-primary`
- **Icon**: 32px microphone, color `text-on-primary`
- **Shadow**: `elevation-2` default, `elevation-3` when active
- **States**:
  - Default: opacity 1.0
  - Pressed: scale 0.95
  - Active (Listening): pulse animation, scale 1.0 → 1.05 → 1.0, 1500ms infinite

### WaveformBar (Audio Visualization)
- **Container**: 80px height, full width minus screen padding
- **Bars**: 4px wide, gap 4px between bars
- **Bar count**: 32 bars across width
- **Bar height range**: 8px (silent) to 60px (loud)
- **Bar border radius**: `radius-full`
- **Color**: `accent-primary`
- **Animation**: Y-axis scale driven by audio amplitude (60fps)
- **Idle state**: subtle continuous wave (sin curve, 1500ms loop)
- **Active state**: amplitude-reactive

### TabBarItem (Bottom Nav)
- **Each tab**: equal flex, ~80px wide on mobile
- **Vertical padding**: 8px top, 4px bottom
- **Icon**: 24px, stroke weight 1.5
- **Label**: `label-sm` in small caps, 2px margin above text from icon
- **Inactive state**: icon + label color = `text-tertiary`
- **Active state**: icon + label color = `accent-primary`, label weight 600
- **No background change on press** — only icon/label color transitions
- **Active indicator**: small 4px circular dot below icon, color `accent-primary`

### ListRow (Settings-style)
- **Min Height**: 56px
- **Padding**: 16px 20px
- **Background**: `bg-secondary`
- **Title text style**: `body` in `text-primary`
- **Subtitle (optional)**: `caption` in `text-tertiary`, 2px margin below title
- **Right element**: chevron / toggle / radio / value text (right-aligned)
- **Right chevron**: 20px chevron-right icon, color `text-tertiary`
- **Right value text**: `body` in `text-tertiary`
- **States**: pressed = `bg-surface` background
- **Divider**: 1px `border-subtle` between rows in a group (no divider on last row of group)

### ToggleSwitch (iOS-style)
- **Outer dimensions**: 51x31px
- **Outer border radius**: `radius-full`
- **Outer background**: `accent-primary` (on) / `bg-surface-variant` (off)
- **Inner thumb**: 27x27px circle, white
- **Inner shadow**: `elevation-1`
- **Animation**: 200ms ease-out for thumb position + color transition

### RadioButton
- **Outer**: 24x24px circle
- **Outer border**: 2px solid `text-tertiary` (unselected) or `accent-primary` (selected)
- **Inner dot**: 12x12px circle in `accent-primary` (selected only)
- **States**: pressed = scale 0.92

### TextInput
- **Default Style**: Underlined (no box)
- **Height**: 48px
- **Padding**: 0px (text fills row), with 8px bottom margin to underline
- **Border**: 1px `border-strong` (bottom only)
- **Text style**: `body-large` in `text-primary`
- **Placeholder color**: `text-tertiary`
- **States**:
  - Focused: bottom border width 2px, color `accent-primary`
  - Error: bottom border color `status-danger`, helper text below in `caption` color `status-danger`
  - Disabled: opacity 0.5

### PricingCard
- **Padding**: 20px 24px
- **Border Radius**: `radius-lg` (16px)
- **Background**: `bg-secondary`
- **Border**: 1px solid `border-subtle` (unselected) or 2px solid `accent-primary` (selected)
- **Title**: `h3` in `text-primary`
- **Price**: `body-large` in `text-primary`
- **Period subtitle**: `caption` in `text-secondary`
- **Optional savings badge (top-right)**: Tag-style pill with `accent-primary` text
- **Optional "free trial" badge (top-left, overlapping)**: small black pill (height 24px, padding 0 12px) with `label-sm` white text, slightly above and left of card corner
- **Right radio indicator**: RadioButton component aligned to vertical center

### StatusBar Handling
- **Light Mode**: `barStyle="dark-content"`, background transparent
- **Dark Mode**: `barStyle="light-content"`, background transparent

### Toast / Alert
- **Padding**: 16px 20px
- **Border Radius**: `radius-md`
- **Background**: `accent-primary`
- **Text style**: `body` in `text-on-primary`
- **Position**: top, 16px below safe area
- **Animation**: slide down + fade in (300ms), auto-dismiss after 3000ms

---

## 7. Iconography
- **Library**: Lucide React Native
- **Default size**: 24px
- **Stroke weight**: 1.5
- **Default color**: `text-primary`
- **Style**: outline, rounded corners

---

## 8. Layout Rules

### Safe Area
- **Top**: respect device safe area inset (typically 44-54px on notched iPhones)
- **Bottom**: respect device safe area inset (typically 34px on notched iPhones)
- **Horizontal screen padding**: 20px both sides

### Bottom Tab Bar
- **Position**: fixed at bottom, absolute
- **Height**: 84px (includes safe area bottom padding)
- **Background**: `bg-secondary` with 95% opacity
- **Backdrop filter**: blur 20px (iOS)
- **Top border**: 1px `border-subtle`
- **Tab count**: 4 (TODAY, TALK, JOURNAL, ANALYTICS)
- **Active indicator**: 4px circular dot below icon, `accent-primary`

### Scroll Behavior
- **All tabbed screens**: ScrollView wraps content area, with `paddingBottom: 100` to ensure last items aren't hidden under tab bar
- **Header area** (screen title + meta): does NOT scroll on Today screen — stays pinned at top. Other screens (Talk, Journal, Analytics) have scrolling headers (standard behavior).
- **Modal screens** (Session, Settings, Paywall, Onboarding): no tab bar, full screen, X close in top-left or top-right

### Section Gap (vertical spacing between major sections)
- **Default**: 32px
- **Tight (related sections)**: 16px
- **Loose (major page transitions)**: 48px

### Container Width
- **Mobile**: full width minus 20px horizontal padding
- **Max content width**: 800px (centered on larger screens — applies if you ever ship iPad layout)

---

## 9. Animation Specs
- **Standard transition duration**: 300ms
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)
- **Modal slide-up**: 350ms
- **Modal slide-down (dismiss)**: 250ms
- **Tab switch**: 200ms cross-fade (or PagerView native swipe)
- **Waveform pulse**: 1500ms, infinite, ease-in-out
- **MicButton pulse (active)**: 1500ms, infinite, scale 1.0 → 1.05 → 1.0
- **FAB appearance**: scale 0 → 1, 250ms, spring easing
- **Toast slide-down**: 300ms ease-out

---

## 10. Screen-Specific Notes

### Today (Dashboard) — primary tab
- **Top bar (pinned)**: hamburger left, "Unpack" centered (italic serif, 18px), settings gear icon right
- **Daily Feature section**: small caps date + h1 title + HeroImageCard with quote + REFLECT NOW button (launches Session)
- **Talk-It-Out card**: standard Card with mic icon, title, body, "START RECORDING →" link
- **Membership card** (free users only): Card with lock icon, "Infinite Journal" branding, body, OutlinedPillButton "UNLOCK ACCESS" (opens Paywall)
- **The Archive section**: SectionDivider with "VIEW ALL" link, then list of entry rows with date+meta, title, body preview, "Read full reflection" link, tag pills

### Session (Q&A) — modal, no tab bar
- **Intro screen** ("Ready to Unpack?"): X close top-left, title centered, intention/duration cards, BEGIN SESSION button at bottom
- **Question screen** (Step N of 3): X close top-left, "STEP N OF 3" label centered, ProgressSegments below, h1 question centered with generous vertical space, MicButton centered, "TAP TO TYPE INSTEAD" link below, WaveformBar at bottom with "LISTENING..." label
- **Bridge text screen**: shows AI response between questions for SESSION_BRIDGE_MIN_DISPLAY_MS (4000ms)
- **Completion**: navigates to Insight reveal (which is an Analytics screen)

### Talk (Vent) — primary tab
- **Top bar**: X close (when in modal mode) OR standard scroll header (when accessed via tab)
- **Title**: "Speak into the ether." h1 or display, italic serif
- **Eyebrow**: "UNBURDEN YOUR MIND" label-caps centered above title
- **WaveformBar**: full-width, centered vertically, reacts to user's voice AND TTS playback amplitude
- **Subtitle inside wave**: "No judgment, just your voice." body in `text-tertiary`, overlay on wave
- **MicButton**: centered toward bottom, with light recessed frame (subtle outer rounded rect with `bg-surface` background)
- **"RECORDING..." status**: label-caps below MicButton
- **Bottom row**: two buttons side-by-side — "PAUSE SESSION" (OutlinedPillButton) | "SAVE REFLECTION" (PillButton primary)

### Journal — primary tab
- **Top bar**: standard
- **Month header**: h1 "October 2026", `label-caps` "ARCHIVED MEMORIES" below, left/right chevron arrows on right
- **Calendar grid**: 7-column, weekday labels small caps, date numbers `body`, dot indicator below days with entries (4px `accent-primary` circle), today has 1px outlined square `radius-sm`
- **Monthly Highlights section**: `label-caps` header, stacked AI insight cards (Card style, italic serif quote with attribution like "— AI Narrative Insight")
- **Selected Reflections section**: large count number in `display` italic serif, "Selected Reflections" in `h2` next to it, date label below
- **Entry list**: two-column layout — left: italic serif timestamp (`h3` small), right: bold title (`body-large` weight 600) + body preview (3 lines, ellipsis) + read time meta
- **FAB**: bottom-right, opens Write entry modal/screen

### Analytics — primary tab (NEW destination)
- **Top bar**: standard
- **Latest insight section**: `label-caps` "SYNTHESIZED FROM YOUR EVENING UNPACK" centered, posterized quote card (italic serif with variable word sizes for emphasis), SHARE INSIGHT button (PillButton with share icon), DEEPER LOOK button (OutlinedPillButton with eye icon)
- **Related Journal Entries section**: `label-caps` header, list of past entries with italic serif date stamps (left column), bold title (right column), meta line "Reflection • 4 min read"
- **Past insights archive**: scrolling chronological list of all past session insights, each as a smaller Card

### Settings — modal (opens from gear icon on Today)
- **Top**: h1 "Settings" left-aligned, X close top-right
- **Sections**: ACCOUNT, NOTIFICATIONS, APPEARANCE, ABOUT, DANGER ZONE
- **Each section**: `label-caps` header (in `text-tertiary` for normal, `status-danger` for DANGER ZONE)
- **Rows**: ListRow style, grouped with hairline dividers within group, 32px section gap between groups
- **Theme picker**: 3 ListRow with RadioButton (Light, Dark, System)
- **Toggle rows**: ListRow with ToggleSwitch on right
- **Time picker row**: ListRow with tinted pill showing time on right (tap opens time picker)
- **Sign out / Delete account**: ListRow with icon prefix, Delete account in `status-danger` color

### Paywall — modal (opens when free user hits gate)
- **Top**: X close top-left only
- **Eyebrow**: "INFINITE JOURNAL" label-caps centered
- **Title**: h1 "Unlock the Infinite" centered
- **Subheading**: body in `text-secondary`, centered, ~3 lines
- **Benefits list**: 5 rows, each with 40x40px icon in `bg-surface` rounded square + body text label
- **Pricing cards**: stacked, Annual on top (selected by default with savings + free trial badges), Monthly below
- **CTA**: PillButton "START FREE TRIAL" (full width)
- **Hero photo**: optional, below CTA, rounded `radius-lg`
- **Footer**: caption disclaimer + two text links ("Restore Purchases" | "Terms")

### Onboarding — full-screen flow, no tab bar
- **Step 1 (Sign In)**: tiny "Unpack" wordmark centered top, h1 "Begin your narrative." centered, body subtitle, two pill buttons (Continue with Apple = PillButton black, Continue with Google = OutlinedPillButton white with Google logo), caption legal at bottom with Terms + Privacy links
- **Step 2 (Name)**: back chevron top-left, "STEP 2 OF 3" label-caps centered, h1 "What should we call you?" centered, body subtitle "First name is fine.", TextInput, PillButton "Continue" (disabled until input)
- **Step 3 (DOB)**: back chevron top-left, "STEP 3 OF 3" label-caps, h1 "When were you born?", body subtitle "Used to personalize your reflections. Stored securely, never shared with third parties.", three TextInput dropdowns (Month, Day, Year), PillButton "Complete Setup"

---

## 11. Premium Tier Naming

The premium subscription tier is branded as **"Infinite Journal"** in all user-facing copy. Internally (RevenueCat entitlement, code variables) it remains `premium`. Use "Infinite Journal" wherever the brand name appears (paywall, membership card, marketing).

---

## 12. Legal & Privacy Copy (locked)

- **Privacy Policy URL**: `https://letsunpack.app/privacy`
- **Terms of Service URL**: `https://letsunpack.app/terms`
- **Support email**: `support@letsunpack.app`
- **Subscription renewal disclaimer**: "Subscriptions automatically renew unless cancelled 24 hours before the end of the trial or period."
- **Sign-in legal text**: "By continuing, you agree to our [Terms of Service](https://letsunpack.app/terms) and [Privacy Policy](https://letsunpack.app/privacy)."
- **DOB collection disclosure**: "Used to personalize your reflections. Stored securely, never shared with third parties."

---

## 13. Accessibility Minimums

- All touch targets ≥ 44x44px
- All text contrast ratio ≥ 4.5:1 against background
- All interactive elements must have accessible labels (React Native `accessibilityLabel` prop)
- Reduce motion preference: disable pulse animations when `AccessibilityInfo.isReduceMotionEnabled()` returns true
