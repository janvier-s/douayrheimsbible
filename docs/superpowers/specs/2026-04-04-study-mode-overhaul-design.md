# Study Mode Overhaul — Design Spec

**Date:** 2026-04-04
**Status:** Approved
**Scope:** Data layer, study panel, verse rendering, interaction model

---

## Overview

Overhaul the study mode to display cross-references, inline notes, and annotations from newly parsed La Salette Bible data. The study panel becomes a scrollable commentary panel synced to the user's reading position. Inline annotation blocks below verses are removed in favour of consolidating all study content in the right-side panel.

---

## Data Layer

### JSON Schema (as produced by `build_website_data.py`)

**Book JSON** (`static/data/odr/{slug}.json`):

```jsonc
{
  "book": "genesis",
  "book_title": "THE BOOK OF GENESIS",    // nullable
  "hebrew_title": "IN HEBREW BERESITH.",   // nullable
  "chapters": [
    {
      "chapter": 1,
      "summary": "God created heaven... <na>[1]</na>",  // optional, may contain <na> markers
      "summary_notes": [                                 // optional, array of {marker, text}
        { "marker": 1, "text": "The first part..." }
      ],
      "verses": [
        {
          "verse": 1,
          "text": "In <cr>[1]</cr> the beginning God created heaven and earth.",
          "has_annotation": true,          // present only when true
          "cross_refs": [                  // present only when non-empty
            { "text": "Act. 14, 15. 17, 24." }
          ],
          "notes": [                       // present only when non-empty
            { "label": "a", "text": "The firmament is all the space..." }
          ]
        }
      ]
    }
  ]
}
```

**Annotation sidecar** (`static/data/odr/{slug}/annotations/{chapter:03d}.json`):

```jsonc
{
  "chapter": 1,
  "annotations": [
    {
      "verse": 1,
      "part": 1,                           // multi-part annotations per verse
      "title": "In the beginning.",
      "text": "<mn>[1]</mn> Holy Moyses... \n\n ...appointed by God's ordinance...",
      "notes": [
        { "marker": 1, "text": "The Church had only traditions..." },
        { "marker": 3, "text": "<i>Cont. Epist. fund. c. 5.</i>" }
      ]
    }
  ]
}
```

### Tag Semantics

| Tag | Context | Meaning |
|-----|---------|---------|
| `<cr>[N]</cr>` | Verse text | Cross-reference marker |
| `<na>(a)</na>` | Verse text | Inline note marker (letter) |
| `<na>[N]</na>` | Summary text | Summary note marker (numeric) |
| `<mn>[N]</mn>` | Annotation prose | Marginal note marker |
| `<i>...</i>` | Notes, annotation prose | Italic (source citations) |

### TypeScript Types (`types.ts`)

```typescript
// --- New / Updated ---

export interface CrossRef {
  text: string;
}

export interface VerseNote {
  label: string;
  text: string;
}

export interface SummaryNote {
  marker: number;
  text: string;
}

export interface Verse {
  verse: number;
  text: string;
  has_annotation?: boolean;
  cross_refs?: CrossRef[];
  notes?: VerseNote[];
}

export interface Chapter {
  chapter: number;
  summary?: string;
  summary_notes?: SummaryNote[];
  verses: Verse[];
}

export interface BookData {
  book: string;
  book_title?: string | null;
  hebrew_title?: string | null;
  chapters: Chapter[];
  intros?: BookIntro[];
}

// --- Annotation sidecar types ---

export interface AnnotationNote {
  marker: number;
  text: string;
}

export interface AnnotationEntry {
  verse: number;
  part: number;
  title: string;
  text: string;
  notes: AnnotationNote[];
}

export interface ChapterAnnotations {
  chapter: number;
  annotations: AnnotationEntry[];
}

// --- Kept as-is ---
// InlineAnnotation, BookIntro, BookMeta, isCrossRef (used by intro system)
```

### Loader (`loader.ts`)

Add `loadAnnotations()`:

```typescript
const annotationCache = new Map<string, Promise<ChapterAnnotations | null>>();

export function loadAnnotations(
  slug: string,
  chapter: number,
  fetch: typeof globalThis.fetch
): Promise<ChapterAnnotations | null> {
  const key = `${slug}/${chapter}`;
  if (!annotationCache.has(key)) {
    const path = `/data/odr/${slug}/annotations/${String(chapter).padStart(3, '0')}.json`;
    const promise = fetch(path).then((res) =>
      res.ok ? (res.json() as Promise<ChapterAnnotations>) : null
    );
    annotationCache.set(key, promise);
  }
  return annotationCache.get(key)!;
}
```

Existing `loadBook`, `getCachedBook`, `getChapter` unchanged.

---

## Component Architecture

### `VerseList.svelte` — Updated

**Rendering modes:**

- **Reading mode**: strip `<cr>...</cr>` and `<na>...</na>` entirely (tags + content). Keep `<i>` tags. Verse numbers use muted colour. Verses are not clickable.
- **Study mode**: render `<cr>` and `<na>` content as superscript accent-coloured badges (small pill, clickable). Verse numbers use accent colour when `has_annotation` is true.

**Verse interaction in study mode:**

- Verses with `has_annotation: true`: the entire verse is clickable (cursor pointer, subtle accent tint + underline on hover). Clicking opens the study panel and scrolls to that verse's annotation section.
- Marker clicks (`[1]`, `(a)`) within the verse take priority: they scroll the panel to the specific cross-ref or note entry.
- Existing features preserved: bionic reading, small-caps, paragraph view, verse numbering, scroll-to-verse.

**Verse scroll tracking:**

- A new `IntersectionObserver` watches verse `<li>` / `<p>` elements in the viewport.
- When a verse enters the top ~30% of the viewport, it becomes the active verse.
- Updates `studyPanel.activeVerse` which drives the panel's synced scroll.

**Removed:**

- `InlineAnnotationBlock` usage removed from template.
- `v.inlineAnnotations` references removed.

### `StudyPanel.svelte` — Full Overhaul

**Structure:**

- Two tabs: **Intro** (unchanged, intros not in JSON yet) and **Commentary**.
- Commentary tab is a scrollable list of verse sections.

**Commentary tab layout:**

```
┌─────────────────────────────┐
│ ┌─ Verse 0 (Summary) ─────┐│  ← sticky header
│ │ Cross-references         ││
│ │  [1] The first part...   ││
│ └──────────────────────────┘│
│ ┌─ Verse 1 ────────────────┐│  ← sticky header, highlighted if active
│ │ Cross-references         ││
│ │  [1] Act. 14, 15. 17... ││
│ │ Annotations              ││
│ │  "In the beginning."     ││
│ │  [1] Holy Moyses...      ││
│ │                           ││
│ │  "In the beginning God..." ││  ← part 2
│ │  [1] Scriptures hard...  ││
│ └──────────────────────────┘│
│ ┌─ Verse 6 ────────────────┐│
│ │ Cross-references         ││
│ │  [1] Job. 38. Jer. 10... ││
│ │ Notes                    ││
│ │  (a) The firmament is... ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

**Per-verse section rules:**

- Only rendered if the verse has at least one of: `cross_refs`, `notes`, `has_annotation` (with loaded annotation data), or `summary_notes` (for verse 0).
- Sticky header: "Verse N" sticks to top of panel scroll container. The "Summary" header (verse 0) is **not** sticky — it sits at natural scroll position.
- Active verse section: subtle left-border accent highlight. Panel auto-scrolls to keep it visible.
- Sub-sections ("Cross-references", "Notes", "Annotations") only shown when data exists for that type. Headers are small uppercase labels.
- Multiple annotation parts for the same verse are shown as separate blocks within the "Annotations" sub-section.

**Annotation prose rendering:**

- `<mn>[N]</mn>` rendered as superscript accent badges (same style as verse markers).
- Clicking a `<mn>` marker shows the corresponding note from `annotations[].notes[]` — either as a popover or an inline expand below the marker.
- `\n\n` rendered as paragraph breaks.
- `<i>` rendered as italic.

**Data loading:**

- When `$readingPosition.chapter` changes, calls `loadAnnotations()` to fetch the sidecar.
- Uses `{#await}` for loading state.
- Merges annotation data with verse data from `bookData` to build the panel content.

**Synced scroll:**

- Reactive on `$studyPanel.activeVerse`. When it changes, the panel smoothly scrolls to the corresponding verse section.
- User can disable auto-scroll via `$prefs.syncStudyScroll` (default: true).
- Manual panel scrolling does not fight auto-scroll — auto-scroll only fires when `activeVerse` changes (triggered by the verse observer), not continuously.

### `InlineAnnotationBlock.svelte` — Deleted

All study content now lives in the panel.

### New: `AnnotationProse.svelte`

Renders annotation entry text:

- Input: `text: string`, `notes: AnnotationNote[]`
- `<mn>[N]</mn>` → superscript accent badge, clickable to show/hide note
- `\n\n` → paragraph break (`</p><p>`)
- `<i>` → italic (pass through)
- Note display: inline popover on marker click (same pattern as `AnnotatedText.svelte`)

### `AnnotatedText.svelte` — Kept

Still used for intro text in the Intro tab. No changes needed.

### `ChapterView.svelte` — Minor Update

- Summary `<na>[N]</na>` markers: rendered as superscript badges in study mode, stripped in reading mode (same logic as verse markers).
- `linkifySummary()` updated to also handle `<na>` tags.

### `BibleReader.svelte` — Minor Update

- Passes `bookData` to `StudyPanel` (already does this).
- No structural changes needed.

---

## Store Changes

### `studyPanel.ts`

```typescript
export type StudyTab = 'intro' | 'commentary';

export interface StudyPanelState {
  activeTab: StudyTab;
  activeIntroIndex: number;
  activeVerse: number | null;        // which verse section is highlighted (0 = summary)
  scrollTrigger: ScrollTrigger | null; // set by marker/verse clicks, consumed by panel
}

export interface ScrollTrigger {
  verse: number;                      // 0 = summary
  type?: 'cross_ref' | 'note' | 'annotation';
  marker?: string;                    // e.g. "1", "a"
}
```

### `prefs.ts`

Add two new preferences:

```typescript
syncStudyScroll: boolean;  // default: true — auto-scroll panel with reading position
showItalics: boolean;      // default: true — render <i> tags; when false, strips them in reading mode
```

---

## Interaction Model

### Flow 1: Scroll Sync (passive)

1. User scrolls through verses in the main column.
2. `IntersectionObserver` on each verse fires when it enters the top ~30% of the viewport.
3. `studyPanel.activeVerse` is updated to the new verse number.
4. If `$prefs.syncStudyScroll` is true, the panel smoothly scrolls to that verse's section and applies the left-border highlight.

### Flow 2: Marker Click (active)

1. User clicks a `[1]` (cross-ref) or `(a)` (note) superscript in a verse.
2. `studyPanel.scrollTrigger` is set to `{ verse: N, type: 'cross_ref', marker: '1' }`.
3. Panel switches to Commentary tab if not already there.
4. Panel scrolls to the specific entry (e.g. the cross-ref `[1]` for verse N) and briefly highlights it.
5. `scrollTrigger` is consumed (set back to null).

Note: Markers are only visible in study mode, where the panel is always open. No mode switching needed.

### Flow 3: Verse Click (active)

1. User clicks anywhere on a verse that has `has_annotation: true` (in study mode).
2. Same as Flow 2 but with `type: 'annotation'` and no specific marker — scrolls to the annotations sub-section for that verse.

### Flow 4: Summary marker click

1. Summary is treated as "verse 0" in the panel.
2. `<na>[1]</na>` in summary text → clicking scrolls panel to Summary section's note entry.

---

## Reading Mode Rendering

**Tag stripping in reading mode** (JS in `renderVerse`):

```typescript
function stripStudyMarkers(text: string, showItalics: boolean): string {
  // Remove <cr>...</cr> and <na>...</na> entirely (tags + content)
  let t = text
    .replace(/<cr>[^<]*<\/cr>/g, '')
    .replace(/<na>[^<]*<\/na>/g, '')
    .replace(/  +/g, ' ')
    .trim();
  // Optionally strip <i> tags (keep content, remove tags)
  if (!showItalics) {
    t = t.replace(/<\/?i>/g, '');
  }
  return t;
}
```

`<i>` tags are preserved by default; stripping is controlled by `$prefs.showItalics`.

---

## Visual Design

### Verse markers (study mode)

- Accent-coloured superscript text: 9px, `font-ui`, `color: var(--color-accent)`, no background/pill. Clean and non-intrusive.
- Subtle hover: underline.
- Cross-ref markers and note markers share the same visual style.

### Verse numbers (study mode)

- Accent-coloured for verses with `has_annotation: true`.
- Default muted colour for verses without.

### Annotated verses (study mode)

- Verses with `has_annotation: true`: `cursor: pointer` on the full verse.
- Hover: subtle accent background tint + dotted underline on the text (`text-decoration: underline; text-decoration-style: dotted;` with solid fallback).
- Click drives the panel.

### Panel verse sections

- Sticky header per verse: small uppercase label, `bg-panel` background so it occludes content when sticky.
- Active section: 3px left-border in accent colour (same pattern as `.verse-target` in current code).
- Sub-section headers ("Cross-references", "Notes", "Annotations"): 10px uppercase, `letter-spacing: 0.15em`, `color: var(--color-subtle)`.
- Annotation prose: `font-reader`, 13px, relaxed leading. Paragraph breaks between `\n\n` segments.
- Marginal note markers in prose: same accent-coloured superscript style as verse markers.

---

## Files Changed

| File | Action |
|------|--------|
| `src/lib/data/types.ts` | Update types to new schema |
| `src/lib/data/loader.ts` | Add `loadAnnotations()` |
| `src/lib/stores/studyPanel.ts` | Add `activeVerse`, `scrollTrigger` |
| `src/lib/stores/prefs.ts` | Add `syncStudyScroll` pref |
| `src/lib/components/VerseList.svelte` | Tag rendering, verse observer, click handling |
| `src/lib/components/ChapterView.svelte` | Summary `<na>` handling |
| `src/lib/components/StudyPanel.svelte` | Full overhaul |
| `src/lib/components/AnnotationProse.svelte` | New component |
| `src/lib/components/InlineAnnotationBlock.svelte` | Delete |

Files **not** changed: `BibleReader.svelte` (already passes bookData), `AnnotatedText.svelte` (still used for intros), `app.css`, `loader.ts` `loadBook`/`getCachedBook`/`getChapter`.

---

## Not in Scope

- Cross-ref verse tooltips on hover (future enhancement — requires abbreviation-to-slug mapping)
- Cross-ref click navigation to referenced verse (future — requires same mapping)
- Book introductions JSON (intros tab stays as placeholder)
- Annotation data for books beyond Genesis (only Genesis parsed so far)
- Facsimile transcription pipeline
