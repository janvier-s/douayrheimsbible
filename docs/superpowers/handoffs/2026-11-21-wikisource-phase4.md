# Handoff: Wikisource pipeline refactor, Phase 4 onward

## Where things are

- Worktree `douayrheimsbible-ws-phase0`, branch `wikisource-refactor-phase0`. It is unmerged and unpushed by the owner's choice: don't merge, push or touch the main checkout (read-only `npx prettier --check <absolute paths>` from the main checkout is fine; this worktree has no `node_modules`).
- Phases 0–3 of the spec are done.
  - Phase 2 (docs): `wikisource/1582-rhemes-nt/RULES.md` is the authority, `PLAYBOOK.md` the workflow, `BOOKS.md` the status table; `scripts/wikisource/tests/test_docs.py` keeps them consistent with the lint codes and fidelity features.
  - Phase 3 (shared core and CLI, commits `0d66c19c..b2e965e1`): the tools live in `scripts/wikisource/rhemes/` and run as `python3 -I scripts/wikisource/rh.py <command>` (no command lists them). Shared modules: `paths.py`, `text.py` (folding), `sources.py` (every loader, one `A16049.xml` path), `lock.py` (`data_lock()`), `config.py` (per-book keys in `books.json`), `overrides.py` (per-page patches). The old script names are shims until Phase 5.
  - After Phase 3: `8532dc9c` fixed the OCR page keying after multi-page Arguments (Acts, Romans). Replaying all 377 recorded Acts/Romans ladder decisions changed no winner, so data and pages stand.
- Tests: `python3 -m pytest -q scripts/wikisource/tests` (206 pass, golden included when `~/facsimiles` OCR is present). Lint: `python3 -I scripts/wikisource/rh.py lint wikisource/1582-rhemes-nt/pages --quiet` (0 errors; 28 `W-header` warnings on the front matter, expected).
- A concurrent session may commit data fixes or posts on this branch. Before each task, check `git log` for commits you didn't make, and keep the docs in line with the code at HEAD.

## Read first (in this order)

1. `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md`: §4.4 (Fixes ledger), §5 (phases 4 and 5), §8 ("Rule-based fixers", "Live edits by others"), §9.
2. `wikisource/1582-rhemes-nt/RULES.md` §1 (the print wins; `odr-original` and the pages keep the print's misprints, only `odr` gets corrections) and §6 (data writes, the lock).
3. `wikisource/1582-rhemes-nt/PLAYBOOK.md`: the `rh.py reconcile` loop and "Sync odr" (step 10 of "Check a book against the scans"), which `rh sync-odr` replaces.
4. `docs/superpowers/plans/2026-11-21-wikisource-phase3-core-cli.md`: the format the owner approved for a phase plan (Global Constraints, Review Focus, tasks with Interfaces, TDD steps).
5. The scripts Phase 4 converts, each header docstring only: `scripts/wikisource/backfill_{matthew,mark,luke,john,front}_xml.py`, `apply_wordfixes.py`, `fix_john_argument{,2,3}.py`, `fix_microfilm_duplicates.py`, and the rule-based fixers `autofix.py`, `apply_wvv.py`, `longs.py`, `apply_longs_pages.py`.

## Owner's decisions (don't reopen them)

- Fidelity to the facsimile governs everything; the print wins (RULES §1). `odr-original` and the pages keep the print's misprints; only `odr` is corrected.
- Approach A of the spec: gradual cleanup, every phase behaviour-preserving or explicitly reconciled. Nothing is urgent.
- No posting to Wikisource without the owner's approval (RULES §7). Posting is from the owner's own account, 12 s apart.
- Ledger format: JSONL per book under `wikisource/1582-rhemes-nt/fixes/` (spec §8).
- One-off scripts are deleted in Phase 5, not archived; `docs/archive/scripts.md` lists each with its last commit.
- Rule-based fixers become detectors that propose ledger entries; past bulk passes count as one baseline (spec §8).
- Phase 3 rulings stand (`docs/superpowers/plans/2026-11-21-wikisource-phase3-core-cli.md` plus the commit messages).

## Constraints

- Scripts run as `python3 -I`; text is NFC; data JSON is written only through `jsonfmt.write_like()` under `rhemes.lock.data_lock()`.
- Never edit a generated page; fix the data or the generator and regenerate. `E-loss`/`E-shift` need a scoped override with a reason in the commit message.
- Before each commit: the pytest suite and lint (0 errors), as above.
- Scans are the last resort; read the XML and the OCR first.
- **Trap:** `rh.py reconcile ladder <book>` on an already-reconciled book finds no conflicts and overwrites `reconcile/<book>.jsonl` with an empty file. If it happens, `git restore` the file. To re-check recorded decisions, replay them read-only through `ladder.decide` instead.

## Your next step

Write the **Phase 4 plan** (fixes ledger, spec §4.4) with superpowers:writing-plans. Save it as `docs/superpowers/plans/2026-11-2x-wikisource-phase4-fixes-ledger.md`, commit it, and get the owner's review before executing. The owner has asked to run phases inline (superpowers:executing-plans) with one whole-branch review at the end.

What the plan must cover (spec §4.4, §5, §8):
- The record format `fixes/<book>.jsonl` (`id`, `target`, `loc`, `old`, `new`, `odr_new`, `evidence`, `date`, `note`), and a loader in `rhemes/`.
- `rh.py fix apply <book>`: a dry run by default; `old` must occur exactly once in scope; idempotent (`new` present and `old` absent counts as applied); runs the fidelity check, holds the data lock, writes through `write_like()`; edits `A16049.xml` text nodes without reserialising (bytes outside the edit unchanged). `rh.py fix check` reports each entry's state.
- Converting the backfills and one-offs into ledger entries. Exit proof: the full ledger applied to current data is a no-op, and applied to the pre-backfill git versions of the data it reproduces the current data.
- The rule-based fixers as detectors that propose entries instead of writing.
- `rh.py sync-odr <book>`: lists content differences between `odr` and `odr-original` and proposes entries; it never writes.
- Live edits by others (spec §8): a valid one becomes an entry with `evidence: "wikisource rev N by <user>"`.
- Optionally, from the Phase 3 deferred list: `reconcile ladder` refusing to overwrite a decisions file that has entries.

Deferred minors from the Phase 3 review (fold in only where a Phase 4 task touches the same code): `LockHeld` prints a traceback rather than a message; `status --write` and `reconcile ladder` write without the lock; a new book without `running` gives an unclear `TypeError`; a dead `BOOKS_JSON` constant in `rhemes/generate.py`; `test_rh_lists_commands` doesn't check `ornaments`; `fix_live.py` prints old script names (Phase 5).
