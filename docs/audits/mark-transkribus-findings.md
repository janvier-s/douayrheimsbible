# Mark: Transkribus + Tesseract vs odr-original (2026-11-17)

Preprocessing pass before the Mark Wikisource round. Nothing in `static/data` was changed.
Per-location list: `docs/audits/mark-transkribus-findings.tsv` (columns: class, vote,
section, location, data word, Transkribus, Tesseract, odr-modern hint, context).

## Method

- OCR: Transkribus Print M1 (strips split per page by `scripts/wikisource/transkribus.py`)
  and Tesseract (`~/facsimiles/ocr-2026-11-12/sancta-scan`). For the argument (PDF 114),
  Tesseract 5.5 was run on the page crop (`pages/mark-argument/argument/pdf114.tess.tsv`).
- `scripts/wikisource/ocrdiff.py mark <out>`: data body text (argument, summaries, verses,
  annotation titles and text) is aligned word by word against each OCR's text column.
  Margin items are located by a character-level fuzzy search in the margin words of their
  anchor's page (±1 page). Folded before comparing: ſ/s/f, vv/w/vy/vu, u/v, i/j, l for I,
  † read as f/t, hyphen breaks, drop-cap letters, macrons.
- Vote: a finding needs BOTH OCRs to agree against the data. An OCR form also has to occur
  2+ times in odr-original. If it doesn't, it is filed as `both-unattested`, because both
  engines misread the same glyphs (c/e, t/r, y/v).
- Alignment quality: Transkribus pairs 21,084 of 22,388 data words exactly (94%), Tesseract
  16,892 (75%).

## Findings by class

| Class | Count | Confidence | Proposal |
|---|---|---|---|
| A. data **w**, print **vv** | 110 (verse 55, summary 37, argument 8, ann. text 8, ann. margin 2) | high (Tesseract never invents vv; 6/6 crops checked: Andrevv, knovv, povver, vvaues, pillovv, anſvvering) | w→vv in odr-original, per word |
| B. data **vv**, print W glyph | 12 (ann. text 10, ann. title 1, verse 8:33 VVho) | medium (both read W; Transkribus often gives a capital mid-word: "We", "Wife") | wait for the annotation-font check, then vv→w |
| C. annotation text in modern spelling | 20 voted words in 7 annotations; 9 annotations have modern forms | high | re-read those annotations whole on the scan |
| D. modern possessive apostrophe | 3 (1:sum note, 10:sum note "Chriſt's"; 3:12a1 "Heretics'") | high | drop the apostrophe (Chriſts, Heretikes) |
| E. data word the print lacks | 2 (11:16a1 "now [with] Heretical", 16:1a1 "ſhe [the] firſt") | medium | eye check; would apply to BOTH datasets |
| F. margin item not located | 28 of 294 (refs 10, glosses 10, ann. margins 8) | low | eye check (list below) |
| G. margin word differs | 3 (4:12a1 Mt.→Mat.; 8:35a3 "9."→"9,16."; 11:22 he→be) | medium/low | eye check |
| H. shared misreadings | 18 `both-unattested` | none | not proposed; a few worth a look (below) |
| I. "missing" words | 24 | none | all catchwords or margin words leaking into the column |
| J. verse wording | 0 real | n/a | verse wording is clean: every verse row in the vote is class H |

### A. w → vv

The w/vv choice is made **per word**. There is no rule by book, section or chapter. The Mark 7
summary changes from the W glyph ("With", "Which", "sheWing", "Witte") to vv ("vvoman",
"beſtovveth", "Ievves", "tovvardes") partway through one paragraph. The Mark 5 summary uses only
the W glyph ("hoW", "leWes", "Way"). Annotation text mixes the two in the same way (7/1:
"Without", "oWne" beside "vvhere", "vvas"). One word may even mix both: Transkribus reads 12:sum "Widovu" (not checked on the scan).
So the vote covers what both OCRs read, and the rest needs crops:

| Section | data w-words | both OCRs vv | at least one OCR agrees with data | open |
|---|---|---|---|---|
| verse | 214 | 55 | (mostly vv words) | ~150 w-words with no two-OCR verdict |
| summary | 121 | 37 | 61 | ~23 |
| argument | 38 | 8 | 12 | ~18 |
| annotation text | 408 | 8 | most | annotation font unknown (other agent) |

Verse clusters: 1:5, 1:16, 4:36–40 (11), 5:42–43, 7:15, 7:22, 8:34–38 (8), 10:28, 11:26–33
(21), 12:30, 12:42–43, 16:20. Summaries: chapters 1, 2, 3, 4, 7, 8, 12, 13, 14, 15, 16.

### C. Annotations in modern spelling (odr-original)

These annotations have ſ but modern word forms. Like the Matthew annotation margins, they were
not converted to the print form:

- 3:12a1 devil→diuel, Therefore→Therfore, mouths→mouthes, Heretics'→Heretikes
- 5:36a4 heart→hart (also "do")
- 6:9a4 too→to, all→al (title: Not tWo coates)
- 9:3a1 all→al, glory→glorie (2×)
- 9:12a2 Zealous→Zelous; profeſſors→profeſſours (unattested but plausible)
- 9:37a3 proof→proofe, glory→glorie, devils→diuels, ſign→ſigne, Heretics→Heretikes, do→doe
- 14:24a5 all→al, therefore→therfore
- also contain modern "do", not voted: 5:30a3, 7:15a4

odr (modern) needs nothing from this class. Its text is already modern.

### F. Margin items not located (eye check)

Short refs, where the fuzzy search scores low: 1:2 Eſa. 40, 3; 6:18; 7:10 Lev. 20, 9 (the
print may read "Leu."); 8:19; 10:6; 10:7; 10:10; 14:21; 15:16 "Io. 19, 1" (no final period);
15:28. Glosses: 6:45, 7:6, 8:22, 9:3, 10:16, 11:8, 12:9, 13:32, 16:18 ("Miracles the Church
by impoſition of hand." reads as if a word is missing), 15:29 `<i>\`buildeſt</i>` (stray
backtick in the data). Annotation margins: 3:33a6, 12:19a2, 13:14a3 (2), 14:4a1, 14:22a3,
14:23a4, 15:11a1.

### H. Shared misreadings worth a look

11:sum Paſſion (both OCRs: Paſion), 9:12a2 profeſſors/profeſſours, 15:40 Salóme (both OCRs
lack the accent; odr has Salome), 14:72 tvviſe.

## odr (modern)

None of the Mark findings change odr wording. Classes A–D are spelling. Class E (11:16a1,
16:1a1) would apply to both datasets if the scan confirms it.

Side finding outside Mark: odr-original has OCR junk the modern text lacks: Numbers 33:41
"rhey", Leviticus 10:3 "tbe", 1 Paralipomenon 4:3 "allo" (check).

## Pipeline notes for the Mark round

- Wiki pages: 114 = argument (PDF 114, not in sancta), Mark 1:1 = 115 (sancta 1/1), last Mark
  page = 160 (sancta 16/2), 161 = Argument of Luke (sancta mark/16/3, split to
  `pages/luke-argument/16/3`).
- Generator run to scratch, both sources, 46 pages: page starts agree within ±2 tokens except
  the 136/137 break (16 tokens) and 151/152. On 151/152 Transkribus is 72 tokens late because its line
  segmentation broke on sancta 13/3 (24 fragment lines; the splitter now flags this). Use
  Tesseract or a PAGE_STARTS override there, or rerun that page in Transkribus.
- Transkribus sees more marks (130 mark differences vs 64) and more macron candidates (6 vs 3:
  cōgruity, fragmēts, remēbring), which helps Steps 1 and 4.
- Step 0 still to do: HOLY weeke heads run from wiki 144 (11/1, printed 116) to 160 (both
  OCRs; check which pages lack them). SIG_FIRST['mark'] = 29 is assumed, not yet checked.
  PAGE_STARTS / CATCHWORDS for Mark are not set.

## Status (2026-11-17, applied after approval; uncommitted)

- A: 110 w→vv applied with `scripts/wikisource/apply_wvv.py` (letter by letter from the
  Transkribus reading; 12:sum prints "Widovv", checked). 0 skipped. odr-original lemmas rebuilt.
- B: 12 vv→w applied after crops (all print the W glyph). 5:3a1 "We" and the 13:4a1 title
  "When ſhal theſe things be?" also got their printed capital/question mark.
- C: the nine annotations were read whole on the scan. Changed: 3:12a1, 5:36a4, 6:9a4 (also
  modern u/v: ſeruice, them ſelues, Euang.), 9:3a1 (also the missing ")"), 9:12a2, 9:37a3 (and
  its margin note JESUS→IESVS), 14:24a5 (and title bodie/bloud). 5:30a3 and 7:15a4 already
  match the print ("do" is printed). Left alone: punctuation-only differences (5:36a4
  "deſired. and", 7:15a4 "abominable;"), and the 14:24a5 title number (print looks like 23).
- D: summary notes 1 ("preparatiō to chriſts") and 10 ("Goſpel, Chriſtes cōming into Iewrie").
- E: 16:1a1 "ſhe the firſt" → "ſhe firſt" (odr already lacked it). 11:16a1 "now With" is
  printed: no change. odr 9:3a1 got the same ")" fix.
- F: the 28 unlocated margin items are taken as table-derived; left alone.
- G: all three print readings match our data (he wil; Luc. 9,16 belongs to 8:7; Mt. 13.).
- The 169 w-words with no two-OCR verdict are done: 81 where both OCRs read vv but the first
  pass missed the match (spot check 9/9 vv), plus 88 read on crop sheets (TK boxes;
  Tesseract boxes where TK's were off, e.g. page 14/1). Result: 112 w→vv, 6 W→VV
  (Vvho, Vvhy, Vve, Vvhich), 51 kept as the W glyph. A rerun of the vote finds no w/vv
  disagreements left in Mark.
- Generator setup for Mark is done: OCR_SOURCE mark=transkribus, HOLY_WEEK 144-160 (every page),
  SIG_FIRST 29 (checked: M ij 119 … R ij 159), CATCHWORDS 160 "THE", PAGE_STARTS 152.
