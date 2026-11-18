# Book log: 1582 Rhemes NT against the scans

One row per book. "Checked" means the data (`static/data/odr-original`, plus
`static/data/odr` for content fixes) was read against the 1582 scans and fixed.
"Proofread" means a person read the generated wiki pages against the scan, which is
what Wikisource quality level 3 requires. Nothing is posted yet.

| Book    | Wiki pages | Checked against the scans  | Wiki pages generated | Proofread | Posted |
| ------- | ---------- | -------------------------- | -------------------- | --------- | ------ |
| Matthew | 31-113     | yes, complete (2026-11-17) | yes, all 83          | no        | no     |
| Mark    | 114-160    | ch 1-2 + argument (11-18)  | 114-120 published    | no        | no     |
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

## Mark: round 1, chapters 1-2 and the Argument (2026-11-18)

Pages 114-120 (argument, Mark 1:1-2:28 with the annotations of both chapters, and 3:1-5 with
the chapter 3 summary, which share page 120) were read against the scans (two-page sheets at
0.36, margin strips, word crops) and published. Generate with
`WS_NO_ORNAMENTS=1 python3 -I scripts/wikisource/generate.py "$PWD" mark 114 <out> 46`.

Generator: the book title's last line is per book (`TITLE_END`; it printed "DING TO MATTHEW."
for Mark); page 114 is generated from the book's first intro (`ARGUMENT`; italic with the
data's `<i>` spans as the roman quotations, margin notes in the outer margin, the four parts as
paragraphs since the linter allows no `<br/>`); 115's head prints "CHA. I." (`FIRST_HEAD_CHA`);
a word hyphenated across a page break is `{{hws}}`/`{{hwe}}` (`SPLIT_WORDS`, 115/116
"de-ſert."); `WS_NO_ORNAMENTS=1` leaves out the woodcut `image=` parameters that the untracked
`ornaments.json` adds; tokens.json carries each word's text. Matthew pages regenerate
byte-identical. Mark tables: PAGE_STARTS 120 `@annhead`, CATCHWORDS 114 "THE", 115 "sert.",
119 "ANNOT.", BARS 1:12 and 1:35 (‖ one word earlier than the lemma: "into ‖ the deſert",
"into ‖ a deſert place").

Data fixes (both datasets unless noted; 0 notes removed, counts unchanged):

- Marks: 1:14 `* And` → `And *` and its part heading "THE SECOND part…" is `head` (no ∷ in
  text or margin; the playbook's blind spot again); 1:44 `*`/∷ swapped (∷ before "to the high
  prieſt", `*` before "Moyſes"); 2:1 and 3:1 drop-cap verses carry no `*`: citation to the
  verse end; argument "he vvas _ tranſlated" (marker had been after "830."); A2:25 note
  `star: true` (the text has "and ſo _ the very chalices", the margin "Amb." has no star).
- odr-original only: speech-start capitals the print sets as W ("What", "Why") were lowercase:
  1:24, 1:27, 2:7, 2:8, 2:16, 2:19; 2:9 "VVhether" → "Whether" (single W sort). Citations
  "Lev." → "Leu." (1:44, 2:26, as printed). Notes: 1:4 "remiſsiō", "in deede"; 2:28 "whē";
  A2:10 "an other"; A2:25 margin "li. 2 off.". 1:12 citation "Lu. 4. 1." → "Lu. 4, 1." (both).
- Argument (odr-original): title ARGVMENT; "The Second", "Holy weeke", "Act. 12 and 15",
  "Philēmon", "1 Pet. 5", "them ſelues" (was modern "themſelves"), "(ſaith S. Hierom)",
  "hypotypoſ.", "Secta 29", "Cænobiorum", "li. 2 c. 15.", "the 8 yere", "li. 5 ep. 60.";
  "Which when Peter" capital in both datasets.
- `odr-original/mark/paragraphs.json` written for chapters 1-2 (1: 1 9 12 14 16 21 29 35 39;
  2: 1 13 18 23), all checked on the scans.

Checked and already right: both chapter summaries (numbers "23 … 18" in ch 2 are as printed),
all other verse `*`, ∷ and ‖ positions, annotation titles and bodies of ch 1-2 (word diff
against Transkribus, doubtful words cropped), the remaining citations, running heads,
signatures (M 117, M ij 119), catchwords.

Kept on purpose: 2:18 citation "Lu. 5, 33." where the print reads "Lu. 5,32" (misprint
correction, as Matt 11:25); 1:40 "Lu. 5, 12." (print shows no final period); 2:26 "1. Re."
(print "1 Re."); "himſelfe" in the argument (the print may have a thin space).

Step 6 for ch 1-2: structure (markers, note kinds, stars, cross-ref counts, annotation notes)
and all numbers match between `odr` and `odr-original`; no full word alignment was run.

Open, for the next Mark rounds (ch 3 from 3:6, pages 121-160):

- Lowercase speech-start "what/why/who" after a comma in odr-original verses where the print
  has a capital W: Mark 5:31, 6:3 still to check; Matthew 27:4 "ſaid, what", 27:23 "why
  vvhat" are published that way (check on the scan).
- "Lev." in Mark cross_refs (6:18, 7:10, 9:48, 12:31) where `xrefs` has "Leu.": check each
  on the scan. Matthew 5:34 and 5:43 (published) also read "Lev." in our data; the Tesseract
  OCR of Matthew reads "Leu." 11 times, "Lev." twice; check those two on the scan.
- Words hyphenated across a page break: add to `SPLIT_WORDS` as found (catchword = the
  second half).
- Fixed 2026-11-18: the generator glued a trailing number to the word before it ("c.3" for the data's "c. 3"); 62 spaces restored on 34 pages (Matthew 31-107, Mark 117-120).

## Other books: NT-wide passes already done

These fixed one class of error across the NT; the books were not read in full.

- Variant readings (`<alt>`): all 102 NT notes read on the scans, both datasets.
- Lectionary notes outside Matthew: vpon → vpō where printed (93), 27 hard ones
  found by eye; notes taken from the Table of Epistles and Gospels are kept.
- Annotation margin notes: long s by rule (all books), 41 NT and 105 OT notes in
  later or modern spelling read on the scans.
- One-offs: Mark 1:2, Jude 1:11, Apoc 15:6, Rom 7:1, 1 Tim 6 (Greek letter).

When a book is finished, update its row and add a section like Matthew's.
