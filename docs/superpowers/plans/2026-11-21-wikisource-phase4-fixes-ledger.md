# Wikisource Phase 4 (fixes ledger) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every data fix becomes a record in `wikisource/1582-rhemes-nt/fixes/<book>.jsonl`, applied by one tool (`rh.py fix apply`). The XML backfills and one-offs since the EEBO-TCP import, and the JSON one-offs, are converted into records. The rule-based fixers only propose records. `rh.py sync-odr` lists `odr` vs `odr-original` content differences.

**Architecture:** There are two new addressing modules. `loc.py` resolves a `loc` to a string or value in the book JSON. `xmlspan.py` splits `A16049.xml`'s `<text>` into per-book character spans. On top of them sits `fixes.py`, with the record type, the ledger I/O, the entry states and apply/check. The conversion of the XML history is one generic command, `fix propose-diff xml REV_A REV_B`, run over the XML repo's 2026-11-19 commits. Detectors, `sync-odr` and `propose-live` only emit proposals. None of them writes data.

**Tech Stack:** Python 3 stdlib (run as `python3 -I`) and pytest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md` §4.4, §5 (phase 4), §8 ("Rule-based fixers", "Live edits by others"), §9. Rules: `wikisource/1582-rhemes-nt/RULES.md` §1 and §6. Handoff: `docs/superpowers/handoffs/2026-11-21-wikisource-phase4.md`.

## Global Constraints

- Phase 4 exit: "Ledger replays as a no-op on current data and reproduces it from pre-backfill versions" (spec §5).
- `fix apply` is "a dry run by default"; "`old` must occur exactly once in scope"; "idempotent: when `new` is already present and `old` absent, the entry counts as applied"; "runs the fidelity check, holds the lock, and writes through `write_like()`"; "edits `A16049.xml` text nodes without reserialising the document, so the file's formatting is preserved byte for byte outside the edited span" (§4.4).
- "Spelling-only fixes target `odr-original` (and the xml) only; content fixes also carry `odr_new` in modern spelling" (§4.4).
- `sync-odr` "proposes ledger entries and does not write" (§4.4). Detectors "propose ledger entries instead of writing"; "past bulk passes are recorded as one baseline" (§8).
- A valid live edit by someone else "goes into the data as a ledger entry with `evidence: "wikisource rev N by <user>"`" (§8).
- The print wins: `odr-original`, the XML and the pages keep the print's misprints; only `odr` is corrected (RULES §1).
- Scripts run as `python3 -I`. Text is NFC. Data JSON is written only through `jsonfmt.write_like()` under `rhemes.lock.data_lock()`. The XML is read and written as bytes (`read_bytes().decode('utf-8')`, never `read_text()`, which translates newlines), also under the lock.
- Tests: pytest, stdlib only, no network. Tests that need the XML repo's history are skipped when `git -C <xml repo> cat-file -e ee79a5e` fails. Replay tests are marked `slow`.
- Before each commit, run `python3 -m pytest -q scripts/wikisource/tests` and `python3 -I scripts/wikisource/rh.py lint wikisource/1582-rhemes-nt/pages --quiet` (0 errors). Commit messages end with the `Co-Authored-By` line.
- Post nothing to Wikisource. Don't merge or push, and don't touch the main checkout (read-only `npx prettier --check` is fine). Don't commit to the XML repo (`~/Documents/Bible-n-stuff/original-douay-rheims-nt`). Phase 4 needs no XML write, because at HEAD the ledger is a no-op.
- Before each task, check `git log` for commits by the concurrent session. Data commits that change a ledger entry's text must be reflected in that entry (`superseded_by` or a new entry).
- Out of scope (Phase 5): deleting `backfill_*`, `apply_wordfixes`, `fix_john_argument*`, `fix_microfilm_duplicates`, `build_matthew_replacements` and the page sweeps (`apply_longs_pages`, `fix_live`, `remove_verse_daggers`). They stay untouched in Phase 4.

## The record

One JSON object per line, keys in this order, `ensure_ascii=False`, NFC:

```json
{"id":"luke-1-6a2-a","target":["odr-original","odr"],"loc":"luke 1:6a2","old":"here is it euident","new":"here it is euident","odr_old":"here is it evident","odr_new":"here it is evident","evidence":"scan (apply_wordfixes.py); applied in b2c6edae","date":"2026-11-19","note":""}
```

- `target` ⊆ `odr-original`, `odr`, `xml`. `old`/`new` apply to every target except `odr`, which uses `odr_old`/`odr_new` when they are given, and `old`/`new` otherwise. `odr_new` is required when `odr` is targeted together with another target.
- `loc` is `<book> <rest>`.
  - For JSON targets, `<rest>` is the `apply_wvv.find_text` grammar: `arg:N|arg:title`, `C:sum[/nM]`, `C:VaN[:title|/mnM]`, `C:V[/noteL|/crN]`. It is extended with an optional `#key` suffix that selects another key of the same container (a **value entry**: `old`/`new` are JSON values compared by equality, and `null` means the key is absent).
  - For `xml`, `loc` is informational. The scope is the book's span (`xmlspan`).
- Optional keys: `odr_old`, `odr_new`, `note`, `allow` and `superseded_by`.
  - `allow` is a list of `FEATURE:loss|shift`: the entry's decided fidelity change. When it is present, `note` must give the reason.
  - `superseded_by` is the id of a later entry in the same file, or `git <hash>`: the entry's text was later changed, so it is skipped by apply and reported as `superseded`.
- `id` is `<book>-<slug(rest)>-<letter>`, unique within the file. `book` is a data-dir slug (`matthew`, `acts`, `1-corinthians`), or `front` or `back` for the XML's front and back matter.
- States, per target. Text entries: `pending` when `old` occurs exactly once in scope; `applied` when `old` occurs 0 times and `new` at least once; otherwise `conflict`. Value entries: `pending` if the value equals `old`, `applied` if it equals `new`, otherwise `conflict`. An entry with `superseded_by` is `superseded` and is not checked.
- Fidelity: `fidelity.compare(old, new)` (the JSON dump for value entries) on the `odr-original` and `xml` targets, never on `odr`. Each finding not listed in `allow` refuses the entry.

## Commands

| Command | Module | Writes? |
| --- | --- | --- |
| `rh fix check [BOOK…]` | `rhemes/fixes.py` | no; exit 1 on any conflict |
| `rh fix apply BOOK [--write] [--only ID,…]` | `rhemes/fixes.py` | data and XML with `--write` |
| `rh fix propose-diff xml REV_A REV_B [--out DIR]` | `rhemes/fixderive.py` | proposal files only |
| `rh fix propose-live PAGE FETCH_DIR [--out FILE]` | `rhemes/fixlive.py` | proposal file only |
| `rh detect stars\|wvv\|longs …` | `rhemes/detectors/` | proposal file only |
| `rh sync-odr BOOK [--out FILE] [--min-spelling 3]` | `rhemes/syncodr.py` | proposal file only |

A proposal file is ledger-format JSONL. It is never written under `fixes/` or `static/data`, and the command refuses such an `--out`. A person reviews the proposals and appends them to the ledger, then runs `fix apply`.

## Review Focus

1. **A short or hand-written `old` that also occurs elsewhere in a big XML span** (one book's span is about 400 KB). Apply must refuse and say how many times it occurs, never apply the first one. Test: `test_apply_refuses_ambiguous_old` (Task 2).
2. **A ledger entry where `new` contains `old`** (a pure insertion with too little context): a re-run would apply it again. The loader must reject it. Test: `test_validate_rejects_old_inside_new` (Task 2).
3. **The concurrent session changes the data between the dry run and `--write`**, or one entry of a run conflicts: `--write` recomputes every state after taking the lock and writes nothing if any selected entry conflicts. Test: `test_write_all_or_nothing` (Task 2).
4. **Decomposed text in an entry** (an `o` + combining macron typed by hand, so it never matches the NFC data): the loader rejects non-NFC strings and names the entry. Test: `test_validate_rejects_non_nfc` (Task 2).
5. **One target applied and another pending** (`odr-original` fixed by hand, `odr` not): the state is per target, and apply writes only the pending targets. Test: `test_partial_targets` (Task 2).

---

### Task 0: Baseline

**Files:** Create (ignored): `.superpowers/sdd/2026-11-21-wikisource-phase4/progress.md`

- [ ] **Step 1:** Record `git log -1`, the pytest count (206) and the lint result. Also record the XML repo's HEAD (`945aa52`, clean) and its import commit `ee79a5e` (2014, the only commit before the 2026-11-19 work: this is the XML baseline).
- [ ] **Step 2:** Record the current data commits for the JSON one-offs with `git log -S` (`apply_wordfixes`: Luke `b2c6edae`, John `392bc00c`; `fix_john_argument{,2,3}`: `392bc00c`/`6247b7af`/`f87d3353`; confirm each). Record the 5 `apply_wordfixes` entries that are no longer present at HEAD (`john 19:17a1` `Holy Croſſe` and four `john arg:0` `Iewes` edits), with the commit that changed each.

### Task 1: Addressing: `rhemes/loc.py` and `rhemes/xmlspan.py`

**Files:**
- Create: `rhemes/loc.py`, `rhemes/xmlspan.py`. Tests: `tests/test_loc.py`, `tests/test_xmlspan.py`
- Modify: `apply_wvv.py` (`find_text` becomes `from rhemes.loc import find_text`), `rhemes/paths.py` (add `FIXES = WS / 'fixes'`)

**Interfaces:**
- Produces:
  - `loc.Store` (dataclass: `root: Path`, `book: str`, `bj: dict`, `anns: dict[int, dict]`).
  - `loc.load_store(root: Path, book: str) -> Store` (the loader `apply_wordfixes.load` uses).
  - `loc.save_store(store, touched: set[int|str])`: `write_like` on `book.json` (key `'book'`) and on the touched annotation chapters; the caller holds the lock.
  - `loc.find_text(bj, anns, rest) -> (container, key)` (moved unchanged); `loc.resolve(store, rest) -> (container, key)` adds `#key`.
  - `loc.iter_locs(store) -> Iterator[tuple[str, dict, str]]`: every text loc in a stable order (intros, then each chapter's summary, summary notes, verses, verse notes, cross_refs, annotations, annotation titles, margin notes).
  - `xmlspan.book_key(div_type, n) -> str`: `xmldiff.BOOKN` reversed, else the slug of `n`.
  - `xmlspan.spans(xml: str) -> list[tuple[str, int, int]]`: a partition of the `<text>` element's content, in document order. `front` runs from the end of `<text …>` to `<body`. Inside `<body>`, a top-level section begins at each top-level `<div`: a book div gets its book key, an `argument` gets the next book's key, and any other section gets the previous section's key (`front` before the first book). `back` runs from the end of `</body>` to `</text>` and exists, possibly as whitespace only, even when there is no `<back>` element (as at `ee79a5e`). Book divs are found by `div` depth counting on the raw text, not by parsing.
  - `xmlspan.span(xml, book) -> tuple[int, int]`: one span per key. Consecutive sections with the same key merge; a book with two non-adjacent sections raises.

- [ ] **Step 1: Write the failing tests.**
  - `test_iter_locs_round_trip`: for `john` in the real data, `resolve(store, loc)` returns the same container and key as `iter_locs` for every loc.
  - `test_resolve_hash_key`: `resolve(store, '1:1a1#star')` gives `(annotation, 'star')`.
  - `test_find_text_moved`: `apply_wvv.find_text is loc.find_text`.
  - `test_spans_partition`: on a small synthetic TEI string (front, a summary, argument + gospel × 2, a `gospel_harmony`, no `<back>`), the spans concatenate to exactly the `<text>` content. After merging, the keys are `front, matthew, mark, back`: the summary falls in `front` and the harmony in `mark`.
  - `test_spans_real_xml` (skipped without the XML): every book in `books.json` has exactly one span, and `back` exists at both `ee79a5e` and HEAD (read the old one with `git show`).
- [ ] **Step 2: Run them.** Expected: they fail on import.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run the full suite and lint.** Expected: they pass.
- [ ] **Step 5: Commit** `feat(wikisource): loc.py and xmlspan.py, the addresses of a data fix`.

### Task 2: `rhemes/fixes.py`: the ledger, `fix check`, `fix apply`

**Files:**
- Create: `rhemes/fixes.py`. Test: `tests/test_fixes.py`
- Modify: `rh.py` (`'fix check'`, `'fix apply'`; catch `rhemes.lock.LockHeld` in `main`, print its message and return 3: the deferred Phase 3 minor), `tests/test_rh.py` (`test_rh_lists_commands` also checks `ornaments`, `fix check` and `fix apply`)

**Interfaces:**
- Consumes: `loc.load_store/resolve/save_store`, `xmlspan.span`, `fidelity.compare`, `lock.data_lock`, `sources.xml_path`.
- Produces:
  - `Entry` (a frozen dataclass with the record's keys) and `KEYS` (the key order).
  - `load_ledger(book, root=paths.FIXES) -> list[Entry]`, which validates each entry; `validate(entry, ids_seen) -> list[str]`.
  - `dumps(entry) -> str`, one line; `write_ledger(path, entries)`.
  - `Ctx(repo: Path, xml: Path)`, plus the cached stores and the XML text.
  - `states(entry, ctx) -> dict[str, str]`, from target to `pending|applied|conflict|superseded`.
  - `apply(entries, ctx, write: bool) -> Report`, where `Report` lists, per entry id, the states before, the targets changed and the refusals.
  - `main(argv)`.
- `validate` rejects:
  - a missing required key or an unknown key;
  - a `target` outside the three stores, or `odr` with another target but no `odr_new`;
  - a `loc` whose book differs from the file's, or a JSON-target `loc` that `resolve` rejects;
  - text that is not NFC;
  - a text entry with `old == new`, or `old in new` (for every target pair);
  - `allow` without a `note`;
  - a duplicate `id`;
  - `superseded_by` naming an id that isn't in the file.

- [ ] **Step 1: Write the failing tests.** The JSON tests use a tmp fixture repo (one small book with one annotation chapter), and the XML tests use a tmp synthetic XML via `Ctx(xml=…)`.
  - `test_states_text`: pending, applied and conflict (neither present; `old` twice).
  - `test_states_value`: a `#star` entry: `null` → `true`.
  - `test_apply_dry_run_writes_nothing`: the file's mtime and bytes are unchanged.
  - `test_apply_write_json`: the right text changes, the file keeps its own format (`write_like`), and a second `apply` reports `applied` and writes nothing.
  - `test_apply_refuses_ambiguous_old`: the message contains `occurs 2×`.
  - `test_partial_targets`.
  - `test_write_all_or_nothing`: two entries, the second a conflict; nothing is written.
  - `test_apply_fidelity_refuses`: `ſ` → `s` is refused; the same entry with `"allow":["ls:shift"]` and a note is applied. Use the feature name `fidelity.FEATURES` gives for long s.
  - `test_xml_bytes_outside_unchanged`: after an XML apply, the bytes before and after the edit are identical to the original's, and the file still parses (`ET.fromstring`).
  - `test_xml_scope_is_book_span`: an `old` that is unique in the book but also occurs in another book is pending, not a conflict.
  - `test_validate_rejects_old_inside_new` and `test_validate_rejects_non_nfc`.
  - `test_lock_held_message`: `rh.py fix apply` with the lock dir present prints `data lock held` and no `Traceback`.
- [ ] **Step 2: Run them.** Expected: they fail on import.
- [ ] **Step 3: Implement.** `apply --write` takes the lock first, then loads and computes states, then refuses on any conflict or fidelity refusal among the selected entries. Otherwise it applies the pending targets in file order: JSON in memory, then `save_store`; XML through the book span with `str.replace(old, new, 1)` on the span slice. Each changed file is written once, the XML after an `ET.fromstring` check. The dry-run output is one line per non-applied entry, `ID STATE TARGET: old → new` (each side shortened to 60 chars), plus the summary `applied N  pending N  superseded N  conflict N`. `check` prints the same summary for each book and lists the conflicts.
- [ ] **Step 4: Run the full suite and lint.** Expected: they pass.
- [ ] **Step 5: Commit** `feat(wikisource): fixes ledger with rh fix check|apply`.

### Task 3: `fix propose-diff xml`, and the XML history as entries

**Files:**
- Create: `rhemes/fixderive.py`; `wikisource/1582-rhemes-nt/fixes/{front,matthew,mark,luke,john,acts,romans,back}.jsonl` (each book that has changes). Tests: `tests/test_fixderive.py`, `tests/test_ledger_replay.py`
- Modify: `rh.py` (`'fix propose-diff'`)

**Interfaces:**
- Consumes: `xmlspan.spans`, `fixes.Entry/dumps/states`.
- Produces: `derive_xml(before: str, after: str, existing_ids: set) -> dict[str, list[Entry]]`, keyed by book; `evidence_for(old, new, repo, rev_range) -> str`.
- The algorithm, which the signature doesn't determine:
  1. Use `difflib.SequenceMatcher(autojunk=False)` on the lines of each book's span (the spans are matched by key), then a character-level matcher within each changed line block. This gives minimal edits.
  2. Merge edits closer than 40 characters.
  3. Widen each edit to whitespace boundaries, then symmetrically by a word at a time, until `old` occurs once in the before-span, `new` occurs once in the after-span, and `old not in new`.
  4. Set `loc` to `<book> C:V` from the last `<div n="C" type="chapter">` and the last `<label type="milestone">…</label>` verse number before the edit. Before the book's div it is `<book> arg`; in other sections it is `<book> <section type>`.
  5. Set `target` to `["xml"]`, `date` to the date of the newest commit found, and `evidence` to `A16049.xml <hash>: <subject>; …` for every commit in `REV_A..REV_B` that `git log -S<old>` or `git log -S<new>` finds (subjects truncated to 80 chars).
  6. Add `allow` for each fidelity finding, with the note `historical audit commit, owner-approved 2026-11-19`.
- Edits in the `teiHeader` are not derived: the replay compares the `<text>` element only.

- [ ] **Step 1: Write the failing tests.**
  - `test_derive_round_trip_synthetic`: on synthetic before/after TEI (a gap fill, a small-caps wrap, one deletion, one change in each of two books), applying `derive_xml`'s output to `before` gives `after`, and the states on `after` are all `applied`.
  - `test_derive_widens_to_unique`: an edit inside `the the the` gets context until unique.
  - `test_xml_ledger_replays_history` (slow; skipped without the XML repo history): apply every ledger's xml entries to `git show ee79a5e:A16049.xml`, then compare its `<text>…</text>` to the current file's, byte for byte.
  - `test_ledger_noop_on_current`: `fix check` over all books reports 0 pending and 0 conflict.
- [ ] **Step 2: Run them.** Expected: the derive tests fail on import, and the replay test fails (there is no ledger yet).
- [ ] **Step 3: Implement** `derive_xml` and the command, with output to `--out DIR` (proposal files `<book>.jsonl`).
- [ ] **Step 4: Convert.** Run `rh.py fix propose-diff xml ee79a5e 945aa52 --out <scratch>`, review a sample of 20 entries per book against the scripts' comments (for example `backfill_mark_xml.py` gaps 2 and 38, and the `2 Theſſal. 2, 15.` correction), then copy the files to `fixes/`. Record the entry count per book and the list of `allow` entries in `progress.md`.
- [ ] **Step 5: Run the full suite with `-m "slow or not slow"`, and lint.** Expected: they pass, including the replay.
- [ ] **Step 6: Commit** `feat(wikisource): XML fixes since the EEBO-TCP import as ledger entries (ee79a5e..945aa52)`. The message lists the per-book counts and every `allow`.

### Task 4: The JSON one-offs as entries

**Files:**
- Modify: `fixes/luke.jsonl`, `fixes/john.jsonl` (appended), `tests/test_ledger_replay.py`

**Interfaces:**
- Consumes: `fixes.*`, `loc.*`.
- Every edit in `apply_wordfixes.EDITS` and `L2447` becomes one entry. Pairs with an odr edit carry `odr_old`/`odr_new`; pairs without one target `["odr-original"]`. The evidence is `scan (apply_wordfixes.py); applied in <hash>`.
- `fix_john_argument.py`, `2.py` and `3.py` become text entries for their string replacements, and value entries (`john arg:0#notes`) for the notes list each one rebuilds (`old` is the list before the script, `new` the list after it, both read from git at the recorded commits). Their evidence is the script docstring's scan reference plus `applied in <hash>`.
- An entry whose text a later commit changed gets `superseded_by: "git <hash>"`. These are the 5 from Task 0, plus any value entry that a later script overwrote, which gets `superseded_by: <id of the later entry>`.

- [ ] **Step 1: Write the failing test.** `test_json_entries_replay_history` (slow): for each JSON entry with `applied in <hash>`, load the data files at `<hash>^` (with `git show`, into a tmp repo layout). The entry must be `pending` there. Apply it, and the string or value at `loc` must equal the one at `<hash>`. The test fails while there are no JSON entries.
- [ ] **Step 2: Write the entries** with a scratch converter (in `.superpowers/sdd/…/`, not committed) that imports the scripts' `EDITS` tables. For the `fix_john_argument*` value entries, read `old`/`new` from git.
- [ ] **Step 3: Run the replay, `test_ledger_noop_on_current` and lint.** Expected: they pass. If an entry fails because its commit also changed other parts of the same string, split the entry, or record the other change as its own entry; don't weaken the test.
- [ ] **Step 4: Commit** `feat(wikisource): apply_wordfixes and fix_john_argument* as ledger entries`.

### Task 5: Detectors: `rh detect stars|wvv|longs`

**Files:**
- Create: `rhemes/detectors/__init__.py`, `stars.py` (from `autofix.py`), `wvv.py` (from `apply_wvv.py`), `longs.py` (from `longs.py`). Test: `tests/test_detectors.py`
- Modify: `autofix.py`, `apply_wvv.py` and `longs.py` become `_shim` shims to `rh.py detect …`. `apply_wvv.py` keeps re-exporting `find_text`, which `apply_wordfixes` imports. Also modify `rh.py` (`'detect'`).

**Interfaces:**
- Consumes: `loc.*`, `fixes.Entry/dumps`.
- Produces: `stars.propose(repo, book, tokens, a, b) -> list[Entry]`, `wvv.propose(repo, book, tsv, cls) -> list[Entry]` and `longs.propose(repo, book) -> list[Entry]`, plus the `main(argv)` behind `rh detect <rule> <args as before, minus --write> [--out FILE]`.
- The rules and their skip lists (`KNOWN_FALSE_STARS`, `KEEP_ROUND`, the abbreviation forms) move unchanged.
- Each change the old script made becomes one entry:
  - A text change gives a text entry at the narrowest loc. `stars` swaps target `odr-original` and `odr`, with `odr_old`/`odr_new`; `wvv` and `longs` target `odr-original` only.
  - A key change (`star`, `kind`) gives a value entry `#key`.
  - The evidence is `detect <rule> <input file name>`, and the date is today.
- The id letter starts after the highest one in the book's ledger.

- [ ] **Step 1: Before shimming, capture the equivalence.** For each script, build a tmp fixture repo that triggers every rule branch (a star; a swap; w→vv and vv→w; a long s with a `KEEP_ROUND` form and an abbreviation). Run the old script `--write` on copy A. Run `propose` and then `fixes.apply(write=True)` on copy B. Then compare A and B byte for byte. Keep the fixtures and the expected entries in `tests/fixtures/detectors/`.
- [ ] **Step 2: Write the failing tests.**
  - `test_<rule>_proposes` (expected entries on the fixture).
  - `test_<rule>_apply_equals_old_write` (compares against the expected files recorded in Step 1).
  - `test_detect_refuses_ledger_out`: an `--out` under `fixes/` or `static/data` is refused.
  - `test_longs_noop_on_nt`: `longs.propose` on `john` returns `[]` (it has already been applied, 0ffb97e0).
- [ ] **Step 3: Implement**, then turn the three scripts into shims.
- [ ] **Step 4: Run the full suite and lint.** Expected: they pass.
- [ ] **Step 5: Commit** `refactor(wikisource): autofix, apply_wvv and longs become detectors that propose ledger entries`.

### Task 6: `rh sync-odr`

**Files:**
- Create: `rhemes/syncodr.py`. Test: `tests/test_syncodr.py`
- Modify: `rh.py` (`'sync-odr'`)

**Interfaces:**
- Consumes: `loc.load_store/iter_locs`, `text.fold_key`, `fixes.Entry/dumps`.
- Produces: `structure_diffs(orig: Store, odr: Store) -> list[str]`; `spelling_pairs(books) -> Counter[tuple[str, str]]`; `content_diffs(orig, odr, spelling, min_count) -> list[Diff]`, where `Diff` holds `loc`, `orig_words` and `odr_words`; `main(argv)`.
- The structure checks: the same set of locs; and per loc, equal counts of `<na>`, `<mn>`, `<cr>`, `*` and notes, and equal `lemmas`.
- The content check works per loc. Strip the tags, split into words, and align the `fold_key` sequences with `SequenceMatcher`.
  - A `replace` of equal length whose word pairs are each fold-equal, or a pair seen at least `--min-spelling` (default 3) times across all books, is spelling. The count comes from `spelling_pairs` over equal-length replaces.
  - Everything else is content.
- Each content diff prints `loc | odr-original: … | odr: …` and proposes one entry: target `["odr"]`, `old` the `odr` span (with 2 words of context, unique in the loc string), `new` the same span with the original's words, the note `modernise new before adding`, and the evidence `sync-odr: odr-original reading`.

- [ ] **Step 1: Write the failing tests** on a fixture pair of stores.
  - `test_spelling_not_reported`: `vvith`/`with`, and `Iewes`/`Jews` seen 3×.
  - `test_content_reported`: `band`/`hand` once, a missing word, and an extra word.
  - `test_structure_reported`: a `<mn>` count mismatch and a missing note.
  - `test_sync_odr_never_writes`: the data's mtimes are unchanged.
- [ ] **Step 2: Run them.** Expected: they fail on import.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it on `mark` and `john`.** Record the counts in `progress.md`, and file the real content findings as a list for the owner (don't fix them in this phase).
- [ ] **Step 5: Run the full suite and lint.** Expected: they pass. **Commit** `feat(wikisource): rh sync-odr lists content differences between odr and odr-original`.

### Task 7: `rh fix propose-live`

**Files:**
- Create: `rhemes/fixlive.py`. Test: `tests/test_fixlive.py`
- Modify: `rh.py` (`'fix propose-live'`)

**Interfaces:**
- Consumes: `FETCH_DIR/<n>.wiki` and `FETCH_DIR/revs.json` (written by `rh fetch`), `sources.committed_page`, `config` (the book of a page, from `first`/`last`), `text.wiki_to_ls`/`wiki_to_plain`, `loc.iter_locs`, and `fixes.Entry`.
- Produces: `propose_live(page: int, live: str, committed: str, rev: dict, store: Store) -> tuple[list[Entry], list[str]]` (the entries, and the changes it couldn't place).
- For each changed word run between the committed page and the live page, take the plain committed words and their data form, and find the loc in `odr-original` whose text contains them exactly once. If exactly one loc does, propose an entry with target `["odr-original"]`, the evidence `wikisource rev <revid> by <user>`, and the note `check against the scan; add odr/xml targets if they apply`. Otherwise list it as unplaced. The command is offline.

- [ ] **Step 1: Write the failing tests.** `test_live_word_change_placed`: a fixture page with one live word change (`euident` → `euidēt`) gives one entry with the right loc and evidence. `test_live_unplaced`: a change in the running head is unplaced.
- [ ] **Step 2: Run them.** Expected: they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full suite and lint.** Expected: they pass. **Commit** `feat(wikisource): rh fix propose-live turns another editor's change into a proposed entry`.

### Task 8: `reconcile ladder` keeps recorded decisions

**Files:** Modify `rhemes/reconcile.py` (the `ladder` writer), `tests/test_reconcile.py`

- [ ] **Step 1: Write the failing tests.** `test_ladder_refuses_to_overwrite`: an existing `reconcile/<book>.jsonl` with entries and no conflicts left gives exit 1 with `has N recorded decisions`, and the file is unchanged. `test_ladder_holds_lock`: when the lock is held, it refuses with the `data lock held` message.
- [ ] **Step 2: Run them.** Expected: they fail.
- [ ] **Step 3: Implement.** Refuse unless `--overwrite` is given, and write inside `data_lock()` (the deferred Phase 3 minors for this code).
- [ ] **Step 4: Run the full suite and lint.** Expected: they pass. **Commit** `fix(wikisource): reconcile ladder never empties a decisions file; writes under the lock`.

### Task 9: Docs

**Files:** Modify `wikisource/1582-rhemes-nt/RULES.md` §6, `PLAYBOOK.md` ("Record a fix", step 10 "Sync odr", "Post" step 3), `AGENTS.md` §1 (one line on the ledger), `tests/test_docs.py`, and the handoff doc (a Phase 5 handoff).

- [ ] **Step 1: Write the failing test.**
  - `test_docs_ledger`: RULES §6 says that every data fix is a ledger entry applied with `rh.py fix apply`, and PLAYBOOK step 10 names `rh.py sync-odr`.
  - Every `rh.py` command the docs name is in `rh.COMMANDS` (the existing test, now with the `fix …`, `detect` and `sync-odr` entries).
- [ ] **Step 2: Update the docs.**
  - RULES §6: data fixes go through `fixes/<book>.jsonl` and `fix apply`; the record format (the section above, shortened); `allow` replaces `--allow-*` for a ledger entry, and its reason sits in `note`; a hand edit of the XML is recorded afterwards with `fix propose-diff xml`.
  - PLAYBOOK: "Record a fix" (write the entry, dry run, `--write`, `fix check`); detectors and `sync-odr` propose and a person appends; Post step 3 uses `rh fix propose-live`.
- [ ] **Step 3: Verify.** Run the full suite and lint, and prettier on the changed `.md` files (read-only, from the main checkout). **Commit** `docs(wikisource): the fixes ledger in rules, playbook and agents`.

### Task 10: Whole-branch review

- [ ] Run the full suite with `-m "slow or not slow"` (golden and replay) and lint. Then run one review of the Phase 4 range on the most capable model, against this plan and spec §4.4/§8. Fix what it finds, with a failing test first wherever one can be written. Update the memory file `odr-wikisource-refactor.md`.

## Owner calls in this plan (open to correction)

- **The XML baseline is `ee79a5e`** (the 2014 EEBO-TCP import). All 21 XML commits since then (2026-11-19: the backfills, `fix_microfilm_duplicates`, and the hand audits "against 1582 facsimiles") become entries, derived from the git diff rather than from the scripts. That is the only way "reproduces the current data" can hold for the XML, because the hand audits after the backfills changed the backfilled text. The `teiHeader` (revisionDesc, statistics) is not ledger data and is left out of the replay.
- **The JSON proof is per entry, against the commit that made the change.** A single replay from one JSON baseline would need the bulk passes and the ladder writes too (§8 counts those as baseline and as `reconcile/` decisions).
- **Four additions to the spec's record:**
  - `odr_old`, since `odr`'s text differs from `old` and has to be located;
  - `allow`, the decided fidelity change, carried in the entry rather than on the command line;
  - `superseded_by`, for entries whose text later commits changed (5 known);
  - value entries via `loc#key`, for the notes list that `fix_john_argument` rebuilds and the `star`/`kind` keys `autofix` sets.
- **There is no `rh backfill-xml`.** A gap fill is an ordinary entry with target `["xml"]`.
- **Ledger books include `front` and `back`**, for the XML's front matter and the microfilm appendix. Non-book sections inside `<body>` go with their neighbour: an argument with the next book, the gospel harmony with John, and the summary of Acts with Acts.
- **`detect longs` also runs on the OT books.** Its proposals for them are printed, but the ledger stays under the NT folder. OT ledgers are out of scope.
- **`apply_longs_pages` is a page sweep, not a data fixer.** It is not converted, and Phase 5 deletes it.
