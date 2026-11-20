# Wikisource 1582 Rhemes NT pipeline — refactor design

Date: 2026-11-20 · Scope: `scripts/wikisource/`, `wikisource/1582-rhemes-nt/`, `static/data/odr{,-original}/`, `A16049.xml` (repo `original-douay-rheims-nt`), and the docs that govern them.

## 1. Intent

The pipeline reproduces the 1582 Rhemes New Testament facsimile on en.wikisource as faithfully as possible. It grew one script at a time, much of it written by weaker LLMs, and the main cost now is the disorder itself: rules contradict each other, several tools parse the same sources in different ways, fixes are baked into book-specific scripts, and the committed pages have drifted from what the generator produces.

The refactor makes the pipeline one coherent toolchain, built so that losing print features by accident (the long-s wipe being the known case) becomes hard.

**Governing principle: the print wins.** Every rule, tool and check serves faithful reproduction of the facsimile: long-s, u/v, vv/w, macrons and titlos, ligatures, roman/italic, small caps, layout. The one exception the owner has made is keeping real misprint corrections in citations (PLAYBOOK).

## 2. Goals, non-goals, anti-goals

**Goals**
- One source of truth per fact: data plus the generator produce the pages; pages are never hand-swept.
- A fidelity guard that refuses any page post or data write that reduces print features, unless the loss is named and justified.
- Golden tests: regenerating a book reproduces its committed pages byte for byte.
- One shared core for loading and comparing the XML, odr-original, odr, OCR and wiki text.
- Data fixes as reviewable records (a fixes ledger) applied by one tool, instead of `backfill_<book>_xml.py` and `fix_*N.py` scripts.
- One authoritative rules document, one workflow document, and a short AGENTS.md, with every wrong rule removed (e.g. "† after verse numbers").
- Running the next book is a short, repeatable sequence that a low-budget agent can follow cheaply.

**Non-goals**
- Changing the editorial policy itself (the rules are consolidated, not redesigned).
- The SvelteKit web app, the OT repo's content work, and `divinum-officium-*`.
- A new OCR or alignment algorithm; `generate.py`'s alignment logic moves but is not rethought.
- Proofreading content. Text changes made during the refactor are limited to resolving the drift (§4.1).

**Anti-goals (failure even if it "works")**
- Any modernisation or normalisation of print forms: ſ→s, vv→w, stripping macrons or ligatures, collapsing italics or small caps.
- A big-bang rewrite that leaves the pipeline unusable for weeks.
- A page-level "sweep" script that edits `pages/*.wiki` or live pages directly.
- Overwriting human edits on Wikisource without review.
- Trusting EEBO-TCP over the print.

## 3. Current state (recon, 2026-11-20)

- 38 Python scripts in `scripts/wikisource/`, no tests. Roughly:
  - **Core:** `generate.py` (52 KB; book config as dicts at the top), `lint.py`, `wikipost.py`, `wikifetch.py`, `check_live_edits.py`, `check_live_linter.py`, `publish.py`, `jsonfmt.py`, `ocrpages.py`, `transkribus.py`, `ornaments.py`, `cropsheet.py`, `paste_helper.py`.
  - **Comparison (each has its own parsing and folding):** `triage.py`, `xml_json_diff.py`, `ocrdiff.py`, `audit_all_front.py`, `audit_all_267.py`.
  - **Data fixers:** `autofix.py`, `apply_wvv.py`, `apply_wordfixes.py`, `longs.py`, `backfill_{front,matthew,mark,luke,john}_xml.py` (one function each, with fixes written into the code), `build_matthew_replacements.py`, `fix_john_argument{,2,3}.py`, `fix_microfilm_duplicates.py`.
  - **Page and live sweeps (violate "fix the data, never the pages"):** `apply_longs_pages.py`, `fix_live.py`, `remove_verse_daggers.py`.
  - **Other:** `update_ot_index.py` (OT Index pages).
- `manifest.json`: 451 pages, all `posted`, each with `sha1` and `revid` only.
- **Drift:** regenerating Mark (pages 114-160) gives 9 identical pages and 38 that differ. Word-level differences:
  - 79 ſs-vs-ſſ: the data and generator give `Pa{{ls}}{{ls}}ion`, the committed pages `Pa{{ls}}sion`.
  - 23 other long-s placement differences.
  - About 40 structural differences:
    - The generator emits ornament images (`[[File:…headpiece]]`, `{{dropinitial|…|image=…}}`); the committed pages don't have them.
    - The committed pages have `{{sc|…}}` and a `fl={{verse…}}` drop-initial form that the generator doesn't produce.
    - `{{hws|…|title=}}` differs.
    - Some running-head numbers differ.
- Docs:
  - Wikisource folder: `AGENTS.md` (contains the wrong dagger rule), `CLAUDE.md` (web app), `wikisource/1582-rhemes-nt/{RULES,PLAYBOOK,BOOKS,README,paste-sheet,scriptorium-request}.md`.
  - TEI encoding rules: `original-douay-rheims-nt/RULES.md`.
  - About 25 files in `docs/audits/`.
  - The umbrella `README.md` in the critical workspace.
  - `BOOKS.md` says "Nothing is posted yet" while the table says posted.
- Constraints already in force (keep them):
  - Scripts run with `python3 -I`; the isolated Python has PIL but no numpy.
  - Text is always NFC.
  - Data JSON is written only through `jsonfmt.write_like()`.
  - The `.git/odr-data.lock` mkdir lock is held around data writes.
  - Nothing is posted without the owner's approval.
  - Posts wait at least 12 s apart and run a `last_author` check.

## 4. Design

### 4.1 Reconcile pages with the generator (first, after the safety net)

The live pages are the current published truth, and the generator is the intended source. For every generated book, classify each difference between a fresh generation and the committed page, then settle each class once, in data or generator code:

| Class | Settled by |
|---|---|
| Page-only change that is right per print (sweep results such as `{{sc}}`, dagger removal, `title=`) | Port into data or generator; the page stays as is |
| Generator-only change that is right and wanted | Keep in the generator; the page changes locally and waits (no reposts during the refactor) |
| Ornament images (`image=`, headpiece/tailpiece files) | Behind a `books.json` / CLI flag `ornaments`, **off by default**, until the owner has reviewed or uploaded them |
| Conflicting print reading (ſs vs ſſ, other letter shapes) | Evidence ladder (below); the answer goes into odr-original |
| Wrong on both sides | Fix the data |

**Evidence ladder for letter-shape conflicts (cheapest first; stop at the first rung that settles it):**
1. `A16049.xml` keeps literal ſ (e.g. `Paſsion` ×48, `Paſſion` ×52). Where an OCR reading shows the shape (`f` for ſ: `Pafsion`/`Paffion`, about 1 in 6 cases in Transkribus, which mostly outputs plain `s`) and agrees with the XML, take it.
2. The XML alone, when no OCR shows the shape (EEBO's known faults are dropped lines and contractions, not ſ placement); it goes to rung 3 if it contradicts the committed page.
3. Tesseract OCR as a tie-breaker, together with the word's form elsewhere on the same page or in the same book.
4. Scan crops are a **last resort**. They're batched into one collage per round, used only for words still unsettled after rungs 1-3, and the count is reported before any image is read.

The detector reports how many words each rung settled, so the cost stays visible.

Exit: for every book marked `generated`, `generate.py` output equals the committed pages, and a golden test enforces it. Front matter 1-30 was produced by an agent (Gemini), so it is reconciled like the other books. If it becomes a major sticking point it is deferred, not hand-maintained, and the cost is reported rather than pursued. Pages that can't be generated yet are marked `"source": "frozen"` in the manifest. They are only edited by hand, still under the fidelity guard.

### 4.2 Fidelity guard

A module `fidelity.py` counts print features per page and per data unit:
- long-s (`{{ls}}` / `ſ`)
- each macron or titlo letter (ā ē ī ō ū ñ, combining forms)
- æ, œ, &c.
- vv and w separately
- u/v and i/j at word start
- italic spans, `{{sc}}`, `{{sup|‖}}`, margin notes, verse markers
- non-NFC text (must be zero)

It is enforced in three places:
- **`lint`:** compares each page against its git `HEAD` version and fails on any decrease.
- **`post`:** compares against the live revision (fetched) and refuses on any decrease.
- **Fix applier:** refuses an edit whose old→new pair reduces a feature.

Override: `--allow-loss FEATURE:page --reason "…"`, which is recorded in the commit message or the ledger. A decrease that comes with an equal increase in a sibling feature (e.g. ſſ→ſs) is still reported, as a *shift*, and needs the same override. That is how the ſs/ſſ work stays deliberate.

### 4.3 Shared core and one CLI

A package `scripts/wikisource/rhemes/` holds:
- `sources.py`: loaders for `A16049.xml` (verses, notes, page breaks), odr-original and odr (books, annotations), Transkribus and Tesseract OCR (`ocrpages`/`transkribus` folded in), committed pages, live pages and the manifest.
- `text.py`: NFC, tokenising, one folding function family (fold ſ, vv/w, u/v, macrons), and wiki ↔ plain conversion (`{{ls}}` ↔ ſ).
- `fidelity.py` (§4.2) and `fixes.py` (§4.4).
- `config.py`: per-book settings now in dicts at the top of `generate.py` (`OCR_SOURCE`, `TITLE_END`, `ARGUMENT`, `RUNNING`, …), moved to one `books.json`, so starting a book is data, not code.
- `lock.py`: the odr-data lock as a context manager.

One entry point, `python3 -I scripts/wikisource/rh.py <command>`:
- `triage`, `diff xml|ocr`, `fix apply|check`, `sync-odr`, `backfill-xml`
- `generate`, `lint`, `fetch`, `live-check`, `post`, `status`
- The existing tools become modules behind these commands.
- Old script names stay for one release as thin shims that print the new command, then they are removed.

`triage`, `xml_json_diff` and `ocrdiff` keep their outputs: the token-cheap report shape of `triage.py` is a requirement, not an accident.

### 4.4 Fixes ledger

The record format is `wikisource/1582-rhemes-nt/fixes/<book>.jsonl`, one JSON object per line:

```json
{"id":"luke-13-33-a","target":["odr-original","odr","xml"],"loc":"luke 13:33","old":"…","new":"…","odr_new":"…","evidence":"scan pdf228 crop","date":"2026-11-19","note":"EEBO dropped line"}
```

- `target`: which stores the fix applies to. Spelling-only fixes target `odr-original` (and the xml) only; content fixes also carry `odr_new` in modern spelling (PLAYBOOK rule).
- `rh fix apply <book>` is a dry run by default:
  - `old` must occur exactly once in scope.
  - It is idempotent: when `new` is already present and `old` absent, the entry counts as applied.
  - It runs the fidelity check, holds the lock, and writes through `write_like()`.
  - It edits `A16049.xml` text nodes without reserialising the document, so the file's formatting is preserved byte for byte outside the edited span.
- The existing backfill and one-off scripts are converted into ledger entries. Proof of correctness: applying the full ledger to current data is a no-op, and applying it to the pre-backfill git versions of the data reproduces the current data.
- `rh sync-odr <book>` replaces PLAYBOOK step 6 by hand: it lists content differences between odr and odr-original. It proposes ledger entries and does not write.

### 4.5 Docs

- **Rules (authoritative):** `wikisource/1582-rhemes-nt/RULES.md`, rewritten:
  - Editorial and transcription rules, with "the print wins" first.
  - Each rule names the lint code or fidelity feature that enforces it.
  - The NT repo's `RULES.md` keeps only TEI encoding specifics and links here for orthography.
- **Workflow:** `wikisource/1582-rhemes-nt/PLAYBOOK.md`, rewritten around `rh` commands: one book = check → fix ledger → apply → generate → lint/test → approve → post → record.
- **AGENTS.md:** short, pointing to RULES and PLAYBOOK, plus the hard rules: never edit pages directly, never reduce fidelity without `--allow-loss`, never post without approval, run tests. The wrong dagger rule is removed in phase 0.
- **Status:** `BOOKS.md` keeps a short status table generated by `rh status` from the manifest, and moves the audit narrative to `docs/audits/`.
- **Other:**
  - The umbrella `README.md` in the critical workspace is updated to the new layout.
  - `paste-sheet.md`, `paste_helper.py` and `scriptorium-request.md` are archived if no longer used (owner confirms).
  - `docs/audits/*.md` stay as history and are not rewritten.

### 4.6 Tests

`pytest` in `scripts/wikisource/tests/`, stdlib plus pytest only, no network:
- golden regeneration per book (marked slow)
- fidelity counting and shift detection
- the fix applier (uniqueness, idempotence, refusal on loss)
- lint codes against small fixture pages
- folding and tokenising
- wikipost decision logic, with the API mocked

Before each commit: `pytest scripts/wikisource/tests`, `lint`, and the existing `npx vitest run` / `npm run check` / prettier checks.

## 5. Phases (each leaves the pipeline usable)

| # | Phase | Exit criterion |
|---|---|---|
| 0 | Safety net: `fidelity.py`, guard in `lint` and `wikipost`, pytest scaffold, fix the AGENTS.md dagger rule; fetch all live pages (read-only) and confirm they equal the committed pages (record any exceptions) | Guard blocks a synthetic long-s loss; live == committed or exceptions listed |
| 1 | Reconcile (§4.1), book by book, with collages for ſs/ſſ | Golden tests pass for all generated books; frozen pages marked |
| 2 | Docs rewrite (§4.5) | One rules doc, one playbook, short AGENTS.md; no contradictions |
| 3 | Shared core plus `rh` CLI; migrate the comparison tools and the generator config | Golden tests still pass; triage/diff output equivalent on all books |
| 4 | Fixes ledger; convert backfills and one-offs; `sync-odr` | Ledger replays as a no-op on current data and reproduces it from pre-backfill versions |
| 5 | Remove the one-off scripts and page sweeps (git history keeps them; `docs/archive/scripts.md` lists each with its last commit) | `scripts/wikisource/` holds only the package, `rh.py`, shims and tests |

Posting during the refactor: **none** (owner, 2026-11-20). A page whose content changes during reconciliation is committed locally, and its manifest entry gets `status: "changed"` (sha1 differs from the posted revision) so it is visibly pending. Re-posting is a separate decision after the refactor, under the guard, with per-book word-diff summaries.

## 6. Approaches considered

- **A. Gradual cleanup around a shared core (chosen).** The safety net comes first, and every phase is behaviour-preserving or explicitly reconciled. It is the least risky option for fidelity, and it can be resumed at any phase.
- **B. Rebuild as staged steps** (ingest → compare → fix list → apply → generate → lint → post, with files on disk). Cleaner in the end, but it is a rewrite, and a rewrite is where print features were lost before.
- **C. Tidy only** (archive, docs, guards). Cheap, but it leaves the duplicated parsing, the code-embedded fixes and the drift in place.

The owner chose A on 2026-11-20 and left the order of work to Claude.

## 7. Decided by the owner

- Fidelity to the facsimile is the governing goal; the long-s wipe must not be repeatable.
- All `.md` files may be rewritten and optimised; AGENTS.md has a wrong rule (added by Gemini).
- Approach A; nothing is urgent; Claude picks the order.
- Scanning is a last resort (token cost); settle readings from the OCR and the XML first.
- Front matter should be generated too, not hand-maintained; defer it if it is a major sticking point.
- Ornament images: not yet. Generator output for them stays switched off until the owner reviews or uploads them.
- No reposts to Wikisource during the refactor; everything is reconciled locally.

## 8. Calls made by Claude (open to correction)

- Committed pages are treated as live truth until phase 0 confirms they equal the live pages.
- The fidelity guard is strict by default, with a named override rather than warnings.
- One CLI, `rh.py`, with temporary shims for the old script names.
- The ledger format is JSONL per book, under `wikisource/1582-rhemes-nt/fixes/`.
- Per-book generator config moves to `books.json`.
- One-off scripts are deleted, not kept in an archive folder, with an index doc kept.
- Tests use pytest, stdlib only.

- **Live edits by others** (answered by RULES §10): when a live page differs from the committed one because someone else edited it, the edit is checked against the scan. A valid edit goes into the data as a ledger entry with `evidence: "wikisource rev N by <user>"`; an invalid one is reported to the owner and never reverted silently. `post` keeps each page's existing `pagequality` level and never lowers it.
- **ſs vs ſſ and other letter-shape conflicts** (owner, 2026-11-20): settled by the evidence ladder in §4.1. Scanning is the last resort, because it costs the most tokens.
- **Matthew and front matter:** both are reconciled to the generator. Front matter (pp. 1-30) may be deferred if it costs too much (owner, 2026-11-20); deferred pages are marked `frozen` and listed.
- **Rule-based fixers** (`autofix`, `apply_wvv`, `longs`, `apply_wordfixes`): these become *detectors* that propose ledger entries instead of writing. The replay check in phase 4 applies to the ledger only. Past bulk passes are recorded as one baseline: the data at the commit before the ledger begins counts as the starting point, and only the book backfills and one-offs since then are converted into entries.
- **Generator config:** plain per-book values go to `books.json`. Per-page and per-verse patches that are code-shaped (`SIDE_SC` lambdas, `PAGE_STARTS`, `CATCHWORDS`, `SPLIT_WORDS`, `BARS`, `PAREN_TITLES`) go to `rhemes/overrides.py`, keyed by book. "Starting a book is data" means `books.json` plus overrides only where the print needs them.
- **Guard during reconciliation:** `--allow-loss` and `--allow-shift` may be given per book with one reason, e.g. `--allow-shift ls:mark --reason "ſs/ſſ per scan collage 2026-11-21"`. The reason goes into the commit message.

## 9. Left to the builder

- Internal module boundaries in `generate.py` while it is moved behind `rh generate`.
- The exact fidelity feature list beyond §4.2, as long as every RULES.md orthography rule maps to a feature or lint code.
- How `A16049.xml` text-node edits are located (anchor by verse milestone vs XPath), as long as the bytes outside the edit are unchanged.
- The fixture selection for tests.
