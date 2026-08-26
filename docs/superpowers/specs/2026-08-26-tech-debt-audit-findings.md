# Tech Debt Review -- Findings

**Date:** 2026-08-26
**Branch:** `fix/chapter-title-per-book`
**Predecessor:** `2026-04-24-tech-debt-audit-findings.md` (20/21 items closed)

Scope: full codebase review, four months after the April audit. Verified against a real
production build, the type checker, the linter, and the unit suite.

---

## Status: items 1-7 applied 2026-08-26

Batches 1-3 of the suggested ordering are done. Final gate: `npm run lint` exit 0,
`svelte-check` 0 errors, 214/214 tests, `npm run build` exit 0.

| # | Item | Outcome |
|---|------|---------|
| 1 | CLAUDE.md | Rewritten. See correction A below. |
| 2 | iCloud duplicates | Deleted. Static files **10,913 → 9,789**. `.gitignore` rule added and verified. |
| 3 | 404 skip link | Fixed. Build warning gone. |
| 4 | Split `reference.ts` | Done: new `src/lib/search/osis.ts`. See correction C below. |
| 5 | 12 type warnings | Triaged. All deliberate. See correction B below. |
| 6 | Tooltip extraction | Done: new `src/lib/utils/verseRefTooltip.svelte.ts`. |
| 7 | Build script dedup | Done: new `scripts/sfm-lib.ts`. `.gitignore` gaps closed, `test-results/.last-run.json` untracked. |

### Correction A: the migration is not as complete as this review first claimed

The rune migration was run with `svelte-migrate`, which left its compatibility layer in
place. **19 files import from `svelte/legacy`**, with **59 `run()` call sites** (20 in
`StudyPanel.svelte` alone), plus `createBubbler`, `stopPropagation`, `preventDefault`, and
`passive` shims.

`run()` is the mechanical translation of `$:` and is a shim, not a destination. The original
review checked for `$:` and found none, concluding the migration was finished. That was
wrong. CLAUDE.md now documents the shim layer explicitly. Replacing the 59 `run()` blocks
with `$derived` / `$effect` is unclaimed work, best done opportunistically per component.

### Correction B: the two "probable bugs" in P2-5 were not bugs

- `FloatingNav.svelte` seeds `activeTestament` from `bookSlug` on mount. All three call
  sites render it behind `{#if navOpen}`, so it remounts on every open and re-seeds. Correct
  as written.
- `ChapterView.svelte` seeds `activeVerse` from `targetVerse`, and a `run()` block at line
  ~251 re-syncs it when the prop changes. Correct as written.

All 12 warnings are deliberate prop-seeding. Each of the four sites now carries a comment
saying so, so the next reader does not re-investigate.

### Correction C: splitting `reference.ts` does not, by itself, remove the 150KB chunk

The split is done and is correct module hygiene: `parseOsis` and `OsisRange` now live in a
dependency-free `osis.ts`, and only three modules still reach for the grammar
(`crossRefParser.ts`, `SearchBar.svelte`, `routes/search/+page.svelte`).

**Measured after the change, the grammar chunk is still `modulepreload`ed on
`/odr/genesis/1`.** The P0 diagnosis was right about the cause but wrong about the cure. The
full chain is:

```
BibleReader  ->  StudyPanel  ->  AnnotationProse  ->  linkifyItalicRefs
                                                   -> parseItalicRef
                                                   -> parseAllReferences  -> bcv_parser
```

`StudyPanel` is rendered unconditionally in `BibleReader` (no `{#if}` guard), so everything
below it is in the reader's eager module graph. `linkifyItalicRefs` genuinely needs the
grammar, and it is synchronous, called from inside `String.replace` and `{@html}` rendering,
so it cannot simply be awaited.

Removing the 36KB gzip therefore requires a real decision, not a refactor:

1. **Lazy-load `StudyPanel`** behind study mode. Biggest win by far, since it also defers a
   2,581-line component. It changes the reader's layout lifecycle (the resize panel and the
   mobile drawer both assume the panel exists), so it needs care and manual testing.
2. **Dynamically import the grammar inside `crossRefParser`**, rendering italic refs
   unlinked on first paint and re-linkifying once loaded. Smaller blast radius, but it
   introduces a visible flash on the commentary.
3. **Leave it.** 36KB gzip on a text-heavy reading site may be an acceptable price.

**Resolved.** Option 1 was chosen and implemented, see the next section.

---

## Item 4, resolved: the grammar is off the reader route

Two changes, both measured against a production build:

1. **`StudyPanel` is now lazy.** `BibleReader` imports it via `import()` on first entry into
   study mode, guarded by `{#if StudyPanel}`. The default mode is `reading`, and SSR only
   ever produced a 2KB empty shell (175 characters of placeholder), so nothing is lost.
   Once loaded it stays loaded, so toggling modes keeps the panel's tab and scroll state.
2. **`linkifyItalicRefs` / `parseItalicRef` moved to `src/lib/search/crossRefItalic.ts`.**
   These were the only things in `crossRefParser.ts` that needed the grammar, and
   `ChapterView` and `CrossRefText` import `tokenizeCrossRef` from that module on the reader
   route. Splitting them means `crossRefParser.ts` no longer imports `./reference` at all.

Step 1 alone was not enough: the reader HTML shrank 124K → 108K but the grammar stayed,
because `ChapterView` still pulled it through `crossRefParser`. Both steps were needed.

| Measure | Before | After |
|---------|--------|-------|
| Grammar chunk | 150.36 kB (36.43 kB gzip) | 132.09 kB (**31.80 kB gzip**) |
| Preloaded on `/odr/genesis/1` | yes | **no** |
| Preloaded on any prerendered page | yes | **no** |
| `modulepreload` count on reader | 32 | 30 |
| Reader HTML | 124K | 109K |

Confirmed in a browser: in reading mode neither `StudyPanel` nor the grammar is fetched at
all. In study mode the panel loads and renders annotations normally.

---

## Item 8, accessibility: one real gap closed, one design decision surfaced

**The review's claim was partly wrong.** Inline markers are already `<button>` elements with
`aria-label`, so Enter and Space fire a native click that reaches the delegated handler.
Markers were never keyboard-inaccessible. The `svelte-ignore` comments cover the event
delegation, not a missing affordance.

**The real gap was elsewhere, and it is larger than the review described.** Across a sample
of ODR books, **70% of annotated verses (145 of 207) carry no inline marker at all**. Their
annotation was reachable only by clicking the verse body, which no keyboard user can do.
Confirmed live on `/odr/1-corinthians/1`, where both annotated verses have zero markers.

Fixed in the verse-list view: annotated verses now render a `.verse-annotation-key` button,
visually hidden until focused, then shown as a small labelled chip. Verified end to end in a
browser: focusing it and pressing Enter opens the panel to "VERSE 5, In all knowledge" and
marks the verse active. The verse text stays plain text rather than becoming a widget, so
screen-reader reading flow is unaffected.

### Open: paragraph view has a functional gap, not just an accessibility one

**Correction to an earlier draft of this section:** it claimed `paragraphView` defaults to
`true`. It does not. `DEFAULTS.paragraphView` is `false` (`prefs.ts:59`) and no migration
overrides it. The `true` reading came from stale `localStorage` in a shared browser profile
being mistaken for the default. Verified with a cleared profile: a fresh visitor gets
`paragraphView: false` and the verse-list view (31 `<li>`, 0 paragraph blocks).

The gap itself is real but narrower than that draft implied. The paragraph-view branch has
no verse-level click handler, only marker clicks. On `/odr/1-corinthians/1` in paragraph
view, markers exist for verses 1, 12, 14, 19, 25 and 31; verse 5's annotation opens fine in
verse-list view but cannot be reached by any input method in paragraph view.

Because the default is verse view, this affects only readers who deliberately turned
paragraph view on. Closing it means deciding how an annotated verse should be indicated in
flowing paragraph text, which is a visual design call, so it is left open. Options: give
paragraph view the same annotated-verse affordance the verse list has, render markers for
markerless annotations, or state in the UI that annotations are a verse-view feature.

---

## Baseline health -- all green

| Check | Result |
|-------|--------|
| `vitest run` | 214 passed / 214, 24 files |
| `svelte-check` | 508 files, **0 errors**, 12 warnings |
| `eslint src/` | clean |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run build` | exit 0 |
| TODO / FIXME / HACK | 0 real instances |
| `console.log` in `src/` | 0 |
| `any` / `@ts-ignore` | 3 `any`, 0 `@ts-ignore` |

The April items stayed fixed. Code hygiene is genuinely strong; the findings below are
structural rather than symptoms of sloppiness.

Not verified: `npm outdated` failed on a corrupted local npm cache (`ENOENT` in
`~/.npm/_cacache`). Dependency freshness is unchecked. `npm cache clean --force` then retry.

---

## P0 -- 150KB reference parser eagerly preloaded on the main reader route

**The single highest-value fix in this review.**

`bible-passage-reference-parser` compiles to a 150.36 KB chunk (36.40 KB gzip), the largest
in the build. It is `modulepreload`ed in the `<head>` of `/odr/genesis/1`, so every visitor
to the primary reader route downloads and parses it before it is ever needed.

**Root cause.** `src/lib/search/reference.ts` (173 lines) is one module holding two unrelated
things:

- `parseReference` / `parseAllReferences` -- need the PEG grammar, statically imported at
  lines 1-2 (`bcv_parser`, `lang/en.js`).
- `parseOsis` (line 159) -- a **pure 12-line regex function with zero dependency on the
  grammar**.

Eight components on the reader route import only `parseOsis` and the `OsisRange` type:
`StudyPanel`, `ChapterView`, `CrossRefText`, `AnnotationProse`, `FathersCommentaryPanel`,
`PrayerModal`, `VerseTooltip`, and the reference page. Because the grammar lives in the same
module, importing the regex helper drags in the whole parser.

**Fix.** Split the module:

- `reference-types.ts` -- `OsisRange`, `ParsedReference`, `parseOsis`. No dependencies.
- `reference-parser.ts` -- `parseReference`, `parseAllReferences`. Keeps the `bcv_parser`
  import, loaded via dynamic `import()` from its three real consumers (`SearchBar`,
  `routes/search/+page.svelte`, `crossRefParser.ts`).

Removes roughly 36 KB gzip of eagerly-preloaded, eagerly-parsed JS from the app's
most-trafficked route. Verify with `grep ByQ1Tp2Z .svelte-kit/output/prerendered/pages/odr/genesis/1.html`
returning nothing after the change.

---

## P1 -- CLAUDE.md documents the opposite of the actual codebase

`CLAUDE.md` states, under a heading marked "important":

> All components and stores use **Svelte 4 syntax** (`export let`, `$:`, `on:click`, writable
> stores). Do **not** migrate to Svelte 5 runes (`$state`, `$derived`, `$effect`) unless
> explicitly asked.

Measured reality across 70 `.svelte` files:

| Pattern | Count |
|---------|-------|
| `export let` | **0** |
| `on:click` | **0** |
| `$:` reactive labels | **0** |
| `$props` / `$state` / `$derived` | **45** |

The rune migration is complete for components. The instruction is not merely stale, it
actively tells every contributor and every AI session to write code in a style the codebase
abandoned, and forbids the style it actually uses.

Only the second half holds: `src/lib/stores/` still uses `writable` (7 files, 0 runes), which
is a reasonable deliberate choice worth stating on its own.

Two related documentation defects:

- CLAUDE.md cites `TECH_DEBT.md` twice. That file was **deleted on 2026-04-18** in commit
  `e00c6fa1` and has not existed since. Both references are dead.
- CLAUDE.md is listed in `.gitignore` ("Claude Code context (local only)") and is untracked,
  so the project's primary onboarding document lives on one machine with no backup or history.

**Fix.** Rewrite the Svelte section to describe runes-for-components / stores-for-shared-state.
Drop the `TECH_DEBT.md` references or restore the file. Reconsider gitignoring CLAUDE.md.

---

## P1 -- Static asset count is at 55% of the Cloudflare Pages ceiling

Cloudflare Pages caps a deployment at **20,000 files**. Current count:

```
10,913 static files   (55% of limit)
   139M static/data
```

Per-data-type file counts show the trend:

| Directory | Files |
|-----------|-------|
| `static/data/glossa/` | 2,248 |
| `static/data/haydock-commentary/` | 1,332 |
| `static/data/fathers/` | 1,166 |
| `static/data/knox-notes/` | 1,110 |
| `static/data/haydock-crossrefs/` | 1,081 |
| `static/data/cpdv-notes/` | 934 |
| `static/data/drc-notes/` | 804 |

The per-chapter JSON sidecar pattern costs roughly 1,000 to 2,250 files per commentary layer.
Glossa Ordinaria alone (August) added 2,248. Three or four more layers of that size reach the
hard ceiling, at which point deploys fail rather than degrade.

This is not urgent today, but it is a ceiling rather than a slope, and it should inform the
next data-layer design. Options: bundle chapters per book into single JSON files (trading
file count for per-request bytes), or move cold layers to KV alongside the search index.

Related: `static/data/odr/search-index.json` is 8.3 MB and ships as a static asset in addition
to living in KV. That is intentional (`text-search.ts:97` falls back to the static URL when KV
misses), so it is correct, just worth knowing it is 8.3 MB of the deploy.

---

## P1 -- iCloud duplicate files polluting the repo and the deploy

The working tree carries **175 iCloud conflict duplicates** with a `" 2"` suffix:

- **104 duplicate directories** under `static/`, totalling **1,124 files / 7.7 MB**
- Duplicated source: `scripts/build-glossa-data 2.ts`, `scripts/glossa-lib 2.ts`,
  `tests/unit/glossa-lib.test 2.ts`
- Duplicated docs: 7 plan and spec files

Consequences: those 1,124 files count against the 20,000-file Pages limit and would deploy as
live URLs; the duplicated `.ts` files are ambiguous to anyone reading `scripts/`; and they
break naive tooling (a plain `find | xargs wc -l` over `scripts/` errors on the unquoted
spaces).

**Fix.** Delete them, then add a `.gitignore` rule for `* 2.*` and `* 2/`. Verify none is the
newer copy first:

```sh
find . -path ./node_modules -prune -o -name '* 2*' -print
```

---

## P2 -- Remaining items

### 1. Tooltip handler duplication, and a stale rationale

April item B-18 was skipped with the reason "data extraction logic differs, shared action adds
complexity for little gain." That reasoning has since expired for two of the three sites.

`StudyPanel.svelte:570-600` (`handleConfRefOver` / `handleConfRefOut`) and
`FathersCommentaryPanel.svelte:99-127` (`handleRefOver` / `handleRefOut`) are now
**character-for-character identical** apart from variable prefixes (`confVerseRef*` vs
`verseRef*`). The `.verse-ref` markup pattern spans 6 files.

The third site, `ChapterView.svelte:162-196`, genuinely does differ (different selector, builds
its range from `data-verse` rather than `data-osis`), so the original rationale still holds
there. It has also drifted: its dismiss delay is **120ms** against **300ms** in the other two,
which is a user-visible inconsistency introduced by copy-paste.

**Fix.** Extract a `createVerseRefTooltip()` utility covering the two identical sites. Leave
`ChapterView` alone or pass the delay as a parameter and pick one value deliberately.

### 2. StudyPanel.svelte is 2,581 lines

Composition: 983 lines of script, ~887 markup, ~711 style. It mixes tab construction, scroll
observation, an IntersectionObserver, verse-section registration, clipboard handling, wheel
handling, and tooltip logic.

For scale, April decomposed `FathersCommentaryPanel` as a P2 item when it hit **531 lines**.
StudyPanel is nearly five times that and has never been split. Same treatment applies: lift
the tab model and the scroll/observer logic into `$lib/utils`, leaving a panel shell.

### 3. Accessibility: core verse interaction is mouse-only

29 `svelte-ignore` comments suppress 48 a11y rules:

| Rule | Count |
|------|-------|
| `a11y_no_static_element_interactions` | 22 |
| `a11y_click_events_have_key_events` | 11 |
| `a11y_no_noninteractive_element_interactions` | 9 |
| `a11y_mouse_events_have_key_events` | 5 |
| `a11y_no_noninteractive_tabindex` | 1 |

The 11 click and 5 mouse suppressions are the substantive ones. In `VerseList.svelte`,
`handleVerseClick` (line 897) and `handleMarkerClick` (lines 821, 916) are bare `onclick`
handlers with no `role`, no `tabindex`, and no keyboard equivalent. Opening the study panel
for a verse, the reader's central feature, cannot be done from a keyboard.

Suppressing the warning silences the linter without addressing the gap. Worth a dedicated
pass rather than a line-by-line fix.

### 4. Broken skip link on /404

`+layout.svelte:102` renders `<a href="#main-content">Skip to reading</a>` on every page.
Every route defines `id="main-content"` except `src/routes/404/+page.svelte`, whose `<main>`
carries no id. The skip link is a dead anchor exactly where a lost user lands.

The build reports this every run; `prerender.handleMissingId: 'warn'` keeps it from failing.
One-word fix: add `id="main-content"` to the 404 `<main>`.

### 5. Twelve `state_referenced_locally` warnings are half-migration artifacts

All 12 type-checker warnings are the same class: `$state` initialized from a prop, capturing
only the first value. Two look like live bugs:

- `FloatingNav.svelte:33` -- `activeTestament` derives from `bookSlug` once. Navigating from
  an OT book to an NT book client-side leaves the testament toggle on its stale value.
- `ChapterView.svelte:76` -- `activeVerse = $state(targetVerse)` will not follow a changed
  `targetVerse` prop.

The rest (`BibleReader` 93-95, `search/+page` 38-54) appear intentional, seeding mutable local
state from an initial prop. Worth triaging each and adding a short comment where the capture is
deliberate, so the warnings drop to zero and future ones are signal.

### 6. Build script duplication

Across `extract-drc-reference.ts` (534), `extract-haydock-reference.ts` (496), and
`extract-vulgate-format.ts` (492):

- `readSfm` is **byte-identical** between the drc and haydock scripts.
- `writeJson` and `cleanInline` exist in both but have **diverged**, which is the worse case:
  copied, then edited on one side only.

Extract the shared three into `scripts/sfm-lib.ts` and reconcile the drift deliberately.

### 7. .gitignore gaps

- `test-results/.last-run.json` is **tracked in git**. Playwright output should not be.
- Untracked and unignored, so they clutter every `git status`: `.claude/`, `.playwright-mcp/`,
  and 5 root screenshots (`cec-1-check.png`, `cec-1-studypanel.png`, `odr-genesis1-check.png`,
  `reading-mode.png`, `vul-gen1.png`).

Add `test-results/`, `.playwright-mcp/`, `.claude/`, `/*.png` and `git rm --cached` the
tracked artifact.

---

## Suggested order

| # | Item | Effort | Why this order |
|---|------|--------|----------------|
| 1 | Split `reference.ts` | Small | Best value-to-effort in the review; user-facing on the top route |
| 2 | Fix CLAUDE.md | Trivial | Every further change is written against wrong instructions until this lands |
| 3 | Delete iCloud duplicates + gitignore | Trivial | Unblocks clean `git status`; removes 1,124 junk deploy files |
| 4 | 404 skip link | Trivial | One word |
| 5 | Triage the 12 warnings | Small | Two are probable bugs |
| 6 | Tooltip extraction | Small | Two sites are literal copies |
| 7 | Build script `sfm-lib.ts` | Small | Reconcile diverged copies before they drift further |
| 8 | Accessibility pass | Medium | Needs a deliberate keyboard-interaction design |
| 9 | StudyPanel decomposition | Large | No urgency, but it grows with every feature |
| 10 | Data-layer file-count strategy | Large | Decide before the next commentary layer, not after |
