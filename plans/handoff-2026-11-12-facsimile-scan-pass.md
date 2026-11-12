# Handoff: facsimile check list, scan pass (follows handoff-2026-11-12-facsimile-peters-salette.md)

CSV: `sancta-scrape/analysis/facsimile-check-list.csv` (586 rows; original 16 columns unchanged; backup `facsimile-check-list.before-salette-facsimile.csv`). Short list: `analysis/facsimile-needs-eye.csv` (192 rows). No data changes, no commits, no vision.

## Witnesses (new columns)

- `sancta2_*`: primary. Sancta scans re-OCR'd (hires when present, downscaled to 2217 px) with margin strips OCR'd separately; numbering read from margin numerals (1609 OT) / inline numerals (1582 NT) via TSV geometry (`bscan.py`); annotation phrases read as "text printed between anchors".
- `facsimile_pdf_*`: archive.org PDFs. SAME edition and line breaks as the Sancta scans, but 800x1124 px; confirmation only. Its disagreements checked so far were matcher errors (parallel passages, verse vs annotation lemma, Tesseract dictionary-correcting misprints).
- `peters2_*`: Peters text layer split into columns (margin notes / text / cross-refs). Modern spelling; may follow modern verse division, so secondary.
- `salette_*`: Madueke/La Salette = the site's own source, not independent; useful only where it agrees with Sancta (mine drifted from its source).
- `ed3_*`: 3rd-edition transcription; later verse division; numbering rows only, weak.
- `evidence_summary`, `needs_eye`.

## Files

Scripts: `sancta-scrape/tools/facsimile/2026-11-12/` (paths inside point to the old session scratchpad; repoint `S=`). OCR output: `~/facsimiles/ocr-2026-11-12/` (sancta-scan, facsimile-pdf, peters-columns). Chain: `fx.py <dir> in out sancta2` -> `bscan.py` -> `fx.py pet ... peters2` -> `fx.py fx ... facsimile_pdf` -> `assemble.py`.

## Remaining

C (margin notes only in mine): 50 rows not found in scan OCR; likely OCR loss on small italic, needs eye. E: 135 rows, mostly short phrases/numbers where anchors fail.
