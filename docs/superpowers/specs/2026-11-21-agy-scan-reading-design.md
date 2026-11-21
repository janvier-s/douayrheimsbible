# agy scan reading, with calibration — design

Date: 2026-11-21. Status: approved by the owner (chat, 2026-11-21).

## Goal

Finish checking Acts and Romans against the scans while spending as few Claude tokens as possible. agy
(Gemini) reads the scan crops first. Claude reads only what agy cannot be trusted to settle. Trust is
measured, kind by kind, on words already settled in Matthew–John. It is not assumed.

## Why calibration first

PLAYBOOK ("Cheap eye checks") says Gemini Flash is good for wording and vpō but bad at w/vv, macrons and
misprints, because it "corrects" them. Those classes are most of the Acts/Romans work (261 + 18 w/vv,
54 + 26 macron in `rh.py triage acts romans`). The owner asked to try a prompt that names what to look
for. Calibration tells us whether that prompt helps.

## Pieces

### 1. Crops

`rh.py diff ocr <book> <out>` already writes one row per OCR finding with `page` (e.g. `pdf242`) and
`box` (`l,t,w,h` in the page frame of `~/facsimiles/transkribus/pages/<book>/<page>.jpg`). Triage's macron
and long-s findings have no box, so `ocrdiff` gains `word_boxes(book)`: the same Transkribus alignment
`run()` already does, exported as `{(loc, data word, occ): (page, box)}` for every data word. A crop is the box
padded by about one word's height each side, scaled to 340 px tall text at 1.4× (PLAYBOOK: 0.5–0.85×
misleads on letter shapes). Each crop gets a stable id: `<book>:<page>:<box>`.

### 2. Answer key (calibration set)

About 300 words from Matthew–John, whose pages have been checked against the scans, so the committed
page reading is the truth. Two strata:

- **Hard:** words where the OCR and the data disagreed (`docs/audits/{mark,luke,john}-transkribus-findings.tsv`
  rows of class `w_for_vv`, `vv_for_w`, `word`), plus scan-settled entries (`reconcile/scan-readings.jsonl`,
  ledger entries whose evidence names the scan).
- **Ordinary:** a seeded random sample of words containing vv/w, a macron or ſ where both OCRs agreed
  with the data, to measure false alarms.

Kinds are taken from the key word: `wvv` (contains w or vv), `macron`, `longs` (contains ſ), `wording`
(the rest). A word can count in several kinds. The key is written once to
`wikisource/1582-rhemes-nt/reconcile/agy-key.jsonl` (id, book, page, box, truth, kinds, stratum) so
reruns compare like with like.

### 3. Calling agy

`agy --model <m> --add-dir <crop dir> --mode accept-edits -p "<prompt>" --output-format json --json-schema <schema>`
(headless agy denies file reads without `--add-dir` and accept-edits; the prompt says to use only the
image-reading tool). Crops go about 30 per call as a numbered sheet or numbered files. The schema asks for
`[{n, reading, notes}]`.

Two prompts. Neither shows the expected reading:

- **plain:** transcribe each word exactly as printed, letter for letter; keep long ſ, u/v as printed,
  vv as two letters, strokes over letters as macrons (ā ē ī ō ū); do not correct spelling.
- **targeted:** plain, plus for each word: is every double-u one letter w or two letters vv? Is there a
  stroke over any letter, and over which? Is any s a long ſ?

Each prompt runs twice per model, for `gemini-4-argon-low` and `gemini-4-argon-high`. agy outputs are cached
by (crop id, model, prompt, run) under the scratch run dir, so a rerun costs nothing.

### 4. Scoring and the trust bar

For each (model, prompt, kind): n, agreement of the two runs, accuracy when they agree, and
**confidently wrong** (both runs agree on a reading that differs from the key). Comparison is exact on
NFC text for the feature of that kind (for `wvv`, the w/vv letters; for `macron`, which letter carries the
stroke; for `longs`, ſ vs s; for `wording`, the whole word folded with `ocrdiff.key`).

A kind is **trusted** for a (model, prompt) only if n ≥ 30, both runs agree and match the key in ≥ 98%
of cases, and confidently wrong = 0. The calibration prints a table and writes
`reconcile/agy-calibration.json`. The owner picks the (model, prompt) and kinds from it. Nothing is
trusted by default.

### 5. Routing Acts and Romans

`rh.py agy read <book> --chapters a-b --use <model>:<prompt> --out <file>` takes the open findings for those
chapters: triage's `w/vv`, `macron`, `longs` and `text` rows (XML vs data), and `diff ocr`'s `w_for_vv`,
`vv_for_w` and `word` rows. A finding is **not open**, and is left to the existing detectors and ladder,
when the Transkribus and Tesseract readings at that word both show the same form as one side. The tool
crops the open findings and calls agy with the chosen setup.

- **Trusted kind and both runs agree:** the reading is kept. Where it differs from the data, a ledger
  entry is proposed (`detectors.propose_from`, as `detect wvv` does) with
  `evidence: "agy <model> <prompt> <date>; XML <form>; Transkribus/Tesseract <tk>/<ts>"`. Every kept
  reading is also logged to `reconcile/agy-readings.jsonl`, so the answers are auditable and a rerun
  costs nothing.
- **Otherwise:** the finding is listed in `<out>.claude.tsv` and drawn on one crop sheet per round for
  Claude to read.

As with every detector, nothing is written but the proposal file. A person appends the proposals to
`fixes/<book>.jsonl` and runs `rh.py fix apply`. The data changes only through the ledger, and the pages
only by regenerating.

### 6. Docs

PLAYBOOK's "Check a book against the scans" gains a step before the crop collage: run `rh.py agy read`,
review its proposals, and read only `<out>.claude.tsv` by eye. "Cheap eye checks" replaces the Gemini
line with a pointer to the calibration result. RULES §6.5 names the `agy` evidence string.

## Code

`scripts/wikisource/rhemes/agyread.py`, exposed as `rh.py agy key|calibrate|read`. Crop cutting reuses
`cropsheet.py`'s image code. Tests mock the agy subprocess (no real calls in the suite): crop geometry,
key stratification is seeded and stable, scoring (including confidently wrong), the trust bar edge
cases, routing writes only trusted+agreeing readings, cache hits skip the call.

## Out of scope

Margin-note digits and verse-boundary findings stay with the existing passes. No posting. Other books
use the same tool later, after Acts and Romans show it works.

## Risks

- agy may agree with itself on a "correction". The confidently-wrong = 0 bar and the hard stratum are
  there for that. If no kind passes for w/vv or macrons, those go to Claude as today, and we have lost one
  calibration run.
- Batches of 30 may lower accuracy compared with single crops. Calibration measures the batch setup
  that is actually used.
