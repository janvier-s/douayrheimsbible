# Mobile Redesign — Design Spec

## Goal

Fix three mobile UX problems in the Bible reader: overlapping TopBar elements, an inaccessible study panel layout, and untappable study markers.

## Scope

Mobile only (`max-md`, i.e. screens narrower than 768px). Desktop layout is **completely unchanged**.

---

## Problem Summary

1. **Row 1 overlap** — Logo is `max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2` (visually centered) while ModeToggle sits in normal flow and extends into the same area. They collide.
2. **Row 2 overlap** — Chapter nav button is `absolute left-1/2 -translate-x-1/2` (centered) while the Translation selector is in flow on the left. On phones with long book/chapter names (e.g. "Ecclesiasticus 45") they overlap.
3. **Study panel** — Opens as a side-by-side column at `42.65vw`, consuming almost half the phone screen with no way to dismiss. Unusable on mobile.
4. **Study markers too small to tap** — `.study-marker` elements render at 8px font with 1–3px padding; far below the 44px minimum touch target.

---

## Design Decisions

### 1. TopBar — Row 1 (mobile)

Remove the absolute centering from the logo. Logo becomes in-flow on the left. ModeToggle is hidden on mobile (replaced by the bottom tab bar below).

**New Row 1 layout on mobile:**
```
[✠ + stacked "Douay" / "Rheims"] ········ [sliders icon (reading options)]
```

- Logo: `✠` cross glyph (color-accent) beside two stacked lines — "Douay" and "Rheims" — in small caps/uppercase tracking. Removes `max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2`.
- ModeToggle: `hidden md:flex` (hidden on mobile, visible on desktop — no behavior change on desktop).
- "Aa" / "Reading options" text button: replaced by a sliders SVG icon button, right-aligned. Moves to Row 1 (was Row 2). Opens the reading options sheet (see §3).
- Search icon: removed from Row 1 on mobile (moved to bottom tab bar). On desktop it stays in Row 1.

### 2. TopBar — Row 2 (mobile)

Remove the absolute centering from the chapter nav. Use flex layout to distribute space naturally.

**New Row 2 layout on mobile:**
```
[Translation selector (shrink-0, left)] [flex-1 → chapter nav centered] [nothing right]
```

- Translation selector: unchanged. The "ODR ▾" button stays. Its dropdown panel behavior is unchanged.
- Chapter nav: wrap the existing `<button>` in a `flex-1 flex justify-center` div instead of using `absolute left-1/2 -translate-x-1/2`. The button itself is unchanged — it still opens `FloatingNav` exactly as it does today.
- Reading options button: moved to Row 1 (see §1), so Row 2 no longer has a right-side element. This frees enough space for the chapter nav to never overlap.

### 3. Reading options — mobile bottom sheet

On mobile, the reading options panel currently opens as a `fixed top-[var(--header-height)] right-md` floating panel (272px wide). Replace with a full-width bottom sheet on mobile.

**Behavior:**
- Tapping the sliders icon in Row 1 opens the sheet.
- The sheet slides up from the bottom (`transform: translateY(0)` from `translateY(100%)`), with a `250ms ease` transition.
- A semi-transparent overlay (`bg-black/40`) covers the reading content. Tapping the overlay closes the sheet.
- The sheet has a drag handle (28px wide, 3px tall, centered at top).
- The existing `<ReadingPrefs />` component renders inside — no changes to ReadingPrefs itself.
- The three tabs (Text / Reading / Verse) inside ReadingPrefs span the full width of the sheet (`flex w-full` instead of the current `flex border-b`).
- The sheet height is `auto` with `max-height: 85vh` and `overflow-y: auto`.
- A close button (✕) at the top-right of the sheet header provides a tap target to dismiss.
- On desktop: nothing changes — the existing `fixed top-[var(--header-height)] right-md w-72` panel stays.

**Implementation note:** TopBar.svelte controls `prefsOpen`. On mobile, instead of rendering the floating panel, render the bottom sheet. Use a `isMobile` reactive that checks `window.innerWidth < 768` (or a media query store), or use CSS to show/hide the two panel variants.

Simplest approach: keep a single `prefsOpen` boolean. Add a `<MobilePrefsSheet>` component that wraps `<ReadingPrefs />` in the bottom sheet chrome. Render `<MobilePrefsSheet>` only on mobile via `class="md:hidden"`, and keep the existing desktop panel with `class="hidden md:block"`.

### 4. Bottom tab bar (mobile only)

A fixed bottom navigation bar replaces the ModeToggle on mobile.

**Tabs:** Read · Study · Compare · Search

**Layout:**
```
fixed bottom-0 left-0 right-0
height: 56px (+ safe-area-inset-bottom padding)
display: flex, 4 equal columns
background: var(--color-bg-glass), backdrop-blur
border-top: 1px solid var(--color-border)
z-index: 50
```

**Each tab:**
- SVG icon (16×16, `stroke="currentColor"`, `stroke-width="1.5"`)
- Label text below (8px, uppercase tracking)
- Active tab: `color-accent`, inactive: `color-subtle`
- Tap triggers the same handler as the existing ModeToggle's `on:select` — same `prefs.update` / `goto('/compare/...')` logic

**Icons:**
- Read: document/lines icon
- Study: info circle icon (matching current study mode)
- Compare: left-right arrows icon
- Search: magnifying glass icon

**Search tab behavior:** opens `SpotlightSearch` (`searchOpen = true`), same as the existing search button in Row 1.

**Placement:** rendered inside `TopBar.svelte` (where ModeToggle already lives and has access to `handleModeSelect`, `modeItems`, `activeModeIdx`, `searchOpen`). Hidden on desktop with `md:hidden`.

**`--header-height` adjustment:** Currently `110px` (50px + 60px rows). On mobile the tab bar takes 56px at the bottom — the reading content needs `padding-bottom: 56px` (plus safe area) so the last verse isn't hidden. Add `pb-[56px] md:pb-0` to the `<main>` in `BibleReader.svelte`.

### 5. Study panel — mobile tab switcher (option C)

On mobile, the study panel no longer opens as a side-by-side column. Instead, in Study mode on mobile:

- The `<main>` reading column is hidden (`hidden` or `display:none`).
- The study panel fills the full width.
- The "Study" tab in the bottom tab bar is the entry point — switching to Study mode hides the reading column and shows the full-width panel.
- Switching back to "Read" hides the panel and shows the reading column.
- The study panel's `max-width` transition (`0 → liveWidth`) is bypassed on mobile — it just shows/hides at full width with no width animation.

**Implementation in `BibleReader.svelte`:**
- On mobile, add `class:hidden={$prefs.readingMode === 'study' && isMobile}` to `<main>`.
- On mobile, the study panel container gets `class="md:shrink-0" style="width: 100%; ..."` — override the max-width/transition logic for mobile.
- Use a `isMobile` reactive derived from a `matchMedia` check, same as used for the prefs sheet.

**`isMobile` utility:** A small writable store `src/lib/stores/mobile.ts` that tracks `window.matchMedia('(max-width: 767px)').matches` and updates on resize.

### 6. Study marker tap targets (mobile)

`.study-marker` buttons are visually small (8px) but need a 44px minimum tap target on touch devices.

Add to the `:global(.study-marker)` rule in `VerseList.svelte`:

```css
:global(.study-marker) {
  position: relative; /* needed for ::before */
}

@media (pointer: coarse) {
  :global(.study-marker::before) {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }
}
```

Visual appearance is unchanged. Only the invisible hit area grows.

---

## Files to Change

| File | What changes |
|------|-------------|
| `src/lib/components/TopBar.svelte` | Logo markup, hide ModeToggle on mobile, move search to tab bar, add bottom tab bar, add mobile prefs sheet, Row 2 chapter nav flex layout |
| `src/lib/components/BibleReader.svelte` | Hide main column in study mode on mobile, full-width study panel on mobile, add `pb-[56px] md:pb-0` to `<main>` |
| `src/lib/components/VerseList.svelte` | Add `position: relative` + `::before` hit-target rule for `.study-marker` on touch devices |
| `src/lib/stores/mobile.ts` | New: `isMobile` store (matchMedia `max-width: 767px`) |
| `src/app.css` | Update `--header-height` comment; no value change needed (110px is still correct for desktop) |

**Not changed:** `ReadingPrefs.svelte`, `FloatingNav.svelte`, `StudyPanel.svelte`, `ModeToggle.svelte` (used as-is on desktop), `prefs.ts`.

---

## Out of Scope

- Gesture-based bottom sheet drag for reading options (too complex for now — a static full-height sheet is sufficient)
- Changing the FloatingNav component itself
- Any desktop layout changes
