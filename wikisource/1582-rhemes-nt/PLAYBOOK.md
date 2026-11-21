# Playbook: working on the 1582 Rhemes NT pages

How to do the work. What is allowed is in [RULES.md](RULES.md), which wins wherever the two disagree. Book status is in [BOOKS.md](BOOKS.md). The commands below are the ones that exist today; Phase 3 of the refactor will put them behind one `rh` command.

## Ground rules

- The print wins (RULES §1). Fix the data or the generator, never a generated page (RULES §6.1).
- Hold `.git/odr-data.lock` (mkdir/rmdir) around every data write, page write and commit. Write data JSON only with `jsonfmt.write_like()` (RULES §6.2). Don't hold the lock while reading scans.
- Run scripts as `python3 -I`. The isolated Python has PIL but no numpy.
- Nothing is posted without the owner's approval (RULES §7).
- Scans are the last resort: read the XML and the OCR first (below).

## Sources

- **Scans:** `~/facsimiles/sancta/<book>/<ch>/hires/<n>.jpg` (1897×2710). Chapter folders overlap: when a chapter starts mid-page, its first page is the previous chapter's last. Some hires images are missing or thresholded (luke/9 pp. 5–6, 15/3, 19/3, 23/4, 10/3); run Tesseract on those.
- **Tesseract OCR:** `~/facsimiles/ocr-2026-11-12/sancta-scan/<book>/<ch>/<n>.tsv` (column 12 the word, 7–10 x/y/w/h in hires coordinates). It reads ſ as f, ſſ as ff/fl/ii/il/ei, ſs as `fs`, ∷ and † as `*`, ‖ as a quote mark, macrons as é or not at all, and the ct ligature as é. It does vote on s against ſ.
- **Transkribus OCR** (Mark onward; about 90 % page match against Tesseract's 65 %): `transkribus.py <strip_dir> <xml_dir>` splits the stitched-strip PAGE XML into `~/facsimiles/transkribus/pages/<role>/<id>.{tsv,txt,jpg}` and a `manifest.json` (Tesseract TSV layout; margin words in blocks 90/91). It prints every ſ as round s, so it **doesn't vote on s against ſ**. It reads vv as vv/vy/vu, I as l, and glues † to the word as f or t. `generate.py` uses it for the books in `OCR_SOURCE` (`WS_OCR=tesseract|transkribus` overrides). Pages with broken line segmentation are flagged `fragments`; use Tesseract or a `PAGE_STARTS` entry there.
- **TEI:** `A16049.xml` in the `original-douay-rheims-nt` repo (the `RHEMES_XML` environment variable overrides the path). It keeps the literal ſ. Its faults are dropped lines and misread contractions (RULES §1.3).
- **Generator output:** `generate.py` also writes `tokens.json` (each data word with its scan box) and `report.txt` (wiki page → scan page, alignment, mark differences, macron candidates). Use the boxes to place crops; positions read off a thumbnail are about 10 % off.

## The evidence ladder

Conflicts of letter shape or spelling between two readings (ſs/ſſ, ſ/s, macrons, vv/w) are settled cheapest first, and the first rung that settles one wins (`ladder.py`):

1. `A16049.xml` equals one side, and an OCR reading shows the same shape.
2. The XML alone, when it equals the committed page. The XML also settles the stem-rule ſs cases (owner 2026-11-21).
3. OCR readings that agree with one side (Transkribus doesn't count for s against ſ), otherwise the book's majority form in the XML (at least 2:1). A majority of one occurrence decides only where the XML at the place is silent.
4. The scans, only for what is still unsettled, and only after the owner has seen the count. Batch them into one crop collage per round.

Scan readings go in `reconcile/scan-readings.jsonl`, one per line: `{"book", "page", "committed", "generated", "reading", "evidence"}`. A scan reading takes precedence at any rung. A reading that matches neither side stays open unless it carries `"replace": true`, so mark that only after reading the crop. Each book's decisions are in `reconcile/<book>.jsonl`; an empty `winner` means the word is still open.

## Change a generated book

The loop Phase 1 ran for each book (`books.json` lists them: Matthew to Romans, with golden tests).

1. **Fix the data.** Edit `static/data/odr-original/<book>/` (and `static/data/odr/<book>/` for content fixes, RULES §1.2) under the lock. If you moved markers, rebuild the lemmas: `npx tsx scripts/build-odr-lemmas.ts --write` and `npx tsx scripts/build-odr-lemmas.ts --dir=odr-original --write`. A ‖ the lemmas get wrong goes in `BARS` in `generate.py` (wiki only). If you remove a note or split a cross_ref, update the counts in `scripts/export.corpus.test.ts` with a dated comment.
2. **See the difference:** `python3 -I scripts/wikisource/reconcile.py diff <book> [--jsonl <out>]` counts the word differences between a fresh generation and `pages/`, by class (`ls:ss`, `ls:other`, `sc`, `foot`, `text`, …).
3. **Letter-shape conflicts:** `reconcile.py ladder <book>` decides each one by the ladder above, writes `reconcile/<book>.jsonl` and prints the count per rung, then the rung-4 words. Stop there and report the rung-4 count to the owner before reading any scan.
4. **Adopt the committed readings that won:** `reconcile.py adopt <book>` is a dry run. Then run `reconcile.py adopt <book> --write`, adding `--allow-shift ls:<first>-<last> --reason "…"` where the ladder turns ſs into ſſ or back. It writes `odr-original` under the lock and the fidelity guard.
5. **Write the pages:** `reconcile.py write <book>` copies each regenerated page that differs into `pages/`. It never touches a frozen page.
6. **Verify:** `reconcile.py verify <book>` must report `0 decisions not shown on the pages`.
7. **Lint and test:** `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` must give 0 errors; overrides are allowed only as RULES §1.1 says. Then run `python3 -m pytest -q scripts/wikisource/tests -m "slow or not slow"`, golden tests included.
8. **Mark the manifest:** `reconcile.py status --write` sets `status: changed` on each page that now differs from the live pages (`LIVE_BASE` in `reconcile.py`).
9. **Commit**, with each override and its reason in the message, and honest counts (seen / already right / changed).

## Start a new book (1 Corinthians onward)

1. Add the book to `books.json`: `first`, `last`, `"ornaments": false`, and `"golden": true` once its pages are committed.
2. Set its entries in the tables at the top of `generate.py`: `RUNNING` (check the glyphs; MATTHEW is printed with a single W), `TITLE_END`, `ARGUMENT` (the Argument page, if the book has one) and `OCR_SOURCE`. Set `HOLY_WEEK`, `PAGE_STARTS`, `CATCHWORDS`, `SPLIT_WORDS`, `PAREN_TITLES`, `BARS`, `SIDE_SC`, `MANUAL_PARAS` and `NO_PARAS` only where the print needs them. Phase 3 moves these into `books.json` and an overrides module.
3. Generate to a scratch folder: `python3 -I scripts/wikisource/generate.py "$PWD" <book> <first-page> <out> [max-pages]`, and read `<out>/report.txt`. Without a page count, generation stops at the book's `last`.
4. Check the book against the scans (next section) and fix the data, then follow "Change a generated book" from step 2. After any generator change, the earlier books must still pass their golden tests.

## Check a book against the scans

Start with the cheap passes. `python3 -I scripts/wikisource/triage.py` prints one short report (page, manifest and lint state; per-book counts of w/vv, long s, macron, wording, verse-boundary and margin-note findings). Drill down with `triage.py <book> --detail <kind> --limit N`, and hide findings you have reviewed with `triage.py --accept <book> <kind>`. `python3 -I scripts/wikisource/ocrdiff.py <book> <out>` is the two-OCR vote against `odr-original`: a finding means both OCRs agree with each other and differ from the data. Treat every finding as a candidate and check it on the Transkribus text before reaching for a scan.

Then work through these, about five chapters per round:

1. **Marks.** Read `report.txt`'s mark differences. The OCR can't show these, so check each one by eye:
   - a citation `*` at word 0 (the OCR reads the verse-start † as `*`);
   - a drop-cap verse 1, which usually has no `*` (the citation goes to the verse end, the lectionary note to the start);
   - a citation before an italic OT quotation, which is usually margin-only (at the verse end, after a closing `⊣`);
   - two citations under one `*`, which are one cross_ref entry holding both, never two.
2. **Note kinds.** List every `gloss` note whose text is a lectionary note ("The Goſpel vpō…"), a part heading or a side heading. The print sets those without a ∷, so they get `lectionary` or `head` in both datasets. Not every heading lacks it: "THE firſt worke of iuſtice" (Matt 6:2) has its ∷.
3. **Paragraphs.** Full and half indents both start a paragraph. Exceptions go in `MANUAL_PARAS`, `NO_PARAS` or `PAGE_STARTS`; write `paragraphs.json` only for chapters you have checked.
4. **Verse numbering and chapter breaks.** Compare the print's numbers with the data at every chapter start. When the print opens a chapter earlier (Mark IX at Vulgate 8:39), move the verse, renumber, shift the annotation `verse` numbers and `odr-clarifications`, and add the chapter to `static/data/odr/versification.json`.
5. **Annotation titles** close with `]` or `)` as the compositor chose: check every chapter's closers (`PAREN_TITLES`).
6. **Margin notes.** Citations in print form (`2 Re. 12, 24.`); a margin `*` before a citation stays in the note text and is not `star: true`. Lectionary notes often carry later-edition text (saints' days, apostrophe possessives): replace it with the 1582 text in both datasets. A note that the margin lacks but the Table of Epistles and Gospels has (`static/data/reference/odr/nt/table-epistles-gospels.json`) is kept. `vpon` against `vpō` varies, so follow each note. Modern spelling in a gloss (Saviour) means a later edition.
7. **Annotations:** titles, stars (`star: true` is a `*` in the annotation text), bodies.
8. **Spelling (odr-original only):** macrons, w/vv, and long s by `longs.py`'s rules (an abbreviation ends in ſ: `Pſ.`, `Chryſ.`). For verse-text macrons, align each chapter's data words with the TSV words and flag OCR é/ë/~ against data vowel+m/n; about 80 % are real, so confirm each on a crop. ſs against ſſ goes through the ladder.
9. **Modern-spelling leftovers:** word-align `odr-original` with `odr` across the NT annotations (fold ſ→s, vv→w). Words this book keeps in modern form where the rest of the NT differs are suspects. If the OCR reads the same as the data, that is the print form.
10. **Sync odr:** the book's `odr` and `odr-original` must match in structure (verses, markers, notes, cross_refs, lemmas, annotations). Word-align them with spelling folded; every difference that is content and not spelling needs the print's form in `odr` as well (RULES §1.2).

## Cheap eye checks

- **Word crops:** about 600×80 px windows around the TSV box at 0.85 scale, two columns, about 30 to an image, labelled `ch:v word [ocr]`. For letter shapes (ſs/ſſ) use 340 px at 1.4×; 0.5–0.85× misleads.
- **Whole-page sheets:** two hires pages side by side at 0.36 scale are legible for marks, indents and note wording (about 1k tokens a page). For margins, use outer-margin strips (blank rows squeezed out, 0.55 scale, six columns).
- Never read a whole hires page, and never read the same crop twice. One collage per round.
- Gemini Flash (`agy`) on 3× crops is good for wording and vpō (two runs, accept where they agree), but not for w/vv, macrons or misprints, because it "corrects" them.

## Post (owner only)

1. The owner approves the page range.
2. Dry run: `python3 -I scripts/wikisource/wikipost.py <first>-<last>`. It needs lint to be clean, fetches each live page, and prints what would change. It refuses a fidelity loss against live, and skips pages that are already equal. Add `--diff` to see the exact diff.
3. **A page someone else edited** is skipped (`SKIP newest live revision is by …`). Read their change (`wikifetch.py <first>-<last> <out>` or `check_live_edits.py <pages>`) against the scan. If it's right, put it into the data (above) and regenerate, then pass `--adopt-others <n>[,<n>…]`. If it's wrong, report it to the owner; never overwrite it silently (RULES §7.2).
4. Post: `wikipost.py <first>-<last> --post --summary "…"`, adding scoped `--allow-loss`/`--allow-shift FEATURE:SCOPE --reason "…"` only for a planned change. The default `--delay` is 12 s; keep it at 12 or more. `--create` also creates pages that don't exist yet. The credentials come from the macOS keychain.
5. `wikipost.py` writes each page's `sha1`, `status: posted` and `revid` into `manifest.json`. Set `LIVE_BASE` in `reconcile.py` to the commit whose pages now equal live, and commit the manifest with it.

## Before each commit

- `python3 -m pytest -q scripts/wikisource/tests` (add `-m "slow or not slow"` after any generator or data change)
- `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet`: 0 errors
- `npx vitest run` and `npm run check` when the data changed. This worktree has no `node_modules`, so run them and `npx prettier --check <absolute paths>` from the main checkout.
