# Phase 1 audit: reconcile and conformance (1582 Rhemes NT, Wikisource)

Branch `wikisource-refactor-phase0`, plan `docs/superpowers/plans/2026-11-21-wikisource-phase1-reconcile-conformance.md`. Nothing was posted to Wikisource.

## Result

- Every page in Matthew–Romans (31–451, less the frozen ones) is now exactly what `generate.py` writes from `odr-original`. A golden test per book enforces this (`tests/test_golden.py`, `books.json` `golden: true` for all six books).
- Readings that the committed pages had right were written into `odr-original` through `reconcile.py adopt`, under the data lock and the fidelity guard. Every decision is kept in `wikisource/1582-rhemes-nt/reconcile/<book>.jsonl`. `reconcile.py verify` finds 0 decisions missing from the pages in every book.
- Lint: 0 errors. The only warnings are 28 `W-header` on front-matter pages 1–28, which have no running head in the print. No `W-catchword`, `W-signature`, `W-nop` or `W-linebreak` remain.
- Tests: 128 passed, golden tests included (`pytest -m "slow or not slow"`).
- Manifest: 440 of 451 pages are `changed` against live, and every generated page differs from live. They wait for the next repost.

## Per book

"Diff before" is the word-level difference between the generator and the committed pages before reconciliation. The rungs are the evidence-ladder decisions after the final re-check: (1) XML and Transkribus agree, (2) XML supports the committed form, (3) OCR or the book majority, (4) the scans. *c* means the committed page's form won, *g* the generated (data) form.

| Book | Pages | Diff before (largest classes) | Ladder | Pages changed |
|---|---|---|---|---|
| Matthew | 31–113 | foot 75, ls:ss 191, ls:other 42, text 31, space 28, sc 11 | r2 c25 · r3 c2/g192 · r4 c1/g1 · open 4 | 83/83 |
| Mark | 114–160 | foot 45, ls:ss 83, ls:other 24, text 16, space 16, hw 6 | r2 c22 · r3 c8/g68 · r4 g1 · open 1 | 47/47 |
| Luke | 161–241 | foot 76, ls:ss 196, sc 51, ls:other 49, text 30, greek 25 | r1 c9 · r2 c32 · r3 c12/g191 · r4 c1/g4 · open 3 | 81/81 |
| John | 242–308 | foot 67, ls:ss 120, ls:other 42, sc 37, ornament 22, text 20 | r1 c6 · r2 c25 · r3 c15/g113 · r4 c3/g2 | 67/67 |
| Acts | 317–401 | foot 84, ls:ss 141, ls:other 72, greek 39, sc 29, ornament 28 | r1 c10/g1 · r2 c14 · r3 c15/g166 · r4 c1/g24 · open 3 | 85/85 |
| Romans | 410–451 | foot 40, ls:ss 75, ls:other 56, greek 18, ornament 18, space 16 | r1 c8/g3 · r2 c15 · r3 c21/g85 · r4 c1/g10 | 42/42 |

Scan readings (`reconcile/scan-readings.jsonl`): 60 in all. 35 were read on crop collages (Matthew 4, Mark 2, Luke 4, John 5, Acts 9, Romans 11). 25 were inferred from the same word already read on the scans, or from a print rule that the XML supports (Acts 20, John 2, Romans 2, Luke 1). Each line gives its evidence. The 89 stem-rule `ſs` cases were settled by the XML at rung 2, as the owner decided.

Overrides used (in each book's commit message): `--allow-shift ls:<book range>` for the ladder's ſs/ſſ changes. `--allow-loss` was used only under the owner's decisions: long-s inside `{{sc}}` becomes round s, printer's signatures (`vv:`) are dropped, and woodcut initials (`v_initial:`) are dropped while ornaments are off.

## Ladder corrections made during the phase

1. **Transkribus can't tell s from ſ.** It prints round s for every long-s, so its readings no longer vote on s vs ſ (`round_s=False`); Tesseract still does. All five books reconciled before this fix were re-checked against their pre-reconcile commits. 38 committed-side readings no longer held (Luke 11, John 4, Acts 23) and were reverted in `odr-original` (fb6e64da).
2. **EEBO's abbreviation stroke is a combining mark.** `A16049.xml` writes it as U+0304, so an NFC form like `childrē` never matched and rung 2 couldn't settle these macrons. The XML tokens are now NFC-normalised (9ccb673c). Re-laddering all six books flipped one winner: Romans p431 `childrē`.
3. **One-sided context in `adopt`.** A "done" found with before-context only could run into the next string, as at Romans p417, where `Pſ.` matched v13's own cross-reference. It now defers when the after-context finds the place (9ccb673c).

## Frozen pages

No generator makes these 46 pages, so they are kept as committed (`manifest.json` `source: frozen`). The §4.7 points were fixed by hand on 36 of them (810ea1aa).

| Pages | What | Why frozen | Estimated cost to generate later |
|---|---|---|---|
| 1–30 | Front matter (title, preface, tables of contents) | One-off layouts the generator has no model for | High for little gain; keeping them frozen is reasonable |
| 309–313, 402–404 | Tables (Evangelical History, tables between books) | The generator has no table support | Medium: a table renderer plus data for 8 pages |
| 314–316, 405–409 | Acts Argument, General Argument | Their `odr-original` intros are in modernised spelling (no vv, u/v, I/J), so generating them would lose print features | Medium: restore the intros in original spelling from A16049.xml and the scans, then add them to the generator, which already handles Mark's and John's Arguments |

## Missing Commons files (19)

With ornaments off (the default, by owner decision), the generated pages carry no ornament images. Before this phase, 66 live pages (244–451) used these 19 files, none of which exists on Commons, so readers see red links:

- Rhemes New Testament 1582 initial A, two satyrs.png (16 pages)
- Rhemes New Testament 1582 initial A, a bearded man.png (14)
- Rhemes New Testament 1582 initial A, scrolling foliage with grotesque heads.png (9)
- Rhemes New Testament 1582 initial W, foliage.png (4)
- Rhemes New Testament 1582 initial B, heads among foliage.png (4)
- Rhemes New Testament 1582 initial T, an urn and foliage.png (3)
- Rhemes New Testament 1582 initial I, two horned animals.png (3)
- Rhemes New Testament 1582 initial T, a bird and a human head.png (2)
- Rhemes New Testament 1582 initial I, foliage.png (2)
- Rhemes New Testament 1582 headpiece (John).png (2)
- Rhemes New Testament 1582 tailpiece (Romans).png
- Rhemes New Testament 1582 initial V, a grotesque mask and flowers.png
- Rhemes New Testament 1582 initial P, flowers and foliage.png
- Rhemes New Testament 1582 initial M, a grotesque mask.png
- Rhemes New Testament 1582 initial L, a standing child.png
- Rhemes New Testament 1582 initial L, a dragon.png
- Rhemes New Testament 1582 initial I, an old man in a cap.png
- Rhemes New Testament 1582 initial F, scrolling foliage.png
- Rhemes New Testament 1582 initial F, a hooded figure.png

Prepared files are in `~/facsimiles/ornaments-1582-nt/commons`. Once they are uploaded, set `ornaments: true` for a book in `books.json` and regenerate it.

## Open questions for the owner

1. **11 words without print evidence.** The data form stays for each, and the word is listed in its book's JSONL with an empty winner:
   - Matthew: p55 Confeſsing, p58 poſsible., p81 Paſsion., p82 poſsible.
   - Mark: p156 Paſſ./Paſs.
   - Luke: p203 Confeſsors, p219 Quĩquagesme., p221 Confeſsors
   - Acts: p336 Iosuè,, p367 neceſsary, p392 Iesvs,

   Most of these were settled by Transkribus before correction 1 above. One scan collage would settle them.
2. **Upload the 19 ornament files**, or leave ornaments off.
3. **Frozen Arguments (314–316, 405–409):** restore the intros in original spelling so they can be generated, or keep them frozen.
4. **Reposting:** 440 pages are `changed` against live. Posting stays with the owner (`wikipost.py`, which checks fidelity against the live revision).
