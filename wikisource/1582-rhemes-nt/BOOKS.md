# Book log: 1582 Rhemes NT against the scans

One row per book. "Checked" means the data (`static/data/odr-original`, plus
`static/data/odr` for content fixes) was read against the 1582 scans and fixed.
"Proofread" means a person read the generated wiki pages against the scan, which is
what Wikisource quality level 3 requires. Nothing is posted yet.

| Book    | Wiki pages | Checked against the scans  | Wiki pages generated | Proofread | Posted |
| ------- | ---------- | -------------------------- | -------------------- | --------- | ------ |
| Matthew | 31-113     | yes, complete (2026-11-17) | yes, all 83          | no        | no     |
| Mark    | 114-       | partial (NT-wide passes)   | no                   | no        | no     |
| others  |            | partial (NT-wide passes)   | no                   | no        | no     |

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

Known leftovers: none that block posting. The wiki pages are `generated` in
`manifest.json` (not proofread), so they would go up at quality level 1.

Modern text (`odr`): content fixes were mirrored, but a comparison on 2026-11-17
found about 35 content differences where `odr` still has later-edition or OCR text
that `odr-original` dropped after the scan check (e.g. 8:5 lectionary note lacks
"Lu. 7, 1."; 16:13 note adds "And upon S. Leo his day April 11"; annotation
citations "In Ps. 66" / "sec. Io." for the print's 69 / 10; 23:29 lacks "ye").
Structure (verses, markers, notes, cross-refs, lemmas, annotations) is identical.
Not yet synced.

## Other books: NT-wide passes already done

These fixed one class of error across the NT; the books were not read in full.

- Variant readings (`<alt>`): all 102 NT notes read on the scans, both datasets.
- Lectionary notes outside Matthew: vpon → vpō where printed (93), 27 hard ones
  found by eye; notes taken from the Table of Epistles and Gospels are kept.
- Annotation margin notes: long s by rule (all books), 41 NT and 105 OT notes in
  later or modern spelling read on the scans.
- One-offs: Mark 1:2, Jude 1:11, Apoc 15:6, Rom 7:1, 1 Tim 6 (Greek letter).

When a book is finished, update its row and add a section like Matthew's.
