# Wikisource Phase 2 (docs rewrite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the contradictory Wikisource docs with one rules doc (`RULES.md`), one playbook (`PLAYBOOK.md`), a short `AGENTS.md` and a status-only `BOOKS.md`, and keep them consistent with the code through a test.

**Architecture:** Docs only, plus one pytest module (`test_docs.py`) that checks, both ways, that every lint code and fidelity feature maps to a rule in `RULES.md` and that every rule names its enforcer. The audit narrative in `BOOKS.md` moves unchanged to `docs/audits/`. No data, page, manifest or script changes, and nothing is posted.

**Tech Stack:** Markdown, pytest (stdlib only), prettier (run from the main checkout, read-only).

**Spec:** `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md` (§4.5, §4.7, §5 Phase 2). Handoff: `docs/superpowers/handoffs/2026-11-21-wikisource-phase2.md`. Phase 1 record: `docs/audits/2026-11-21-phase1-reconcile.md`.

## Global Constraints

- Branch `wikisource-refactor-phase0` in worktree `douayrheimsbible-ws-phase0`. Don't merge, push, or write in the main checkout `../douayrheimsbible`.
- Post nothing to Wikisource. Phase 2 changes docs only.
- Scripts run as `python3 -I`. Text is NFC.
- `docs/audits/*.md` are history: add files there, don't rewrite existing ones.
- Document only commands that exist today (`generate.py`, `reconcile.py`, `lint.py`, `wikipost.py`, `wikifetch.py`, `check_live_edits.py`, `triage.py`, `ocrdiff.py`, `transkribus.py`). Phase 3 introduces `rh`; don't name `rh` commands as usable.
- The owner decisions in the handoff are settled; the plan restates them and doesn't reopen them.
- Before each commit: `python3 -m pytest -q scripts/wikisource/tests` (fast), and `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (0 errors), and `cd ../douayrheimsbible && npx prettier --check <absolute paths of changed .md files>`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **A lint code or fidelity feature added in Phase 3+ without a rule.** `test_docs.py` must fail. Test: `test_every_lint_code_has_a_rule`, `test_every_fidelity_feature_has_a_rule` (Task 1).
- **A rule that cites a code that no longer exists, or a § that isn't there.** Test: `test_index_names_only_real_codes`, `test_index_sections_exist` (Task 1).
- **A rule with no enforcer.** Every `###` rule in RULES.md needs an `Enforced by:` line, and "review" counts only when written out as `review (no code)`. Test: `test_every_rule_names_its_enforcer` (Task 1).
- **A retired rule creeping back in** (the "† verse start" mark, "bot approval", `changed_since_post`, ſs only "where the scan shows it"). Test: `test_retired_rules_absent` over all the rewritten docs (Task 1).
- **AGENTS.md growing back into a second rules doc.** Test: `test_agents_md_is_short` (the Wikisource section is at most 40 lines and links RULES.md and PLAYBOOK.md) (Task 1).

---

## Contradictions found in the old docs (and the version kept)

| # | Where | Contradiction | Kept |
|---|---|---|---|
| 1 | README "Conventions" | "Printed marks stay in the text: `†` verse start" | No † after `{{verse}}` (owner; `W-mark`). Every other † stays (`dagger` feature) |
| 2 | RULES §1 | `title=` "only when the word contains markup" | Every `{{hws}}`/`{{hwe}}` has a plain-text `title=` (`E-hw-title`) |
| 3 | RULES §3.2 | "Abbreviations end in long-s" with no exception | It still holds, except that long s inside `{{sc}}` is set as round s (owner, Phase 1) |
| 4 | RULES §2.3 | Drop-cap examples `{{sc\|He booke}}` and `{{dropinitial\|T}}H{{sc\|e}}` | The generator's form: `{{dropinitial\|T\|fl={{verse\|chapter=1\|verse=1}}}}{{sc\|He}} booke` |
| 5 | PLAYBOOK step 0 | "SIG_FIRST (signatures continue the gatherings…)" | Printer's signatures are omitted (owner; `W-signature`) |
| 6 | PLAYBOOK step 4 | ſs vs ſſ: "data writes ſſ and keeps ſs only where the scan shows it" | The evidence ladder (XML → OCR → book majority → scans last); the XML settles stem-rule ſs (owner 2026-11-21) |
| 7 | PLAYBOOK sources; `ladder.py` docstring | Transkribus "prints ſ as f now and then", so it votes on s/ſ | Transkribus doesn't vote on s vs ſ (Phase 1 ladder correction 1); Tesseract still does. The `ladder.py` docstring is code, so it's noted for Phase 3 |
| 8 | PLAYBOOK ground rules; `scriptorium-request.md` | "bot approval needed", separate bot account | The owner posts from their own account at 12 s spacing, only after approving (spec §4.7) |
| 9 | README; `publish.py` docstring | `changed_since_post` flag; `generated → reviewed → posted` | `manifest.json` `status` is `posted` or `changed` (`reconcile.py status`); `source: frozen` marks hand-kept pages. `publish.py` isn't in the new workflow (Phase 5 removes it) |
| 10 | PLAYBOOK "Publish and commit" | `generate.py` to a scratch dir, then `publish.py` | `reconcile.py write <book>` (it never touches frozen pages) |
| 11 | BOOKS.md | "Nothing is posted yet", but the table says posted; no Acts or Romans rows | The manifest: all 451 pages posted 2026-11-21 |
| 12 | RULES §10 | `--adopt-others` "if our audit encompasses them" | Review the other editor's change against the scan, put a valid change into the data, and only then pass `--adopt-others`. Never revert a human edit |
| 13 | PLAYBOOK / README | "Never hand-edit a page" with no exception | Generated pages: never. Frozen pages (1–30, 309–313, 402–404) are edited by hand only, still under lint's `E-loss`/`E-shift` |
| 14 | PLAYBOOK ground rules; spec §1 | The print wins "except real misprint corrections in citations (Matt 11:25 `Mt. 18,1.` stays 18, 3)" | odr-original and the pages keep the print's misprints, and only odr gets fixes (owner, permanent). **Question 3** below asks whether the Matt 11:25 citation exception still stands |
| 15 | RULES §10 | "lint `<pages_dir>`" with no fidelity step | Lint compares against git HEAD, and wikipost against the live revision. Losses need `--allow-loss`/`--allow-shift FEATURE:SCOPE --reason` |

## Questions for the owner (asked once, in this review)

**Answered 2026-11-21:** Q1 yes (Task 6 runs). Q2 later (Task 7 is skipped). Q3: odr-original and the pages keep the print's misprints, and odr gets the corrections; there is no citation exception.

1. **Archive `paste-sheet.md`, `paste-state.json`, `paste_helper.py` and `scriptorium-request.md`?** Nothing references them except each other and the spec. The last change to any of them was 2026-11-18, and wikipost has done the posting since. If yes, Task 6 moves the two `.md` files into `docs/archive/wikisource/`, deletes `paste-state.json` and `paste_helper.py` (git history keeps them), and lists each one with its last commit in `docs/archive/wikisource/README.md`. If no, they stay and get a one-line "not part of the workflow" header.
2. **The other repos.** Spec §4.5 also slims `original-douay-rheims-nt/RULES.md` to TEI specifics with a link here, and updates the umbrella `README.md` in `original-douay-rheims-1st-edition-critical/` (not a git repo). Both are outside this worktree. Do Task 7 (commit in the NT repo, no push; edit the umbrella README in place), or leave both for later?
3. **The Matt 11:25 citation** (contradiction 14): keep the PLAYBOOK's exception (corrected citations stay corrected in the pages), or does the permanent "keep the misprint" rule cover citations too? The plan writes whatever you answer. Until then, RULES records the rule without the exception, plus an open item.

---

## File map

- Create: `scripts/wikisource/tests/test_docs.py` (consistency test)
- Rewrite: `wikisource/1582-rhemes-nt/RULES.md` (single authority)
- Rewrite: `wikisource/1582-rhemes-nt/PLAYBOOK.md` (workflow as it is now)
- Rewrite: `wikisource/1582-rhemes-nt/README.md` (orientation, about 20 lines: what the folder is, links)
- Rewrite: `wikisource/1582-rhemes-nt/BOOKS.md` (status table)
- Create: `docs/audits/2026-11-17-books-log.md` (BOOKS.md's per-book narrative, moved verbatim)
- Modify: `AGENTS.md` §1 only (the web-app §2 is unchanged)
- Conditional (Q1): `docs/archive/wikisource/{README.md,paste-sheet.md,scriptorium-request.md}`; delete `scripts/wikisource/paste_helper.py` and `wikisource/1582-rhemes-nt/paste-state.json`
- Conditional (Q2): `~/Documents/Bible-n-stuff/original-douay-rheims-nt/RULES.md`, `~/Documents/Bible-n-stuff/original-douay-rheims-1st-edition-critical/README.md`

---

### Task 1: Docs consistency test

**Files:**
- Create: `scripts/wikisource/tests/test_docs.py`

**Interfaces:**
- Produces: the RULES.md format that Task 2 must satisfy:
  - Rules are `### N.M Title` headings under `## N. …` sections. Each has a line that begins `Enforced by:`, followed by backticked lint codes (`E-…`/`W-…`), backticked fidelity features (`` `ls` ``) and/or plain enforcers (`generator`, `golden tests`, `wikipost`, `reconcile verify`, `books.json`, `review (no code)`).
  - A final section `## Enforcement index`, with a table whose rows look like `` | `E-ital` | lint | §4.1 | `` or `` | `ls` | feature | §3.1 | ``.
- Consumes: `lint.__doc__` (the code lines `^\s+([EW]-[a-z-]+)\s`), `fidelity.FEATURES` (dict keys).

- [ ] **Step 1: Write the tests**

```python
WS = REPO / 'wikisource/1582-rhemes-nt'
DOCS = [WS / 'RULES.md', WS / 'PLAYBOOK.md', WS / 'README.md', WS / 'BOOKS.md', REPO / 'AGENTS.md']

def lint_codes(): return set(re.findall(r'^\s+([EW]-[a-z-]+)\s', lint.__doc__, re.M))
def index_rows(): # {(name, kind): section} from the Enforcement index table
def rule_blocks(): # {'§4.1': text of that ### block}

def test_every_lint_code_has_a_rule():      assert lint_codes() <= {n for n, k in index_rows() if k == 'lint'}
def test_every_fidelity_feature_has_a_rule(): assert set(fidelity.FEATURES) <= {n for n, k in index_rows() if k == 'feature'}
def test_index_names_only_real_codes():     # index lint names ⊆ lint_codes(); index feature names ⊆ FEATURES
def test_index_sections_exist():            # every § in the index is a key of rule_blocks()
def test_index_matches_enforced_by():       # each (name, §) row: name appears in that block's Enforced by line; and every backticked code/feature in an Enforced by line has a row
def test_every_rule_names_its_enforcer():   # every rule block has exactly one line starting 'Enforced by:' with ≥1 enforcer
def test_retired_rules_absent():
    retired = ['† verse start', 'bot approval', 'changed_since_post', 'only where the scan shows it', 'SIG_FIRST']
    for doc in DOCS: assert not [r for r in retired if r in doc.read_text()], doc
def test_agents_md_is_short():              # AGENTS.md text between '## 1.' and '## 2.' ≤ 40 lines, contains 'RULES.md' and 'PLAYBOOK.md'
```

`REPO` is `Path(__file__).resolve().parents[3]`. Import `lint` and `fidelity` through the conftest path, as the other tests do.

- [ ] **Step 2: Run them and confirm they fail against the old docs**

Run: `python3 -m pytest -q scripts/wikisource/tests/test_docs.py`
Expected: FAIL. There's no Enforcement index yet, and the retired phrases are still present (`† verse start` in README).

- [ ] **Step 3: Commit the failing test under a module-level `pytestmark = pytest.mark.xfail(reason='Phase 2 docs pending', strict=False)`**

Non-strict, because a few checks already pass on empty input. This keeps the fast suite green between tasks; later steps pass `--runxfail` to see the real results, and Task 5 removes the marker. Commit message: `test(wikisource): docs consistency checks (xfail until Phase 2 docs land)`.

---

### Task 2: RULES.md, the single authority

**Files:**
- Rewrite: `wikisource/1582-rhemes-nt/RULES.md`

**Interfaces:**
- Consumes: the Task 1 format.
- Produces: the § numbers that PLAYBOOK and AGENTS link to (`RULES.md#…` anchors from the headings below).

Each rule is short: the rule, one example in wikitext, and the `Enforced by:` line. Keep the old docs' reasons where they still help (dark mode, `<ol>` padding, NFC and Greek oxia). Leave out tutorial prose. Outline, with the enforcer for each rule:

**1. The print wins**
- 1.1 Reproduce the 1582 facsimile: ſ, u/v, i/j, vv/w, macrons and titlos, ligatures, roman/italic, small caps, marks and layout. Never modernise. *Enforced by:* `E-loss` `E-shift` (lint vs HEAD), wikipost vs live, golden tests.
- 1.2 odr-original and the pages keep the print's misprints; only `odr` (modern) gets fixes. Content fixes go into both datasets, each in its own spelling, and spelling fixes into odr-original only. Don't add words the print lacks. *Enforced by:* review (no code). Add the open item from Q3.
- 1.3 Trust the print over EEBO-TCP: EEBO drops lines and misreads contractions. *Enforced by:* review (no code); see PLAYBOOK, evidence ladder.

**2. The owner's editorial removals (the only ones)**
- 2.1 No † after `{{verse}}`. *Enforced by:* `W-mark`.
- 2.2 No printer's signature marks. *Enforced by:* `W-signature`, generator.
- 2.3 Ornament images off for now (19 files missing on Commons). *Enforced by:* `books.json` `ornaments` (default false), generator.

**3. Orthography**
- 3.1 Long s: `{{ls}}` in pages (`{{ls}}{{ls}}` for ſſ, `{{ls}}s` for ſs), literal U+017F in data and XML. `s` is counted for information only. *Enforced by:* `ls`, `s`, `E-shift`.
- 3.2 Long s inside `{{sc}}` is round s. Abbreviations otherwise end in ſ (`P{{ls}}.`, `Chry{{ls}}.`). *Enforced by:* generator, golden tests.
- 3.3 u/v and i/j as printed. *Enforced by:* `v_initial`, `u_initial`, `j`.
- 3.4 vv and w as printed (the roman margin w is still w). *Enforced by:* `vv`, `w`.
- 3.5 Macrons and titlos are kept. *Enforced by:* `macron`.
- 3.6 Ligatures æ, œ, &c. *Enforced by:* `ae`, `oe`, `etc`.
- 3.7 NFC everywhere. *Enforced by:* `E-nfc`.
- 3.8 No double quotes in the body. *Enforced by:* `dquote`, `W-quote`.
- 3.9 Greek in `{{lang|grc|…}}`, with accents and breathings from the print. *Enforced by:* generator.

**4. Typography**
- 4.1 Roman/italic as printed. Each page parses alone, so an italic run is closed before the page break and reopened after it. No `''''`. *Enforced by:* `italic`, `E-ital`, `E-foot-ital`.
- 4.2 Margin notes never sit inside an open italic run, nor does any template with `''` inside. *Enforced by:* `E-tpl-italic`.
- 4.3 Bold balanced. *Enforced by:* `E-bold`.
- 4.4 Small caps: sacred names `{{sc|Iesvs}}`, display capitals, the word after a drop initial. *Enforced by:* `sc`.
- 4.5 Running heads in small caps: the middle title lowercase (`{{sc|the gospel}}`), the side words capitalized (`{{sc|Cha. VI.}}`, `{{sc|Holy}} weeke.`), Roman numerals kept as capitals. *Enforced by:* `W-rh-caps`, `W-header`.
- 4.6 Drop initials: `{{dropinitial|T|fl={{verse|chapter=1|verse=1}}}}{{sc|He}} booke`. *Enforced by:* `dropinitial`.
- 4.7 Type sizes as printed. *Enforced by:* `size`.
- 4.8 Print marks kept: `*`, `∷`, `‖` (as `{{sup|‖}}`), `⊣`, and † other than at verse starts. *Enforced by:* `star`, `quad`, `bar`, `sup_bar`, `tack`, `dagger`.

**5. Page structure and Wikisource conventions**
- 5.1 Page skeleton: `<noinclude><pagequality …/>{{rh|…}}</noinclude>` body `<noinclude>{{continues|…}}</noinclude>`, braces balanced, no generator sentinels. *Enforced by:* `E-tag`, `E-brace`, `E-sentinel`.
- 5.2 Honest page status: the generator emits level 1, level ≥ 3 needs a named proofreader, and wikipost keeps the live level. *Enforced by:* `E-status`, wikipost.
- 5.3 Margin notes: `{{MarginNote|margin=left|right|margin-width=65|text=…}}`. On recto (odd) pages the inner margin is left and the outer right; verso is the reverse. Citations go in the inner margin; glosses and lectionary notes in the outer. `{{br}}` for line breaks, and no space before the template when punctuation follows. *Enforced by:* `E-margin`, `margin_note`.
- 5.4 Verse markers `{{verse|chapter=|verse=}}` in print order, following the print's numbering. *Enforced by:* `verse`, `E-verse`.
- 5.5 The annotation mark `‖` never splits a word. *Enforced by:* `E-lemma-split`.
- 5.6 Every `{{hws}}`/`{{hwe}}` has a plain-text `title=`. *Enforced by:* `E-hw-title`.
- 5.7 The catchword goes in `{{continues|…}}`, never in a `{{rh}}` cell. *Enforced by:* `W-catchword`.
- 5.8 `{{nop}}` on its own line at a paragraph's foot when the next page opens a paragraph. *Enforced by:* `W-nop`.
- 5.9 No single line breaks inside a paragraph. *Enforced by:* `W-linebreak`.
- 5.10 Spacing: no double spaces, no space before `, . ; : ? ! )` or after `(`. *Enforced by:* `W-space`.
- 5.11 No `#`/`<ol>` lists; numbered items are paragraphs. *Enforced by:* generator.
- 5.12 Tables: no `background` in styles, no `!` headers; use the standard container. *Enforced by:* `E-darkmode`.
- 5.13 The page run is complete. *Enforced by:* `E-gap`.

**6. Sources and data**
- 6.1 Pages are generated from `static/data/odr-original`. Never edit a generated page. Frozen pages (`manifest.json` `source: frozen`: 1–30, 309–313, 402–404) are edited by hand only. *Enforced by:* golden tests, `E-loss`, `E-shift`.
- 6.2 Data JSON is written only through `jsonfmt.write_like()`, under `.git/odr-data.lock`. *Enforced by:* review (no code).
- 6.3 Letter-shape conflicts are settled by the evidence ladder, with scans as a last resort (PLAYBOOK). Every decision is recorded in `reconcile/<book>.jsonl`. *Enforced by:* reconcile verify.
- 6.4 `A16049.xml`: literal ſ; restore gaps; recount the tags and update the NT repo README; add a `<change>`; check well-formedness. *Enforced by:* review (no code).

**7. Posting**
- 7.1 Only with the owner's approval, from the owner's account, at 12 s or more between edits. *Enforced by:* wikipost (`--delay`, default 12), review (no code).
- 7.2 Never revert a human edit. wikipost skips pages whose last author is someone else; review the change against the scan, adopt a valid one into the data, then `--adopt-others`. Report an invalid one to the owner. *Enforced by:* wikipost.
- 7.3 No post that loses print features against the live revision without `--allow-loss`/`--allow-shift … --reason`. *Enforced by:* wikipost.

**Open items** (a short list at the end): Acts 367 `neceſſary` unread on the scan; the 19 ornament files missing on Commons; the frozen pages; Q3 if it's still open.

**Enforcement index:** 26 lint codes and 24 fidelity features, each with its §.

- [ ] **Step 1: Write RULES.md to this outline.** Check every wikitext example against a committed page (`grep` in `pages/`) before keeping it.
- [ ] **Step 2: Run** `python3 -m pytest -q scripts/wikisource/tests/test_docs.py -k "rule or index or feature or code" --runxfail`. Expected: those tests PASS.
- [ ] **Step 3: Commit** `docs(wikisource): RULES.md as the single authority, each rule with its enforcer`.

---

### Task 3: PLAYBOOK.md, the workflow as it is now

**Files:**
- Rewrite: `wikisource/1582-rhemes-nt/PLAYBOOK.md`

The playbook says how to do things; RULES says what's allowed. Where a rule matters, link `RULES.md §N` instead of restating it. Sections:

1. **Ground rules (5 lines):** links to RULES §1, §6 and §7; the lock and `write_like`; `python3 -I`.
2. **Sources:** scans, Tesseract TSV, Transkribus pages (paths and quirks carried over from the old playbook, with the Transkribus s/ſ point corrected), `A16049.xml` (`RHEMES_XML`), and `generate.py`'s `tokens.json`/`report.txt`.
3. **Change a generated book** (the loop used in Phase 1):
   1. Fix the data (odr-original, and odr for content), under the lock. If markers moved, run `npx tsx scripts/build-odr-lemmas.ts --write` and `--dir=odr-original --write`.
   2. `python3 -I scripts/wikisource/reconcile.py diff <book> [--jsonl out]`: word differences between generator and pages, by class.
   3. Letter-shape conflicts: `reconcile.py ladder <book>` writes `reconcile/<book>.jsonl`. It reports rung counts. Rung 4 (scans) only after the owner has seen the count: one collage per round, readings appended to `reconcile/scan-readings.jsonl` (`book, page, committed, generated, reading, evidence`; `replace` only where the reading matches neither side).
   4. `reconcile.py adopt <book>` (dry run), then `--write` with `--allow-shift ls:<range> --reason "…"` where the ladder shifts ſs/ſſ.
   5. `reconcile.py write <book>`: pages from the generator. Frozen pages are never touched.
   6. `reconcile.py verify <book>`: 0 decisions not shown.
   7. Lint (0 errors; overrides only per RULES §1.1), then `pytest -m "slow or not slow"` (golden tests).
   8. `reconcile.py status --write`: changed pages become `status: changed`.
   9. Commit, with each override and its reason, and honest counts (seen / already right / changed).
4. **Start a new book** (1 Corinthians onward): add it to `books.json` (`first`, `last`, `ornaments: false`, `golden`); set the `generate.py` tables (`RUNNING`, `TITLE_END`, `ARGUMENT`, `OCR_SOURCE`, and `HOLY_WEEK`, `PAGE_STARTS`, `CATCHWORDS`, `SPLIT_WORDS`, `PAREN_TITLES`, `BARS`, `SIDE_SC`, `MANUAL_PARAS`/`NO_PARAS` where the print needs them); generate to a scratch dir (`generate.py <repo> <book> <first> <out>`) and read `report.txt`; check the earlier books still pass their golden tests. Phase 3 moves these tables into `books.json` and overrides.
5. **Checking a book against the scans:** the old steps 1–5 condensed (marks and blind spots, note kinds, paragraphs, verse numbering, annotation title closers, margin notes, annotations, macrons, w/vv, modern-spelling leftovers, syncing odr), with ſs/ſſ replaced by the ladder. `triage.py` and `ocrdiff.py` are the cheap first pass.
6. **Cheap eye checks:** word crops and collages (sizes from the old playbook), never a whole hires page, never the same crop twice.
7. **Post (owner only):** owner approval; `wikipost.py A-B` dry run (lint must be clean; it fetches live and refuses losses); `--diff` to inspect; for pages someone else edited, `check_live_edits.py`/`wikifetch.py`, review against the scan, adopt into the data, then `--adopt-others N`; `--post --summary "…"` with scoped overrides and `--reason` if needed; wikipost writes the `revid`s into `manifest.json`; commit the manifest.
8. **Before each commit:** pytest, lint, `npx vitest run`, `npm run check`, prettier (from the main checkout while this worktree has no `node_modules`).

- [ ] **Step 1: Confirm each documented command and flag exists.** Run `python3 -I scripts/wikisource/reconcile.py` (prints usage) and check its `--jsonl`/`--write` handling. Check the wikipost and lint flags in their docstrings, `generate.py`'s argument order, and that each named table exists (`grep -n '^NAME ='`). Drop anything that doesn't exist.
- [ ] **Step 2: Write PLAYBOOK.md.**
- [ ] **Step 3: Run** `python3 -m pytest -q scripts/wikisource/tests/test_docs.py -k retired --runxfail`. Expected: PLAYBOOK has no retired phrase (README and BOOKS may still fail until Task 5).
- [ ] **Step 4: Commit** `docs(wikisource): PLAYBOOK.md describes the reconcile workflow as it runs now`.

---

### Task 4: AGENTS.md and README.md

**Files:**
- Modify: `AGENTS.md` (replace §1 only)
- Rewrite: `wikisource/1582-rhemes-nt/README.md`

AGENTS.md §1 is at most 40 lines:
- One line on scope, then links to `wikisource/1582-rhemes-nt/RULES.md` (what's allowed) and `PLAYBOOK.md` (how).
- Hard rules: never edit generated pages, fix the data; never reduce fidelity without `--allow-loss`/`--allow-shift` and `--reason`; never post without the owner's approval; run the tests and lint (0 errors) before committing; `python3 -I`, NFC, `write_like` under the lock; never revert a human edit on Wikisource.
- Scans last: OCR and XML first (one line, linking PLAYBOOK).

The dark-mode table rules, the orthography detail and the publication steps move out of AGENTS (they're RULES §5.12, §3 and PLAYBOOK §7). §2 (web app) stays byte-identical.

README.md, about 20 lines: what the folder is (Index link, page `n` = `Page:…/n`, printed page `n − 28`); the files (`pages/`, `manifest.json` statuses `posted`/`changed` and `source: frozen`, `books.json`, `reconcile/`, `ornaments.json`); links to RULES, PLAYBOOK and BOOKS.

- [ ] **Step 1: Write both.**
- [ ] **Step 2: Run** `python3 -m pytest -q scripts/wikisource/tests/test_docs.py -k "agents or retired" --runxfail`. Expected: `agents` PASSES; `retired` passes for AGENTS and README.
- [ ] **Step 3: Check that §2 is unchanged:** `git diff AGENTS.md` shows changes only above `## 2.`.
- [ ] **Step 4: Commit** `docs(wikisource): short AGENTS.md pointing to RULES and PLAYBOOK; README as orientation`.

---

### Task 5: BOOKS.md status table, narrative to audits

**Files:**
- Create: `docs/audits/2026-11-17-books-log.md`, holding BOOKS.md lines 16–463 verbatim, under a two-line header that says it was moved from BOOKS.md on 2026-11-21 and is history.
- Rewrite: `wikisource/1582-rhemes-nt/BOOKS.md`

BOOKS.md is a definition line for each column, then one row per book (Matthew, Mark, Luke, John, Acts, Romans, then a single "1 Corinthians–Apocalypse" row), plus the front matter and the tables:

| Book | Pages | Checked against the scans | Generated (golden) | Proofread | Posted |

The values come from `books.json`, the manifest (`python3 -I` one-liner counting status per range) and the old table and audits. Acts and Romans are "reconciled (Phase 1)", not "checked complete", unless an audit says otherwise. Then a link to the books log and the Phase 1 audit, and one line saying the table will be generated by `rh status` from Phase 3.

- [ ] **Step 1: Move the narrative and write the table.** Check the moved text: `diff <(sed -n '16,$p' <(git show HEAD:wikisource/1582-rhemes-nt/BOOKS.md)) <(tail -n +4 docs/audits/2026-11-17-books-log.md)` shows nothing.
- [ ] **Step 2: Remove the `xfail` markers from `test_docs.py`.**
- [ ] **Step 3: Run** `python3 -m pytest -q scripts/wikisource/tests`. Expected: all pass (138 plus the new ones).
- [ ] **Step 4: Commit** `docs(wikisource): BOOKS.md as a status table; per-book log moved to audits`.

---

### Task 6 (only if the owner answers yes to Q1): archive the paste tools

- [ ] `git mv` `paste-sheet.md` and `scriptorium-request.md` to `docs/archive/wikisource/`; `git rm` `scripts/wikisource/paste_helper.py` and `wikisource/1582-rhemes-nt/paste-state.json`; write `docs/archive/wikisource/README.md` listing each file with its last commit (`git log -1 --format=%h -- <path>`) and the reason (posting goes through wikipost; the owner posts from their own account).
- [ ] `git grep -n "paste_helper\|paste-sheet\|scriptorium-request"` finds only the spec, the handoff and the archive README.
- [ ] Commit `chore(wikisource): archive the hand-paste sheet and bot-approval draft (owner)`.

If the answer is no: add a first line to each `.md` saying it isn't part of the workflow, and link it from nowhere.

---

### Task 7 (only if the owner answers yes to Q2): the other repos

- [ ] `original-douay-rheims-nt/RULES.md`: keep §9 (TEI maintenance) and §11 (microfilm duplicate exposures), plus the TEI encodings (`<hi rend="smallcaps">`, `<foreign xml:lang="grc">`, `<seg rend="decorInit">`, literal ſ). Replace everything about Wikisource and orthography with a link to this repo's RULES.md. Commit there (no push).
- [ ] Umbrella `README.md`: update the doc pointers to RULES, PLAYBOOK, BOOKS and the audits. Not a git repo, so show the owner the diff.

---

### Task 8: Final check

- [ ] **Contradiction sweep:** read RULES, PLAYBOOK, AGENTS §1, README and BOOKS together, and compare each with the contradictions table. Each "Kept" version appears, and no other version does.
- [ ] **Verification:** `python3 -m pytest -q scripts/wikisource/tests -m "slow or not slow"` (all pass); lint (0 errors, 28 `W-header`); prettier `--check` on every changed `.md`; `git status` shows no change under `pages/`, `static/data/` or `manifest.json`.
- [ ] **Review:** one whole-branch review of the Phase 2 commits (superpowers:requesting-code-review), with the questions: does any doc state something the code contradicts, and does any rule lack an enforcer?
- [ ] **Handoff:** write `docs/superpowers/handoffs/2026-11-2x-wikisource-phase3.md` (status, the code-side notes found here: the `ladder.py` and `publish.py` docstrings, the `LIVE_BASE`/page 266 special case in `reconcile.py status`, the Q3 outcome). Commit.
