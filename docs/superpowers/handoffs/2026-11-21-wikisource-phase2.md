# Handoff: Wikisource pipeline refactor, Phase 2 onward

## Where things are

- Worktree `douayrheimsbible-ws-phase0`, branch `wikisource-refactor-phase0`. It is unmerged and unpushed by the owner's choice: don't merge, push or touch the main checkout.
- Phases 0 and 1 of the spec are done. All six books (Matthew–Romans) and the Acts and Epistles Arguments (314–316, 405–409) regenerate byte for byte (golden tests). The pages still frozen are 1–30, 309–313 and 402–404.
- On 2026-11-21 the owner approved reposting pages 1–451. All are posted, the manifest shows `status: posted` for every page, and a dry run reports 0 to post.
- Tests: `python3 -m pytest -q scripts/wikisource/tests -m "slow or not slow"` (138 pass). Lint: `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (0 errors; 28 `W-header` on front matter).

## Read first (in this order)

1. `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md`: the whole spec, especially §4.5 (Docs), §4.7 (conformance) and §5 (Phases).
2. `docs/audits/2026-11-21-phase1-reconcile.md`: what Phase 1 did, the ladder corrections, the frozen pages and the open items.
3. The current docs Phase 2 replaces: `AGENTS.md`, `wikisource/1582-rhemes-nt/RULES.md`, `PLAYBOOK.md`, `BOOKS.md` and `README.md`, plus `paste-sheet.md` and `scriptorium-request.md`.
4. `scripts/wikisource/lint.py` (header docstring): the lint codes each rule should name.

## Your next step

Write the **Phase 2 plan** (docs rewrite, spec §4.5) with superpowers:writing-plans. Save it as `docs/superpowers/plans/2026-11-2x-wikisource-phase2-docs.md`, commit it, and get the owner's review before executing it. Then execute it yourself (inline). The exit criterion from the spec is one rules doc, one playbook, a short AGENTS.md, and no contradictions.

What the plan must cover:
- **RULES.md** is the single authority. "The print wins" comes first. Every rule names the lint code or fidelity feature that enforces it, and every lint code and fidelity feature maps back to a rule. Check this both ways.
- It must include the rules decided during Phase 1:
  - long s inside `{{sc}}` is round s;
  - printer's signatures are omitted;
  - catchwords go in `{{continues}}`;
  - `{{nop}}` goes at a paragraph's foot;
  - plain `title=` on `{{hws}}`/`{{hwe}}`;
  - running heads in small caps: the middle title lowercase `{{sc|the gospel}}`, the side words capitalized (`{{sc|Cha. VI.}}`, `{{sc|Holy}} weeke.`), Roman numerals kept as capitals;
  - margin notes never inside an open italic run;
  - ornaments off;
  - odr-original keeps the print's misprints, and only odr gets fixes.
- **PLAYBOOK.md** describes the workflow as it really is now: `reconcile.py` diff/ladder/adopt/write/verify/status, the evidence ladder (XML → OCR → book majority → scans as a last resort), scan readings in `reconcile/scan-readings.jsonl`, `wikipost.py` dry run → `--post` with scoped overrides and `--reason`, and `--adopt-others` only after reviewing the other editor's change. Phase 3 will rewrite it around `rh`, so don't invent commands that don't exist yet.
- **AGENTS.md** is short and points to RULES and PLAYBOOK, with the hard rules: never edit pages directly, never reduce fidelity without `--allow-loss`/`--allow-shift` and `--reason`, never post without the owner's approval, run tests and lint.
- **BOOKS.md**: a short status table, with the audit narrative moved to `docs/audits/`.
- Contradictions found in the old docs are listed in the plan, each with the version kept.
- `paste-sheet.md`, `paste_helper.py` and `scriptorium-request.md` are archived only if the owner confirms they are unused. Ask once, in the plan review.

## Owner decisions (don't reopen)

- Governing principle: reproduce the 1582 facsimile as faithfully as possible. Never modernise ſ, vv, macrons, ligatures, italics or small caps.
- The only print removals are the owner's editorial ones: the † after `{{verse}}`, printer's signature marks, and (for now) ornament images.
- Scans are a last resort because of their token cost.
- Posting stays on the owner's account at 12 s spacing, and only with the owner's approval. Phase 2 changes docs only and posts nothing.
- Follow Wikisource conventions. Never revert human edits.
- All `.md` docs may be rewritten. `docs/audits/*.md` stay as history.

## Constraints

- Scripts run as `python3 -I`. Data JSON is written only through `jsonfmt.write_like()`, under `.git/odr-data.lock`. Text is NFC. Phase 2 shouldn't need data writes.
- This worktree has no `node_modules`. Run prettier from the main checkout on absolute paths: `cd ../douayrheimsbible && npx prettier --check <abs paths>`. Read-only use of the main checkout is fine.
- End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Open items carried forward (not Phase 2 work, but RULES/PLAYBOOK should reflect them): Acts 367 `neceſſary` is unread on the scan; 19 ornament files are missing on Commons (ornaments off); the frozen tables 309–313 and 402–404 and the front matter 1–30.
