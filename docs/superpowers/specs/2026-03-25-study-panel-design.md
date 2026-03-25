# Study Panel — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Reading mode expansion, inline annotations, persistent study sidebar

---

## Overview

Add a **Study mode** to the Douay-Rheims Bible reader. Study mode presents the biblical text alongside a permanent study panel and reveals inline annotations that are faithful to the original ODR layout. The feature is additive — Reading and Compare modes are unchanged.

---

## 1. Three-Mode System

The current Reading / Compare binary in the TopBar becomes a three-way toggle:

| Mode | Description |
|------|-------------|
| **Reading** | Current experience. Centered text, no panel, no inline annotations. |
| **Compare** | Existing compare route (`/compare`). Unchanged. |
| **Study** | Text + permanent panel side by side. Inline annotations shown. |

The toggle has three visual states, but `readingMode` only stores `'reading' | 'study'` — Compare is detected by the current route (`$page.url.pathname.startsWith('/compare')`), not stored in prefs. Mode persists across sessions via `prefs`. Clicking Study while on `/compare` navigates to `/odr/` first, then sets `readingMode: 'study'`.

TopBar subscribes to `$prefs.readingMode` to reflect active state. Clicking Study calls `prefs.update(p => ({ ...p, readingMode: 'study' }))`. Clicking Reading calls the same with `'reading'`. Clicking Compare navigates to `/compare`.

---

## 2. Study Mode Layout

```
┌─────────────────────────────────────────┬──╫──┬──────────────────┐
│                                         │     │                  │
│         Reading text column             │  ⟺  │   Study Panel    │
│         (flex: 1, min-width: 0)         │     │  (default 340px) │
│                                         │     │                  │
└─────────────────────────────────────────┴─────┴──────────────────┘
```

- **Flex row** in `+page.svelte` wrapping the existing `<main>` and `<StudyPanel>`
- **Drag divider** — a `<div>` between the two columns with `cursor: col-resize`; `mousedown` on divider → `mousemove` on `window` → `mouseup` on `window` to release. Width writes to `prefs.studyPanelWidth` are debounced using the existing `$lib/utils/debounce` utility to avoid per-pixel localStorage writes
- Panel width: default `340px`, min `240px`, max `50vw`; persisted in `prefs.studyPanelWidth`
- No close button on the panel — switching back to Reading mode hides it
- **Scroll model:** `window` scroll is preserved. The panel is `position: sticky; top: 0; height: 100vh; overflow-y: auto` so it stays in view while the user scrolls the text. The existing infinite scroll `IntersectionObserver` and `window.scrollY` logic in `+page.svelte` is unchanged.

### Mode transition animation

**Reading → Study:**
1. Panel animates from `max-width: 0` to `max-width: 340px` (`250ms ease`) — this causes the flex layout to narrow the text column simultaneously as the panel grows
2. Panel opacity fades from `0` to `1` over the same `250ms`
3. Inline annotation blocks expand into view (see §4 for animation details)

**Study → Reading:** reverse — annotations collapse, panel shrinks to `max-width: 0` and fades out, text column expands.

Note: `transform: translateX` is intentionally **not used** for the panel — it would not affect the flex layout and the text column would not narrow alongside it.

---

## 3. Data Schema Additions

New TypeScript interfaces added to `src/lib/data/types.ts`. Field names use **camelCase** to match existing codebase conventions (e.g., `bookSlug`, `showVerseNumbers`).

```ts
// Short inline annotation — driven by letter (a)(b) or number [1][2] markers in verse text
interface InlineAnnotation {
  marker: string;   // 'a', 'b', 'c' (footnote) or '1', '2' (cross-ref)
  text: string;
}

// Long-form commentary entry — titled, tied to a specific verse
interface Annotation {
  chapter: number;
  verse: number;
  page: number;
  title: string;
  text: string;
  annotations?: InlineAnnotation[]; // inline markers within the commentary text itself
}

// Book-level introductory section (Argument, Sum, etc.)
interface BookIntro {
  title: string;              // e.g. "THE ARGUMENT OF THE BOOK OF GENESIS."
  text: string;               // prose with [n] markers inline
  annotations?: InlineAnnotation[];
  default?: boolean;          // true = open this sub-tab by default
}
```

Added as optional arrays on existing types (backward-compatible with books that have no annotation data yet):

```ts
interface Verse {
  // existing fields ...
  inlineAnnotations?: InlineAnnotation[];
}

interface Chapter {
  // existing fields ...
  annotations?: Annotation[];
}

interface Book {
  // existing fields ...
  intros?: BookIntro[];
}
```

Marker type discrimination: letter marker (`/^[a-z]+$/`) = footnote note; number marker (`/^\d+$/`) = cross-reference.

---

## 4. Inline Annotations (Study mode only)

### Display

Both letter annotations `(a)` and cross-ref annotations `[1]` render as **inline blocks inserted after the relevant verse** in the reading text — faithful to the original ODR printed layout.

- Letter annotation block: plain prose text in a lightly shaded box (`bg-panel border border-border`)
- Cross-ref block: italic scripture reference (e.g. *2. Cor. 11, 3.*) in the same shaded box
- Rendered by `InlineAnnotationBlock.svelte`, placed by `VerseList.svelte` after each verse that has `inlineAnnotations`

Inline annotations are **only rendered in Study mode**. In Reading mode the verse text renders without the blocks (the `inlineAnnotations` data is present but the block components are not mounted).

### Animation

The outermost flex container in `+page.svelte` carries `data-mode={$prefs.readingMode}`. The CSS grid trick animates all annotation blocks simultaneously when this attribute changes:

```css
.annotation-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 250ms ease, opacity 250ms ease;
}

[data-mode='study'] .annotation-wrapper {
  grid-template-rows: 1fr;
  opacity: 1;
}

.annotation-inner {
  overflow: hidden;
}
```

All annotation blocks transition simultaneously when mode changes. Each expands to its own natural height regardless of content length, with an opacity fade layered on top. No JS height measurement is required.

---

## 5. Study Panel Component

`src/lib/components/StudyPanel.svelte`

### Tabs

Two top-level tabs: **Intro · Commentary**

#### Intro tab

- Sub-tab row: one sub-tab per entry in `book.intros[]`
- Sub-tab labels: shortened from title (e.g. "Argument", "Sum (OT)", "Of Moyses")
- Default active sub-tab: the entry where `default: true`; falls back to index 0 if none marked
- Content: annotated prose rendered by `AnnotatedText` component (see §5.1)

#### Commentary tab

- Shows `Annotation[]` entries for the chapter currently tracked by the `readingPosition` store (which updates via the existing `IntersectionObserver` as the user scrolls through infinite-loaded chapters)
- Each entry shows its `title` and `text`
- Same `AnnotatedText` rendering if commentary text contains `[n]` markers
- When no annotations exist for the current chapter, shows a muted placeholder

### 5.1 Annotated Prose Rendering — `AnnotatedText.svelte`

Shared component used in both Intro and Commentary:

- Body prose with `[n]` markers rendered as clickable superscript buttons (accent color)
- **Clicking a marker** shows a **popover** — a click-triggered, absolutely-positioned `<div>` with the `InlineAnnotation.text` for that marker. Dismissed by clicking outside or pressing Escape. Implemented as a Svelte `{#if}` toggle with a `clickOutside` action. This popover shows the short annotation text only — it is not linked to the long-form `Annotation` commentary entries (those are a separate data type in the Commentary tab).
- Below the prose: a collapsed disclosure row — **"N notes ▼"** — clicking expands the full footnote list
- Expanded list: numbered entries separated by a top border rule, each showing `marker` + `text`
- Collapsed by default; each intro sub-tab tracks its own expanded state independently
- `AnnotatedText` receives `text: string` and `annotations: InlineAnnotation[]` as props

---

## 6. Study Panel Store

`src/lib/stores/studyPanel.ts`

This store is **in-memory only** and resets on page navigation. It is not persisted to localStorage.

```ts
type StudyTab = 'intro' | 'commentary';

interface StudyPanelState {
  activeTab: StudyTab;
  activeIntroIndex: number; // which sub-tab is open in Intro
}

const defaults: StudyPanelState = {
  activeTab: 'intro',
  activeIntroIndex: 0,
};
```

`activeAnnotation` (for tracking which popover is open) is local state inside `AnnotatedText.svelte`, not in the store — it is ephemeral UI state that does not need to be shared across components.

`activeIntroIndex` initialization: `StudyPanel.svelte` resolves the correct default sub-tab in `onMount` — it finds the index of the entry where `default: true` in `book.intros` and calls `studyPanel.update(s => ({ ...s, activeIntroIndex: idx }))`. This runs after the component mounts with the book data already available from the SvelteKit `load` function, so there is no async race. If no entry has `default: true`, index 0 is kept.

No `open` field — the panel's visibility is governed entirely by `$prefs.readingMode === 'study'`.

---

## 7. Prefs Store Changes

`src/lib/stores/prefs.ts` — the exported interface is `ReadingPrefs`.

New fields, bump `PREFS_VERSION` to `5`:

```ts
interface ReadingPrefs {
  // existing fields ...
  readingMode: 'reading' | 'study'; // default 'reading'
  studyPanelWidth: number;           // pixels, default 340
}
```

Migration snippet following the existing `_v` pattern:

```ts
if (!parsed._v || parsed._v < 5) {
  parsed.readingMode = 'reading';
  parsed.studyPanelWidth = 340;
}
```

---

## 8. Component & File Map

| File | Change |
|------|--------|
| `src/lib/data/types.ts` | Add `InlineAnnotation`, `Annotation`, `BookIntro`; extend `Verse`, `Chapter`, `Book` |
| `src/lib/stores/prefs.ts` | Add `readingMode`, `studyPanelWidth` to `ReadingPrefs`; bump to v5 |
| `src/lib/stores/studyPanel.ts` | New — panel tab state (in-memory) |
| `src/lib/components/StudyPanel.svelte` | New — panel shell, tabs, intro/commentary content |
| `src/lib/components/AnnotatedText.svelte` | New — shared prose renderer with popover markers and collapsible footnote list |
| `src/lib/components/InlineAnnotationBlock.svelte` | New — shaded block rendered after a verse in Study mode |
| `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte` | Wrap content in flex row with `data-mode`; add drag divider + `StudyPanel`; conditionally mount `InlineAnnotationBlock` |
| `src/lib/components/VerseList.svelte` | Render `InlineAnnotationBlock` after verses that have `inlineAnnotations` (Study mode only) |
| `src/lib/components/TopBar.svelte` | Extend toggle to three-way; subscribe to `$prefs.readingMode` |

---

## 9. Out of Scope (v1)

- Notes and Cross-refs panel tabs (data not yet available from PDF parsing)
- Mobile bottom sheet (deferred — Study mode is desktop-first)
- Shareable URLs encoding panel state
- Keyboard shortcut to toggle Study mode
