# Wikisource Phase 3 (shared core and `rh` CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the working tools into one package, `scripts/wikisource/rhemes/`, behind one entry point, `rh.py`. Fold the duplicated loaders, folding helpers, lock code and per-book generator tables into shared modules. Every output stays byte for byte the same.

**Architecture:** First a pure move (`git mv` into the package, with thin shims at the old paths), then one dedup per task, each checked by the golden tests and by an output-equivalence script run against a baseline captured before the move. The generator's internals are not restructured: its tables move out, and its code stays.

**Tech Stack:** Python 3 stdlib (run as `python3 -I`), pytest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md` §4.3, §4.6, §5 (phase 3), §8 ("Generator config"). The rules are in `wikisource/1582-rhemes-nt/RULES.md`; the workflow is in `PLAYBOOK.md`.

## Global Constraints

- Phase 3 exit: "Golden tests still pass; triage/diff output equivalent on all books" (spec §5).
- "`triage`, `xml_json_diff` and `ocrdiff` keep their outputs: the token-cheap report shape of `triage.py` is a requirement, not an accident" (§4.3).
- "Old script names stay for one release as thin shims that print the new command" (§4.3).
- Plain per-book values go to `books.json`. Code-shaped per-page and per-verse patches go to `rhemes/overrides.py`, keyed by book (§8).
- Tests: pytest, stdlib only, no network (§4.6).
- Scripts run as `python3 -I`. `-I` leaves the script's folder off `sys.path`, so `rh.py` and every shim must add `scripts/wikisource` to it themselves.
- Data JSON is written only through `jsonfmt.write_like()` under the data lock (RULES §6.2).
- Before each commit: `python3 -m pytest -q scripts/wikisource/tests` and `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (0 errors). The golden tests (`-m "slow or not slow"`) run at the end of every task that touches the generator or its config.
- Post nothing to Wikisource. Don't merge, push, or touch the main checkout.
- Out of scope, for later phases: the fixes ledger, `fix apply|check`, `sync-odr`, `backfill-xml` (Phase 4); deleting one-off scripts (Phase 5). The one-offs stay where they are and are not moved.

## What moves, and the commands

| Tool now (`scripts/wikisource/`) | Module               | `rh` command                                 |
| -------------------------------- | -------------------- | -------------------------------------------- |
| `generate.py`                    | `rhemes/generate.py` | `rh generate REPO BOOK FIRST OUT [MAXP] [--ornaments]` |
| `lint.py`                        | `rhemes/lint.py`     | `rh lint PAGES_DIR [--only …] [--skip …] [--quiet]` |
| `triage.py`                      | `rhemes/triage.py`   | `rh triage …` (same arguments)               |
| `xml_json_diff.py`               | `rhemes/xmldiff.py`  | `rh diff xml BOOK [out.tsv]`                 |
| `ocrdiff.py`                     | `rhemes/ocrdiff.py`  | `rh diff ocr BOOK OUT_DIR`                   |
| `reconcile.py`                   | `rhemes/reconcile.py`| `rh reconcile diff|ladder|adopt|write|verify BOOK …`; `rh status [--write]` |
| `ladder.py`                      | `rhemes/ladder.py`   | (library)                                    |
| `fidelity.py`, `jsonfmt.py`      | same names           | (library)                                    |
| `ocrpages.py`, `transkribus.py` readers | `rhemes/sources.py` | `rh ocr-split STRIP_DIR XML_DIR [OUT]` (the transkribus splitter) |
| `wikifetch.py`                   | `rhemes/wikifetch.py`| `rh fetch FIRST-LAST OUT_DIR [--index …]`    |
| `check_live_edits.py`            | `rhemes/livecheck.py`| `rh live-check …` (same arguments)           |
| `wikipost.py`                    | `rhemes/wikipost.py` | `rh post …` (same arguments)                 |
| `ornaments.py`, `cropsheet.py`   | same names           | `rh crops …` for cropsheet; ornaments is a library |

Not moved (Phase 4 turns them into detectors, Phase 5 deletes the rest): `apply_*`, `audit_all_*`, `autofix`, `backfill_*`, `build_matthew_replacements`, `check_live_linter`, `fix_*`, `longs`, `publish`, `remove_verse_daggers`, `update_ot_index`. Where one of them imports a moved module (`import jsonfmt`, `import ocrpages`), the shim keeps it working.

## Review Focus

1. **A shim imported as a library** (`import ladder` in a one-off script or in a test, then `monkeypatch.setattr(ladder, …)`): it must give the real module object, not a copy, so patches reach the code. Test: `test_shim_is_the_module` (Task 1).
2. **Running from another folder or as `python3 -I`** (the agent's usual call, and `reconcile.generate_book`'s subprocess): `rh.py` and the shims must work with no `PYTHONPATH` and any working directory. Test: `test_rh_runs_isolated_from_elsewhere` (Task 1).
3. **A data change by the concurrent session during the phase**: the equivalence check must compare old code and new code on the same data, not a stale baseline against new data. Handled by `equivalence.sh` running the base commit's code on the current data (Task 0).
4. **The lock left behind after a crash, or held by the other session**: `data_lock()` must remove it on an exception and refuse (not wait forever, not remove it) when it already exists. Tests: `test_lock_released_on_error`, `test_lock_refuses_when_held` (Task 4).
5. **books.json written back by a tool** (`reconcile status --write` or a future `rh` command): the new nested keys must survive and keep the file's layout. Test: `test_books_json_round_trip` (Task 5).

---

### Task 0: Baseline and equivalence check

**Files:**
- Create (ignored, not committed): `.superpowers/sdd/2026-11-21-wikisource-phase3/equivalence.sh`, `progress.md`

- [ ] **Step 1: Write `equivalence.sh CODE_ROOT OUT_DIR`.** It runs, from `CODE_ROOT` and with `RHEMES_XML` set to the NT repo's `A16049.xml`, each of these into its own file in `OUT_DIR`: `triage.py` (overview); for each book in `books.json`: `triage.py BOOK --detail all --tsv`, `xml_json_diff.py BOOK out.tsv`, `ocrdiff.py BOOK OUT_DIR/ocr-BOOK`, `reconcile.py diff BOOK`; then `reconcile.py status` and `lint.py … --quiet`. After Task 1 it calls the same tools through `rh.py`, chosen by whether `CODE_ROOT/scripts/wikisource/rh.py` exists.
- [ ] **Step 2: Make the base tree.** `git worktree add $SCRATCH/phase3-base <BASE>` (BASE = this plan's commit). Before each comparison, copy the current `static/data/odr-original`, `static/data/odr`, `wikisource/1582-rhemes-nt/{pages,manifest.json,books.json,reconcile}` into it, so both runs read the same data. Make the XML available at the base tree's old path: `mkdir -p sources/eebo-tcp && ln -s <NT repo>/A16049.xml sources/eebo-tcp/` there (ignored by `.gitignore:58`).
- [ ] **Step 3: Capture.** Run it on the base tree. Expected: no `ERROR` lines in the triage overview (the symlink fixes the missing XML).
- [ ] **Step 4: Compare.** `equivalence.sh <worktree> new/` then `diff -r base/ new/`. Expected now: identical (no code changed yet). The equivalence check after each later task means: rerun Step 2's copy, both runs, and `diff -r` shows no difference.

### Task 1: Move the tools into `rhemes/`, with `rh.py` and shims

**Files:**
- Create: `scripts/wikisource/rhemes/__init__.py` (empty), `rhemes/paths.py`, `scripts/wikisource/rh.py`, `scripts/wikisource/_shim.py`
- Move (`git mv`): the tools in the table above. The old paths become shims.
- Modify: every moved module (imports, `REPO`/`HERE` paths, `main`), `tests/*.py` imports, `reconcile.generate_book`
- Test: `tests/test_rh.py`

**Interfaces:**
- Produces: `rhemes.paths`: `REPO: Path`, `WS = REPO/'wikisource/1582-rhemes-nt'`, `PAGES = WS/'pages'`, `MANIFEST = WS/'manifest.json'`, `BOOKS_JSON = WS/'books.json'`, `DATA = REPO/'static/data/odr-original'`, `DATA_ODR = REPO/'static/data/odr'`, `HERE = REPO/'scripts/wikisource'`, `RH = HERE/'rh.py'`.
- Produces: every moved tool exposes `main(argv: list[str]) -> int | None`. Tools that read `sys.argv` now (`lint`, `wikipost`, `wikifetch`, `livecheck`, `ocrdiff`, `transkribus`, `xmldiff`, `cropsheet`) take `argv` instead. Inside the package, imports are relative (`from . import fidelity`) and the `sys.path.insert` lines go.
- Produces: `rh.py`: `COMMANDS: dict[str, tuple[str, list[str]]]`, mapping each command to (module name, leading argv). `diff xml` and `diff ocr` are two words. `status` maps to `reconcile` with `['status']`. Unknown or missing command: print the command list and exit 2.
- Produces: `_shim.run(module: str, new_cmd: str)`: in a shim file the whole body is `import _shim; _shim.run('rhemes.ladder', 'rh.py …')` after the `sys.path` line. Imported, it does `sys.modules[__name__] = importlib.import_module(module)`. Run as a script, it prints `<old>.py is now: python3 -I scripts/wikisource/rh.py <cmd>` to stderr and calls `main(sys.argv[1:])`.

- [ ] **Step 1: Write the failing tests** in `tests/test_rh.py`:
  - `test_shim_is_the_module`: `import ladder, rhemes.ladder; assert ladder is rhemes.ladder`.
  - `test_rh_lists_commands`: `subprocess.run([sys.executable, '-I', RH], cwd=tmp_path)` exits 2, and its stdout names `generate`, `lint`, `triage`, `diff xml`, `diff ocr`, `reconcile`, `status`, `fetch`, `live-check`, `post`, `ocr-split`, `crops`.
  - `test_rh_runs_isolated_from_elsewhere`: `rh.py lint <pages> --only E-ls --quiet`, with `cwd=tmp_path` and `env={}`, exits 0 and prints `0 error(s)`.
  - `test_old_name_prints_new_command`: `python3 -I scripts/wikisource/lint.py <pages> --quiet` prints `rh.py lint` on stderr and the same stdout as `rh.py lint`.
- [ ] **Step 2: Run** `python3 -m pytest -q scripts/wikisource/tests/test_rh.py`. Expected: 4 failed (no `rh.py`, no package).
- [ ] **Step 3: `git mv` each tool, rewrite imports and paths to `rhemes.paths`, write `rh.py`, `_shim.py` and the shims.** `reconcile.generate_book` calls `[sys.executable, '-I', str(RH), 'generate', …]`. Tests import `from rhemes import ladder` etc.; `conftest.py` keeps its one `sys.path` line.
- [ ] **Step 4: Verify.** The full suite passes, the golden tests pass (`-m "slow or not slow"`), lint shows 0 errors, and the Task 0 equivalence `diff -r` is empty.
- [ ] **Step 5: Commit** `refactor(wikisource): tools move into rhemes/ behind rh.py; old names are shims`.

### Task 2: `rhemes/text.py`, one home for folding and wiki text helpers

**Files:**
- Create: `rhemes/text.py`; Test: `tests/test_text.py`
- Modify: `ladder.py` (`fold`, `core`), `triage.py` (`fold_char`, `fold_key`), `generate.py` (`norm`), `wikipost.py`/`wikifetch.py`/`livecheck.py` (`norm`, `norm_text`), `fidelity.py` (`plain`), the `{{ls}}`↔ſ replacements in `ladder.py:103` and elsewhere

**Interfaces:**
- Produces, each keeping its current behaviour exactly (they differ on purpose and stay separate):
  - `nfc(s: str) -> str`
  - `fold_word(w: str) -> str`: was `ladder.fold` (marks dropped, lower case, ſ→s, vv→w, v→u, j→i, only `a-zæœ` kept).
  - `core(w: str) -> str`: was `ladder.core`.
  - `fold_chars(s: str) -> str` and `fold_key(w: str) -> str`: were `triage.fold_char` and `triage.fold_key` (æ→ae, œ→oe; v and u kept apart).
  - `wiki_word_key(w: str) -> str`: was `generate.norm` (sentinels, drop cap and templates stripped, f→s, u→v). It needs `generate`'s `SENT` and `DROPI` patterns, which move here with it.
  - `wiki_to_plain(text: str) -> str`: was `fidelity.plain`. `ls_to_wiki(s)` / `wiki_to_ls(s)`: ſ ↔ `{{ls}}`.
  - `pagequality_blank_user(t)`: was `wikifetch.norm` and `livecheck.norm_text` (identical). `pagequality_bare(t)`: was `wikipost.norm` (whole tag → `<pagequality />`).
- The old names stay as aliases in their modules (`fold = text.fold_word`), so call sites and other callers don't change in this task.

- [ ] **Step 1: Write the failing tests.** For each function, 3–5 pinned cases taken by running the current code. Include at least `fold_word('Vvhē') == 'whe'` (the macron is dropped, not expanded), `fold_word('ſ') == 's'`, `fold_key('æneas,') == 'aeneas'`, `fold_key('Æneas') == 'neas'` (current behaviour: capital Æ is not folded; pin it, don't fix it here), `core('“ſinne,”') == 'ſinne'`, `ls_to_wiki('poſſible') == 'po{{ls}}{{ls}}ible'`. Add `test_old_names_alias` (`ladder.fold is text.fold_word`, `triage.fold_key is text.fold_key`, `generate.norm is text.wiki_word_key`).
- [ ] **Step 2: Run them.** Expected: fail on the import.
- [ ] **Step 3: Move the bodies into `text.py`** unchanged, and replace each original with its alias.
- [ ] **Step 4: Verify** as in Task 1 Step 4, golden included.
- [ ] **Step 5: Commit** `refactor(wikisource): text.py holds the folding and wiki-text helpers`.

### Task 3: `rhemes/sources.py`, one loader per source, and one XML path

**Files:**
- Create: `rhemes/sources.py`; Test: `tests/test_sources.py`
- Modify: `xmldiff.py:13` (the broken `sources/eebo-tcp` path), `ladder.py:26` (`XML`), `ocrpages`/`transkribus` readers (moved in here), `reconcile.py` (`ocr_by_page`, `load_books` import), `ladder.book_files`, `generate.load_books`, `triage.load_accepted` (it stays in triage: one caller)

**Interfaces:**
- Produces:
  - `xml_path() -> Path`: `RHEMES_XML` if set, else `~/Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml`. It is the only place the path appears. `xml_text() -> str` is cached.
  - `load_books() -> dict` (the raw books.json; Task 5 adds typed access), `manifest() -> dict`, `committed_page(n: int) -> str`, `data_files(book) -> list[Path]` (was `ladder.book_files`).
  - The OCR readers now in `ocrpages.py`: `book_pages(book, source=None)`, `read_tsv`, `TK`, `SCAN` and the helpers `generate` and `ocrdiff` use, plus `transkribus.read_strip`, `tag_margins` and `PAGE_W`; and `ocr_by_page(book, source) -> dict[int, str]` (was in `reconcile`). The `ocrpages` module name is kept as an alias module (`rhemes/ocrpages.py` = `from .sources import *` plus its underscored names), since one-offs import it.
- The `rh ocr-split` command stays in `rhemes/transkribus.py` (the splitter CLI), importing its readers from `sources`.

- [ ] **Step 1: Write the failing tests.** `test_xml_path_env(monkeypatch, tmp_path)`: with `RHEMES_XML` set to a file in tmp, `sources.xml_path()` returns it. `test_xml_path_single_place`: grep the `rhemes/` sources; `A16049.xml` appears only in `sources.py`. `test_triage_runs_without_sources_dir`: `rh.py triage` in this worktree (no `sources/eebo-tcp`) prints no `ERROR` line; skip if the NT repo XML is absent.
- [ ] **Step 2: Run them.** Expected: the last two fail (two XML paths; triage errors for every book).
- [ ] **Step 3: Implement**, moving each body unchanged and pointing callers at `sources`.
- [ ] **Step 4: Verify** as in Task 1 Step 4, golden included. Then remove the base tree's `sources/eebo-tcp` symlink: the new code must not need it, and the base code still does.
- [ ] **Step 5: Commit** `refactor(wikisource): sources.py loads every source; one A16049.xml path (fixes triage in worktrees)`.

### Task 4: `rhemes/lock.py`, the data lock as a context manager

**Files:**
- Create: `rhemes/lock.py`; Test: `tests/test_lock.py`
- Modify: `reconcile.py` (`git_lock`, `cmd_adopt`, `cmd_write`), `ladder.adopt` (it takes a lock path and does mkdir/rmdir itself)

**Interfaces:**
- Produces: `lock_path() -> Path` (`git rev-parse --git-common-dir` + `/odr-data.lock`, as `reconcile.git_lock` now), and `data_lock(path: Path | None = None)`, a context manager. It runs `mkdir(path)`; if the folder already exists it raises `LockHeld(path)` with the message `data lock held: <path> (another writer, or a crash: check, then rmdir it)`. It runs `rmdir` on exit, even after an exception.
- `ladder.adopt(files, decisions, ov)` loses its `lock` parameter; the caller holds the lock. `reconcile write` now holds it around `write_pages`, as RULES §6.2 requires (it held none before).

- [ ] **Step 1: Write the failing tests.** `test_lock_released_on_error`: an exception raised inside `with data_lock(p)` leaves `p` absent. `test_lock_refuses_when_held`: with `p.mkdir()` done first, `data_lock(p)` raises `LockHeld` and `p` still exists afterwards. `test_lock_path_is_common_dir`: in this worktree, `lock_path().parent` equals `git rev-parse --git-common-dir`, resolved. Update `test_reconcile.py`'s adopt test for the new signature.
- [ ] **Step 2: Run them.** Expected: fail on the import.
- [ ] **Step 3: Implement**, and replace both callers.
- [ ] **Step 4: Verify** as in Task 1 Step 4 (golden not needed: no generator change).
- [ ] **Step 5: Commit** `refactor(wikisource): lock.py; reconcile write now holds the data lock`.

### Task 5: Per-book config: `books.json`, `rhemes/config.py`, `rhemes/overrides.py`

**Files:**
- Create: `rhemes/config.py`, `rhemes/overrides.py`; Test: `tests/test_config.py`
- Modify: `wikisource/1582-rhemes-nt/books.json`, `rhemes/generate.py` (the tables at lines 30–64 and the code-shaped tables after them)

**Interfaces:**
- `books.json` gains, per book, only where the generator now has a value: `"ocr"` (was `OCR_SOURCE`; default `"tesseract"`), `"title_end"` (`TITLE_END`), `"argument_page"` (`ARGUMENT`), `"argument_intros"` (`ARGUMENT_INTROS`), `"argument_roman": true` (`ARGUMENT_ROMAN`), `"first_head_cha": true` (`FIRST_HEAD_CHA`), `"scripture_pages"` (`SCRIPTURE_PAGES`), `"running": [verso, recto]` (`RUNNING`), `"holy_week": {"first", "last", "skip": [...]}` (`HOLY_WEEK`). The existing keys and the tab indentation stay. A book becomes a multi-line object when it has more than the four current keys.
- `config.py` produces `Book` (a NamedTuple with `name, first, last, ornaments, golden, ocr, title_end, argument_page, argument_intros, argument_roman, first_head_cha, scripture_pages, running, holy_week`, defaults as in the generator today) and `book(name: str) -> Book`, `books() -> dict[str, Book]`. Sets and tuples are rebuilt from JSON lists here.
- `overrides.py` holds, moved verbatim with their comments: `ARGUMENT_TITLES`, `ARGUMENT_BREAKS`, `ARGUMENT_SPLIT`, `INNER_ARGUMENT_NOTES`, `SUMMARY_STARS`, `SIDE_SC`, `PAREN_TITLES`, `OUTER_NOTES`, `CREND_AT`, `BARS`, `PAGE_STARTS`, `CATCHWORDS`, `SPLIT_WORDS`, `MANUAL_PARAS`, `NO_PARAS`. Whatever is a pattern or a constant of the print (`ITALIC_REF`, `ROMAN`, `SENT`, `CAPS_RUN`, …) stays in `generate.py`.
- `generate.py` reads `config.book(BOOK)` and `overrides.*`. `WS_OCR` still overrides `ocr`.

- [ ] **Step 1: Write the failing tests.** `test_config_matches_old_tables`: for every book, `config.book(b)` has the values the generator's tables had at the base commit (load them by `git show <BASE>:scripts/wikisource/generate.py` and `exec` only the table assignments, or pin them as literals in the test). `test_books_json_round_trip`: `jsonfmt.write_like` of the loaded books.json reproduces the file byte for byte. `test_generator_has_no_book_tables`: `rhemes/generate.py` assigns none of the moved names at module level.
- [ ] **Step 2: Run them.** Expected: fail on the import.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify** as in Task 1 Step 4, golden included: this is the task that can break the pages.
- [ ] **Step 5: Commit** `refactor(wikisource): per-book generator config in books.json; code-shaped patches in overrides.py`.

### Task 6: Docs and the commands they name

**Files:**
- Modify: `wikisource/1582-rhemes-nt/PLAYBOOK.md`, `RULES.md` (the enforcer names in "Enforced by:" lines and the index), `README.md`, `AGENTS.md` §1 (rule 5's commands), `tests/test_docs.py` (the list of known enforcers)

- [ ] **Step 1: Write the failing test.** `test_docs_name_rh_commands` in `test_docs.py`: no doc names a moved tool by its old script name (`triage.py`, `reconcile.py`, `lint.py`, `generate.py`, `wikipost.py`, `wikifetch.py`, `check_live_edits.py`, `ocrdiff.py`, `xml_json_diff.py`, `transkribus.py`), and every `rh.py <cmd>` in the docs is a key of `rh.COMMANDS`.
- [ ] **Step 2: Run it.** Expected: fail, listing the old names in PLAYBOOK and AGENTS.
- [ ] **Step 3: Update the docs.** PLAYBOOK's "Start a new book" step 2 now says: set the book's keys in `books.json`, and add `overrides.py` entries only where the print needs them. Drop the "Phase 3 will put them behind one `rh` command" sentence.
- [ ] **Step 4: Verify.** Full suite, lint, and prettier (run from the main checkout, read-only) on the changed `.md` files.
- [ ] **Step 5: Commit** `docs(wikisource): playbook and rules name rh commands`.

### Task 7: Whole-branch review

- [ ] Final equivalence run (Task 0 Step 4) and golden. Then one review of the Phase 3 range on the most capable model, against this plan and spec §4.3. Fix what it finds, with a failing test first wherever one can be written.

## Owner calls in this plan (open to correction)

- `rh reconcile <sub>` keeps reconcile's subcommands under one name; `rh status` is the one alias, since the spec lists it.
- Two commands beyond the spec's list: `rh ocr-split` (the Transkribus splitter) and `rh crops` (cropsheet, for the scan collages). Both are working tools the playbook uses.
- `xml_json_diff` is renamed `xmldiff` and `check_live_edits` is renamed `livecheck` inside the package; the shims keep the old names.
- The concurrent session: while Phase 3 runs, it should commit only data, pages and `reconcile/` files. Any commit it makes to a moved script must be ported into `rhemes/`. Before each task, I'll check `git log` for such commits.
