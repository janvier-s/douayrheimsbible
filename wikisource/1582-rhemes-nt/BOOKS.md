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
  has a capital W: Mark 5:31 fixed and 6:3 right as it is (round 2); Matthew 27:4 "ſaid, what", 27:23 "why
  vvhat" are published that way (check on the scan).
- "Lev." in Mark cross_refs (6:18 done in round 2: "Leu."; 7:10 and 9:49 in round 3; 12:31 still) where `xrefs` has "Leu.": check each
  on the scan. Matthew 5:34 and 5:43 (published) also read "Lev." in our data; the Tesseract
  OCR of Matthew reads "Leu." 11 times, "Lev." twice; check those two on the scan.
- Words hyphenated across a page break: add to `SPLIT_WORDS` as found (catchword = the
  second half).
- Fixed 2026-11-18: the generator glued a trailing number to the word before it ("c.3" for the data's "c. 3"); 62 spaces restored on 34 pages (Matthew 31-107, Mark 117-120).

## Mark: round 2, chapters 3:6-6 and the chapter 6 annotations (2026-11-18)

Pages 121-132 (3:6 to 6:56, the annotations of chapters 3-6, and 7:1-7 with the chapter 7
summary, which share page 132) were read on two-page sheets at 0.4, margin crops and word
crops, and published. `paragraphs.json` now has chapters 1-6 (chapter 7 not yet). Chapter 7
past verse 7 is NOT checked (pages 133-160 are neither published nor read).

Seen / already right / changed:

- Marks: 4 drop-cap verses (4:1, 5:1, 6:1, 7:1) carried a `*` the print lacks: citation moved to
  the verse end. 7:6 had a `*` before the italic quotation the print lacks: citation to the verse
  end. 3 annotation stars the print has (3: "Twelue" Act. 1, "Peter" Mt. 16; 4: "And ſleepe" 1. Cor. 3;
  the OCR vote found two, the third was a `‖` in the OCR). All other verse `*`, ∷, ‖ and `†`
  positions on pages 121-132 already right. 6:9 ‖ stands before "tvvo" (BARS, wiki-only).
- Text: 4:11 margin note was cut after "heare and": now "… read neuer ſo much, they cannot
  vnderſtand. Bed. in 4 Marc." (both datasets). 5:31 "Who hath touched me?" has the capital W
  (odr-original only). Kept: 4:16 "thy likevvise" (misprint in the print, as seen), 6:3 "why,"
  (the print's w is lowercase), 5:39 margin "Ser."/annotation margin "ſer." as printed.
- Citations: 5:1 "Mat. 8, 28. Luc. 8, 26." (data had "Mt. … Lu."), 6:18 "Lev." → "Leu." (u as printed),
  6:32 "Mt. 14, 13." (data had a full stop), 6:46 "Io. 6, 16.", annotation margins "Marc. 5, 36."
  and "Chryſ. ho. 49, in Mt." (commas). Other citations on the pages already right.
- Page structure (generate.py): CHA. IIII. heading and its summary open page 123 (they were at the
  end of 122; PAGE_STARTS '@chap', catchword "Chap. IIII." on 122); page 131 starts "he blessed"
  (130 ends "heauen,", catchword "he"); words split across a page break: forth-vvith (127/128) and
  He-rodias (129/130) in SPLIT_WORDS with the catchword = second half; MANUAL_PARAS 4:3 word 3
  ("Behold" opens the paragraph, not "Heare ye") and 5:35; NO_PARAS 4:3 word 0 and 6:50 word 7
  ("And immediatly" is mid-line after "trou-/bled."). Matthew pages regenerate byte-identical.

Findings for other chapters/books:

- Drop-cap verse 1 stars again (4 of 4 in this round); the OCR does not show them.
- Citations with `Mat.`/`Luc.` full forms printed where our data has `Mt.`/`Lu.` (5:1): the data's
  `xrefs` is no guide; read every citation. Transkribus margin reading is too noisy to automate it.
- Page breaks in the middle of a line can be one word off (130/131): check each page's first and
  last words against the scan, not only the catchwords.
- Tesseract/Transkribus have no macrons: Step 4 (macron hints from the Tesseract TSV) is NOT done
  for Mark 3-6; margin notes with printed macrons ("Sacramēt" in the 6:13 note) are still plain.

Open, chapters 3-6:

- Macrons (verse text, margin notes, annotation bodies) for chapters 3-6.
- Annotation title 7 "13. With Oile)." (second annotation of 6:13): the print has a capital O and
  ")" instead of "]"; the generator prints "''13. With oile.''] ". Left as is.
- Step 6 word alignment between `odr` and `odr-original` for chapters 3-6 was not run; stars,
  markers, citations and notes were edited in both datasets together.
- Paragraph indents were taken from the OCR and checked by eye where a line looked doubtful (4:3,
  5:35, 6:50 fixed); no page was measured line by line.

Resume at page 133 (7:8): generate with `WS_NO_ORNAMENTS=1 … mark 114 <out> 46`, publish 133 onwards
only once chapter 7 is checked (page 132's chapter 7 part is already read).

## Mark: round 3, chapters 7:8-10 and the chapter 10 annotations (2026-11-18)

Pages 132-144 (7:1-7 already read; 7:8 to 10:52, the annotations of chapters 7-10, and 11:1-8 with
the chapter 11 summary, which share page 144) were read on two-page sheets at 0.4, margin and word
crops, and published. `paragraphs.json` now has chapters 1-10. Chapters 11-16 (pages 145-160) are NOT
checked. Generate with `WS_NO_ORNAMENTS=1 WS_OCR=transkribus … mark 114 <out> 46`.

**Verse numbering (decided with the user): the data now follows the 1582 print at Mark 8/9.** The
print opens chapter IX with "And he said to them, Amen I say to you…" (Vulgate 8:39) and numbers the
rest of the chapter one higher (9:2 "And after six daies", … 9:50). In BOTH datasets 8:39 became 9:1
(drop-cap "AND", citation "Mt. 16, 27. 17, 1. Lu. 9, 27." at the verse end, no `*`) and old 9:n is 9:n+1
(ch 8 has 38 verses, ch 9 has 50; the total is unchanged). Moved with it: the ch 9 annotation `verse`
numbers (4, 13, 38; the print titles read "4. Elias With Moyſes.)", "13.", "38."), `odr-clarifications`
(`scandalize` 9:42 → 9:43) and `static/data/odr/versification.json` (new `mark` → `9`, so compare, search and tooltips map
ODR 9:n to Vulgate n-1; ODR 9:1 and 9:2 share Vulgate row 1, Vulgate 8:39 has no ODR verse). The
other things keyed on Vulgate numbers (`textual-notes`, `table-epistles-gospels.json` refs such as the
Wednesday of the Imber week "Mark 9:16-28") were left alone. Old 9:1 (now 9:2) carries the ∷ before "And" with the gloss
"See the Annotations vpon the 17 of S. Matthew." (it had been on old 9:2, "And his garments"). Print
page 109 ends with the chapter IX summary and the catchword AND; 110 opens with the drop-cap verse.

Seen / already right / changed:

- Marks: 3 drop-cap verses carried a `*` the print lacks (8:1, 10:1, 11:1): citations moved to the verse
  end. 10:19 had `*` and ∷ swapped: the print has "the ∷ com-maundements, _ Commit not…" (gloss on
  "commaundements", citation before the quotation). Two annotation stars the print has: 8 ann 7
  "(as _ he did mankind" (Gen. 1, 22, 28, marker moved from after "them )" to after "as") and 10 ann 30
  "is, _ that he wil giue" (Hiero. in 19 Mat). All other verse `_`, ∷, ‖ and † positions on pages
  133-144 were already right.
- Headings: 11:1 "PALME Sunday." has no ∷ in text or margin: kind `head` (both datasets); the ch 11
  summary note is `head`, not `gloss`. Generator: the side heading prints "THE fourth" as `{{sc|The}} fourth`
  and `{{sc|Holy}}` (`SIDE_SC`), "THE THIRD" stays `{{sc|The third}}`.
- Citations: 7:10 and 9:49 "Lev." → "Leu." (as printed, both datasets; 12:31 still to check). Annotation
  10 ann 4 ended with "Aug. ep. 119 c. 19." in the body: the print has it only in the margin: removed.
- Annotation titles: the print closes some with ")" instead of "]". `PAREN_TITLES` in generate.py lists
  them: ch 7 ann 33, 34, ch 9 all three, ch 10 all five, and 6:13b (page 132, now "13. With Oile)." with the capital
  O in odr-original). ch 7 ann 2, 7, 11, 15 and ch 8 all four are "]". Chapters 1-6 and 11-16 were NOT scanned for ")" (the
  generator prints "]" everywhere else): check them.
- Macrons (odr-original only), seen on crops: 7:9 "thē", 8:19 "fragmēts" (8:20 plain), 9:9 "deſcēded"
  (print "deſcē-ded"), 9:14 "cōming"; margins "parēts", "Abſtinēce", "cōtemne", "vpō" (7:15), "Gods
  cōmaundements" (10:19); annotation bodies "cōdeſcend" (8 ann 36), "contentatiō" and "cōſcience" (10 ann 30).
  Tesseract does not show macrons: its "é" is a macron only some of the time ("Amén", "Gofpéel" are plain),
  and the m/n-dropped words it gives are rare. A read of the annotation blocks at 0.8 is what finds them.
- Page structure (generate.py): 141 opens with the Chap. X heading and summary (PAGE_STARTS '@chap',
  catchword "Chap. X." on 140); 144 opens with ANNOTATIONS Chap. X. (PAGE_STARTS '@annhead', catchword
  "ANNOT" on 143); MANUAL_PARAS 8:22 and 9:38 (indented, the OCR missed them), NO_PARAS 7:26, 7:27 and 9:3
  (mid-line or flush beside the drop cap). Chapters 3-6 pages 121-131 regenerate byte-identical.

Open, chapters 7-10:

- Paragraph indents were checked by eye on the sheets and by crop at 9:37, 7:26-27 only.
- Step 6 word alignment between `odr` and `odr-original` for chapters 7-10 was not run (structure,
  markers, notes, cross-refs, stars edited in both together).
- Macrons of chapters 3-6 (verse text, margins, annotation bodies) are still not done, except the ones
  listed in round 2; known: 5 annotation "wēche" (the print has "with the wēche roſe vp").

Resume at page 145 (11:9): ch 11 starts on 144 (read), pages 145-160 unchecked.

## Mark: round 4, chapters 11:9-14 with the chapter 13 and 14 annotations (2026-11-18)

Pages 145-156 (11:9 to 14:72, the annotations of chapters 11-14, and the chapter 15 summary with 15:1-8 on page 156,
which share that page) were read on two-page sheets at 0.4, margin and word crops, and published. `paragraphs.json`
now has chapters 1-14. Chapter 15 from 15:9 on and chapter 16 (pages 157-160) are NOT checked.

Seen / already right / changed:

- Margin-only citations (the print has no `*` before the italic Old Testament quotation): 11:9, 11:17, 12:10, 12:26,
  12:29, 12:31, 12:36 (cross_ref kept), 13:14 (after the `‖`; the `*` was before it), 14:27: `<cr>` moved to the verse end
  in both datasets. Drop-cap verse 1 stars removed in 12:1, 13:1, 14:1, 15:1 (citation to the verse end).
  11:20: the `*` stands after "And", not before it.
- Headings with no ∷ in text or margin (kind `head`, both datasets): MVNDAY. (11:12), TVESDAY. (11:20), the Chap. XIII
  side headings (13:1 "See the Annotations vpon S. Matthew c. 24.", 13:4 TVESDAY night., 13:7, 13:9, 13:12, 13:13),
  TENEBRÆ Wedneſday. (14:1), MAVNDY Thurſday. (14:12), THVRSDAY night. (14:26), GOOD FRIDAY. (15:1). 11:20 lectionary note
  now reads "b The Goſpel for S. Gregorius…" (the print keys it with a superscript b before 11:22 "And Iesvs"; Matthew 15:9
  does the same with "a").
- 14:25 "of the fruite ∷ of the vine": the print has a ∷ and a roman gloss "See Annot. in Mat. c. 26, 29." in the
  outer margin, not a citation: the cross_ref became a gloss note (both datasets; `export.corpus.test.ts` counts updated).
- Citation spelling as printed: 14:22 "Luc. 21, 19." (both datasets). Annotation star: 13 ann 14 "abomination of deſolation _
  which by Antichriſt" (Hyppolyt. note). 12:38 "doctrine, _ Take heede" and 13:34 "authoritie _ ouer ech" carry a `_` in the
  print but no margin note beside them: left as is (cannot be represented; open).
- Annotation titles: ")" on ch 12 ann 19, 24, 24 (`PAREN_TITLES`); the others of chapters 11-14 read "]" on the crops and sheets (13 ann 6, 14, 22
  and 14 ann 6, 22, 23, 71 only at 0.4).
- Macrons (odr-original): 12:43 margin "mā", 14:23 margin "cōmaundement", 14:51 "vpō the bare", 14:64 margin
  "predictiō" and "takē". Chapter 11-14 verse text has no other macron the Tesseract hints or the crops showed.
- Page structure (generate.py): 149 starts "ſhal receiue larger iudgement" (148 ends "theſe", catchword "ſhal"); 151 starts "be." (150
  ends "neither ſhal", catchword "be."); catchwords "And" (149, as printed, not AND), "ring" (152) with hea-/ring in SPLIT_WORDS,
  "ANNOT." (155); 156 opens with ANNOTATIONS Chap. XIIII. (PAGE_STARTS '@annhead'); MANUAL_PARAS 11:15 (word 5), 12:13, 12:35, 12:41, 13:32;
  NO_PARAS 13:33. Pages 114-144 regenerate byte-identical.

Open: step 6 word alignment for chapters 11-14; chapter 11-14 paragraph indents were taken from the OCR and checked at the verses above.

Resume at page 157 (15:8-32 seen at 0.4, marks 15:28 etc. not yet fixed): chapters 15-16 are the last round.

## Mark: round 5, chapters 15-16 and the chapter 15-16 annotations (2026-11-18)

Pages 157-160 (15:8-32, 15:33-16:12, 16:12-20 with the chapter 16 annotations) were read on two-page sheets at 0.4, margin and
word crops, and published, together with 145 and 150 (their `‖` had been published on stale lemma spans in round 4: after moving
markers run `build-odr-lemmas.ts --write` for both datasets BEFORE generating the pages you publish). `paragraphs.json` now has
chapters 1-16. Every Mark page 114-160 is published; Mark is checked against the scans except what is open below.

Seen / already right / changed:

- Margin-only citations (no `*` before the italic quotation): 15:28, 15:34; drop-cap 16:1 star removed (citation to the
  verse end). 16:7: the ∷ stands at "and ∷ Peter" and the `*` at "see him, _ as he told you" (they were swapped; the margin
  gloss lost a stray " · Mr. 14, 28." in odr-original). 16:19: the `_`stands after "vnto them,"; "The Ascension." has
no ∷ (kind`head`), like EASTER DAY. (16:2); "The Goſpel vpō Easter day." (16:1) is a lectionary note.
- 16:14 citation "Io. 20, 26." → "Io. 20, 19." (the print; both datasets). The print has "Lu. 25, 51." at 16:19: the data keeps its
  correction "Lu. 24, 51." (misprint rule).
- 16:18: the gloss "Miracles the Church by imposition of hand." (∷ in the text) is NOT in the 1582 print (no margin note,
  no ∷; the OCR agrees): removed with its marker from both datasets (`export.corpus.test.ts` counts updated).
- Annotation stars: 15 ann 11 "_ partly" (Euseb. note), 16 ann 1 "_ ſhe first before al other, \* and they next" (both notes). 15 ann 11 had
  "Ezech. 7, 26." twice in odr-original (the second note belongs to Io. 16, 13. Luc. 22 and 10, in the left margin): fixed.
- Page structure (generate.py): 158 ends "according to" with catchword "the", 159 starts "the Prophet" (PAGE_STARTS); MANUAL_PARAS
  15:33 (top of page 158, indented), NO_PARAS 15:36 (mid-line). Pages 114-144 and 146-156 regenerate byte-identical.

Open:

- Macrons of chapters 15-16 margin notes and annotation bodies were read at 0.4 only (pages 157-160): not done. 159 margin "Executig lawes
  againſt innocents." reads "Executig" in the print (possibly a macron); the data still has "Executing".
- Chapters 3-6 macrons and ")" titles, chapters 1-6 and 11-16 annotation titles other than the ones listed in rounds 3-4 were not
  cropped (rounds 1-2 and the 0.4 sheets read "]"); the 12:38 and 13:34 stars without a margin note; 12:31 citation "Leu." in the data is
  still "Lev." (print: "Leu. 19, 18." read at 0.4).
- Step 6 word alignment between `odr` and `odr-original` for chapters 3-16, and the paragraph indents of chapters 11-16 (OCR + eye).

## Other books: NT-wide passes already done

These fixed one class of error across the NT; the books were not read in full.

- Variant readings (`<alt>`): all 102 NT notes read on the scans, both datasets.
- Lectionary notes outside Matthew: vpon → vpō where printed (93), 27 hard ones
  found by eye; notes taken from the Table of Epistles and Gospels are kept.
- Annotation margin notes: long s by rule (all books), 41 NT and 105 OT notes in
  later or modern spelling read on the scans.
- One-offs: Mark 1:2, Jude 1:11, Apoc 15:6, Rom 7:1, 1 Tim 6 (Greek letter).

When a book is finished, update its row and add a section like Matthew's.
