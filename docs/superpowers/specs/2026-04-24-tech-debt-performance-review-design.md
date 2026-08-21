# Tech Debt & Performance Review — Design Spec

**Date:** 2026-04-24
**Status:** Approved

## Context

The Douay-Rheims Bible app has accumulated meaningful tech debt since the Fathers mode was introduced (late April 2026). The fathers page loads noticeably slowly. Recent changes (linkify in ChapterView, about-page split) may have introduced regressions elsewhere. Build output shows ~200 lines of 301 redirects and 404 errors. A comprehensive audit is needed before further feature work.

## Scope

**Tiered — not all areas treated equally:**

- **Fathers page** (`/fathers/[book]/[chapter]`): deep-dive across performance, code quality, data loading, and component architecture
- **Study mode + linkify** (`ChapterView.svelte`, study panel): targeted review of recently ballooned linkify pipeline
- **Rest of the app**: light regression check focused on recent commits (about-page split, reference route changes)
- **Build warnings**: 301 redirects and 404 fathers JSON fetches — ~200 lines, need root-cause analysis

**Out of scope:**
- Svelte 4 → 5 migration (tracked in TECH_DEBT.md, deliberately deferred)
- Cloudflare routing config changes (has intentional quirks documented in CLAUDE.md)
- Translation selector UI (frozen per project conventions)

## Priority Tiers

- **P0 — Fix in this session**: measurable slowness, broken fetches, render-blocking issues
- **P1 — Fix in this session**: code quality issues with clear bounded solutions
- **P2 — Write plan, implement later**: architectural changes needing more thought

## Audit: Four Parallel Agents

### Agent 1 — Performance (Lighthouse + Network)
**Tool:** `application-performance:performance-engineer`
**Model:** Opus

Targets:
- `/fathers/john/1` — largest chapter (386KB JSON, ~100+ entries)
- `/odr/john/1` — baseline reader
- `/` — homepage baseline

Throttling: test with Slow 3G + 4x CPU slowdown to reproduce real-world experience, not just localhost metrics.

Metrics to capture: LCP, TTI, TBT, CLS, total transfer size, JS parse time, DOM node count.

Must also check: whether Cloudflare serves fathers JSON with Brotli/gzip (actual over-the-wire size vs raw file size). The 386KB figure is uncompressed — the real transfer size may already be acceptable.

Reports: what is actually slow and why, backed by measured numbers.

---

### Agent 2 — Code Review + Decomposition: Fathers Components + Recent Changes
**Tool:** `code-review-ai:architect-review` + `code-simplifier` analysis
**Model:** Opus

Deep review:
- `src/lib/components/FathersCommentaryPanel.svelte` (531 lines)
- `src/lib/components/FathersEntryCard.svelte` (176 lines)
- `src/lib/components/FathersVerseList.svelte` (256 lines)
- `src/lib/components/FathersReader.svelte` (61 lines)
- `src/lib/components/FathersBar.svelte`
- `src/routes/fathers/[book]/[chapter]/+page.ts` — the load function that fetches the 386KB JSON

`FathersCommentaryPanel` decomposition (strict deliverable format):
1. Proposed file tree after split
2. Props + events interface for each extracted component
3. Line-by-line extraction map: which lines move where

Also identifies: dead code, redundant reactive blocks, inline style duplication, missing memoization.

Light review (recent changes, check for regressions):
- `src/routes/about/` subtree (recently split)
- `src/lib/components/ChapterView.svelte` (371 lines)

Reports: coupling issues, reactive computation problems, a11y regressions, decomposition plan.

---

### Agent 3 — Architecture: Data Loading, JSON Payloads, Build Errors
**Tool:** `code-review-ai:architect-review`
**Model:** Opus

Reviews:
- `src/lib/data/loader.ts` — caching strategy, fetch patterns
- `static/data/fathers/` — payload sizes (max 386KB), structure, compression opportunities
- `static/` bundle composition — `paragraphs.ts` (28KB), `books.ts` (14KB), `reference.ts` (17KB) bundled client-side
- Build 404s: `manifest.json` lists chapters without corresponding `.json` files (2-john/1, 1-machabees/1, etc.) — extraction gaps or manifest bugs?
- Build 301s: which routes generate stale `/reference/ot/...` links, and where those links originate
- `src/routes/reference/` — route structure and redirect logic

Reports: JSON slimming strategy, lazy-load opportunities, manifest/data sync fix, compression approach, 301 redirect root cause and fix.

---

### Agent 4 — Study Mode + Linkify
**Tool:** `code-refactoring:code-reviewer`
**Model:** Sonnet

Reviews:
- `src/lib/components/ChapterView.svelte` — linkify pipeline added in recent commits
- Study panel components and `src/lib/stores/studyPanel.ts`
- `src/lib/utils/fathers-display.ts` and verse-ref utilities

Specifically checks:
- Regex cost of linkify on large chapters (e.g. Psalms 119)
- DOM manipulation overhead — is linkify running on every render or once?
- Whether linkify output is memoized per verse
- Impact on scroll performance in ChapterView

Reports: performance cost of linkify, memoization gaps, any regressions vs pre-linkify behavior.

---

## Consolidation

After all four agents complete, findings are merged into a single prioritized list using the P0/P1/P2 tiers. Duplicates are deduplicated. Each finding maps to a concrete file + line number where possible.

**Hypotheses to confirm** (pre-audit expectations — agents must measure before promoting):
- 386KB uncompressed JSON for John 1 — is the over-the-wire (gzip/Brotli) size still a problem?
- No virtualization for entry cards — does DOM node count actually cause measurable jank, or is the bottleneck elsewhere?
- ~200 build 404s: manifest entries with no data files — P1 unless these cause user-facing errors
- 301 redirects from stale internal links — P1 build hygiene

**Likely P1 candidates:**
- `FathersCommentaryPanel` mixed concerns (531 lines)
- Multiple redundant `$:` reactive blocks recomputing derived values on every state change
- Linkify cost on large chapters — investigate, promote to P0 only if measured

## Implementation

P0 and P1 fixes are implemented in the same session, using parallel agents where fixes are independent. Each fix is verified with `npm run check` + `npm run lint`.

P2 items are written into a follow-up implementation plan.

## Guardrails

- No Svelte 4 → 5 migration
- No Cloudflare routing config changes without explicit discussion
- ODR pages stay through the Worker
- Translation selector labels untouched
- No speculative abstractions — fixes target what is actually measured as slow or broken
