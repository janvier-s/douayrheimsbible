# ODR original spelling — fidelity to the 1609/1582 print

Audit date: 2026-11-15. Compares `static/data/odr-original` against three witnesses:

1. **The scans** (`~/facsimiles/sancta/<book>/<ch>/hires/*.jpg`), read by eye. Treated as ground truth.
2. **Tesseract OCR of the same scans** (`~/facsimiles/ocr-2026-11-12/sancta-scan`). Covers 293 of ~1,330 chapters (1,079 of 4,832 pages), spread across 60 books in both Testaments. Tesseract reads long s (ſ) as `f` and keeps `vv`, so it is word-level evidence for both.
3. **The Sancta website scrape** (`sancta-scrape/data/<book>/<ch>.json`, `original` fields).

Word alignment: 167,497 site/OCR word pairs, plus a chapter-level site/scrape diff.

## Headline findings

### Long s (ſ): missing everywhere

The site has no ſ at all, and neither does the Sancta website. The print uses it throughout, in roman type and in italic margin notes alike. From the OCR word pairs:

| Context (lowercase s) | OT 1609 | NT 1582 |
|---|---|---|
| word-final | round s, always | round s, always |
| default, not final (incl. `st`, `ss`) | **ſ** 99.9% (7,887 / 7,895) | **ſ** 99.9% (8,486 / 8,495) |
| before **h** | **round** 92% (1,293 / 1,400); some books mix (Genesis: 59 ſh / 134 sh) | **ſ** 99.6% |
| before **k** | round 89% | ſ 100% |
| before **b** | mixed, 11 ſ / 9 round | ſ 100% |
| before **f** | round (2/2) | mostly round (7/9); `kinſfolke` is long |
| capital S | S, always | S, always |

Seen on the scans: "aſcend, ſearching, themſelues, hoſtes" (Amos 9), "ſtarre, ſhal" (Mt 2), "should, shal, Whence shal" (OT, round), "ſhootforth" next to "shal" in the same Genesis verse, "frendshippe" round (1 Mac 10), "ſatisfaction", "kinſfolke", "blasted" round (Gen 41).

**So:** apply the rule by default, and use OCR evidence per word wherever a page is OCR'd. The rule is about 99.6% right for the NT. For the OT the remaining uncertainty is `sh`, `sb` and `sk`, which need per-word evidence.

### w vs vv

- **OT (1609–10):** the body text prints real **w** ("wil, downe, away, which, sword"). Site and OCR agree on 6,584 pairs; there are 4 conflicts (Deut 17:2 and 17:14 "VVhen" vs OCR "When"; Ps 44:11 and 125:2 "with" vs OCR "vvith"). Italic margin notes use **vv** ("tribes vvere"). Do **not** convert w→vv in the OT body.
- **NT (1582):** the print **mixes** w and vv within a single line (Mt 2:9–11: "Who … went their way … where … was" then "vvith exceding great ioy"; 1 Cor 9:22: "vveake I became weake"). There is no rule, so each word needs evidence.
  - Site vv = print vv: 5,169. Site w = print w: 293.
  - **Site w where print has vv: 1,101 (~16%).**
  - Site vv where print has w: 97 (e.g. 1 Cor 3:8 site "ovvne", print "owne").
  - Chapters where the site has **no vv at all**, which looks like the vv was lost wholesale: Acts 14, 15, 18, 19, 20, 22; 1 Cor 1, 4; James 1–5; Apoc 1–3. Acts 1, 12, 17, 21, 23, 28 and 1 Cor 2 are nearly vv-free as well.
  - The Sancta website has the same w/vv as the site (only 2 differences: Mark 1:2, Phil 3:15), so it is **not** a witness for vv.

### Other differences from the Sancta website

Apart from note-letter glue in the scrape, the site matches Sancta closely: 174 chapter-level diff spans. The real problems, all modern spelling inside the original-spelling dataset, are listed below:

- 27 verses
- 17 verse-0 summary fragments
- 11 chapter summaries
- 80 book introductions and arguments (essentially all of them)
- 24 annotation files that lean modern

## Status after the fixes (2026-11-15)

All of this is applied to `static/data/odr-original` and mirrored to the external source folder (`../odr-original`). A backup of the external folder from before the mirror is in the session scratchpad.

**Coverage.** All 3,959 Sancta scan pages now have Tesseract OCR (`~/facsimiles/ocr-2026-11-12/sancta-scan`), so 1,359 of 1,361 chapters have word-level evidence.

**Long s.** Every s in verses, summaries, margin notes, cross-references and annotations was decided as follows:
- About 234,000 decisions came from the OCR: ſ wherever Tesseract read `f`, round s wherever it read `s`.
- About 125,000 came from the rule, mostly word-final s. Inside a word the rule gives ſ, except round s before f, and in the OT also before h and k.
- The two chapters without OCR use the rule only.

**w / vv.**
- 5,730 w became vv where the OCR shows vv. A sample of 75 checked on the scans was 75/75 correct; the OCR does not invent vv.
- For 663 places where the site had vv and the OCR read w, every word crop was checked by eye:
  - 556 really are w and were changed.
  - 115 really are vv and were kept. Tesseract misreads vv as w roughly 1 time in 6.
- All-capital running heads ("THE NEVV TESTAMENT") keep VV; the OCR misreads those.
- 46 margin-only cases with no box were left as the site had them.
- The OT body keeps its printed w.

**Other spelling and text fixes**, from Sancta and checked against the scans where they disagreed:
- About 35 modernised or truncated verses restored. This includes:
  - 3 Esdras 2:13 and 6:25, whose text was missing.
  - 4 Esdras 7:1, 7:7, 9:9 and 14:14, which held displaced text, and 9:1 and 14:1, which were missing.
  - Ecclesiasticus 14:10, where an editorial "not" was removed because it isn't in the print.
- Verse-0 summary fragments: 21 replaced with the original-spelling continuation, 23 duplicates removed, and 4 reduced to their note markers.
- 11 chapter summaries restored. Several also held the chapter's first verse in modern spelling.
- About 2,150 modern words in annotations and about 195 in notes, summaries and verses changed to the Sancta form ("have"→"haue", "than"→"then" and the like).
- Intros: a first conservative pass only, about 1,980 words against the Salette facsimile OCR. Paused at the user's request.

**Code.** `scripts/odr-lemma-lib.ts` now folds vv→w when matching annotation catchwords; ſ already folded under NFKD. Original-spelling catchword anchoring went from 95.3% to 99.1%, with none left unanchored. Lemma spans were re-written for both datasets.

**Intros.** The main intro of each of the 68 books with intros was synced to Sancta Clara Press's "Verbatim 1609" text (`sanctaclarapress.com/read/<book>/about`). The page carries it as Markdown in its RSC payload under `verbatim`.
- Main intros align 90–98% with that text. The site's paragraphing, markers and notes were kept.
- About 4,500 words changed: exact spelling variants, plus looser pairs only when the Sancta form is attested elsewhere in Sancta's 1609/1582 text, or is an æ ligature or a tilde abbreviation.
- OCR slips in that text ("Periarch", "wonld", "dauger", "Sripture") were rejected.
- Long s was added by the rule, since there is no scan OCR for these pages. vv is as Sancta prints it.
- Secondary front matter is not on those pages and is still partly modern. Examples are Genesis's "Sum and Partition", Matthew's "Sum of the New Testament", and the "Continuance of the Church" pieces.

**Modern text (`static/data/odr`), the same cleanup:**
- Restored 4 Esdras 7:1, 7:7, 9:9, 14:14 and 16:66, and re-added 9:1 and 14:1.
- Completed truncated verses in both texts: 3 Esdras 1:46, 2:13, 3:7, 6:25, 8:91 and 9:22; 4 Esdras 3:22, 5:26, 8:33, 10:21 and 16:1 (which read just "Table OF"); and Numbers 1:53. The original text also gets 3 Esdras 4:8 and John 10:11.
- Set 15 polluted summaries to Sancta's modern heading: 3 Esdras 3 and 5–7; 4 Esdras 1–3, 5, 6, 10–12 and 15; Ecclesiasticus 15 (it held chapter 16's) and 16. In the original text, 3 Esdras 7 and 4 Esdras 12 were fixed too.
- Turned about 255 leftover original spellings into modern ones, for instance "oxe", "Iesus", "Ioseph", "Samaritane", "Iob", "contrarywise". These were in verses, notes, summaries, annotations and intros. Latin citation abbreviations and possessives were left alone.
- Ecclesiasticus 14:10 keeps "not †" in the modern text, since the Vulgate has "non". It is removed from the original text, matching the print.
- `scripts/export.corpus.test.ts` pins were updated: 43,996 blocks, 48 verse-0 fragments, and one summary-less chapter.

**Still open:**
- Secondary front-matter intros are still partly modern.
- NT words where both the site and the OCR read w were not checked by eye. Tesseract sometimes reads vv as w, so a few of these may really be vv.
- 46 margin-only vv/w disagreements have no box (the scratchpad file `vv_conflicts.json`).

## Recommended fix pipeline (original plan)

1. OCR the remaining ~3,750 Sancta pages with the same Tesseract setup, so every NT word has vv/w evidence and every OT `sh/sb/sk` has ſ/s evidence.
2. Apply ſ by the rule table above, overridden per word by aligned OCR evidence. Apply vv/w in the NT from OCR evidence only.
3. Check the remaining disagreements and unaligned words against the scans.
4. Restore the modernised items below from the Sancta `original` fields. Restore the intros from the Salette facsimile OCR and the scans.
5. Site side: search and the compare view should fold ſ→s and vv→w, so that "shall" still finds "ſhal".

## 1. Verses with modern spelling in the original text

Site word(s) → Sancta 1609/1582 reading. Long-span rows are verse-boundary shifts, listed so they can be checked too.

- 1-esdras 10:42 — A maria Joseph → Amaria Ioseph
- 1-kings 20:21 — I will send also a boy saying to him Go and fetch me the arrows → 
- 1-machabees 11:6 — Jonathas → Ionathas; meet → meete; Joppe → Ioppe; glory → glorie; another → an other
- 1-thessalonians 2:12 — would walk worthy → vvould vvalke vvorthie; who → vvho; Kingdom → kingdom; glory → glorie
- 2-kings 23:39 — Urias → Vrias; All thirty seven → Al thirtie seuen
- 2-paralipomenon 26:22 — words → wordes; son → sonne; Prophet → prophet
- 4-esdras 7:1 — Jesus shall be revealed with them that are with him they shall be merry that are left in → AND it came to passe when I had ended to speake these wordes; four hundred years → Angel was sent to me which had bene sent to me the first nights
- 4-esdras 7:7 — And it came to pass when I had ended to speak these words → The entrance therof narrow and set in a stepe place so that on; Angel → right hand there; sent to me which had been sent to me → fire on; first nights → left depe water
- 4-esdras 9:9 — good works are means to salvation → ; he answered me → then shal they be in miserie that now haue abused my wayes; said Measuring measure thou the time → they that haue reiected them; it self and it shall be when thou seest after a certain part of the signs which are spoken of before shall pass → contempt shal abide in torments
- 4-esdras 16:66 — shall → shal; sins shall → sinnes shal come forth before men and the iniquities shal be they that shal stand accusers in that day
- acts 4:26 — up → vp; Princes → princes; Christ → CHRIST
- amos 9:15 — will → wil; upon → vpon; own → owne; will → wil; pluck → plucke; have given → haue geuen; saith → sayth
- ecclesiasticus 14:10 — evil → euil; evil things → euil thinges; shall not have → shal haue; fill → fil; needy → needie; heaviness shall → heauines shal
- ecclesiasticus 36:28 — credit → credite; wheresoever → wheresoeuer; dark → darke; city → citie; city → citie
- luke 2:30 — eyes have → eies haue; Salvation → SALVATION
- mark 1:2 — written → vvritten; shall → shal
- philippians 3:15 — us therefore → vs therfore; otherwise → othervvise; revealed → reuealed
- psalms 10:4 — holy → holie; seat → seate; heaven → heauen
- psalms 21:18 — have numbered all → haue lnumbered al; themselves have considered → themselues haue mconsidered
- psalms 22:2 — Upon the → Vpon cthe; up → vp
- psalms 24:1 — Unto the → Vnto athe; Psalm → Psalme; David To thee O → Dauid TO THEE ô; have → haue; up my soul → vp bmy soule
- psalms 28:11 — will give → awil geue; will bless → bwil blesse
- psalms 103:26 — ships shall pass → shippes shal passe
- psalms 123:2 — us When → vs bWhen; up → vp; us perhaps → vs cperhaps
- psalms 127:6 — children s → dchildrens; upon → vpon
- psalms 129:1 — From the depths → FROM athe depthes; have → haue; o → ô
- tobias 7:4 — said → sayd;  → of; captivity → captiuitie; Ninive → Niniue

### Verse-boundary differences (site vs Sancta)

- 3-esdras 2:14
- 3-esdras 6:26
- 4-esdras 9:2
- 4-esdras 14:14
- baruch 6:1
- mark 8:39

## 2. Verse-0 entries (summary fragments) in modern spelling

- 1-machabees 10:0 — “horsemen) 83. Jonathas burneth Azotus, with their idol Dagon: 86. so returneth b…”
- 3-kings 19:0 — “thousand in Israel, which have not bowed to Baal.…”
- acts 7:0 — “mad, so that they stone him to death (Saul consenting) he commending his soul to…”
- acts 13:0 — “foretold by the Prophets. 44. But the next Sabboth, they blaspheming, he in plai…”
- acts 21:0 — “keep Moyses' Law: 27. he is invaded by the infidel Jews, and ready to be murdere…”
- isaie 6:0 — “destroyed, but good relics shall be conserved.…”
- isaie 10:0 — “God: 21. and the Jews delivered from imminent danger: with diverse mysteries of …”
- john 1:0 — “Then, the testimonies of John Baptist, first to the solemn legacy of the Jews: 2…”
- john 9:0 — “Lord receiveth him: 39. and foretelleth by this occasion, the excecation of the …”
- john 13:0 — “Peter who presumed too much of his own strength, that even this night he will de…”
- john 16:0 — “apprehension, they will all forsake him.…”
- josue 3:0 — “15. the upper part miraculously standeth and swelleth, the lower running away, t…”
- jude 1:0 — “recover all not desperate, to confirm the weak, and to live themselves virtuousl…”
- matthew 11:0 — “God's wisdom in this behalf, 27 and calling to himself all such as feel their ow…”
- matthew 21:0 — “consequently their irreparable damnation that shall ensue thereof. [1]…”
- matthew 27:0 — “being buried, they to make all sure, set soldiers to keep his sepulcher.…”
- tobias 0:0 — “Dominica alleging this book (cap. 12.) saith: Divine Scripture instructeth us, t…”

## 3. Chapter summaries in modern spelling

Similarity < 0.9 to the Sancta heading after ignoring running heads. Where the score is low only because the scrape prefixes a book title, the summary may be fine.

- 3-esdras 5 — “Those that returned from captivity of Babylon into Jerusalem and Jury,…”
- 3-esdras 6 — “The Jews by assistance of king Darius build up the Temple in Jerusalem…”
- 4-esdras 1 — “Esdras is sent to expostulate with the ungrateful Jews for neglecting …”
- 4-esdras 2 — “The Synagogue expostulateth with her children for their ingratitude; ℣…”
- 4-esdras 5 — “Diverse signs of things to come are shewed to Esdras by an Angel: ℣.16…”
- 4-esdras 6 — “God knowing all things before they were made, created them ℣.54. for m…”
- 4-esdras 10 — “The state of Jerusalem is prefigured by a woman mourning, ℣.25. and af…”
- ecclesiasticus 15 — “A few good children, yea none at all, are better than many wicked. 9. …”
- isaie 45 — “Cyrus by God's providence overcoming Babylon, will deliver the Jews fr…”
- john 1 — “The preface of the Evangelist, commending Christ (as being God the Son…”
- mark 9 — “The more to confirm them, he giveth them in his Transfiguration a sigh…”

## 4. Book introductions and arguments in modern spelling

Not in the Sancta scrape. Need the facsimile OCR or the scans.

- 1-corinthians [0] THE ARGUMENT OF THE FIRST EPISTLE TO THE CORINTHIANS.
- 1-esdras [0] THE ARGUMENT OF THE BOOKS OF ESDRAS.
- 1-esdras [1] THE CONTINUANCE OF THE CHURCH AND RELIGION, IN THE FIFTH AGE
- 1-john [0] THE ARGUMENT OF S. JOHN'S THREE EPISTLES.
- 1-kings [1] THE ARGUMENT OF THE BOOK OF KINGS AND PARALIPPOMENON IN GENE
- 1-machabees [0] THE BOOK OF MACHABEES PERTAINING TO THE HISTORICAL PART OF T
- 1-machabees [1] THE CONTINUANCE OF THE CHURCH, AND RELIGION IN THE SIXTH AGE
- 1-paralipomenon [0] THE ARGUMENT OF PARALIPOMENON.
- 1-peter [0] THE ARGUMENT OF BOTH THE EPISTLES OF S. PETER, THE FIRST, AN
- 1-thessalonians [0] THE ARGUMENT OF THE FIRST EPISTLE OF S. PAUL TO THE THESSALO
- 1-timothy [0] THE ARGUMENT OF THE FIRST EPISTLE OF S. PAUL TO TIMOTHEE.
- 2-corinthians [0] THE ARGUMENT OF THE SECOND EPISTLE TO THE CORINTHIANS.
- 2-esdras [0] THE ARGUMENT OF THE BOOK OF NEHEMIAS.
- 2-kings [0] THE ARGUMENT OF THE SECOND BOOK OF KINGS.
- 2-paralipomenon [0] THE ARGUMENT OF THE SECOND BOOK OF PARALIPOMENON.
- 2-thessalonians [0] THE ARGUMENT OF THE SECOND EPISTLE OF S. PAUL TO THE THESSAL
- 3-esdras [0] THE THIRD BOOK OF ESDRAS.
- 4-kings [0] THE ARGUMENT OF THE FOURTH BOOK OF KINGS.
- acts [0] THE ARGUMENT OF THE ACTS OF THE APOSTLES.
- aggeus [0] THE PROPHECY OF AGGEUS.
- amos [0] THE PROPHECY OF AMOS.
- apocalypse [0] THE ARGUMENT OF THE APOCALYPSE OF S. JOHN.
- baruch [0] THE ARGUMENT OF BARUCH'S PROPHECY.
- canticle-of-canticles [0] THE ARGUMENT OF THE CANTICLE OF CANTICLES.
- colossians [0] THE ARGUMENT OF THE EPISTLE OF S. PAUL TO THE COLOSSIANS.
- daniel [0] THE ARGUMENT OF DANIEL'S PROPHECY.
- deuteronomy [0] THE ARGUMENT OF DEUTERONOMY.
- ecclesiastes [0] THE ARGUMENT OF ECCLESIASTES.
- ecclesiasticus [0] THE ARGUMENT OF ECCLESIASTICUS.
- ecclesiasticus [1] THE PROLOGUE UPON ECCLESIASTICUS OF IESUS THE SON OF SIRACH.
- ephesians [0] THE ARGUMENT OF THE EPISTLE OF S. PAUL TO THE EPHESIANS.
- esther [0] THE ARGUMENT OF THE BOOK OF ESTHER.
- exodus [0] THE ARGUMENT OF THE BOOK OF EXODUS.
- ezechiel [0] THE ARGUMENT OF EZECHIEL'S PROPHECY.
- galatians [0] THE ARGUMENT OF THE EPISTLE OF S. PAUL TO THE GALATIANS.
- genesis [0] THE ARGUMENT OF THE BOOK OF GENESIS.
- genesis [1] THE SUM AND PARTITION OF THE HOLY BIBLE. With a brief note o
- genesis [2] THE SUM OF THE OLD TESTAMENT, as it is distinguished from th
- genesis [3] OF MOYSES THE AUTHOR OF THE five first books.
- habacuc [0] THE PROPHECY OF HABACUC.
- hebrews [0] THE ARGUMENT OF THE EPISTLE OF S. PAUL TO THE HEBREWS.
- hebrews [1] THE EPISTLE OF S. PAUL THE APOSTLE TO THE HEBREWS.
- isaie [0] THE ARGUMENT OF THE PROPHECY OF ISAIE.
- isaie [1] THE FOURTH PART OF THE OLD TESTAMENT CONTAINING PROPHETICAL 
- james [0] THE ARGUMENT OF THE EPISTLE OF S. JAMES.
- jeremie [0] THE ARGUMENT OF THE BOOKS OF JEREMY.
- job [0] THE ARGUMENT OF THE BOOK OF JOB.
- joel [0] THE PROPHECY OF JOEL
- john [0] THE ARGUMENT OF S. JOHN'S GOSPEL.
- jonas [0] THE PROPHECY OF JONAS.
- josue [0] THE ARGUMENT OF THE BOOK OF IOSUE.
- jude [0] THE ARGUMENT OF THE EPISTLE OF S. JUDE.
- judith [0] THE ARGUMENT OF THE BOOK OF JUDITH.
- lamentations [0] THE ARGUMENT OF JEREMIE'S LAMENTATIONS.
- leviticus [0] THE ARGUMENT OF LEVITICUS.
- luke [0] THE ARGUMENT OF S. LUKE'S GOSPEL.
- malachie [0] THE PROPHECY OF MALACHIE.
- mark [0] THE ARGUMENT OF S. MARK'S GOSPEL.
- matthew [0] The Argument of S. Matthew's Gospel.
- matthew [1] The Sum of the four Gospels.
- matthew [2] THE SUM OF THE NEW TESTAMENT.
- micheas [0] THE PROPHECY OF MICHEAS.
- nahum [0] THE PROPHECY OF NAHUM.
- numbers [0] THE ARGUMENT OF NUMERI.
- osee [0] THE PROPHECY OF OSEE.
- osee [1] THE ARGUMENT OF THE TWELVE LESS PROPHECIES.
- philippians [0] THE ARGUMENT OF THE EPISTLE OF S. PAUL TO THE PHILIPPIANS.
- proverbs [0] THE ARGUMENT OF THE PROVERBS.
- proverbs [1] THE THIRD PART OF THE OLD TESTAMENT CONTAINING SAPIENTIAL BO
- psalms [0] Concerning interpretation of holy Scriptures.
- psalms [1] PROEMIAL ANNOTATIONS UPON THE BOOK OF PSALMS.
- romans [0] THE TIME WHEN THE EPISTLE TO THE ROMANS WAS WRITTEN, and the
- romans [1] THE ARGUMENT OF THE EPISTLES IN GENERAL.
- ruth [0] THE ARGUMENT OF THE BOOK OF RUTH.
- sophonias [0] THE PROPHECY OF SOPHONIAS.
- titus [0] THE ARGUMENT OF THE EPISTLE OF S. PAUL TO TITUS.
- tobias [0] THE ARGUMENT OF THE BOOK OF TOBIE.
- tobias [1] ANNOTATIONS. Concerning the Book of TOBIAS, JUDITH, WISDOM, 
- wisdom [0] THE ARGUMENT OF THE BOOK OF WISDOM.
- zacharias [0] THE PROPHECY OF ZACHARIAS.

## 5. Annotation files leaning modern

Count of modern / original marker words. The Sancta scrape has the 1609/1582 annotation text (`annotations[].original`).

- 1-kings/annotations/016.json (2/0)
- 1-thessalonians/annotations/002.json (4/0)
- 2-corinthians/annotations/004.json (2/0)
- 2-peter/annotations/001.json (21/3)
- 2-timothy/annotations/001.json (9/7)
- exodus/annotations/007.json (108/7)
- exodus/annotations/012.json (18/0)
- exodus/annotations/016.json (16/0)
- genesis/annotations/008.json (3/0)
- genesis/annotations/043.json (1/0)
- hebrews/annotations/007.json (54/34)
- hebrews/annotations/011.json (18/12)
- james/annotations/003.json (1/0)
- jeremie/annotations/035.json (15/0)
- josue/annotations/003.json (14/3)
- mark/annotations/002.json (13/4)
- mark/annotations/009.json (7/0)
- mark/annotations/014.json (3/2)
- matthew/annotations/017.json (10/2)
- philippians/annotations/001.json (1/0)
- psalms/annotations/006.json (8/2)
- psalms/annotations/031.json (6/2)
- romans/annotations/001.json (14/10)
- romans/annotations/007.json (12/6)
