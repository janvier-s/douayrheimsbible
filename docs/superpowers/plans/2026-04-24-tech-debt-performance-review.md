# Tech Debt & Performance Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the codebase for performance issues and tech debt (fathers page deep-dive, study mode/linkify review, light app-wide regression check), then fix all P0 and P1 findings in-session.

**Architecture:** Four parallel audit agents produce independent findings. Findings are consolidated into P0/P1/P2 tiers. P0+P1 fixes are implemented via parallel agents where independent.

**Tech Stack:** SvelteKit 2, Svelte 5 (Svelte 4 compat mode), Tailwind CSS 3, Cloudflare Pages+Workers, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-24-tech-debt-performance-review-design.md`

---

## Phase 1: Parallel Audit (4 agents)

All four agents launch simultaneously. Each produces a structured findings report.

### Task 1: Launch Agent 1 — Performance (Lighthouse + Network)

**Agent type:** `application-performance:performance-engineer`
**Model:** Opus

- [ ] **Step 1: Launch agent with this prompt**

```
You are auditing the performance of a SvelteKit Bible app deployed on Cloudflare Pages.

PROJECT CONTEXT:
- SvelteKit 2 + Svelte 5 (Svelte 4 compat mode) + Tailwind CSS 3
- Static JSON data fetched at page load, no backend database
- Cloudflare Pages (static) + Workers (dynamic ODR routes)
- CSS is inlined (inlineStyleThreshold: 51200)

YOUR TASK:
Start the dev server with `npm run dev`, then use Playwright to measure performance on three pages:

1. /fathers/john/1  — the heaviest page (386KB raw JSON, 100+ commentary entries)
2. /odr/john/1      — baseline Bible reader
3. /                 — homepage baseline

FOR EACH PAGE, measure and report:
- LCP, TTI, TBT, CLS (via Lighthouse or Performance API)
- Total transfer size (especially the fathers JSON — check actual over-the-wire size with gzip/Brotli, not just raw file size)
- DOM node count
- JS parse/eval time
- Time to first meaningful paint

CRITICAL: Test with throttling — use Slow 3G network + 4x CPU slowdown. Localhost with a fast connection will not reproduce the real user experience.

ALSO CHECK:
- Does the dev server (and presumably Cloudflare) serve /data/fathers/*.json with Content-Encoding: gzip or br?
- What is the actual transfer size of /data/fathers/john/1.json vs the 386KB raw size?
- Are there render-blocking resources despite the inlineStyleThreshold setting?
- How many DOM nodes does /fathers/john/1 create vs /odr/john/1?

OUTPUT FORMAT — structured findings:
For each finding, report:
- FINDING: one-line summary
- SEVERITY: P0 (measurably slow) / P1 (suboptimal) / P2 (architectural concern)
- EVIDENCE: the measured number(s)
- FILE: which source file is responsible (if applicable)
- FIX: suggested approach (one sentence)

End with a SUMMARY section: the single biggest bottleneck, and what you'd fix first.
```

- [ ] **Step 2: Verify agent started successfully**

---

### Task 2: Launch Agent 2 — Code Review + Decomposition

**Agent type:** `code-review-ai:architect-review`
**Model:** Opus

- [ ] **Step 1: Launch agent with this prompt**

```
You are doing a deep code review of a SvelteKit Bible app, focused on the Fathers commentary feature and recent changes.

PROJECT CONTEXT:
- SvelteKit 2 + Svelte 5 (Svelte 4 compat mode — uses `export let`, `$:`, `on:click`, writable stores)
- Do NOT suggest migrating to Svelte 5 runes ($state, $derived, $effect) — this is deliberately deferred
- Tailwind CSS 3 for styling
- All Bible data is static JSON fetched at page load

DEEP REVIEW — read each file carefully and report issues:

1. src/lib/components/FathersCommentaryPanel.svelte (531 lines)
   - This is the primary target. It mixes four concerns: filter state/logic, scroll management, verse-ref tooltip, and entry rendering with pericope grouping.
   - Check for: redundant $: reactive blocks, missing memoization, unnecessary recomputation on state changes, dead code, inline style duplication
   
2. src/lib/components/FathersEntryCard.svelte (176 lines)
3. src/lib/components/FathersVerseList.svelte (256 lines)
4. src/lib/components/FathersReader.svelte (61 lines)
5. src/lib/components/FathersBar.svelte (223 lines)
6. src/routes/fathers/[book]/[chapter]/+page.ts — the load function

DECOMPOSITION PLAN for FathersCommentaryPanel.svelte:
After reviewing, produce a strict decomposition deliverable:
a) Proposed file tree after splitting FathersCommentaryPanel into focused components
b) For each new component: props interface (TypeScript types) and events it dispatches
c) Line-by-line extraction map: which line ranges from the current file move to which new file

LIGHT REVIEW — check for regressions from recent changes:
- src/routes/about/ subtree (recently split into sub-pages)
- src/lib/components/ChapterView.svelte (371 lines)

OUTPUT FORMAT — structured findings:
For each finding, report:
- FINDING: one-line summary
- SEVERITY: P0 / P1 / P2
- FILE: exact file path and line numbers
- EVIDENCE: what you observed (quote the problematic code)
- FIX: suggested approach

Then the DECOMPOSITION PLAN section with the file tree, interfaces, and extraction map.

End with a SUMMARY: top 3 issues by impact.
```

- [ ] **Step 2: Verify agent started successfully**

---

### Task 3: Launch Agent 3 — Architecture: Data Loading + Build Errors

**Agent type:** `code-review-ai:architect-review`
**Model:** Opus

- [ ] **Step 1: Launch agent with this prompt**

```
You are auditing the data architecture and build health of a SvelteKit Bible app.

PROJECT CONTEXT:
- SvelteKit 2 + Svelte 5 (Svelte 4 compat) on Cloudflare Pages + Workers
- All Bible text + fathers commentary stored as static JSON in static/data/
- 8,472 total JSON files, 1,166 in static/data/fathers/
- Largest fathers JSON: john/1.json at 386KB, romans/1.json at 232KB
- Build output shows ~200 lines of 301 redirects and 404 errors

REVIEW THESE FILES:

1. src/lib/data/loader.ts (11KB) — data loading + caching
   - Check caching strategy, fetch patterns, error handling
   - Is the fathers chapter cache (fathersChapterCache) effective?
   
2. static/data/fathers/ — JSON payload structure
   - Read a large file (e.g. john/1.json) and a small one
   - What data could be stripped or deferred? (e.g. footnotes, full body text)
   - Could entries be paginated or lazy-loaded?

3. Client-side bundle concerns:
   - src/lib/data/paragraphs.ts (28KB) — is this fully bundled client-side?
   - src/lib/data/books.ts (14KB) — same question
   - src/lib/data/reference.ts — same question
   - Check if these are tree-shaken or fully included

4. BUILD 404s — root cause analysis:
   - Read static/data/fathers/manifest.json
   - Cross-reference with actual files in static/data/fathers/
   - Which manifest entries have no corresponding JSON file?
   - Is the manifest generated or hand-maintained? Find its source.
   - Are these extraction pipeline gaps (data not yet extracted) or manifest bugs (listing chapters that shouldn't be there)?

5. BUILD 301s — root cause analysis:
   - The pattern is /reference/ot/... redirecting to /reference/odr/ot/...
   - Check src/routes/reference/ for redirect logic
   - Find where the old-format URLs are being generated (internal links, prerender entries)
   - Is there a redirect handler, or is SvelteKit generating these from route matching?

OUTPUT FORMAT — structured findings:
For each finding:
- FINDING: one-line summary
- SEVERITY: P0 / P1 / P2
- FILE: exact path and line numbers
- EVIDENCE: data (file sizes, counts, code quotes)
- FIX: concrete approach

Sections: DATA LOADING, JSON PAYLOADS, BUNDLE SIZE, BUILD 404s, BUILD 301s, SUMMARY.
```

- [ ] **Step 2: Verify agent started successfully**

---

### Task 4: Launch Agent 4 — Study Mode + Linkify

**Agent type:** `code-refactoring:code-reviewer`
**Model:** Sonnet

- [ ] **Step 1: Launch agent with this prompt**

```
You are reviewing the study mode and linkify features of a SvelteKit Bible app for performance issues and code quality.

PROJECT CONTEXT:
- SvelteKit 2 + Svelte 5 (Svelte 4 compat mode — uses `export let`, `$:`, `on:click`, writable stores)
- Do NOT suggest migrating to Svelte 5 runes — deliberately deferred
- The linkify feature was recently added: it converts Bible verse references in text to clickable links with hover tooltips
- The feature has "ballooned" per the maintainer — it may be doing too much work

REVIEW THESE FILES:

1. src/lib/components/ChapterView.svelte (371 lines)
   - Focus on the linkify pipeline: how are verse references detected and converted to links?
   - Is this running on every render, or computed once per chapter load?
   - Is the output memoized per verse?
   - Check DOM manipulation patterns — innerHTML vs Svelte reactivity

2. src/lib/stores/studyPanel.ts (59 lines)
   - Store design, subscription patterns

3. src/lib/utils/fathers-display.ts (42 lines)
   - Utility functions for verse ref display

4. src/lib/components/VerseTooltip.svelte (356 lines)
   - How is the tooltip positioned and rendered?
   - Does it fetch verse text on hover? If so, is that cached?
   - Is the tooltip destroyed/recreated on every hover, or reused?

5. src/lib/search/reference.ts or similar — the parseOsis / reference parsing utilities
   - Regex complexity — are patterns compiled once or on every call?
   - What happens with a chapter that has many references (e.g. a patristic commentary entry citing 20+ verses)?

PERFORMANCE CONCERNS TO INVESTIGATE:
- What is the regex cost of scanning a large chapter for verse references? Test mentally with Psalms 119 (176 verses, potentially many cross-references)
- Are there O(n*m) patterns where n=verses and m=references?
- Is any work being duplicated between the linkify pipeline and the tooltip system?
- Does the study panel reactivity trigger unnecessary re-renders of ChapterView?

OUTPUT FORMAT — structured findings:
For each finding:
- FINDING: one-line summary
- SEVERITY: P0 / P1 / P2
- FILE: exact path and line numbers
- EVIDENCE: code quotes showing the issue
- FIX: concrete approach (one sentence)

End with SUMMARY: is linkify a real performance problem or just messy code? What's the single most impactful fix?
```

- [ ] **Step 2: Verify agent started successfully**

---

## Phase 2: Consolidation

### Task 5: Collect and merge agent findings

- [ ] **Step 1: Wait for all four agents to complete**
- [ ] **Step 2: Read each agent's output and extract findings into a single list**
- [ ] **Step 3: Deduplicate — where two agents found the same issue, keep the one with better evidence**
- [ ] **Step 4: Assign final priority tiers based on measured evidence:**
  - P0: measured slowness with numbers (e.g. "LCP 4.2s on throttled 3G") or broken functionality
  - P1: clear code quality issue with bounded fix (e.g. "531-line component needs split")
  - P2: architectural concern needing design work
- [ ] **Step 5: Write consolidated findings report**

Save to: `docs/superpowers/specs/2026-04-24-tech-debt-audit-findings.md`

Format:
```markdown
# Tech Debt & Performance Audit — Findings

## P0 — Fix Now
| # | Finding | File | Evidence | Fix |
|---|---------|------|----------|-----|

## P1 — Fix This Session  
| # | Finding | File | Evidence | Fix |

## P2 — Plan for Later
| # | Finding | File | Evidence | Fix |
```

- [ ] **Step 6: Present findings to user for review before implementing**

---

## Phase 3: Implementation

### Task 6: Implement P0 fixes

- [ ] **Step 1: For each P0 finding, determine if fixes are independent or dependent**
- [ ] **Step 2: Launch parallel agents for independent P0 fixes**
  - Each agent gets: the specific finding, the file(s) to modify, the fix approach, and verification commands
  - Each agent must run `npm run check` and `npm run lint` after changes
- [ ] **Step 3: Review each agent's changes**
- [ ] **Step 4: Run `npm run check` && `npm run lint` on the combined changes**
- [ ] **Step 5: Commit P0 fixes**

```bash
git add <specific files>
git commit -m "perf: fix P0 issues from tech debt audit

<list each P0 fix in commit body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Implement P1 fixes

- [ ] **Step 1: For each P1 finding, determine independence**
- [ ] **Step 2: Launch parallel agents for independent P1 fixes**
  - FathersCommentaryPanel decomposition follows the decomposition plan from Agent 2
  - `code-simplifier` skill runs on each new component after extraction
- [ ] **Step 3: Review each agent's changes**
- [ ] **Step 4: Run `npm run check` && `npm run lint`**
- [ ] **Step 5: Commit P1 fixes**

```bash
git add <specific files>
git commit -m "refactor: fix P1 issues from tech debt audit

<list each P1 fix in commit body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Document P2 items

- [ ] **Step 1: Write P2 items into a follow-up plan**

Save to: `docs/superpowers/plans/2026-04-24-tech-debt-p2-followup.md`

- [ ] **Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: add P2 tech debt follow-up plan

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full check suite**

```bash
npm run check && npm run lint && npm run test
```

- [ ] **Step 2: Start dev server and manually verify fathers page loads**

```bash
npm run dev
# Navigate to /fathers/john/1 — verify it loads and filters work
# Navigate to /odr/john/1 — verify no regressions
# Navigate to / — verify homepage is intact
```

- [ ] **Step 3: If Agent 1 provided baseline metrics, re-measure to confirm improvement**
