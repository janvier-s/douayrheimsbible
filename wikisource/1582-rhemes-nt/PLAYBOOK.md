# Playbook: checking a book against the 1582 scans

What Matthew taught us, in the order to do it for the next book. Matthew took 12
rounds because these steps were found one at a time; doing them in this order
should take far fewer. Log progress in `BOOKS.md`.

## Ground rules

- Fix the data, never the wiki pages: `pages/<n>.wiki` are generated.
- The print wins, except real misprint corrections in citations (the user keeps
  those, e.g. Matt 11:25 "Mt. 18,1." stays 18, 3).
- Content fixes (wording, notes, marks, citations, later-edition text) go into BOTH
  `odr` and `odr-original`, each in its own spelling. Spelling fixes (ſ, vv, macrons,
  1582 forms) go into `odr-original` only.
- Do not add words to `odr` that the print lacks; follow the print's word order.
- The 1582 verse numbering differs from the Clementine (Matt 5:13 is split); the
  data follows the print.
- Do not post to Wikisource without the user's approval (bot approval needed).
- Several agents may share the worktree: hold `.git/odr-data.lock` (mkdir/rmdir)
  around every data write, regenerate+publish and commit; never while reading scans.
- Write data JSON only with `scripts/wikisource/jsonfmt.py` `write_like()`: files
  differ in format (compact vs indent=2) and must keep theirs.

## Sources

- Scans: `~/facsimiles/sancta/<book>/<ch>/hires/<n>.jpg` (1897x2710). Chapter dirs
  overlap: a chapter's first page is the previous chapter's last when it starts
  mid-page. Some pages have no OCR or broken hires images (luke/9 pp 5-6, 15/3,
  19/3, 23/4; luke/10/3 hires is thresholded): run tesseract on the hires image.
- OCR: `~/facsimiles/ocr-2026-11-12/sancta-scan/<book>/<ch>/<n>.tsv` (col 12 word,
  7-10 x/y/w/h, same coordinates as hires). Tesseract reads ſ as f, ſſ as
  ff/fl/ii/il/ei, ſs as "fs", ∷ and † as `*`, ‖ as a quote mark, macrons as é or not
  at all, the ct ligature as é.
- Transkribus OCR (Mark on; better than Tesseract: ~90% vs ~65% page match):
  `transkribus.py <strip_dir> <xml_dir>` splits stitched-strip PAGE XML into
  `~/facsimiles/transkribus/pages/<role>/<id>.{tsv,txt,jpg}` + `manifest.json`
  (Tesseract TSV layout, page frame; margin words in blocks 90/91; word boxes
  estimated from the ink when the strip had no word segmentation). Run the
  generator with `WS_OCR=transkribus`. Pages with broken line segmentation are
  flagged (`fragments`); use Tesseract or a PAGE_STARTS override there.
  `ocrdiff.py <book> <out>` is the two-OCR vote against odr-original (findings TSV).
  Transkribus outputs ſ as s, vv as vv/vy/vu, I as l, † as f/t glued to the word.
- `generate.py` writes `tokens.json` (each data word with its scan box) and
  `report.txt` (wiki page → scan page, mark differences). Use the boxes to locate
  crops; reading positions off a thumbnail is ~10% off.

## Step 0: generator setup for the book

`generate.py` has Matthew-specific tables. Before generating a new book set:
RUNNING (running head), SIG_FIRST (signatures continue the gatherings of 4 leaves
from wiki page 29), the book title and Argument page (Mark: page 114 is the Argument
of S. Marke, Mark 1 starts on 115), HOLY_WEEK (if any), and pick the max-pages argument so the last page takes the end of the stream (Matthew: 83). Check the
running head glyph (MATTHEW. printed with a single W). Confirm the earlier book's
pages stay byte-identical after any generator change.

## Step 1: marks and structure (per chapter, ~5 chapters per round)

1. Generate; read `report.txt` mark differences; `autofix.py` applies annotation
   stars and swapped `*`/lectionary marks (its `--write` reformats indent=2 files:
   apply by hand there; filter its report on `n.get('star')`).
2. Blind spots the OCR cannot show, check by eye on every verse:
   - `<cr>` at word 0 (OCR reads the verse-start † as `*`).
   - Drop-cap verse 1: usually no `*`; the citation goes to the verse end, the
     lectionary `<na>` to the start.
   - `<cr>` before an italic OT quotation: usually margin-only (verse end; after a
     closing `⊢`, as `⊢ <cr>[1]</cr>`). Matthew had 9 left inline (3:3, 4:7, 4:10,
     4:15, 9:13, 11:10, 12:7, 13:35, 19:18); 3 really have the `*` (6:9, 16:19, 19:19).
   - Two citations under one `*` (two refs side by side in the margin): one
     cross_ref entry holding both (`Mr. 1, 14. Luc. 4, 14.`), never two `<cr>`.
   - Note kinds before anything else: list every `kind: 'gloss'` note whose text is
     a lectionary note ("The Goſpel vpō…"), a part heading ("THE THIRD part of the
     Goſpel…") or a side heading ("The PATER NOSTER."). The generator and the site
     (`src/lib/utils/printMarks.ts`) print a ∷ for every gloss; these have none.
     Check each on a word crop, then set `lectionary` / `head` in both datasets.
     Not every heading is unmarked: "THE firſt worke of iuſtice" (Matt 6:2, 6:5,
     6:16) does carry ∷ in text and margin. Matthew had 5 (4:1, 4:12, 4:18, 6:9,
     9:18); the OCR diff missed them all: each sits beside a † or a citation `*`,
     which the OCR also reads as `*`, so the extra mark does not show.
3. Print paragraphs (very important to the user): full AND half indents both start
   paragraphs; exceptions go in MANUAL_PARAS / NO_PARAS / PAGE_STARTS. Write
   `paragraphs.json` only for checked chapters.
4. After moving markers, run `npx tsx scripts/build-odr-lemmas.ts --write` (and
   `--dir=odr-original --write`), then regenerate. ‖ the lemmas get wrong goes in
   BARS (wiki-only).
5. Removing a note or splitting a cross_ref changes the counts in
   `scripts/export.corpus.test.ts`: update with a dated comment.
6. Verse numbering and chapter breaks: compare the print's numbers with the data at every chapter
   start. The 1582 print can open a chapter earlier than the Vulgate (Mark IX starts at Vulgate 8:39). The
   data follows the print: move the verse, renumber the chapter, shift its annotation `verse` numbers and
   `odr-clarifications`, and add the chapter to `static/data/odr/versification.json`.
7. Annotation titles close with "]" or ")" as the compositor chose: crop the title closers of every
   chapter (`PAREN_TITLES` in generate.py).

Fastest read: two-page side-by-side sheets of the hires scans at 0.36 scale are
legible for marks, indents and note wording (~1k tokens/page). Crop only doubtful
spots.

## Step 2: margin notes

- Citations: print form (`2 Re. 12, 24.`); a margin `*` before a citation is kept
  as `* Mr. 12, 18.`; such notes go in the inner margin. A leading `* ` in a note's
  text is the margin star, not `star: true`; never convert one into the other.
- Lectionary notes: read each one. Later-edition text is common (saint's days,
  apostrophe possessives, "Invention Aug. 3"): replace with the 1582 text in both
  datasets. A note absent from the margin may come from the Table of Epistles and
  Gospels (`static/data/reference/odr/nt/table-epistles-gospels.json`): keep those.
  vpon vs vpō varies; follow each note. Some notes continue onto the next page.
- Glosses: watch for modern spelling (Saviour, always) = later edition.
- Holy-week style headings are unmarked notes: kind `head`.
- Spelling in notes: ſ by `scripts/wikisource/longs.py` rule (abbreviations end in
  ſ: Pſ., Chryſ.; Seſs./Theſs. are the ß ligature), w vs vv (the roman margin w looks
  like a capital W; it is still w), macrons.
- Efficient read: outer-margin strips per page (blank rows squeezed out, 0.55 scale,
  6 columns) or contact sheets beside each verse start (token boxes, 0.55, 9-18 per
  image). Gemini Flash via `agy` works for wording and vpō on 3x crops (two runs,
  accept agreement) but NOT for w/vv, macrons or misprints (it "corrects" them).

## Step 3: annotations

- Titles and stars (`star: true` = `*` in the annotation text).
- Bodies: macrons (OCR é hints + a 0.5-scale column read; ~30 per book half),
  1582 spellings left in modern form (step 5), ſs/ſſ (step 4).
- Locate a word: word i of the tag-stripped text ≈ token i, but common words land
  on another occurrence: search the page TSV with a regex within the y-range.

## Step 4: spelling details (odr-original only)

- Verse-text macrons: no images needed for candidates. Align each chapter's data
  verse words with the TSV body words (difflib on folded keys, m/n after a vowel
  dropped); flag OCR é/ë/~ (not é+t where the data has ct) and data vowel+m/n where
  the OCR lacks it. ~80% are real; confirm on word crops. Matthew: 31 added; the
  print uses them mostly to justify lines.
- Map each seen form to the data with a regex (X̄ ↔ X[mn]) inside that verse; change
  only the macron.
- ſs vs ſſ: data writes ſſ and keeps ſs only where the scan shows it. OCR "fs" is
  the reliable hint; confirm at ≥1.4x (0.5-0.85 misleads: round 12a misread three).
  Italic ß (ſs) in summaries is common.
- w vs vv in verse text and notes (OCR misreads vv as w; check by eye).

## Step 5: modern-spelling leftovers

Detector, no images: word-align `odr-original` with `odr` across the NT annotations
(fold ſ→s, vv→w); per modern word count how often the NT original differs. Words the
book keeps in modern form where the NT usually differs are suspects. Compare with the
OCR first: if the OCR reads the same as the data, it is the print form (mercy,
contrary, charity…). Crop only where the OCR differs or finds nothing.

## Step 6: sync odr (modern)

Compare the book's `odr` and `odr-original`: structure (verses, markers, notes,
cross-refs, lemmas, annotations) must match; then word-align with spelling folded
and list inserts/deletes, rare word pairs and number differences. Every difference
that is content, not spelling, needs the print form in `odr` too.

## Word crops (the cheapest eye check)

~600x80 px windows around the TSV box at 0.85 scale, 2 columns, ~30 per image,
labelled "ch:v word [ocr]"; 340 px at 1.4x for letter shapes (ſs/ſſ). Never Read a
whole hires page, never Read the same crop twice. The isolated python has PIL but
no numpy.

## Publish and commit

```bash
python3 -I scripts/wikisource/generate.py "$PWD" <book> <first-page> <out> <max-pages>
for n in ...; do cmp -s <out>/$n.wiki wikisource/1582-rhemes-nt/pages/$n.wiki || echo $n; done
python3 -I scripts/wikisource/publish.py <out> <a>-<b>   # one range per call
```

Rendering conventions (generator): `<sc>` → `{{sc|Iesvs}}` (capital + small caps, as
printed; the word after a verse-1 drop cap stays in capitals); the annotation mark ‖ →
`{{sup|‖}}` (″ read as quotation marks). The data keeps `<sc>` and ‖.

Check the word diff of every changed page; pages you did not mean to change must stay
byte-identical. Before each commit: `npx vitest run`, `npm run check`,
`npx prettier --check scripts/wikisource wikisource`. Commit messages list each
change with an honest count (seen / already right / changed).

## Cheap whole-NT triage (XML vs odr-original)

`python3 scripts/wikisource/triage.py` prints one ~60-line report: page/manifest/lint state plus per-book counts of w/vv, long-s, macron, stray anchor letters, wording, verse-boundary and margin-note findings. Drill down with `triage.py <book> --detail <kind> --limit N`. Findings are candidates: check them on the Transkribus text, since EEBO is not ground truth. Hide reviewed-and-fine ones with `triage.py --accept <book> <kind>`.
