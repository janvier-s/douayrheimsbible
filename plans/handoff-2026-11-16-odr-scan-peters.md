# Handoff: finish the ODR print-fidelity scan (Argon pages + Peters witness)

Worktree: this one (`improve-odr-modernization`, branch janvier-s/improve-odr-modernization). Nothing is committed; all data edits are uncommitted in `static/data/odr*/`. Do not commit unless the user asks.
Tests: `npx vitest run` (46 files / 535 tests passing at handoff).

## Read first

- `docs/odr-errata.md` — what was changed and what is still open (keep updating it).
- Memory index (~/.claude/projects/.../memory/MEMORY.md) for ODR conventions: odr = modernized text, odr-original = 1609 spelling (long s, vv); never "correct" odr-original, it is a diplomatic transcription of the print.

## Tools / data (durable copies, safe from /tmp cleanup)

`~/facsimiles/ocr-2026-11-12/odr-scan-2026-11-16/`

- `session2/` — this session: `scan.py` (diff odr vs odr-original → `scan.pkl`), `mk2.py` (match verses to page images, write agy prompts), `run.sh <dir> <model> <idx>` (idempotent agy runner), `cmp2.py` (compare page readings with odr-original), `cand.txt` (single-word candidates + Challoner), `pet/pex.py` (Peters XML parser), `pet/*.xml` (pdftohtml -xml of the three Peters PDFs).
  Script paths were rewritten to `session2/`; if something still points at /private/tmp scratch, patch it.
- `session2/f1/` Flash reads (110 of 160 pages; the rest hit the Flash quota), `session2/a1/` Argon-high re-read of 137 earlier pages (done), `session2/f2/` Argon-high reads of the 50 pages Flash missed (was ~31/50 done at handoff; re-run `run.sh` over the missing ones — it skips finished pages).
- `session1/` — previous session's scripts and Flash reads (`agy/`, `verses.pkl`, `applylog.pkl`).
- agy usage: `cd /tmp && agy --model gemini-4-argon-high --add-dir <dir of image> -p "<prompt>"`. Models: `gemini-3.8-flash-medium` (Flash quota was exhausted Nov 16 ~09:15 CET, resets ~4h later), `gemini-4-argon-high` (worked; user wants it as the second pass / for unsettled verses). Page images: `~/facsimiles/sancta/<book>/<chapter>/<n>.jpg`; hires web copies at `https://facsimile.thedouayrheims.com/<book>/<chapter>/<n>.webp` (the 1609 text; Luke 15 is `3.webp`).
- Vulgate: `static/data/vul/<book>.json`; Challoner: `static/data/drc/`; also knox, kjv, cpdv under `static/data`.

## Tasks (in order)

1. **Finish the 50 Argon pages** (`session2/f2`), then run `cmp2.py`-style comparison against odr-original. Settle the 8 unconfirmed single-word candidates: 3 Kings 3:12 "I", Genesis 36:17 "are", Isaie 33:2 "O", Jer 47:6 "thee", Job 9:2 "be", Josue 11:9 "of them", Ps 85:5 "so", Exodus 16:15 "an". Rule: odr follows the print; add/remove the word in odr (modern spelling) when the page confirms it; if the page reading is not clear, ask the user. Fix odr-original when Argon shows the transcription is wrong (examples already fixed: Job 4:5 faynted, 1 Par 5:18 halfe, Ecclus 28:16 no "one").
2. **The 54 removed additions** (odr words dropped last session where the print lacks them; list in `session1/cat_Mextra_*.txt` and the applylog): judge each as "print genuinely omits" (keep removed) vs "print slip / sense breaks" (restore or add to errata), using the Vulgate + Challoner. Produce a verdict table for the user; do not restore without evidence. Argon re-read of those pages already agrees with odr-original for 116/139 verses.
3. **Peters as an independent third witness** (finds errors present in both odr and odr-original that no diff can see; Ecclus 28:16 "one" was such a case). Peters PDFs: `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/ODR/ODR pdf/Peters/{DRO_OT_1,DRO_OT_2,DRO_NT}.pdf` — real text layer, modernized spelling, Peters' own annotations; it is a flagging witness, never an authority on its own.
   Preprocessing needed (xml already extracted in `session2/pet/`): body text = font size 16, left ≥ ~170 on OT pages (NT uses sizes 14/15, check); margin notes = size 14 at left ~130; annotation blocks (size 15/16) start at an "ANNOTATIONS" heading — stop body collection there; on many pages verse numbers are separate size-14 tokens at left ~258, not part of the verse line; chapters = "Chapter N" headings / verse-1 resets; books = large Georgia title lines (size ≥30). A naive line-start-digit parse only found ~800 segments, so use the separate-token numbers. Peters numbers verses like Sancta in some places (see plans/handoff-2026-11-12-facsimile-peters-salette.md), so expect to hand-align some chapters.
   Then diff odr (modern) vs Peters per verse; whole-word differences not already settled go to Argon on the page image. Keep a table of verdicts in `docs/odr-errata.md`.
4. A local OCR-set vote against `ocr-2026-11-12/sancta-scan` was tried and is useless (flags ~22,900 of 37,000 verses; OCR of the 1609 typeface is too noisy). Don't repeat it.

## Still open (not in scope unless the user asks)

Deut 19:5 (garbled print, not copied into odr), Jer 22:12 "see any this land more", verse-0 chapter summaries, verse-count mismatches (boundary-shift list in `docs/odr-errata.md`).
