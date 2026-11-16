# ODR print-fidelity changes and errata (Nov 16 2026)

Page readings: Gemini 3.8 Flash first pass, Gemini 4 Argon (High) second pass on the 137 pages read in the earlier session, Argon (High) on the 50 pages Flash missed, plus manual image checks. Peters (DRO_OT_1/2, DRO_NT text layer) used as a third, flagging-only witness.

## Applied to the modern text (odr) — print has the word, odr lacked it
| Ref | Change |
|---|---|
| Luke 15:30 | "that thy son, this that hath devoured" (word order per print) |
| Josue 11:16 | "land of Gosen, and plain" (dropped extra "the") |
| 1 Kings 6:21 | "come down & fetch" (word order) |
| 2 Kings 11:6 | "Send me Urias" |
| 2 Kings 24:17 | "against me, and against my father's house" |
| 2 Par 16:14 | "they burnt it over him" |
| Josue 14:8 | "our Lord my God" |
| Lam 3:1 | "I the man" |
| Prov 7:15 | "desirous to see thee" |
| Ps 113:25 | "thee, O Lord" |
| Ps 118:87 | "made an end of me" |
| Ps 144:1 | "for ever and ever" |
| Ecclus 28:16 | removed "one": print reads "from nation into nation" (also odr-original) |
| Ps 83:1 | removed "to": print has only a stray "t", the Vulgate has none |
| Genesis 36:17 | "these are be the Dukes" (print doubles "are be"; kept as print oddity) |
| Isaie 33:2 | "O Lord have mercy" |
| Jer 47:6 | "Get thee into thy scabbard" |
| Job 9:2 | "man can not be justified" (was "is not justified"; print "can not be") |
| Exodus 16:15 | "one to an other" (lemma span for the catchword shifted +3) |
| Job 3:24 | "waters, so my roaring" (print ſo; both texts had "to") — found via Peters |
| 3 Kings 7:20 | "pillars above" (print aboue; both texts had "about") — found via Peters |
| Mark 14:9 | "a memory of her" (print "memorie of her"; both texts had "for her") — found via Peters |

## Applied to odr-original (transcription)
- 1 Par 5:18 "halſe" → "halfe"; Job 4:5 "faynred" → "faynted" (page images).
- 3 Kings 3:12: removed "I" ("& I haue geuen" → "& haue geuen"); Flash and Argon both read no "I" on the page (odr already lacked it).
- Psalms 85:5: removed "ſo" ("of ſo much mercie" → "of much mercie"); both readings agree (odr already lacked it).
- Job 3:24 "to" → "ſo", 3 Kings 7:20 "about" → "aboue", Mark 14:9 "for her" → "of her" (Argon on the page image).

## Print oddities kept (not corrected)
- 1 Kings 21:1 "Why thou alone"; 2 Esdras 7:39 "nine hundred three" (Vulgate 973); Baruch 6:53 double negative "can not do nothing";
  doubled words Isaie 18:7 "expecting expecting", Isaie 41:2 "with with".
- Isaie 24:19: print misprints "shal the earth the broken" (Argon on the page); odr reads "be broken" (Vulgate commovebitur), odr-original keeps "the".

## Citation-number corrections (modern odr corrected, odr-original keeps the print)
| Ref | Print (p. 803) | odr | Note |
|---|---|---|---|
| Daniel 12:7, note (e) | "Apo. 11. v. 14. &c." | "Apoc. 12. v. 14. etc." | The print misnumbers the Apocalypse chapter (Apoc 12:14 is the "time, times, and half a time" verse, cited as 12 in the annotation on the same verse). odr-original had been silently corrected; restored to the print on Nov 16 2026. Editorial note in `odr-notes/daniel/12.json`. |

Other citation numbers changed in earlier commits were checked against the page images (Argon Medium, Nov 16 2026) and are transcription fixes, not print corrections: the print already reads the current number, so they need no site note.
- b2e0381c (Nov 11 annotation review): Apoc 1 "Act. 15, 28", Apoc 12 "Dan. 10, 21", Apoc 19 "vers. 6", Gen 4 "27. v. 29", Matt 23 "c. 51" and "c. 61" (both printed); Gen 6 "600. yeare", Exodi. 32, Lev 18 "chap. 20", Acts 15 and John 6 notes (OCR).
- 7000aeb9 (Nov 11 patristic citations): Heb 7 "ho. 17", Acts 23 "ep. 65. 69", Gal 5 "li. 15 de Trin.", Gen 9 "Li. 26 Moral.", Gen 27 "c. 37 de civit." and "ho. 53", James 2 "c. 27", John 10 "Trin. li. 7" and "tract. 48", John 13 "li. 3 de Sacr.", John 14 "c. 8".
- Not checked against the print: Josue 24 "pag. 203" (was 186; a page cross-reference re-pointed with the verse re-division) and the Mar 24 ℣-reference fixes in summaries (editorial refs, not print text).

## Single-word candidates settled (Argon High on the page)
| Ref | Page reading | Verdict |
|---|---|---|
| 3 Kings 3:12 "I" | no "I" | odr-original wrong, fixed; odr unchanged |
| Genesis 36:17 "are" | "theſe are be the dukes" | odr adds "are" |
| Isaie 33:2 "O" | "O Lord" | odr adds "O" |
| Jer 47:6 "thee" | "Get thee into" | odr adds "thee" |
| Job 9:2 "be" | "can not be iuſtified" | odr "can not be justified" |
| Josue 11:9 "of them" | page has "of them:" opening v9 | boundary shift (odr has it at the end of 11:8); no text change |
| Ps 85:5 "so" | no "ſo" | odr-original wrong, fixed |
| Exodus 16:15 "an" | "one to an other" | odr "one to an other" |

Other Argon (50-page set) differences vs odr-original were abbreviation marks, margin markers or truncated reads, except boundary shifts (below). Jer 4:19 "My bellie," is not on the page read (page break); 2 Mac 3:6 odr-original is cut short: its tail "it is poſſible, al might fal into the kings powre" sits in 3:7 (shift).

## The 56 words dropped from odr last session (print lacks them)
Evidence: Vulgate + Challoner. Verdicts: **omission** = print omits a word the sense does not need (kept removed); **slip** = print misprint/drop, sense or grammar breaks, the Vulgate has the word (odr still follows the print; word listed so it can be restored if the user prefers a corrected text).

| Verdict | Refs |
|---|---|
| Omission (kept removed) | 1 Cor 14:35 "list"; 1 Esd 1:1, 1:7; 2 Par 1:17, 2:10 "metretes of", 29:17, 36:22; 1 Par 17:22, 29:28; 1 Thess 1:8 "also"; 2 Esd 2:5; 3 Kings 20:32 "Benadad"; 4 Esd 7:38; Acts 2:22, 9:9, 25:4, 27:3; Amos 3:9; Apoc 3:20 "to me"; Cant 2:10 "my"; Ecclus 11:32 "to"; Esther 7:4; Gen 11:32 "he"; Isaie 6:9, 22:11, 43:8; Jer 33:4; Job 4:5, 38:32; John 1:16; Josue 11:16; Judges 1:35; Judith 5:20; Luke 13:22; Mark 15:42; Matt 15:36; Num 3:3; Prov 4:8, 7:27; Ps 59:6; Rom 12:1; Tobias 2:12; Wisdom 10:3 |
| Print slip (kept removed, listed) | 1 Esd 2:50 and 2 Esd 7:13 "children (of) …"; 2 Kings 13:3 "Amnon (had) a friend"; 3 Kings 10:7 "the half (hath) not been told"; 2 Par 33:23 "face (of) our Lord"; Judges 6:22 "Angel (of) our Lord"; Job 20:29 "This (is) the portion"; Exodus 24:4 "according (to) the twelve tribes"; Jer 43:10 "the God (of) Israel"; 1 Kings 21:1 "Why (art) thou alone" |
| Print slip, number changes | 2 Esd 7:39 "nine hundred three" (Vulgate 973); Exodus 32:28 "about three thousand" (Vulgate/Challoner "three and twenty thousand", odr had "and twenty") |

**Restored (decision Nov 16):** the 10 slips and the 2 number cases are back in odr as `[word]` followed by `<na>(†)</na>`, each with an editorial note in `static/data/odr-notes/<book>/<chapter>.json` (shown in the study panel, tagged editorial; chapters registered in `manifests/sidecars.json`; the markers are pinned in `KNOWN_UNBOUND`). Isaie 24:19 has a † note only (no word added). odr-original is untouched. The genuine omissions stay as the print has them.
Not yet marked: the earlier fixes where odr now follows the print (the "Applied to the modern text" table) have no note, by choice of scope; Ecclus 14:10 has a note but no brackets.

## Peters as a third witness
Method: Peters' text layer (body = size 16 OT / size 15 NT, annotation blocks cut at "ANNOTATIONS"), anchored to odr verse starts and diffed in 6-verse chunks so verse-boundary shifts cancel. 32,660 of 37,154 odr verses aligned (3 and 4 Esdras are not in Peters or differ too much: 13 % and 9 %). About 7,000 word-level differences; nearly all are Peters' own modernizations. Triage keeping only differences where odr and odr-original agree and Challoner sides with Peters, then Argon on the page:

| Ref | odr / print before | Peters | Page (Argon) | Verdict |
|---|---|---|---|---|
| Job 3:24 | "waters, to my roaring" | so | ſo | both texts wrong; fixed |
| 3 Kings 7:20 | "pillars about" | above | aboue | both texts wrong; fixed |
| Mark 14:9 | "a memory for her" | of her | "memorie of her" | both texts wrong; fixed |
| Isaie 24:19 | odr "be broken", odr-original "the broken" | be | "the broken" | print misprint; odr keeps corrected "be" |

Differences left unexamined (judged Peters' own edits, not errors in the print): Peters-only insertions (e.g. 1 Cor 7:23 "a price", Tobias 2:12 "as also"), Peters omissions of words that both odr texts have (47 with no Challoner equivalent; skimmed, none looked like a print error), and ~100 spelling/word swaps such as matthew 12:20 "cast/send".


## Deut 19:5 and Jer 22:12 (Nov 16 2026, Argon High on the page images)
| Ref | Page (Argon) | Verdict |
|---|---|---|
| Deut 19:5 | "in cutting the wood of axe ſlipped out of his hand" (p. 436), so odr-original was already a faithful transcription | odr had silently corrected it ("in cutting of wood the axe"). Now "in cutting the wood of [the] <na>(†)</na> axe slipped out", print words kept, "the" supplied; editorial note in `odr-notes/deuteronomy/19.json` (Vulgate *in succisione lignorum securis fugerit*); marker pinned in `KNOWN_UNBOUND` (16 now) |
| Jer 22:12 | "he shal not ſee anie this land more" (p. 585) | print slip (Vulgate *terram istam non videbit amplius*, "shall not see this land any more"); odr "see any this land more" already follows the print; no change, no note |

## Chapter summaries and verse 0 (Nov 16 2026)
Sancta's scraped headings hold every summary whole, so they were used as the reference for odr-original; odr was compared with odr-original word by word.

**Verse-0 fragments: folded (decision Nov 16).** 47 chapters in odr (25 of them also in odr-original) had a summary cut mid-sentence with the tail stored as `verses[0]`. The tail now sits in `summary` in both texts and the verse-0 entry is gone; the 10 head notes that hung on verse 0 (Acts 13, Isaie 45, John 1, Mark 11, Matt 21, Psalms 39, 59, 76, 97, 142) are now `summary_notes` (`marker` 1, `kind` kept). Only the Tobias preface (chapter 0) still numbers its text verse 0; it is introduction matter, not an overflow, and keeps its `summary_continuation` handling. `<sc>` is now legal in summary blocks (John 1, Acts 7). Corpus pins updated (blocks 43,950; markers 13,767 bound + 18 unbound; one remaining fragment, 0 notes, 5 cross-references). The ChapterView/StudyPanel/exporter merge code is left in place for the Tobias case.

**Fixed (clear defects):**
- Stray `<i>…</i>` span starting mid-summary (about 57 characters into the overflow) and running to the end: 35 odr chapters, 2 odr-original (1 Mac 9, Acts 19). Sancta and the print have no italics there; tags removed.
- 6 odr summaries had the first words of verse 1 appended (3 Esdras 1 and 4; 4 Esdras 4, 8, 13, 16); removed. Matt 1 and Abdias 1 had the margin citation ("Gen. 12. 22. 2. Reg. 7. Psal. 131.", "S. Epiph.") appended, a copy of the verse notes; removed. Abdias 1 regained "19." before "And redemption".
- odr summaries missing words the print has (odr-original had them): 2 Mac 2 ("Holy fire, and the book of the law were conserved by"), 2 Par 34, 4 Kings 22, Deut 15, Exodus 2 (first clause), Exodus 5, Hebrews 5, Judith 15 (first clause), Numbers 33 (first clause), 4 Esdras 9 (end), Apoc 15 "seven", Luke 12 "so much", Baruch 3 "with a", Judges 17 "a graven, and a molten idol", Eccles 4 (word order restored to the print).
- odr-original summaries that had fallen back to modern spelling (1 Kings 20, 2 Mac 2, 3 Kings 9, Daniel 2, Deut 22, Josue 3, Lev 12, Mark 11) were re-read against Sancta's verbatim heading and respelled; the verse-0 split point is unchanged.
- Job 26 had no summary in either text; the print has one (page confirmed): added to both.

**Looked at, not a defect:** Proverbs 10–29 and Tobias 0 have no summary in the print. Canticles 1–8: the argument is set as lettered margin notes (already in the verse notes), not a chapter summary. Lamentations 1–4: Sancta's "headings" are not a printed summary (Argon: no argument under CHAP.); Lam 5 and Hab 3 carry the heading + marker notes already.

**Summary slips (decided):** where the print has a stray word odr now follows the print (Matt 21 "foretelleth his in two parables", Colossians 1 "the Gospel was not of"); where odr supplies a word the print lacks it is bracketed with a † marker and an editorial note on the summary (`odr-notes/<book>/<chapter>.json`, verse 0, shown as "Summary" in the study panel): Gen 15 "[a] strange land", 2 Cor 5 "may [go] to heaven". Markers pinned in `KNOWN_UNBOUND` (18 now).
**Margin notes cut off in summary_notes:** Daniel 5 note restored from Sancta ("…4. Reg. 25. There reigned also … called Niglissar and Labosardach: as testify Eusebius, S. Jerome, S. Bede, and others"; the "4. Reg. 25." that had landed at the end of the summary belongs inside the note); Ecclesiasticus 44 "…thanks to God." (page confirmed, "thankes to God").

**Sync:** the external `../odr-original` (Websites/odr-original) was brought in line for every odr-original file changed here (it also lacked the earlier Job 3:24, Job 4:5, 3 Kings 3:12 and 7:20, Psalm 85:5, Mark 14:9 and Ecclus 28:16 fixes).

## Margin-note print misprints and oddities (scan apply, Nov 16 2026)
- Ps 6:6 l: print reads "no cenuerſion" (for *conuerſion*); odr-original keeps the misprint, odr reads "no conversion."
- Romans 5:2 (note 1): print reads "certaitie" (nasal tilde lost); odr-original keeps "certaintie".
- Ps 81:7 h: the margin citation "Sap. 6." is in `cross_refs`; the stray "sap." fragment in the odr-original note text was removed.
- The print sets a capital W for the "we" in saints' names inside lectionary notes ("S. MatthéWes day", "AlholoWes eue", "S. BartlemeWes day"); the data spells them with lower-case w.
- Ps 81:8 k: print reads "that eing he is Lord of al" (the ſ dropped); odr-original keeps it, odr reads "seeing".
- Ps 118:8 q: print reads "profitably leiſt a while" (for *left*); odr-original keeps it, odr reads "left".
- Ps 101:5 h: print "al ſauour" = *savour*; odr read "favour" and now reads "savour".
- Mark 16:18: print (and the Sancta scrape) read "Miracles the Church by impoſition of hand" (no *in*); odr-original keeps it, odr reads "in the Church".
- Gen 46:1 note: the print has "The eight and laſt part of this booke." before the argument (added to both texts).
- Num 19:2 [1]: print reads "(q. 36. in Num)" with no full stop after *Num*; odr-original follows the print, odr keeps its stop.

## Annotation title misprints (Nov 16 2026)
Annotation `title` lemmas checked against the scans (Argon High). The print misprints; odr is corrected, odr-original keeps the print. Titles are plain strings, so there is no `(†)` marker.
| Ref | Print | odr |
|---|---|---|
| Gen 1:1 | "In the beginnig." (n for ng) | "In the beginning." |
| Gen 36:6 | "Departed from his btother." (t for r) | "…his brother." |
| Gen 48:16 | "The Angel that delinereth me." (n for u) | "…delivereth me." |
| Matt 5:32 (second note) | "Committeth aduontrie." (n for u; the prose reads "aduoutrie") | "Committeth adultery." |

## Open
- Verse-boundary shifts between print and odr (same clause sits in the neighbouring verse): 1 Kings 4:4/5, 1 Mac 16:9/10, 1 Par 9:8/9,
  2 Mac 3:6/7, 2 Mac 6:21/22, Josue 11:8/9, Josue 13:17/18, 4 Esd 13:31/32, Acts 5:22/23, Apoc 21:10/11, Dan 3:91/92, Jer 34:15/16, Judges 2:16/17, Mark 10:48/49,
  Ps 77:5/6, 82:12/13, 107:9/10, 108:21/22, 124:1/2, Wisdom 10:12 — to be handled with the verse-count mismatches.

**Deut 30 annotation (Nov 16 2026):** the print (p. 459, Argon) sets verses 15 and 19 inside the verse-11 annotation ("…God him ſelf anſwereth: 15. That he hath ſet before thee…"), not as entries of their own. odr and odr-original now both have annotations for verses 6 and 11 only; odr-original's "Free-will." margin note moved onto verse 11, and the two orphan catchword spans were rebuilt.
