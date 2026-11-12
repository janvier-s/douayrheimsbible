# Handoff: finish checking `facsimile-check-list.csv` (Peters done, Salette + hard facsimile next)

## Goal

Reduce the rows the user must check by eye in `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/analysis/facsimile-check-list.csv` (586 rows now; backup of the original 137-row-era file: `facsimile-check-list.before-refresh.csv`). Do NOT apply any data change; present evidence, the user decides. Sancta's "original" is a transcription and can be wrong; the scan is the arbiter. Original archaisms win over modernization; keep Ægypt. No commit/push. Nothing from `~/facsimiles` goes into iCloud or the repo.

**User constraint: avoid Claude vision (too many tokens); use it only if absolutely necessary.**

## Environment facts (gotchas)

- LIVE repo = `/Users/Janvier/Documents/Bible-n-stuff/Websites/douayrheimsbible` (`static/data/odr`, `odr-original`). The iCloud `for-the-kingdom/douayrheimsbible` is an EMPTY STUB; `sancta-scrape/tools/*.py` hard-code ROOT/douayrheimsbible there, so they need repointing (see `tools/facsimile/numbering_now.py`, `refresh.py`).
- Stale iCloud conflict copies exist in `static/data/odr` (e.g. `1-corinthians 2.json`); ignore.
- Sancta scans: `~/facsimiles/sancta/<book>/<ch>/<n>.jpg` (the website's facsimile tab links to these; same scans). Slugs isaias/jeremias/malachias = isaie/jeremie/malachie here.
- Kraken is installed (`~/.venvs/ocr`, uv, Python 3.12, kraken 7.1.1 + rapidfuzz) but its only English model (zenodo 2577813) returns garbage on these scans; early-modern models are Latin/French. **Tesseract `eng` works** (long-s reads as "f"; normalize f->s, v->u, j->i). Python 3.15 default cannot install kraken; use the venv. Run scripts with `PYTHONPATH=<tools/facsimile> ~/.venvs/ocr/bin/python` (rapidfuzz lives there).
- Scripts saved in `sancta-scrape/tools/facsimile/` (copied from the session scratchpad; some paths inside still point to the old scratchpad `.../scratchpad/` for `OUT/`, `peters/`, `final.csv`, so re-create those or patch paths):
  `refresh.py` (staleness status), `numbering_now.py` (numbering runs vs live data), `ocr1.sh` (tesseract one page), `verdict.py` (OCR verdicts), `num.py`, `peters_parse.py` (abandoned, unreliable), `pstream.py` + `pmain.py` (Peters verse-number lookup by text search), `pnotes.py`, `pwords.py`, `pwords2.py` (Peters note/annotation matching).
- OCR output of the Sancta scans for the 303 relevant chapters (1,082 pages) is in the old scratchpad `OUT/<book>/<ch>/<n>.txt`; it may be gone, re-run `ocr1.sh` over a jobs list (6 parallel jobs ~10-40 min depending on machine load).

## Work done

1. **Staleness** (`status` column): A word 14 rows: 13 still-open, 1 changed; B numbering 43: all still-open; C notes-only-in-mine 70: 46 open, 23 changed (moved/removed), 1 resolved; D counts 10: all open; E annotation readings 449 (added by other sessions): 347 open, 101 resolved, 1 error. E/C status is heuristic (phrase presence). New B rows: none; 15 more chapters differ in verse count, mostly Psalms, probably the same shifts as B.
2. **Sancta scan + Tesseract** (`ocr_reading`, `confidence`, `page`, `verdict`): word rows resolved by reading OCR snippets: supports Sancta: 1-esdras 8:33 (bemai), 1-machabees 10:30 (thirds), 2-esdras 7:44 (cenia), 2-esdras 7:68 (fourtie), isaie 37:1 (sackcloth), job 34:28 (caused), proverbs 4:3 (onlie), psalms 18:6 (bridechamber), psalms 17:1 (heading "2 reg 22"). Supports mine: 2-paralipomenon 2:8 (cedar trees, fir trees and pine), 3-kings 8:9 ("came out of the land of Ægypt"; an earlier "were gone" call was a mismatch with v10 and was corrected). Inconclusive (garbled): numbers 11:20, psalms 118:116, zacharias 11:1. Verse numerals from the scan: acts 22:7, matthew 11:16, psalms 28:10 support Sancta (single numeral read, spot-check).
3. **Peters PDFs** (`~/.../SCRIPTURA/sources/ODR/ODR/ODR pdf/Peters/DRO_NT.pdf, DRO_OT_1.pdf, DRO_OT_2.pdf`): real text layer, modern spelling ("Egypt"), notes in a left column, own annotations. Extracted with `pdftotext -layout`. A secondary witness (transcription, not the scan). Columns `peters_reading`, `peters_verdict`:
   - B numbering: Peters numbers like Sancta in 20 rows, like mine in 6 (1-machabees 11:6, 2-paralipomenon 26:22, canticle 1:2-16, ecclesiasticus 29:18 and 29:19-35, psalms 10:2-4), 17 inconclusive.
   - D counts: Peters has the Sancta-only verse in isaie 54:18, psalms 42:6, psalms 125:7. mark 8:39 (mine-only) not checked.
   - A: confirms thirds, forty six, caused, only begotten, "2 reg 22" (Sancta) and the cedar/fir/pine list (mine); 3 Kings 8:9 "came out" (mine).
   - C/E notes: only 16 of 69 C and 27 of 348 E match in Peters even with word-window search. Low scores mean Peters does not carry the note, not that the 1609 margin lacks it.
4. Remaining for the user right now: 40+17 numbering rows without a decisive witness, 7 verse-count rows, 3 word rows, 53 C rows, 321 E rows.

## Next steps

1. **Salette** (`.../ODR pdf/Salette/`): contains `Original-DouayRheims-Bible.pdf`, `Original-Douay-Rheims-Bible-Merged.pdf`, `Fixed-*.pdf`, `augmented-bible`, `salette_png/crop/json/split` (the existing La Salette page-extraction pipeline; see memory `project_salette_pipeline`: its extraction agents must use Sonnet, not Haiku). Check what each is: if it is the Original DR 3rd edition with a text layer, use `pdftotext -layout` and the Peters search code (`pstream.py`, `pwords2.py`) on it; the "Original" edition keeps archaic spelling, so it is a better witness for the A rows and the C/E notes than Peters. Look at `salette_json` for already-extracted text before doing anything new. Avoid vision.
2. **Hard facsimile** (`.../ODR pdf/facsimile/`: `1 of 3 1609 Old Testament.pdf` 185MB, `2 of 3 1610 ...`, `3 of 3 1582 New Testament.pdf`; `probe_page.py` there uses Claude Vision, do not use). Check `pdffonts`/`pdftotext` for a text layer first; otherwise `pdftoppm -r 200 -f N -l N` single pages + Tesseract. Bible text starts around PDF page 22 per `probe_page.py`; build a page-to-chapter map by sampling a few pages (token-efficient: OCR a few pages per book, then binary search), then OCR only chapters named in open rows. This is the true 1609 scan; it can settle numbering, A, C and E rows that Peters/Sancta-scan could not. Margin notes OCR poorly at small italic size; try higher dpi (300) and `--psm 6` on cropped margin strips.
3. Update the CSV columns (keep old columns; add `salette_*`, `facsimile_pdf_*` with page refs), re-report counts, and list the shortest set of rows still needing the user's eye with page paths.
4. Re-run `refresh.py` first if other sessions changed `static/data/odr` (they are still editing annotations).
