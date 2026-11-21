# agy scan reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let agy (Gemini) read scan crops for Acts and Romans findings, trust it only for the kinds a calibration on Matthew–John proves it reads correctly, and send everything else to Claude.

**Architecture:** One new module, `rhemes/agyread.py`, behind `rh.py agy key|calibrate|read`. It reuses `ocrdiff`'s alignment, which gains a `word_boxes()` export, for crop boxes and OCR readings, and `detectors.propose_from` for ledger proposals. agy runs as a subprocess behind one function, `call_agy()`, which the tests replace.

**Tech Stack:** Python 3 (`-I`), Pillow, pytest, the `agy` CLI.

**Spec:** `docs/superpowers/specs/2026-11-21-agy-scan-reading-design.md`

## Global Constraints

- Scripts run as `python3 -I`; text is NFC (AGENTS.md).
- The print wins: a reading is never normalised (keep ſ, vv, u/v, macrons as agy returns them, NFC only).
- `agy read` writes only its proposal file, `<out>.claude.tsv`, the crop sheet and `reconcile/agy-readings.jsonl`. The out path may not be under `fixes/` or `static/data` (the same check the detectors make).
- No real agy call in the test suite. Tests replace `agyread.call_agy`.
- Trust bar: n ≥ 30, both runs agree with each other and with the key in ≥ 98% of cases, confidently wrong = 0. Nothing is trusted by default.
- Models: `gemini-4-argon-low`, `gemini-4-argon-high`. Prompts: `plain`, `targeted`. Two runs each.
- agy is called as `agy --model M --add-dir DIR --mode accept-edits -p PROMPT --output-format json --json-schema SCHEMA`.
- Crops: box padded by one box-height on each side, then scaled so the text is 1.4× the source. Batch size 30.
- agy answers are cached in `~/facsimiles/agy-cache/<sha1 of model|prompt|run|crop bytes>.json`.
- Before each commit, run `python3 -m pytest -q scripts/wikisource/tests` and `python3 -I scripts/wikisource/rh.py lint wikisource/1582-rhemes-nt/pages --quiet` (0 errors). Stage files by path.

## Review Focus

1. **A word that both runs read but return in a different Unicode form** (e.g. decomposed ō): this must compare equal after NFC, not count as a disagreement. *Test in Task 2.*
2. **agy returns fewer items than the batch, or numbers them out of order:** the missing items count as no reading (they go to Claude), and the rest are matched by `n`, not by position. *Test in Task 2.*
3. **agy exits non-zero or returns invalid JSON:** that batch is not cached, its items go to Claude, and the run goes on. *Test in Task 2.*
4. **A finding whose word has no box** (alignment deleted it): it goes to Claude with reason `no-box`, and the run does not crash. *Test in Task 4.*
5. **A rerun after the proposals are applied:** the data now equals the reading, so nothing is proposed again. *Test in Task 4.*

---

### Task 1: `ocrdiff.word_boxes` and crops

**Files:**
- Modify: `scripts/wikisource/rhemes/ocrdiff.py` (pull the alignment loop at the top of `run()` into `_align_sources(book)` and reuse it)
- Create: `scripts/wikisource/rhemes/agyread.py`
- Test: `scripts/wikisource/tests/test_agyread.py`

**Interfaces:**
- Produces: `ocrdiff.word_boxes(book) -> dict[tuple[str, str, int], dict]` keyed by `(loc, data_word, occ)`, value `{'page': str, 'box': (l, t, w, h), 'tk': str, 'ts': str}`. Words with no Transkribus box are left out.
- Produces: `agyread.crop(book: str, page: str, box: tuple, pages_dir: Path = O.TK) -> PIL.Image.Image`.
- Produces: `agyread.kinds(word: str) -> set[str]`, a subset of `{'wvv', 'macron', 'longs', 'wording'}`. `wording` only when none of the others applies.

- [ ] **Step 1: Write the failing tests**

```python
def test_kinds():
    assert agyread.kinds('vvhich') == {'wvv'}
    assert agyread.kinds('ſhevved') == {'wvv', 'longs'}
    assert agyread.kinds('vpō') == {'macron'}
    assert agyread.kinds('Lord') == {'wording'}

def test_crop_pads_and_scales(tmp_path):
    (tmp_path / 'acts').mkdir()
    Image.new('L', (1000, 1000), 255).save(tmp_path / 'acts/pdf314.jpg')
    im = agyread.crop('acts', 'pdf314', (100, 200, 60, 40), pages_dir=tmp_path)
    assert im.size == (round((60 + 2 * 40) * 1.4), round(3 * 40 * 1.4))

def test_crop_clamps_at_page_edge(tmp_path): ...  # box at (0, 0): no negative coordinates, size is still positive

def test_word_boxes_matches_run_rows():
    """The export and run() agree: every w_for_vv row in the John TSV has the same page and box."""
    # skip if ~/facsimiles/transkribus/pages/john is absent
```

- [ ] **Step 2: Run** `python3 -m pytest -q scripts/wikisource/tests/test_agyread.py`. Expected: FAIL (no module `rhemes.agyread`).
- [ ] **Step 3: Implement** `_align_sources`, `word_boxes`, `kinds` and `crop`. `run()` must still produce byte-identical TSVs: check by running `rh.py diff ocr john` before and after into two scratch dirs and `diff`-ing them.
- [ ] **Step 4: Run** the new tests, then the full suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(wikisource): ocrdiff.word_boxes and agy crops`.

### Task 2: calling agy, caching, batching

**Files:** Modify `rhemes/agyread.py`; Test `tests/test_agyread.py`.

**Interfaces:**
- Produces: `PROMPTS: dict[str, str]` with keys `plain` and `targeted` (text from spec §3; the targeted prompt adds the three questions; neither contains an expected reading).
- Produces: `call_agy(model: str, prompt: str, image_dir: Path) -> list[dict]`, which runs the subprocess and returns `[{'n': int, 'reading': str}]`. It raises `AgyError` on a non-zero exit or bad JSON.
- Produces: `read_batch(items: list[dict], model: str, prompt: str, run: int, cache: Path) -> dict[str, str | None]`, mapping item `id` to its NFC reading, or None. Each item has `id` and `image` (a PIL image). It writes the images as `01.png…` to a temporary dir, calls `call_agy`, matches the answers by `n`, and caches per item.
- Produces: `read_all(items, model, prompt, cache, runs=2, batch=30) -> dict[str, list[str | None]]` (one entry per run).

- [ ] **Step 1: Write the failing tests** (monkeypatch `agyread.call_agy`):

```python
def test_answers_matched_by_n_and_missing_is_none(...):   # agy returns n=2 then n=1, omits n=3
    assert out == {'a': 'vvhich', 'b': 'vpō', 'c': None}
def test_readings_are_nfc(...):        # agy returns 'vpō' -> 'vpō'
def test_cache_hit_skips_call(...):    # second read_batch: call count stays 1
def test_agy_error_not_cached(...):    # call_agy raises AgyError -> all None; next call does call agy again
def test_prompts_name_no_reading():    # no PROMPTS value contains a key word from a fixture item
def test_read_all_batches_of_30(...):  # 65 items -> 3 calls per run, 6 in all
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the four names above. The cache key is sha1 of `model|prompt name|run|PNG bytes`. A `run` number in the key keeps run 2 from simply reusing run 1.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: One live smoke call** (not in the suite): 3 John crops, `plain`, `gemini-4-argon-low`, printing the readings. Check that `--json-schema` and `--add-dir` work headless, and fix the command line if they don't (record what changed in the module docstring).
- [ ] **Step 6: Commit** `feat(wikisource): agy batch reader with cache`.

### Task 3: answer key and calibration

**Files:** Modify `rhemes/agyread.py`, `rh.py` (add `'agy': ('agyread', [])`, with the comment `key|calibrate|read …`); Test `tests/test_agyread.py`, `tests/test_rh.py`.

**Interfaces:**
- Produces: `build_key(books=('mark', 'luke', 'john'), n_hard=150, n_ordinary=150, seed=1582) -> list[dict]`, items `{id, book, loc, occ, page, box, truth, kinds, stratum}`. `truth` is the word in `odr-original` now. Hard items are the audit TSV rows of class `w_for_vv`/`vv_for_w`/`word` whose word is still found at `(loc, occ)`. Ordinary items are a seeded sample from `word_boxes` of words with vv/w, a macron or ſ where `tk` and `ts` both key-equal the data. Matthew has no Transkribus split, so it is left out.
- Produces: `score(key, readings) -> dict[(model, prompt, kind), dict(n, agree, acc, confidently_wrong)]`, where `readings[(model, prompt)][id] = [run1, run2]`. Feature compare per kind: `wvv` on the sequence of w/vv letters; `macron` on the (index, letter) pairs of macron letters; `longs` on the positions of ſ; `wording` on `ocrdiff.key`.
- Produces: `trusted(scores) -> set[(model, prompt, kind)]`, applying the Global Constraints bar.
- CLI: `rh.py agy key` writes `wikisource/1582-rhemes-nt/reconcile/agy-key.jsonl` (sorted, stable). `rh.py agy calibrate [--models …] [--prompts …]` reads the key, runs `read_all` for each model×prompt, prints a table and writes `reconcile/agy-calibration.json` `{scores, trusted, date}`.

- [ ] **Step 1: Write the failing tests:**

```python
def test_key_is_stable(): assert build_key(seed=1) == build_key(seed=1)   # on a tmp fixture repo
def test_score_counts_confidently_wrong():
    # truth 'vvhich', runs ['which', 'which'] -> confidently_wrong 1, acc 0
    # runs ['vvhich', 'which'] -> disagreement, not confidently wrong
def test_trust_bar_edges():
    # n=29 all right -> untrusted; n=50, 49 right, 0 wrong-agreeing -> trusted (98%);
    # n=100, 99 right but 1 confidently wrong -> untrusted
def test_wvv_compare_ignores_other_letters():  # truth 'ſhevved', reading 'shevved' -> wvv right, longs wrong
def test_rh_routes_agy():  assert rh.resolve(['agy', 'key']) == ('agyread', ['key'])
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `build_key`, `score`, `trusted` and the `key`/`calibrate` subcommands of `agyread.main(argv)`.
- [ ] **Step 4: Run.** Expected: PASS. Full suite and lint clean.
- [ ] **Step 5: Commit** the code only: `feat(wikisource): agy answer key and calibration`.
- [ ] **Step 6: Run the calibration for real:** `rh.py agy key`, then `rh.py agy calibrate`. Commit `agy-key.jsonl` and `agy-calibration.json` (`data(wikisource): agy calibration on Mark–John`).
- [ ] **Step 7: STOP. Show the owner the table** and ask which (model, prompt) to use and which kinds to trust. Don't start Task 4's live run before the owner answers.

### Task 4: `agy read` for a book

**Files:** Modify `rhemes/agyread.py`; Test `tests/test_agyread.py`.

**Interfaces:**
- Consumes: `word_boxes`, `crop`, `read_all`, `kinds`, the `trusted` set from `agy-calibration.json`, `detectors.load/snapshot/propose_from`, `loc.find_text`, triage's row function for `w/vv`, `macron`, `longs` and `text` rows (`triage.audit_book(book)`), and `ocrdiff` TSV rows.
- Produces: `open_findings(book, chapters: tuple[int, int]) -> list[dict]`, items `{id, book, loc, occ, data, xml, tk, ts, page, box, kinds}`. A finding is dropped (not open) when `tk` and `ts` both show one side's form for every kind of the word (the cheap rungs settle it).
- Produces: `route(findings, readings, use: tuple[str, str], trusted: set) -> tuple[list[dict], list[dict]]` giving `(kept, to_claude)`. Kept means every kind of the word is trusted for `use` and both runs agree. A `to_claude` item carries `reason` ∈ {`no-box`, `untrusted-kind`, `runs-disagree`, `no-reading`}.
- CLI: `rh.py agy read BOOK --chapters A-B --use MODEL:PROMPT --out FILE [--repo R]`. It writes proposals to FILE (ledger JSONL, evidence string from spec §5), the to-Claude rows to `FILE.claude.tsv` (columns `reason loc data xml tk ts page box`), a crop sheet of those to `FILE.claude.jpg` (reuse `cropsheet`'s drawing), and appends kept readings to `reconcile/agy-readings.jsonl`. It refuses an `--out` under `fixes/` or `static/data`.

- [ ] **Step 1: Write the failing tests** (fixture findings, mocked `read_all`):

```python
def test_route_keeps_only_trusted_and_agreeing(): ...
def test_word_with_two_kinds_needs_both_trusted():   # 'ſhevved' with wvv trusted, longs not -> to_claude, untrusted-kind
def test_no_box_goes_to_claude_without_crash(): ...
def test_read_proposes_ledger_entry_with_agy_evidence(tmp_path): ...  # tmp repo: proposal old/new and evidence start 'agy gemini-4-argon-'
def test_rerun_after_apply_proposes_nothing(tmp_path): ...
def test_out_under_fixes_refused(tmp_path): ...
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `open_findings`, `route` and the `read` subcommand. Place each reading in the data the way `detectors/wvv.py` does (by loc, then the occ-th match of the data word), and build entries with `propose_from`.
- [ ] **Step 4: Run.** Expected: PASS. Full suite and lint clean.
- [ ] **Step 5: Commit** `feat(wikisource): rh.py agy read routes findings to agy or Claude`.

### Task 5: docs, then the first Acts round

**Files:** Modify `wikisource/1582-rhemes-nt/PLAYBOOK.md` ("Check a book against the scans", "Cheap eye checks"), `wikisource/1582-rhemes-nt/RULES.md` §6.5, `scripts/wikisource/tests/test_docs.py` if it lists commands.

- [ ] **Step 1: Edit the docs** as spec §6 says. The Gemini line quotes the measured trusted kinds from `agy-calibration.json`, not the old claim.
- [ ] **Step 2: Run** the full suite and lint. Commit `docs(wikisource): agy reading step`.
- [ ] **Step 3: Acts chapters 1–5:** run `rh.py agy read acts --chapters 1-5 --use <owner's choice> --out <scratch>/acts-1-5.jsonl`. Report the counts (kept, proposed, to Claude by reason) to the owner.
- [ ] **Step 4: Claude reads only `acts-1-5.jsonl.claude.jpg`** and writes ledger entries for what it settles. The owner reviews the proposals before they're appended to `fixes/acts.jsonl` and applied with `rh.py fix apply acts --write`. Then regenerate the affected pages, run the suite and lint, and commit with the rounds' evidence.
- [ ] **Step 5: Spot check.** Before the next round, Claude reads 20 random *kept* agy readings from this round on the crops. If any is wrong, stop and tell the owner: the trust is withdrawn for that kind.
