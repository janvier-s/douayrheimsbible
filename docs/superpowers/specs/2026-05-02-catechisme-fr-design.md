# Catéchisme FR — Design Spec

**Date:** 2026-05-02
**Domain (planned):** `lecatechisme.fr`
**Repo:** `catechisme-fr` (new, separate from `douayrheimsbible`)
**Status:** Brainstorm complete, ready for implementation plan

## 1. Goal

Build the most comprehensive French-language Catéchisme de l'Église catholique website: best-in-class reading UX, deep cross-reference navigation, and a corpus architecture that grows to host the Compendium of CCC, St. Pius X catechisms (large & small), and the Catechism of Trent in future versions.

## 2. Architecture

### Strategy

Standalone French CCC site, copy-and-adapt from `douayrheimsbible`, designed for absorption into a future "mega-site" by:
- Keeping all generic UI/state/utils corpus-agnostic in `src/lib/{components/ui,components/panels,stores,utils}/`.
- Treating CCC as one corpus among future siblings via a `corpus` field on every data record.

The mega-site (Bible + multi-catechism + commentaries + liturgy) is **out of scope** for v1. It is held until commentary data is ready. The standalone CCC site protects the mega-site domain from a premature launch.

### Stack

- **SvelteKit 2** + **Svelte 5** (running in Svelte 4 compat mode — `export let`, `$:`, writable stores; no runes). Mirror the `douayrheimsbible` repo precisely on this point.
- **Tailwind CSS 3**, **TypeScript**.
- **Cloudflare Pages** for static delivery; **Cloudflare Workers** for dynamic-render routes (CCC chapter pages render through the Worker to avoid stale-CDN-chunk MIME errors — same pattern as DR's ODR routes).
- **Cloudflare KV** binding `SEARCH_INDEX` for the MiniSearch dump.
- **Vitest** unit tests + **Playwright** e2e (same toolchain as DR).
- Inline-style threshold `51200` like DR (eliminate render-blocking CSS).

### Multi-corpus architecture (foundation only — others ship later)

- All CCC URLs live under `/ccc/...`. Future: `/compendium/...`, `/pius-x/grand/...`, `/pius-x/petit/...`, `/trent/...`.
- The Bible reverse-lookup (`/bible/...`) is a top-level namespace federating over corpora: today returns CCC paragraph hits per Bible reference; later automatically aggregates other catechisms when their data ships.
- Search index documents carry a `corpus` field; index has a `corpus` filter from day 1.

### Hosting & deployment

- Cloudflare Pages with the SvelteKit Cloudflare adapter.
- `prebuild` npm hook runs `scripts/prepare-data.ts` (tsx) to generate static JSON in `static/data/` (mirrors DR's pattern).
- `npm run upload-index` pushes the MiniSearch dump to KV after build (mirrors DR).
- The `lecatechisme.fr` domain registers via a registrar that supports `.fr` natural-person registrations (Gandi or OVH); nameservers point to Cloudflare.

### Reusable code organization

```
src/lib/
  components/
    ui/             # Generic, corpus-agnostic (reusable in future mega-site as-is):
                    #   TopBar, FloatingNav, BottomTabBar, PageFooter,
                    #   SearchBar, ModeToggle, PrefsPanel, InstallBanner,
                    #   ReadingPrefs, ProseLayout
    panels/         # Generalized study panel infrastructure:
                    #   StudyPanel (tabs as props), tab body components
                    #   (TabBibleRefs, TabCrossRefs, TabCitedBy,
                    #   TabSources, TabEnBref)
                    # Note: no TabCitations — citations render inline (§6)
    ccc/            # CCC-specific reading components:
                    #   CCCReader, ChapterOutline, ParagraphView, RangeView,
                    #   EnBrefBlock, CitationBlock, MagisterialRef,
                    #   CccRefMark, BibleRefMark, Wordmark, LogoMark,
                    #   SearchResultCard
    bible/          # /bible/ hub components:
                    #   BookGrid, ChapterGrid, VerseList, VerseToCccList
  stores/           # prefs, reading, studyPanel, searchScope, outline
  utils/            # slug, refs (parser), linkify, scrollTracker
  data/             # JSON loaders (lazy, cache-aware)
  search/           # MiniSearch wrapper + intent detection
```

`ui/` and `panels/` transplant to the mega-site untouched. `ccc/` and `bible/` live under their corpus namespace there.

## 3. Data Pipeline

`scripts/prepare-data.ts` runs at `prebuild`. All inputs are read-only sources committed (or symlinked) under `scripts/data-sources/`.

### Input sources

| Source path | Use |
|---|---|
| `DOCTRINA/JSON/CCC/ccc_paras_processed.json` | Main structural CCC text |
| `DOCTRINA/JSON/CCC/ccc_bible_index_clean.json` | Bible reference → CCC paragraph numbers |
| `DOCTRINA/JSON/CCC/ccc_cross_refs_bidirectional.json` | Paragraph cross-reference graph (both directions) |
| `DOCTRINA/sources/CCC/CCC_1998_FULL/sigles.xhtml` | Magisterial abbreviation table (HTML table) |
| `DOCTRINA/sources/CCC/CCC_1998_FULL/toc.ncx` | Cross-validate hierarchy + drive index thématique TOC |
| `DOCTRINA/sources/CCC/thematic_cross-refs/index_thematique/*.xhtml` | Thematic index (A→Z files, structured XHTML) |
| `DOCTRINA/sources/CCC/thematic_cross-refs/index_citations/*.xhtml` | Source-document reverse-lookup (table-formatted) |
| `SCRIPTURA/sources/NCL/francl_usfx/francl_usfx.xml` | Neo-Crampon Libre French Bible (USFX format) |
| `Website/CCC/catechisme-logo.png` | Logo (light) — needs build-time optimization |
| `Website/CCC/catechisme-logo-white.png` | Logo (dark theme) — needs build-time optimization |

### Output files (under `static/data/`)

| Output | Purpose |
|---|---|
| `ccc/structure.json` | Hierarchy tree (parts → sections → chapters → articles → headings → paragraph numbers + slugs). ~50 KB. Drives nav, TOC, breadcrumbs. Validated against `toc.ncx`. |
| `ccc/chapters/{slug}.json` | One file per chapter (~140 files). Renders the chapter view. |
| `ccc/paragraphs/{n}.json` | One file per paragraph (~2865 files). Tooltip previews + single-paragraph + range views. |
| `ccc/en-bref/{chapter-slug}.json` | "En Bref" summary blocks indexed by container. |
| `ccc/citations.json` | All patristic/liturgical citations indexed by paragraph. |
| `ccc/refs.json` | Magisterial refs (GS, LG, DV…) → expanded names. |
| `ccc/abbreviations.json` | From `sigles.xhtml`: `AA → Apostolicam actuositatem`, etc. |
| `ccc/bible-index.json` | Bible reference → CCC paragraph list. Powers `/bible/` hub. |
| `ccc/thematic-index.json` | Internal-only — alphabetical entries → paragraph list. **Search-enhancement data**, not exposed via public pages (see §4). |
| `ccc/sources-index.json` | Internal-only — magisterial doc → CCC paragraphs citing it. Powers panel "Sources" tab and search results. Not exposed as a standalone page. |
| `bible/ncl.json` | Parsed NCL: `{ "MAT": { "28": { "19": "Allez donc, de toutes les nations…" } } }`. ~3-4 MB. |
| `search-index.json` | MiniSearch dump → uploaded to Cloudflare KV. |

**Not generated**: Guide de lecture data is **excluded** — the essays are copyrighted and not republished. The source files in `thematic_cross-refs/guide_lecture/` are not consumed by the build.

### Slug strategy

- Auto-generated at prep time from titles: lowercase, accent-stripped, hyphenated.
  Example: `"L'homme est « capable » de Dieu"` → `homme-est-capable-de-dieu`.
- Stable: committed in `structure.json`. Hand-overrides allowed via `slug-overrides.json`.
- Collision check: prep script fails the build if slugs collide within the same parent.

### Validation gates (build fails if any fail)

- All cross-refs in `ccc_paras_processed.json` resolve to existing paragraphs (1–2865).
- All Bible refs in paragraphs match a book/chapter/verse in NCL.
- All abbreviation references in paragraphs map to an entry in `sigles.xhtml`.
- Hierarchy in `structure.json` matches `toc.ncx`.
- No slug collisions within any parent.
- All thematic-index links resolve to known paragraphs.

### Deferred-format note

A custom-built PDF of the CCC is not in v1. Print stylesheet ships in v1; user can browser-print to PDF if desired. PDF generation (Puppeteer-based) is post-v1.

## 4. Routes & Pages

### Public routes

```
/                                 Homepage — landing, "Reprendre la lecture",
                                  featured paragraphs, search prompt
/ccc                              CCC home — corpus overview, four parts as cards
/ccc/sommaire                     Full hierarchical TOC (expandable)

/ccc/[ref=cccref]                 Single paragraph or range
                                    matcher: /^\d+(-\d+)?$/
                                    e.g. /ccc/27, /ccc/27-30
/ccc/prologue                     Prologue overview
/ccc/[part]                       Part overview
/ccc/[part]/[section]             Section overview
/ccc/[part]/[section]/[chapter]   Chapter — primary reading view (sticky outline)
/ccc/[part]/[section]/[chapter]/[article]   Article view

/bible                            Bible reverse-lookup home (book grid)
/bible/[book]                     Book — chapter grid
/bible/[book]/[ch]                Chapter — verse list with CCC links
/bible/[book]/[ch]/[v]            Verse — full CCC §s for that verse

/recherche                        Advanced search (filters, scope)

/a-propos, /contact, /confidentialite, /conditions
/sitemap.xml, /robots.txt, /llms.txt, /manifest.json
```

### Convenience redirects

- `/ccc/partie/{1-4}` → respective part slug (for users thinking in numerals)
- `/ccc/prologue` is a real page (not a redirect)

### Routes intentionally NOT exposed (data kept internal)

The following data exists in `static/data/ccc/` for search and panel features but has no public page route:

- **Thematic index** — used to enrich search results (e.g. searching "péché originel" surfaces a result card listing the index entry's §s). No `/ccc/index/...` route.
- **Sources index** (magisterial/patristic) — drives the panel's "Sources" tab and search-result enrichment. No `/ccc/sources/...` route.
- **Guide de lecture** — excluded entirely (copyrighted).

### API routes (Cloudflare Workers)

```
/api/search?q=&scope=             Server-side search fallback
/api/preview/{n}                  Tooltip-preview JSON for paragraph N (cached)
```

### Static vs Worker rendering

- Most routes static-built.
- `/ccc/[part]/[section]/[chapter]` (and `[article]`) routes go through the Worker, like DR's ODR routes — avoids stale-chunk MIME errors. `svelte.config.js` excludes static-only routes from the Worker.

### Routing detail: numeric paragraph matcher

```ts
// src/params/cccref.ts
export const match = (param: string) => /^\d+(-\d+)?$/.test(param);
```

The numeric-matched route is selected first; non-numeric inputs fall through to the part-slug route. No collision possible.

## 5. Components & Reuse

### Reused from DR (copy as-is or with minor renaming)

`TopBar`, `FloatingNav`, `BottomTabBar`, `SearchBar`, `PrefsPanel`, `ReadingPrefs`, `ModeToggle`, `ProseLayout`, `PageFooter`, `SiteFooter`, `InstallBanner`, `OfflineDownload` pattern, `MarkerPopover`.

Renamed: `VerseTooltip` → `RefTooltip` (handles `§NNN`, Bible refs, magisterial refs).

### Generalized from DR

`StudyPanel`: redesigned to take `tabs: TabDef[]` as a prop instead of containing hardcoded Bible-specific tab logic. Tab body components live in `lib/components/panels/` and are picked up by id.

### New CCC-specific components

| Component | Purpose |
|---|---|
| `CCCReader` | Top-level chapter reader; composes outline + content + panel |
| `ChapterOutline` | Sticky left-side outline of headings; `IntersectionObserver`-driven active highlight |
| `ParagraphView` | Single paragraph (`/ccc/27`) — focused view, prev/next arrows |
| `RangeView` | Paragraph range (`/ccc/27-30`) — focused view, derived header |
| `EnBrefBlock` | Distinct visual treatment for summary boxes (left border, label) |
| `CitationBlock` | Inline indented small-print for patristic/liturgical citations (rendered inline under their parent paragraph; not in panel) |
| `CccRefMark` | Inline `<sup>` for `§NNN` references |
| `BibleRefMark` | Inline `<sup>` for Bible references |
| `MagisterialRef` | Inline marker with abbreviation expansion on hover |
| `BookGrid`, `ChapterGrid`, `VerseList`, `VerseToCccList` | `/bible/` hub navigation |
| `SearchResultCard` | Custom result rendering for search results, including thematic-index and source matches that expand to show their § list inline |
| `Wordmark` | 3-line stacked CCC wordmark next to logo |
| `LogoMark` | Logo (light/dark variants), responsive sizing |

### Inline-ref pipeline

Paragraph `text_html` already contains inline `<sup>` markers (e.g. `<sup class="srcRef cccRef">§1718</sup>`).

1. Render `text_html` once via `{@html}`.
2. A `use:linkifyRefs` action attaches a single delegated event listener at the reader root.
3. Hover → `RefTooltip` shows preview (paragraph excerpt / verse text / doc name).
4. Click → opens `StudyPanel` to the right tab with right context.

No re-parsing per render; one listener per reader, not per `<sup>`.

### Single utility: `parseRef`

```ts
type Ref =
  | { kind: 'paragraph'; n: number }
  | { kind: 'range'; from: number; to: number }
  | { kind: 'bible'; book: string; chapter: number; verse?: number; verseEnd?: number }
  | { kind: 'magisterial'; abbr: string; section?: string };

function parseRef(s: string): Ref | null;
```

Used by: search intent detection, link generation, `linkify` action, URL builder.

### Explicitly NOT reused

`BibleReader`, `VerseList` (DR), `ChapterView`, `CompareBar`, `FathersCommentaryPanel`/`FathersBar`/`FathersFilterBar`/`FathersEntryCard`/`FathersReader`/`FathersVerseList` (commentary feature, irrelevant), `BrandingRow` (DR-branded).

## 6. Reading View — Layout & Behavior

### Desktop (≥1280px)

```
+------+----------------------+----+----------------+
| Out- |                      |    | Study panel   |
| line |   Reader column     |    | (when open)   |
|      |   (max 70 ch)       |    |                |
| L    |                      |    | tabs:          |
| e    |                      |    | Bible · Renvois|
| f    |                      |    | · Cités par    |
| t    |                      |    | · Citations    |
|      |                      |    | · Sources      |
|      |                      |    | · En Bref      |
+------+----------------------+----+----------------+
```

- **Outline (left)**: sticky, ~150px wide. Lists headings within current chapter. Active heading highlighted via `IntersectionObserver`. Click jumps to `#{heading-id}`. "EN BREF" appears at bottom when one exists.
- **Reader (center)**: ~750px including the hanging paragraph-number margin (~85-90 characters per line of body text), centered.
- **Panel (right)**: ~400px when open. Slides in fixed-positioned (no content reflow). Tab visibility is dynamic — tabs only appear when their data exists for the current paragraph.

### Tablet/Mobile

Mobile handled separately in implementation. Default fallback: outline becomes a "Plan" toggle button; panel becomes a bottom drawer.

### Tab visibility rules

| Tab | Shown when |
|---|---|
| Bible | Current paragraph has `bible_refs` |
| Renvois (cross-refs) | Current paragraph has `cross_refs` |
| Cités par | Current paragraph appears in any other paragraph's `cross_refs` |
| Sources | Current paragraph has `refs` (magisterial documents) |
| En Bref | Current chapter/article has an En Bref block |

**Citations are NOT a tab.** Patristic/liturgical citations render **inline** as indented small-print blocks under the paragraph that introduces them (see §10 for styling). This matches the printed CCC convention and avoids hiding the most-read supplementary content behind a click.

### Reader rendering rules

- **Paragraph numbers**: always displayed, gold-tinted, click-to-copy link.
- **Citations (inline)**: indented small-print blocks under the parent paragraph. Subtle but distinct visual treatment — left rule (1px in muted accent), slightly-tinted background block, ~0.92em sans-fallback type for differentiation, with `<sup>` source markers that link to the source page on hover/click. Elegantly bracketed, never noisy. Toggleable via prefs.
- **En Bref boxes**: distinct visual treatment (left border, soft-tint background, small-caps label), toggleable.
- **Footnote markers (`<sup>`)**: hover shows tooltip; click opens panel. Always present in DOM; opacity adjustable via prefs.

### Keyboard navigation

- `←` / `→` — navigate within the same view scope:
  - On `/ccc/{n}` (single paragraph) and `/ccc/{n}-{m}` (range) → previous/next paragraph or range.
  - On chapter / article / section / part pages → previous/next sibling at the same level.
- `j` / `k` — prev/next heading within current chapter (scrolls the reader)
- `/` — focus the header search input
- `Esc` — close panel / dismiss tooltip
- Standard tab/focus navigation throughout

## 7. Navigation & Discovery

### TopBar

Single-row layout: brand on the left, search input in the center, nav links + settings clustered on the right.

```
[LOGO] Catéchisme            [── search input ──]      Catéchisme▾  Bible  Sommaire  À propos  [⚙]
       de l'Église
       Catholique
```

Total bar height ~80px (matches the 3-line wordmark + breathing room).

- **Logo + Wordmark** (left, links to `/`)
  - **Logo**: from `Website/CCC/catechisme-logo.png` (light theme) and `catechisme-logo-white.png` (dark theme). Sized to ~56px square in the bar.
  - **Wordmark**: 3-line stacked — `Catéchisme / de l'Église / Catholique`. Set in the heading typeface, line 1 largest (~20px, weight 700), lines 2-3 smaller (~14px, weight 500), tight leading.
- **Search input** (center): always visible, never collapses to a modal. Max width ~460px, auto-centers via flex spacing. Shows intent-detection dropdown on focus + keystrokes; footer "Recherche avancée →".
- **Right cluster**:
  - **Catéchisme▾** — cascading dropdown (parts → sections → chapters, 3 cols max). Articles reachable from chapter pages. Footer: "Sommaire complet →" → `/ccc/sommaire`.
  - **Bible** → `/bible`
  - **Sommaire** → `/ccc/sommaire` (replaces previous "Index" item; the index thématique is search-only and not a public page)
  - **À propos** dropdown → About / Contact / Privacy / Terms
  - **⚙** opens `PrefsPanel`

### TopBar responsive behavior

- **≥1280px**: layout as above.
- **1024–1280px**: nav links collapse to a single "Menu ▾" trigger; search stays centered.
- **<1024px**: search drops below the brand row into a sticky second-row strip (two-row mode kicks in only here). Brand row keeps logo + wordmark + nav-trigger + settings.

### Full table of contents (`/ccc/sommaire`)

- Hierarchical expandable tree of the entire CCC, all four levels visible (part → section → chapter → article).
- Default expansion: parts + sections; user clicks to drill into chapters/articles.
- SEO-rich: deep internal links, French keyword anchors.

### Reading-time outline

See Section 6.

### Hubs

- `/ccc/sommaire` (full hierarchical TOC — public).
- `/bible` (Bible-ref reverse-lookup — public).
- Thematic index and sources index data are search-only (no public pages).

## 8. Search

### Architecture

MiniSearch index built at deploy → uploaded to Cloudflare KV (`SEARCH_INDEX` binding) via `npm run upload-index`. Same shape as DR.

### Indexed document types (single index, `type` field discriminates)

| Type | Example id | Searchable fields | Boost | Result behavior |
|---|---|---|---|---|
| `paragraph` | `ccc:p:27` | text (HTML stripped), §number-as-text | 1.0 | Click → paragraph page |
| `chapter` | `ccc:c:capable-de-dieu` | title | 2.0 | Click → chapter page |
| `article` | `ccc:a:desir-de-dieu` | title | 1.5 | Click → article page |
| `theme` | `ccc:t:peche-originel` | term, related-paragraph excerpts | 1.8 | Renders as enriched card listing the entry's §s inline; click any § → that paragraph page. "Voir tout (N)" → `/recherche?theme=peche-originel` |
| `source` | `ccc:s:lumen-gentium` | name, abbreviation, full title | 1.2 | Renders as enriched card listing top citing-§s; "Voir tout (N)" → `/recherche?source=lumen-gentium` |

Bible verses are **not indexed**. The Bible-ref → CCC mapping is via lookup against `bible-index.json`.

`theme` and `source` documents have **no public landing page** (per §4). The result card itself is the surface — it expands to show paragraph references, with a link to a filtered `/recherche` view if more depth is wanted.

### French language tuning

- `processTerm` uses `snowball-french` stemmer.
- Standard French stop words (`le`, `la`, `de`, `et`, `est`, …).
- Tokenization preserves apostrophes inside words then strips post-stem.
- Accent-insensitive matching (`peche` matches `péché`).

### Header search bar — intent detection

On every keystroke (debounced 100ms):

```ts
function detectIntent(q: string): SearchIntent[] {
  // numeric → paragraph
  // numeric-numeric → range
  // matches Bible book pattern → bible ref
  // matches magisterial abbrev pattern → magisterial ref
  // always also: fulltext
}
```

Dropdown shows up to 6 results: structured intents first, then top 3 fulltext, then "Recherche avancée →" footer link.

### Advanced search page (`/recherche`)

Fields:

- Query text
- Scope checkboxes: Paragraphes / Index thématique / Sources (default all)
- Filters: paragraph-range constraint; only-en-bref; only-with-citations; only-citing-Bible-book-X; only-citing-magisterial-doc-X
- Sort: by relevance / by paragraph number

Also handles deep-link query parameters from result cards:

- `?theme={slug}` → pre-filtered to all paragraphs cited by that thematic-index entry
- `?source={slug}` → pre-filtered to all paragraphs citing that magisterial document
- `?bible={book}/{ch}/{v}` → equivalent to `/bible/{book}/{ch}/{v}` (canonical), just an alternate query interface

Results paginated server-side (Worker route) using same MiniSearch index with post-filter logic.

## 9. State Stores

```ts
// lib/stores/prefs.ts          — copied from DR, CCC-specific fields added
{
  // typography
  fontSize, lineHeight, fontFamily, dyslexiaFont,
  // theme
  theme: 'light' | 'dark' | 'auto',
  // layout
  justifiedText, columnWidth: 'narrow' | 'default' | 'wide',
  readingMode: 'reading' | 'study', studyPanelWidth,
  // typographic toggles
  showItalics, showSmallCaps, showDropcap, hangingParagraphNumbers,
  // CCC-specific (new)
  showCitations, showFootnoteMarkers, showEnBref,
  // panel
  studyDefaultTab: 'bible' | 'renvois' | 'cites-par' | 'sources' | 'en-bref'
}

// lib/stores/reading.ts        — copied
{ ccc: { lastPath, lastParagraph, scrollY, timestamp } }

// lib/stores/studyPanel.ts     — generalized
{ open: bool, activeTab: TabId, context: { paragraph?: number, range?: [number, number] } }

// lib/stores/searchScope.ts    — new
{ corpus: 'ccc' | 'all', filters: {...} }

// lib/stores/outline.ts        — new
{ activeHeadingId: string | null }
```

All persisted prefs use a versioned migration scheme like DR's (the DR `prefs.ts` migration pattern carries over).

## 10. Visual Style & Quality Bar

### Typography

- **Body (default)**: **Libre Baskerville**, fallback `Georgia, serif`.
- **Headings/UI**: existing Gotham + Inter fallback stack from DR.

**Font choices in Reading Prefs:**

1. Libre Baskerville *(default)*
2. Sentinel
3. Source Serif 4
4. Noto Sans
5. Libre Franklin
6. Montserrat
7. Grace Dyslexic MD (toggle, separate from font picker)

**Sizes (default)**: 18px desktop / 17px mobile, line-height 1.65, reader column ~750px wide including the hanging paragraph-number margin (~85-90 characters of body text per line).

**Paragraph numbers**: tabular figures, muted gold (`#a07a1f` light / `#d4a644` dark), click to copy link, hover shows pop-link icon.

**Wordmark**: 3-line stacked: `Catéchisme / de l'Église / Catholique`. Set in the heading typeface, hierarchically sized (line 1 largest, line 3 smallest), tight leading. Sits to the right of the logo.

**Logo**: from `Website/CCC/catechisme-logo.png` (light theme) and `catechisme-logo-white.png` (dark theme). Both are large source PNGs (~500KB-1MB).

**Optimization is a one-time pre-build step** (NOT a build-time hook):

- Provide `bin/optimize-logos.ts` (or `scripts/optimize-logos.ts`), runnable via `npm run optimize-logos`.
- Uses `sharp` (or equivalent) to produce, **once per logo update**, into `static/img/logo/`:
  - WebP at sizes 32, 48, 64, 96, 128, 192px (covers favicon, app-icon, mobile TopBar, desktop TopBar, retina) for both light and dark variants.
  - PNG fallback at the same sizes.
- All optimized outputs are **committed to the repo**. The build pipeline merely copies them to the deploy bundle — no per-build re-encoding.
- Run the script manually whenever a logo source PNG changes (rarely). A pre-commit hook can warn if `Website/CCC/catechisme-logo*.png` is modified without re-running the script.
- Preserve transparency throughout.
- Theme-swap at render time via `<picture>` element with `prefers-color-scheme` media query, or `<img src>` swap on theme-store change.

**Citation-block styling** (inline): subtle but distinct.

- 1px left rule in muted accent (`#c9a875` light / `#b8851a 60%` dark)
- Background block at slightly cooler/warmer tint than body (`#f3efe4` light / `#22201c` dark)
- Body type ~0.92em
- Optional small-caps "Cite source" label suppressed; the inline `<sup>` source marker is the only label
- Generous left padding (~1em) so the block visually nests under the parent paragraph

**French typography niceties**:

- Non-breaking space before `: ; ! ? » ›`
- Proper guillemets `« »`
- Hair space inside guillemets
- Em-dashes `—` for asides

### Color & theme

**Light** (default — warm parchment):

- Background: `#faf6ec`
- Body: `#1f1c17`
- Headings: `#2a2722`
- Accent (paragraph numbers, links, focus rings): `#a07a1f`
- Citation small-print: `#5a5448` on `#f3efe4`
- En Bref: `#fdf6e9` background, `#b8851a` left border, `#7a6020` heading
- Panel: `#fbf6e9`
- Outline active: `#a07a1f` left border + bold

**Dark** (warm-charcoal):

- Background: `#1a1815`
- Body: `#e6e1d6`
- Accent: `#d4a644`
- Panel: `#2a2722`
- Citations: `#a8a294` on slightly-elevated panel

Theme honors `prefers-color-scheme`; user can override.

### Print stylesheet

- Hide TopBar, panel, outline, search, FloatingNav, footer.
- Show paragraph numbers prominently; reduce serif size to ~11pt.
- `page-break-avoid` inside paragraphs and citations.
- URL printed in page footer.

### Quality bar (v1 launch non-negotiables)

- **Lighthouse ≥95** across all four scores on the chapter page.
- **Core Web Vitals**: LCP <2s, INP <200ms, CLS ~0.
- **No CLS** from RefTooltip / StudyPanel: panel is fixed-positioned overlay, content does not reflow.
- **Keyboard navigation**: as in §6.
- **Accessibility**: WCAG AA contrast minimum, visible focus rings, `aria-label` on `<sup>` markers, panel uses `role="dialog"` with focus trap when overlay (not when docked).
- **No theme-flash**: theme set in inline `<script>` in `<head>` before hydration.

## 11. Reading Prefs — v1 vs Deferred

### v1

- `fontSize`, `lineHeight`, `fontFamily`, `dyslexiaFont`, `theme`
- `justifiedText`, `columnWidth`, `readingMode`, `studyPanelWidth`
- `showItalics`, `showSmallCaps`, `showDropcap`, `hangingParagraphNumbers`
- `showCitations`, `showFootnoteMarkers`, `showEnBref`
- `studyDefaultTab`

### v1.1 (deferred)

- `infiniteScroll`
- `bionicReading` + `bionicFixation`, `bionicSaccade`, `bionicOpacity`
- `syncStudyScroll`

### v2

- Annotations (highlights, personal notes) + `annotationSync`
- Bookmarks (localStorage list)
- Audio playback (if `ccc_audio.json` data is verified)
- PDF generation (Puppeteer-based)
- Articles / blog section
- Compendium of CCC data
- St. Pius X catechisms (large & small)
- Catechism of Trent
- Compare-doctrines view across catechisms

## 12. PWA & Offline

- PWA manifest at `/manifest.json`.
- Service worker pre-caches the chapter shell and recently-viewed chapters.
- All static JSON in `static/data/` is cacheable.
- NCL (`bible/ncl.json`) loaded on first Bible-ref interaction; cached for offline.
- Search index (in KV) downloaded on first visit; cached.

Same pattern as the DR site's PWA.

## 13. SEO

- **Schema.org** `Article` markup per paragraph (and per chapter): `inLanguage="fr"`, `isPartOf` link to chapter/section/part, `citation` for sources.
- **OpenGraph** + **Twitter Card** per page with paragraph excerpt.
- **Sitemap** auto-generated at build (every paragraph, range route is omitted to avoid sitemap bloat).
- **`robots.txt`**, **`llms.txt`** (parallel to DR's).
- **`hreflang`-ready** structure (no hreflang in v1 — French only — but page-level `<link rel="alternate">` infrastructure in place).
- French-keyword-rich slugs for every structural URL.
- Internal linking density: every paragraph cross-links to its referenced and citing paragraphs (Renvois + Cités par tabs surface in HTML for indexers; rendered in panel for readers). The `/ccc/sommaire` page is the primary deep-internal-linking hub since thematic and source indexes have no public pages.
- Loss of the per-thematic-entry and per-source landing pages reduces some SEO surface area, accepted as a deliberate copyright/republishing tradeoff.

## 14. Build & CI

Same pattern as DR:

```
npm run dev          # local dev
npm run build        # prebuild (prepare-data.ts) + vite build
npm run check        # svelte-check + tsc
npm run test         # vitest
npm run test:e2e     # playwright
npm run lint           # prettier + eslint
npm run format         # prettier --write
npm run upload-index   # upload search index to Cloudflare KV
npm run optimize-logos # one-time logo asset generation; outputs committed to static/img/logo/
```

CI on GitHub Actions: lint → check → unit → e2e → build → deploy preview → upload-index → deploy production (on `main`).

## 15. Risks & Open Items

### Risks

- **`.fr` registration** for natural-person registrants requires a registrar (Gandi/OVH) that handles a separate technical contact automatically. Cloudflare Registrar does not support `.fr`.
- **Build-time HTML parsing** of XHTML thematic-index files: structure is consistent but malformed XHTML edge cases need to be handled (use a forgiving parser like `parse5`, not strict XML).
- **NCL Strong's-tag stripping**: USFX has Strong's number markup mixed with text and punctuation; the parser must reconstruct verse text correctly. Validate output against a reference verse list.
- **Logo asset workflow**: source PNGs are ~500KB-1MB. The optimized variants are generated by a one-time `npm run optimize-logos` script and committed to `static/img/logo/`. **Risk**: if someone updates a source PNG without re-running the script, the deployed logo stays stale. Mitigate with a pre-commit hook that warns on source-PNG diffs. The build pipeline does NOT re-optimize on every build.

### Open items (defer until in implementation)

- **Audio data verification**: `ccc_audio.json` (1.6 MB) is unaudited. v2 work — reverify shape and quality before committing to the feature.
- **Mobile design specifics**: handled separately in implementation; this spec defaults to desktop-first behavior with sensible drawer fallbacks.
- **Featured-paragraphs strategy** for homepage: hand-curated list TBD.

## 16. Summary

A standalone French CCC site at `lecatechisme.fr`, sharing the DR site's stack and component patterns where applicable. Multi-corpus architecture from day 1 enables future Compendium / Pius X / Trent additions and a federated `/bible/` reverse-lookup. Reading UX prioritizes typographic quality, deep cross-reference navigation via a tabbed study panel, inline elegantly-styled citations, and best-in-class French SEO. Major v1 features: multi-granularity reading views (single paragraph, range, article, chapter, section, part), sticky chapter outline, study panel with hover-tooltip + click-panel cross-refs, always-visible intelligent header search, full hierarchical TOC at `/ccc/sommaire`, comprehensive reading prefs (6 fonts + Grace Dyslexic, theme, layout, typography toggles), PWA/offline. Thematic index and source-document cross-refs are kept as **search-enhancement data** (no public landing pages) to respect republishing concerns; Guide de lecture is excluded entirely (copyrighted). v1.1+ unlocks advanced reading modes (infinite scroll, bionic reading, scroll sync); v2+ unlocks annotations, audio, custom PDF, additional catechisms, and cross-corpus comparison.
