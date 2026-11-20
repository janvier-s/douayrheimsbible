# Handoff: Wikisource pipeline refactor, Phase 1 onward

You now own the refactor of the 1582 Rhemes NT Wikisource pipeline. The previous agent has stopped.

## Where things are

- Worktree: `/Users/Janvier/Documents/Bible-n-stuff/Websites/douayrheimsbible-ws-phase0`
  - branch `wikisource-refactor-phase0`, cut from `janvier-s/odr-wikisource` @ 494f0400
  - The owner chose to keep this branch unmerged for now. Do not merge or push without asking.
  - Do not touch the main checkout `../douayrheimsbible`: other agents may share it.
- Phase 0 (safety net) is done and reviewed:
  - `scripts/wikisource/fidelity.py` counts print features and compares versions.
  - `lint.py` gives `E-loss`/`E-shift` against git HEAD.
  - `wikipost.py` refuses posts that lose features against the live revision.
  - Overrides need a reason: `--allow-loss|--allow-shift FEATURE:SCOPE --reason`.
  - Tests: `python3 -m pytest scripts/wikisource/tests -q` (28 pass).
  - Lint: `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (0 errors, 33 old warnings).

## Read first (in this order)

1. `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md`: the authority. §4.1 covers reconcile and the evidence ladder, §4.7 Wikisource conformance, §5 the phases, §7–8 decisions.
2. `docs/superpowers/plans/2026-11-20-wikisource-phase0-safety-net.md`: done; shows the plan format the owner approved.
3. `docs/audits/2026-11-20-live-vs-committed.md`: the live pages equal the committed pages on all 451 pages.
4. `AGENTS.md`, then `wikisource/1582-rhemes-nt/RULES.md` and `PLAYBOOK.md`. The RULES and PLAYBOOK are pre-refactor, and Phase 2 rewrites them.

## Your next step

Write the **Phase 1 plan** with the `superpowers:writing-plans` skill and save it to `docs/superpowers/plans/`. Phase 1 has two parts:

**(a) Reconcile.** `generate.py` must reproduce every committed page byte for byte; a golden test enforces it.
- What we know so far: regenerating Mark gives 9 of 47 pages identical. The differences are:
  - 79 ſs vs ſſ;
  - 23 other long-s placements;
  - ~40 structural: ornament images that only the generator emits, `{{sc}}` and the `fl={{verse}}` drop-initial form that only the committed pages have, `hws title=`, and some running-head numbers.
- Page sweeps from the Gemini era edited pages directly. Port what they did into the data or the generator.
- Ornament images go behind a flag that is off by default.

**(b) The §4.7 conformance rules, in the generator and lint.**
- Generator changes:
  - catchwords in `{{continues}}` (413 pages);
  - drop printer's signature marks (170);
  - `title=` on every hws/hwe (21);
  - `{{nop}}` where a paragraph ends at the page foot (~68).
- New lint codes: `W-catchword`, `W-signature`, `E-hw-title`, `W-nop`, `E-tpl-italic`, `E-foot-ital`, `W-linebreak`, `E-status`.

Pages that change wait locally: set manifest `status: "changed"`. **Post nothing.**

Then show the owner the plan for review. They chose **Native** execution: you implement it with TDD, then one fresh reviewer on the most capable model checks the whole branch at the end. Follow `superpowers:executing-plans`.

## Owner decisions (don't reopen)

- Governing principle: reproduce the 1582 facsimile as faithfully as possible. Never modernise ſ, vv, macrons, ligatures, italics or small caps.
- The only print removals allowed are the owner's editorial ones: the † after `{{verse}}` (no margin verse numbers because of reflow) and printer's signature marks.
- Scans are a **last resort** because of token cost. Settle letter shapes from `A16049.xml`, which keeps literal ſ, and from the OCR text first (Transkribus mostly outputs plain s; `f` shows ſ). Report the unresolved count before reading any image.
- Front matter (pp. 1–30) should be generated, not hand-maintained. Defer it if it costs too much.
- No reposts during the refactor. Ornament images stay off for now.
- Posting stays on the owner's own account (Sokonok) at 12 s spacing. The owner knows Wikisource:Bots; don't raise it again.
- Follow Wikisource conventions (two editors, ShakespeareFan00 and Beardo, had to fix earlier mistakes). Never revert human edits.
- All `.md` docs may be rewritten (Phase 2).

## Constraints

- Scripts run as `python3 -I`.
- Write data JSON only through `jsonfmt.write_like()`.
- Hold `.git/odr-data.lock` (mkdir/rmdir) around data writes.
- Keep all text NFC.
- This worktree has no `node_modules`. Run prettier from the main checkout on absolute paths: `cd ../douayrheimsbible && npx prettier --check <abs paths>`.
- Wikisource API reads must be paced (an unpaced 451-page fetch got HTTP 429). Read-only fetches are fine.
- Phase 0 deferred minor that matters later: the per-page count comparison can't see a loss offset by a gain of the same feature. The Phase 4 fixes tool must compare per edit.
- End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
