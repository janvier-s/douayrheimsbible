# Handoff: Wikisource pipeline refactor, Phase 5

## Where things are

- Worktree `douayrheimsbible-ws-phase0`, branch `wikisource-refactor-phase0`. It is unmerged and unpushed by the owner's choice: don't merge, push or touch the main checkout. Read-only `npx prettier --check <absolute paths>` from the main checkout is fine; this worktree has no `node_modules`.
- Phases 0–4 of the spec are done. Phase 4 (the fixes ledger) is commits `a3b391cf..` HEAD, with the plan in `docs/superpowers/plans/2026-11-21-wikisource-phase4-fixes-ledger.md`. Its rulings are in the commit messages and in `.superpowers/sdd/2026-11-21-wikisource-phase4-fixes-ledger/progress.md`.
  - **The ledger:** `wikisource/1582-rhemes-nt/fixes/<book>.jsonl` (plus `front` and `back`), with `rh.py fix check` and `rh.py fix apply` (`rhemes/fixes.py`). The format is RULES §6.5.
  - **The history as entries:** the XML's whole history since the EEBO-TCP import (`ee79a5e`), and the JSON one-offs `apply_wordfixes` and `fix_john_argument{,2,3}`. Tests replay both: the ledger applied to the import reproduces today's XML `<text>` byte for byte, and each JSON entry, re-applied to the data just before its commit, gives that commit's data.
  - **Detectors:** `rh.py detect stars|wvv|longs` (`rhemes/detectors/`) were `autofix.py`, `apply_wvv.py` and `longs.py`; those names are now shims. The detectors propose entries and never write. They were proved byte-identical to the old `--write`.
  - **`rh.py sync-odr`** (`rhemes/syncodr.py`) and **`rh.py fix propose-live`** (`rhemes/fixlive.py`) also only propose.
  - **`reconcile ladder`** refuses to replace a decisions file that has entries (`--overwrite` reruns it anyway) and holds the lock. The Phase 4 handoff's ladder trap is fixed.
- Tests: `python3 -m pytest -q scripts/wikisource/tests` (all pass). Lint: `python3 -I scripts/wikisource/rh.py lint wikisource/1582-rhemes-nt/pages --quiet` (0 errors; the 28 `W-header` warnings on the front matter are expected).
- A concurrent session may commit on this branch. Before each task, check `git log` for commits you didn't make.

## For the owner (found in Phase 4, not fixed)

- `docs/audits/2026-11-21-sync-odr-mark-john.md`: content and structure differences between `odr` and `odr-original` in Mark and John. They include a heading in John 10:11 versus 10:12, words present in only one text, `neere`/`need` and `cure`/`care`, and the print's reference letters, which odr drops.
- `rh.py detect wvv` on `docs/audits/{luke,john}-transkribus-findings.tsv` proposes 23 + 6 (Luke) and 21 + 1 (John) w/vv changes that were never applied. Some were settled another way (the John argument), so review them before appending any.
- `docs/audits/mark-transkribus-findings.tsv` predates the `occ` column, so `detect wvv` can't read it (the old script couldn't either).

## Read first

1. The spec, `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md`: §5 (Phase 5: `scripts/wikisource/` holds only the package, `rh.py`, the shims and the tests) and §8.
2. `wikisource/1582-rhemes-nt/RULES.md` §6 and `PLAYBOOK.md` "Record a fix".
3. The Phase 4 plan's format (Global Constraints, Review Focus, tasks with Interfaces, TDD steps).

## Owner's decisions (don't reopen them)

- The print wins (RULES §1). `odr-original` and the pages keep the print's misprints; only `odr` is corrected.
- No posting without the owner's approval (RULES §7).
- One-off scripts are deleted in Phase 5, not archived. `docs/archive/scripts.md` lists each one with its last commit.
- Past bulk passes count as one baseline; they are not ledger entries.

## Your next step

Write the **Phase 5 plan** with superpowers:writing-plans, and get the owner's review before you execute it. Candidates for deletion (check each against its ledger entries or `rh.py` command first):
- `backfill_{matthew,mark,luke,john,front}_xml.py`, `fix_microfilm_duplicates.py`: covered by the XML entries.
- `apply_wordfixes.py`, `fix_john_argument{,2,3}.py`: covered by the JSON entries.
- `apply_longs_pages.py`, `fix_live.py`, `remove_verse_daggers.py`, `build_matthew_replacements.py`, `audit_all_267.py`, `audit_all_front.py`, `check_live_linter.py`, `publish.py`, `update_ot_index.py`: page sweeps and one-offs. Check that each is unused first.

Deferred minors still open: `status --write` writes the manifest without the lock; `rhemes/generate.py` keeps a dead `BOOKS_JSON` constant; a new book without `running` gives an unclear `TypeError`; `fix_live.py` prints old script names (it goes in Phase 5 anyway).
