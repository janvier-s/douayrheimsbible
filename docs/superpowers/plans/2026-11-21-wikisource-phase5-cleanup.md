# Wikisource Pipeline Refactor, Phase 5 (Remove the One-offs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `scripts/wikisource/` holds only the `rhemes/` package, `rh.py`, `_shim.py`, the shims and `tests/`; every deleted script is listed in `docs/archive/scripts.md` with its last commit; the deferred Phase 4 minors are closed.

**Architecture:** Deletion is proved, not assumed: the ledger replay tests (`tests/test_ledger_replay.py`) already prove the XML and JSON one-offs are covered by ledger entries, and a new layout test pins the spec's exit criterion so a one-off can't come back. No pipeline behaviour changes, except three small fixes (the `status --write` lock, a dead constant, a clear error for a book without `running`).

**Tech Stack:** Python 3 stdlib, pytest. Run scripts as `python3 -I`.

**Spec:** `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md` §5 (Phase 5 row), §8. Handoff: `docs/superpowers/handoffs/2026-11-21-wikisource-phase5.md`.

## Global Constraints

- Exit criterion (spec §5): "`scripts/wikisource/` holds only the package, `rh.py`, shims and tests".
- One-off scripts are deleted, not archived (owner). `docs/archive/scripts.md` lists each one with its last commit.
- Shims stay in Phase 5 (they are removed in a later release, spec §4.3). `_shim.py` stays.
- Never edit a generated page, never post, never push, never merge, never touch the main checkout.
- **Shared branch.** Another session works on this branch and may change `wikisource/1582-rhemes-nt/fixes/*.jsonl`, `docs/audits/*`, `scripts/wikisource/rhemes/detectors/`, `tests/test_detectors.py` and `static/data/odr-original`. Don't edit those. Before each commit, run `git log --oneline -5` and `git status --short`, and stage only this task's files **by path** (never `git add -A` or `git add .`). Deletions are staged with `git rm <path>`.
- Before each commit: `python3 -m pytest -q scripts/wikisource/tests` (all pass) and `python3 -I scripts/wikisource/rh.py lint wikisource/1582-rhemes-nt/pages --quiet` (0 errors; the 28 `W-header` warnings on the front matter are expected).

## Recon (done while writing this plan, 2026-11-21)

No deletion candidate is imported by `rhemes/`, `rh.py`, a shim or a test, and none is named in RULES, PLAYBOOK, BOOKS or AGENTS. **None is needed by the detectors:** `apply_wordfixes.py` imports `find_text` from the `apply_wvv` shim (the dependency runs the other way), and `tests/test_detectors.py` reads the *old* `autofix.py`/`apply_wvv.py`/`longs.py` from git at `OLD_REV`, and runs the `longs.py` shim, which stays. The only live mentions are comments (`rhemes/ladder.py:260`, `tests/test_ladder.py:158`: history, kept as is), `wikisource/1582-rhemes-nt/README.md:15` (`audit_all_front.py`) and `.prettierignore:8` (`publish.py`). Historical logs in `docs/audits/` and `docs/superpowers/` keep their mentions.

| Script | Last commit | Covered by |
| --- | --- | --- |
| `backfill_front_xml.py` | e2078fc4 (2026-11-19) | XML entries; `test_xml_ledger_replays_history` (writes only `A16049.xml`) |
| `backfill_matthew_xml.py` | 00c03647 (2026-11-19) | same |
| `backfill_mark_xml.py` | 765ce6b8 (2026-11-19) | same |
| `backfill_luke_xml.py` | b2c6edae (2026-11-19) | same |
| `backfill_john_xml.py` | 392bc00c (2026-11-19) | same |
| `fix_microfilm_duplicates.py` | 43ef5017 (2026-11-19) | same |
| `apply_wordfixes.py` | a6a5d953 (2026-11-18) | JSON entries "applied in b2c6edae / 98229fd0"; `test_json_entries_replay_history` |
| `fix_john_argument.py` | 392bc00c (2026-11-19) | JSON entries "applied in 392bc00c" |
| `fix_john_argument2.py` | 6247b7af (2026-11-19) | JSON entries "applied in 6247b7af" |
| `fix_john_argument3.py` | f87d3353 (2026-11-19) | JSON entries "applied in f87d3353" |
| `apply_longs_pages.py` | ad72d293 (2026-11-19) | page sweep; its stem list's effect is handled by `ladder.py` (comment at :260) |
| `fix_live.py` | ad72d293 (2026-11-19) | page sweep of live pages; superseded by `rh.py fix propose-live` + the ledger |
| `remove_verse_daggers.py` | cff02c6f (2026-11-19) | page sweep; the dagger rule was retired in Phase 0 and the generator emits none |
| `build_matthew_replacements.py` | 00c03647 (2026-11-19) | one-off over `docs/audits/matthew_267_full.json`; its XML result is in the XML entries |
| `audit_all_267.py` | 00c03647 (2026-11-19) | one-off, same input; superseded by `rh.py triage` / `diff` |
| `audit_all_front.py` | e2078fc4 (2026-11-19) | one-off front-matter audit; superseded by `rh.py triage front` |
| `publish.py` | ffbc5178 (2026-11-16) | superseded by `rh.py reconcile write` (writes pages and manifest) |
| `check_live_linter.py` | 494f0400 (2026-11-20) | **owner decision 1** |
| `update_ot_index.py` | ad72d293 (2026-11-19) | **owner decision 2** |

## Owner decisions needed before execution

1. **`check_live_linter.py`** (asks MediaWiki's Parsoid linter about live pages; no `rh.py` equivalent). Recommended: **delete** (posting is paused, `rh.py lint` covers the §4.7 conformance rules locally, git history keeps it). Alternative: move it into `rhemes/livelint.py` behind `rh.py live-lint` (one more task).
2. **`update_ot_index.py`** (posts the Index pages of the 1609/1610 Old Testament volumes: outside the 1582 NT pipeline). Recommended: **delete** (a one-off from 2026-11-19; history keeps it). Alternative: move it to `scripts/wikisource-ot/update_ot_index.py` unchanged.
3. **`wikisource/1582-rhemes-nt/front-draft/`** (30 older drafts of pages 1–30, used only by `audit_all_front.py`). Recommended: **keep** it and say in README that its tool is gone; deleting data is outside this phase. Alternative: delete it in Task 2.

The tasks below assume the recommended answers. If the owner picks an alternative, Task 2 changes as noted there.

## Review Focus

1. **A deleted script still referenced somewhere live** (a doc a person follows, `.prettierignore`, a `sys.path` import): the reader expects every named script to exist. Pinned by `test_docs_name_no_deleted_script` (Task 2).
2. **A new one-off creeping back into `scripts/wikisource/`**: pinned by `test_scripts_dir_holds_only_package_rh_shims_tests` (Task 2).
3. **A shim whose target module was deleted**: every remaining shim must still import. Pinned by `test_every_shim_imports` (Task 2).
4. **`status --write` racing another writer** on `manifest.json`: it must refuse while the lock is held, and plain `status` must still work (read-only). Pinned in Task 3.
5. **Adding a book without `running`**: `rh.py generate` should name the missing key, not raise `TypeError: cannot unpack non-iterable NoneType`. Pinned in Task 3.

---

### Task 1: Delete the data one-offs the ledger covers, and start the archive index

**Files:**
- Create: `docs/archive/scripts.md`
- Delete: `scripts/wikisource/backfill_{front,matthew,mark,luke,john}_xml.py`, `scripts/wikisource/fix_microfilm_duplicates.py`, `scripts/wikisource/apply_wordfixes.py`, `scripts/wikisource/fix_john_argument.py`, `scripts/wikisource/fix_john_argument2.py`, `scripts/wikisource/fix_john_argument3.py`

**Interfaces:**
- Produces: `docs/archive/scripts.md` with a table `| Script | Last commit | What it did | Replaced by |`, one row per deleted script, script names as `` `scripts/wikisource/<name>.py` ``. Task 2 appends rows and its test reads the first column.

- [ ] **Step 1: Prove coverage before deleting.** Run `python3 -m pytest -q scripts/wikisource/tests/test_ledger_replay.py -rs`. Expected: all pass, **no skips** (a skip means the XML repo isn't reachable and coverage is unproved: stop and report). Then for each JSON one-off confirm its commit is named in an entry: `grep -c "applied in <hash>" wikisource/1582-rhemes-nt/fixes/*.jsonl` for 392bc00c, 6247b7af, f87d3353, and for `apply_wordfixes.py` the commit(s) that ran it (`git log --format=%h -- scripts/wikisource/apply_wordfixes.py`, then grep each; at least one of those commits must have a hit, since a commit may have edited the script without running it). Each of the three John commits must have ≥1 hit. A missing hit: stop and report it in the task summary instead of deleting that script.
- [ ] **Step 2: Write `docs/archive/scripts.md`.** One intro paragraph: deleted in Phase 5 of the pipeline refactor (owner, 2026-11-21); git history keeps them; restore one with `git show <commit>:scripts/wikisource/<name>.py`. Then the table with the ten rows from the Recon table above; "Replaced by" names the ledger (`fixes/<book>.jsonl`, `rh.py fix apply`) and the replay test.
- [ ] **Step 3: Delete.** `git rm` the ten files.
- [ ] **Step 4: Verify.** pytest and lint per Global Constraints. Expected: same pass count as before minus nothing (no test imported these).
- [ ] **Step 5: Commit** (stage `docs/archive/scripts.md` by path; the `git rm`s are already staged). Message: `chore(wikisource): delete the XML backfills and JSON one-offs; the ledger replays them`.

### Task 2: Delete the page sweeps and one-offs; pin the exit criterion

**Files:**
- Create: `scripts/wikisource/tests/test_layout.py`
- Modify: `docs/archive/scripts.md` (append rows), `wikisource/1582-rhemes-nt/README.md:15`, `.prettierignore:8`
- Delete: `scripts/wikisource/{apply_longs_pages,fix_live,remove_verse_daggers,build_matthew_replacements,audit_all_267,audit_all_front,publish,check_live_linter,update_ot_index}.py`

**Interfaces:**
- Consumes: `docs/archive/scripts.md` table from Task 1.

- [ ] **Step 1: Write the failing tests** in `tests/test_layout.py`:

```python
HERE = Path(__file__).resolve().parents[1]          # scripts/wikisource
REPO = HERE.parents[1]
LIVE_DOCS = [REPO / 'AGENTS.md', REPO / '.prettierignore',
             *(REPO / 'wikisource/1582-rhemes-nt').glob('*.md')]

def is_shim(p): return 'import _shim' in p.read_text()

def test_scripts_dir_holds_only_package_rh_shims_tests():
    entries = {p.name for p in HERE.iterdir() if not p.name.startswith('.') and p.name != '__pycache__'}
    assert entries - {'rhemes', 'tests'} == {p.name for p in HERE.glob('*.py')}   # no other dirs or files
    extra = [p.name for p in HERE.glob('*.py') if p.name not in ('rh.py', '_shim.py') and not is_shim(p)]
    assert extra == []

def test_every_shim_imports():
    # each shim's _shim.run(__name__, 'rhemes.X', …) module must import
    for p in HERE.glob('*.py'):
        if is_shim(p):
            mod = re.search(r"_shim\.run\(__name__, '([\w.]+)'", p.read_text()).group(1)
            importlib.import_module(mod)

def test_docs_name_no_deleted_script():
    deleted = re.findall(r'`scripts/wikisource/(\w+\.py)`', (REPO / 'docs/archive/scripts.md').read_text())
    assert len(deleted) == 19
    for doc in LIVE_DOCS:
        text = doc.read_text()
        assert [d for d in deleted if d in text] == [], doc
```

- [ ] **Step 2: Run them.** `python3 -m pytest -q scripts/wikisource/tests/test_layout.py`. Expected: the first fails (lists the nine scripts), the third fails (`len == 10`), the second passes.
- [ ] **Step 3: Delete and document.** `git rm` the nine scripts. Append their nine rows to `docs/archive/scripts.md` from the Recon table (for `check_live_linter.py` and `update_ot_index.py`, say what they did and "nothing (owner, 2026-11-21)"). README:15: keep `front-draft/`, say it holds the older drafts of pages 1–30 that the deleted `audit_all_front` compared against (don't write the `.py` name, or the test trips; the archive is the place that names it). `.prettierignore:8`: the comment names `rh.py reconcile write` instead of `publish.py`.
  - *If the owner chose the alternative for decision 1:* instead of deleting `check_live_linter.py`, move it to `rhemes/livelint.py` (imports via the package, `main(argv)`), register `'live-lint': ('livelint', [])` in `rh.py`, add a shim `check_live_linter.py`, and drop its row (the count becomes 18). *Decision 2 alternative:* `git mv` it to `scripts/wikisource-ot/` and drop its row. *Decision 3 alternative:* `git rm -r wikisource/1582-rhemes-nt/front-draft` and remove it from README.
- [ ] **Step 4: Run all three tests, then the full suite and lint.** Expected: all pass, lint 0 errors.
- [ ] **Step 5: Commit** (stage the test, `docs/archive/scripts.md`, README, `.prettierignore` by path). Message: `chore(wikisource): delete the page sweeps and one-offs; pin the Phase 5 layout`, naming the owner's three decisions in the body.

### Task 3: Close the deferred Phase 4 minors

**Files:**
- Modify: `scripts/wikisource/rhemes/reconcile.py` (`cmd_status`, ~:164), `scripts/wikisource/rhemes/generate.py` (:25 and `main`, ~:746)
- Test: `scripts/wikisource/tests/test_reconcile.py`, `scripts/wikisource/tests/test_generate_units.py`

**Interfaces:**
- Consumes: `rhemes.lock.data_lock(path)`, `lock_path()` (`RHEMES_LOCK` env overrides), `LockHeld`; already imported in `reconcile.py` (used by `cmd_write`).

- [ ] **Step 1: Write the failing tests.**

```python
# test_reconcile.py
def test_status_write_holds_lock(tmp_path, monkeypatch):
    from rhemes import reconcile
    from rhemes.lock import LockHeld
    (tmp_path / 'manifest.json').write_text('{}\n')
    monkeypatch.setattr(reconcile, 'MANIFEST', tmp_path / 'manifest.json')
    monkeypatch.setattr(reconcile, 'mark_status', lambda *a, **k: {})
    monkeypatch.setenv('RHEMES_LOCK', str(tmp_path / 'lock'))
    (tmp_path / 'lock').mkdir()
    reconcile.main(['status'])                          # read-only: works while the lock is held
    with pytest.raises(LockHeld, match='data lock held'):
        reconcile.main(['status', '--write'])

# test_generate_units.py
def test_book_without_running_names_the_key(tmp_path):
    r = subprocess.run([sys.executable, '-I', *GEN, str(REPO), 'no-such-book', '452', str(tmp_path / 'out')],
                       capture_output=True, text=True)
    assert r.returncode != 0
    assert "'running'" in r.stderr and 'TypeError' not in r.stderr
```

- [ ] **Step 2: Run them.** Expected: the first fails (no `LockHeld`), the second fails (a `TypeError` traceback, or some other error before it: if so, the check goes earlier, see Step 3).
- [ ] **Step 3: Fix.** `cmd_status`: re-read the manifest and `write_like` it inside `with data_lock(lock_path()):` only when `write`. `generate.main`: right after `CFG = config.from_dict(...)`, `if CFG.running is None: sys.exit(f"books.json {BOOK}: no 'running' ([verso, recto] running heads); add it first (PLAYBOOK 'Start a new book')")`. Delete the dead `BOOKS_JSON` constant at `generate.py:25` (check with `grep -n BOOKS_JSON scripts/wikisource/rhemes/generate.py` that it is the only use).
- [ ] **Step 4: Run the full suite (golden tests included) and lint.** Expected: all pass; the golden tests prove `generate` output is unchanged for every committed book.
- [ ] **Step 5: Commit** (stage the four files by path). Message: `fix(wikisource): status --write holds the lock; a book without running names the key; drop dead BOOKS_JSON`.

### Task 4: Phase 5 close-out

**Files:**
- Modify: `docs/superpowers/handoffs/2026-11-21-wikisource-phase5.md` (append a "Done" section)

- [ ] **Step 1: Verify the exit criterion by hand.** `ls scripts/wikisource` shows only `rhemes/`, `tests/`, `rh.py`, `_shim.py` and the shims; `python3 -I scripts/wikisource/rh.py` prints its command list; one shim still forwards, e.g. `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (same output as `rh.py lint`).
- [ ] **Step 2: Append "Done (Phase 5)"** to the handoff: the commits, the owner's three decisions, and what stays open: the shims (removed in a later release, spec §4.3), and the "For the owner" items the concurrent session is handling.
- [ ] **Step 3: Full suite + lint; commit** the handoff by path. Message: `docs(wikisource): Phase 5 done`.
- [ ] **Step 4: Whole-branch review** of `3b4c0b3b..HEAD` (only this plan's commits; skip the concurrent session's), then superpowers:finishing-a-development-branch **without merging or pushing** (owner's choice: the branch stays local).
