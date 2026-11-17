# Book log: 1582 Rhemes NT against the scans

One row per book. "Checked" means the data (`static/data/odr-original`, plus
`static/data/odr` for content fixes) was read against the 1582 scans and fixed.
"Proofread" means a person read the generated wiki pages against the scan, which is
what Wikisource quality level 3 requires. Nothing is posted yet.

| Book    | Wiki pages | Checked against the scans   | Wiki pages generated | Proofread | Posted |
| ------- | ---------- | --------------------------- | -------------------- | --------- | ------ |
| Matthew | 31-113     | yes, complete (2026-11-17)  | yes, all 83          | no        | no     |
| Mark    | 114-160    | prep: OCR vote (2026-11-17) | scratch only         | no        | no     |
| others  |            | partial (NT-wide passes)    | no                   | no        | no     |

## Matthew: what "checked" covers

Rounds 1-12b, 2026-11-16 to 2026-11-17, branch `janvier-s/odr-wikisource`
(details in the commit messages).

- Verse text: wording, w/vv, macrons (31 added in 12b), ſs where the print has it.
- Print marks: † verse starts, `*` citations, `∷` glosses, `‖` catchwords, `⊣`
  reading ends, marker positions (`<cr>` / `<na>` swaps, verse-end citations).
- Margin notes: citations in print form, glosses, lectionary notes (later-edition
  text removed from both datasets, vpon/vpō as printed), variant readings, holy-week
  headings, w/vv, macrons, long s.
- Annotations: titles, bodies (macrons, 1582 spellings, ſs/ſſ), margin notes,
  stars.
- Chapter summaries (stars, side notes), print paragraphs
  (`odr-original/matthew/paragraphs.json`), running heads incl. "HOLY weeke.",
  signature marks, catchwords.

Round 13 (2026-11-17, user report on page 37): 6 notes stored as `gloss` that the
print sets with no ∷ (lectionary 4:1, 4:18, 9:18, 1:1; headings 4:12, 6:9), 9 `<cr>`
before italic quotations moved to the verse end, 4:12's two citations under one `*`
merged, 4:18's `*` moved after "IESVS". The same kind problem exists in other books
(~58 NT, ~15 OT gloss notes with lectionary or part-heading text; not fixed).

Known leftovers: none that block posting. The wiki pages are `generated` in
`manifest.json` (not proofread), so they would go up at quality level 1.

Modern text (`odr`): synced on 2026-11-17 (step 6). Structure, word alignment
and numbers now differ only by spelling and `odr`'s own conventions; 29 content
fixes went into `odr` and the scan check found 4 slips in `odr-original` (8:23
"4." Sunday, A16.18 margin "ſec. Io.", A6.13 margin "Iac. 1.", a missing space in
23:35). Kept in `odr` on purpose: corrections of real print misprints (A3.2
"2. Cor. 7, 9" for the print's 1 Cor.; A6.13 "de do. persev." for "bo."; A13.8
"Iovin." for "Iouia."; titles "adultery" for "aduontrie" and "Supersubstantial"
for "Superſtantial"), "our Lord's Body" for "our L. Body" (A27.24 note), its own
citation abbreviations (Cyr. l., Mat., Hierom.), and no a/b/c letter keys in
A15.9 (`odr` never carries them; the `<mn>` markers key the notes). Print
misprints `odr-original` keeps and `odr` spells correctly: penanee, weas,
manifodly, ehe, aud, ttuly.

## Mark: preparation (2026-11-17)

Transkribus + Tesseract vote, see `docs/audits/mark-transkribus-findings.md`. Applied:
240 w/vv words (per word, from the vote and crops; every data w-word settled), nine half-modernised annotations
read whole on the scan, two summary notes, one extra word (16:1a1). Generator setup
done (pages 115-160, argument 114 and Luke's argument 161 not generated). Open: Steps 1-6 of the playbook.

## Other books: NT-wide passes already done

These fixed one class of error across the NT; the books were not read in full.

- Variant readings (`<alt>`): all 102 NT notes read on the scans, both datasets.
- Lectionary notes outside Matthew: vpon → vpō where printed (93), 27 hard ones
  found by eye; notes taken from the Table of Epistles and Gospels are kept.
- Annotation margin notes: long s by rule (all books), 41 NT and 105 OT notes in
  later or modern spelling read on the scans.
- One-offs: Mark 1:2, Jude 1:11, Apoc 15:6, Rom 7:1, 1 Tim 6 (Greek letter).

When a book is finished, update its row and add a section like Matthew's.
