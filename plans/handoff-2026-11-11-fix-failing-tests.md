# Handoff: fix the failing unit tests that block the deploy

## Goal

`npm test` passes again, so the "Build and Deploy" workflow reaches the build and Cloudflare deploy steps. Nothing is deployed until it does.

## State (2026-11-11 evening)

- `main` is at the "prettier the spelling-toggle handoff note" commit, pushed. The spelling toggle is merged.
- Workflow steps: lint and check now pass (the only lint failure was an unformatted handoff note, fixed). The "Run unit tests" step fails, so build and deploy are skipped. Runs for `feat: self-hosted Facsimile tab`, `data: annotation review against Sancta` and the toggle merge all failed; the last green run was `fix(a11y): raise contrast...` (c6995b32).
- 29 tests fail in 4 files, locally and in CI. The same 29 fail on a clean checkout of b2e0381c (checked with a throwaway `git worktree`), so the spelling-toggle commit did not cause them.

## Failing files and likely cause

1. `scripts/export.corpus.test.ts` (13 failed) and `scripts/odr-lemmas.corpus.test.ts` (4 failed). Corpus tests with pinned counts that drifted after the annotation-review data commit (b2e0381c) and the unfinished review edits still in the working tree:
   - `expected 13723 to be 13606` (markers bound), `expected 23 to be 26` (unreferenced notes), `1619 vs 1618` lemma entries, `ExportError: 4-kings 14:6: 1 cross_refs with no marker`, `3-esdras 2:1` defects list.
   - Decide per test: fix the DATA (a real defect such as the 4-kings 14:6 cross-reference with no marker) or update the pinned number when the new count is correct. Read each assertion's comment before changing a number. Another session owns the annotation review (`plans/handoff-2026-11-11-annotation-review.md`), so coordinate and do not rewrite data content unasked.
   - `odr-lemmas.corpus.test.ts` checks `static/data/odr`. After any annotation title edit, rerun `npx tsx scripts/build-odr-lemmas.ts --write`, then `--dir=odr-original --write`.
2. `tests/unit/compare-store.test.ts` (9) and `tests/unit/prefs.test.ts` (3). Error is `TypeError: Cannot read properties of undefined (reading 'clear')` at the first `localStorage.clear()` (compare-store.test.ts:20, prefs.test.ts:6). The test environment has no `localStorage`. Check `vitest.config` (environment, setup file) and the Node version: the "known local vitest failure" in the earlier handoffs is probably this. CI shows the same, so it is not only local. Fix by stubbing `localStorage` in a setup file or switching these tests to a `jsdom`/`happy-dom` environment if one is installed.
3. Also note the `compare-store` tests did not cover the new `odr-orig` compare-only column: add one asserting `translationCoversBook('odr-orig', 'OT')` is true and that the saved-layout reset (order length check) still works.

## Steps

1. `npm test 2>&1 | grep -E "×|Error"` to list failures; work file by file.
2. Fix, then run `npm run lint && npm run check && npm test` (CI runs exactly these, then `npm run build`).
3. `npx prettier --write` any touched file, including notes under `plans/` (CI runs `prettier --check .` on committed files).
4. Commit only your own files (other sessions have uncommitted work in `static/data/odr/**` and `src/routes/about/**`), push, then watch the run: `gh run list --limit 1` and `gh run view <id> --log-failed`.
5. After the run goes green, confirm the deploy step succeeded and check the live site: `/odr/1-john/1?spelling=original` and `/compare/1-john/1` with the ODR-Orig pill.

## Gotchas

- Path has spaces and is iCloud; check for stale conflict copies (`"x 2.ts"`).
- Pushing to `main` deploys; GitHub reports a "required status check" bypass on direct pushes to `main`, so a red run does not stop the push.
- Do not rebuild `static/data/odr-original` without rerunning the lemma step afterwards.
