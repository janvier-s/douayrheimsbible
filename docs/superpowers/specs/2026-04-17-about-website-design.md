# About This Website — Design Spec

**Date:** 2026-04-17  
**Route:** `/about`  
**Related rename:** `/history/about` → `/history/the-douay-rheims`

---

## Problem

The Original Douay-Rheims Bible (pre-Challoner, 1582–1610) is effectively unavailable in a usable digital form. The Internet Archive hosts a photographic facsimile in three archaic-spelling tomes, in original period spelling, unsearchable and difficult to read. Dr. William G. von Peters has produced a modernised edition available in print-on-demand and PDF (realdouayrheims.com, originaldouayrheims.com), but it is copyrighted. Neither version is searchable, annotated for the web, or suitable for daily study.

This site exists to fill that gap.

---

## Page Purpose

The `/about` page explains what this site is, why it was built, how it came to exist, who made it possible, and what it provides. It is the site's self-description — distinct from `/history/the-douay-rheims`, which describes the translation itself.

---

## Route Changes

| Old URL | New URL | Change |
|---|---|---|
| `/about` | `/about` | Replace `+server.ts` redirect with real `+page.svelte` + `+page.ts` |
| `/history/about` | `/history/the-douay-rheims` | Rename directory; add 301 redirect from old URL |

Files to update after rename:
- `src/routes/history/+page.svelte` — update article list link and title
- `src/lib/components/SiteFooter.svelte` — update "About the Translation" href
- `src/routes/history/the-douay-rheims/+page.svelte` — update canonical URL and og:url meta tags
- `src/routes/history/about/+page.svelte` → moved, update all internal refs
- Any `href="/history/about"` links in prose pages (check history articles)

---

## Page Structure

### 1. The Translation — and the Gap

The ODR exists in two digital forms: a three-volume facsimile on the Internet Archive (in period spelling, photographed from the originals) and von Peters' copyrighted modernised edition. Neither is freely searchable or annotated for web study. This site provides the first freely available, fully searchable, fully annotated digital edition of Gregory Martin's original text.

### 2. The Source

Full credit to Patrick Madueke and his GitLab repository (`gitlab.com/simple-gui/xml2gui-bible`), dedicated to Our Lady of La Salette. It contained PDF versions of the ODR — `Original-Douay-Rheims-Bible-Merged.pdf` and the Latin Vulgate — with no copyright restriction. Without this work, this site could not have been built.

### 3. Built with AI

Extracting structured data from those PDFs — 76 books, tens of thousands of verses, annotations, prefaces, tables — and building the entire site was made possible with Claude (Anthropic). The model served as instrument: parsing, formatting, building.

### 4. What This Site Provides

A tour of the site's main sections, each with 2–3 lines of description:

**The Reader**
Full text of all 76 books with inline annotation markers, chapter arguments, and book introductions. Two modes: Reading (clean, distraction-free) and Study (side-by-side annotation panel that scrolls in sync).

**Reading Options**
Typography: font family (Libre Baskerville, Sentinel, Gotham), size, line height, column width (narrow/default/wide). Display: verse numbers on/off, italics (marks supplied words absent from the Latin), small caps, justified text, paragraph view or verse-by-verse. Themes: light, sepia, dark, OLED. Accessibility: Bionic Reading with adjustable fixation, saccade, and opacity; dedicated dyslexia font. Scholarly: modern book names toggle (Josue/Joshua), DR vs Hebrew Psalm numbering, annotation sync.

**Search**
Full-text search across all 37,196 verses and 1,707 annotations independently, with a scope toggle between the two. ODR-aware reference parser: understands Douay book names (Josue, Isaie, Paralipomenon, Apocalypse) alongside modern equivalents. Ligature folding: searching "egypt" finds "Ægypt". Glossary term suggestions appear inline when a search term matches a word defined in the ODR's own glossary. Cross-scope hints surface related hits in the other scope without leaving the current view.

**Compare**
Side-by-side view of the ODR against other Vulgate-tradition translations and the King James Version. RSV-CE planned as the modern Catholic reference point.

**History**
Ten articles tracing the ODR from the founding of the English College at Douai through the Challoner revision and its reception in nineteenth-century America. Each stands alone; together they form a complete account.

**Articles**
Shorter pieces on specific topics: language, theology, manuscript tradition, the relationship to the King James Bible.

**Reference**
The original prefatory and appended material from the 1582 and 1609–1610 editions: the NT and OT prefaces, the table of corruptions of Protestant translations, historical tables of ages, the glossary of hard words (*Explication of Certain Words*).

### 5. The ODR in Numbers — Stat Cards

Eight stat cards in a 4×2 grid (desktop) / 2×4 (mobile):

| Stat | Value | Label |
|---|---|---|
| Books | 76 | Books |
| Chapters | 1,362 | Chapters |
| Verses | 37,196 | Verses |
| Annotations | 1,707 | Annotations |
| Marginal sub-notes | 3,709 | Marginal notes |
| Cross-references | 1,989 | Cross-references |
| Chapter summaries | 1,236 | Chapter summaries |
| Book introductions | 84 | Book arguments |

Note on introductions: 84 exceeds 76 because some books carry more than one prefatory section — a general introduction to the book and one or more separate arguments for distinct parts (e.g. the Psalms, the longer prophetic books). The count reflects total intro sections, not books.

Note on annotations: the 1,707 are the full scholarly commentaries from the original edition. Each contains internal marginal citations (`<mn>` markers) — these are the 3,709 sub-notes. The 1,989 cross-references are scripture passages listed directly on verses, separate from the annotations.

**Card aesthetic:** Large crimson numeral (Gotham Bold, ~48px), small-caps label beneath in `--font-ui`, thin ruled top border in `--color-border`, `--color-panel` background, subtle shadow. Grid: `repeat(4, 1fr)` desktop, `repeat(2, 1fr)` at ≤640px.

### 6. A Simple Idea

Closing note: began as a simple chapter selector. Grew into this. Brief, warm, Deo gratias in tone — without being sentimental or self-congratulatory.

---

## Component Architecture

### New files
- `src/routes/about/+page.svelte` — page content with inline stat card styles
- `src/routes/about/+page.ts` — load function (prerender: true)
- `src/routes/history/the-douay-rheims/+page.svelte` — moved from `history/about/+page.svelte`
- `src/routes/history/the-douay-rheims/+page.ts` — moved from `history/about/+page.ts`
- `src/routes/history/about/+server.ts` — 301 redirect to `/history/the-douay-rheims` (replaces existing `+server.ts` which redirected to `/history/about`)

### Modified files
- `src/routes/about/+server.ts` — **deleted** (replaced by page files above)
- `src/lib/components/SiteFooter.svelte` — update "About the Translation" href to `/history/the-douay-rheims`
- `src/routes/history/+page.svelte` — update article list first item href and title
- `src/routes/history/the-douay-rheims/+page.svelte` — update canonical + og:url meta tags

### Stat cards
Inline `<style>` block within `+page.svelte`, no separate component (one-time use). Uses existing CSS variables only — no new tokens.

---

## SEO

- Page title: `About This Website | The Original Douay-Rheims Bible`
- Meta description: ~155 chars covering the ODR's unavailability and what the site provides
- Canonical: `https://thedouayrheims.com/about`
- Schema: `WebPage` with `about` pointing to the translation
- The old `/history/about` gets a 301 so external links and search index entries don't break

---

## Data Notes

- Duplicate file: `prayer-of-manasseh.json` and `prayer-of-manasses.json` both exist in the data directory — this is a separate bug to fix, not part of this task. Stats above exclude the duplicate.

---

## Prose Style Constraints

- No em dashes
- No "not X. It was Y." construction
- Catholic register throughout
- Credit Madueke by name and link the GitLab repo
- Credit Claude/Anthropic factually, without marketing language
