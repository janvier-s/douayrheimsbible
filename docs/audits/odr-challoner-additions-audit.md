# Challoner-style additions removed from modern annotations: recheck against the page scans

Commit 00721721 (`docs/audits/odr-annotations-modern-audit.md`) removed passages from
`static/data/odr/<book>/annotations/*.json` on a majority vote of modern, odr-original and the Sancta scrape.
None of those witnesses is a page image, and a similar removal (saints' days in lectionary notes) turned out to
be print content from the Table of Epistles and Gospels. This audit re-checks every removed passage against the
scans.

**Result: the print has none of them. Nothing was restored; every removal stands.** Three modern words that the
00721721 repair itself broke or dropped, plus one citation, were fixed against the print.

## Method

1. Every annotation changed by 00721721 was word-diffed (old modern vs repaired modern). Hunks that delete 3 or
   more words (net loss of 2 or more), and a second pass over all hunks that delete 1 or more, were listed
   (88 hunks; 25 are real deleted passages or clauses, the rest single-word fixes, glued-word splits or hunks
   where the longer, correct text sits on the NOW side). Each was tested for a 3-word run in odr-original or the
   scrape: none of the deleted passages is in either.
2. Searched for each passage in `static/data/reference/odr` (all files), Peters (`peters-columns/v1..v3`) and
   the Sancta OCR of every page of the book. Peters (a later edition) has some wording
   ("priestly functions…", "Brothers easily envyeth…", "matched his second son") but in other places; it is not
   evidence for the 1609 page. The reference files have none of the passages.
3. Read the page images (Gemini 3.8 Flash low, bands and small line crops around the passage; asked for plain
   transcription, never a leading question). Where the reader's output filter cut a long transcription, the line
   crops were re-read until the whole passage was seen.

## Candidates and verdicts

| Ref | Removed text (old modern) | Where looked | Verdict |
|---|---|---|---|
| 2 Macc 15:39 | "In like sort the continuance of Priesthood, and Priestly functions is manifest in the books of Esdras … Sacrament of holy Orders, in the Church of Christ." | `2-machabees/15` p.4–5; Peters v2 p-930 (the sentence is in Peters' table, not here); reference: none | LACKS. The print runs "…these our endeavours; so to you we offer the rest of our laboures, euen to the end of our liues". The sentence had been spliced into the note from the table. |
| Apoc 1:1 | "admirable book, and to excite…" | `apocalypse/1` p.3 | Not a removal: the print has the repaired text ("deepe prophecie : giuing him further to vnderstand, that vve vvil in our Annotations … and ſome other alſo"). |
| Apoc 1:6 | "there are or ought to be no ecclesiastical Priests, such as are ordained," | p.3 line crops | LACKS. Print: "vvould therfore inferre, that euery one is in proper ſignification a Prieſt, or that al be Prieſts alike". Side finding: modern read "infer, thatare one is"; fixed to "that every one is". |
| Apoc 1:10 | "…fully observed on that very authority only: which sheweth that not the Church alone…", "in memory of Christ's Resurrection and triumph over death, and the coming of the Holy Ghost." | p.3 b3, p.4 b0 | Not removals: the print has the repaired text ("Such great power did Christ leaue to his Church…", "Sunday is a heatheniſh calling…"). |
| Apoc 1:10 | "The ancient Church called Sunday, Dies Dominica, the Lord's day: and all other feasts, Feriae: and the Seventh day still, Sabbathum the Sabbath: not by the Pagan…" | p.4 b0 | LACKS. The main text goes "…the other by the name of Feries, vntil the laſt of the vveeke, vvhich ſhe calleth by the old name, Sabboth". The only related print is the margin note "The Church vſeth not the Heatheniſh names of daies: but Dies Dominicus, feria, Sabbatum", already stored as the ◦ note. |
| Apoc 12:7 | "as whose times he" | p.3 b2 | Repair, not a removal: print "S. Michael (protector of the Church militant as he vvas ſometime of the Ievves Synagogue Dan. 10, 21.)". |
| Gen 3:22 | "These Angels also hinder the devil, that he cannot enter Paradise…" | `genesis/3` p.6 line crops | LACKS at 3:22. It is the last paragraph of the 3:24 note (margin "Good Angels hinder diuels of their desires"), where it already stands. |
| Gen 36:6 | "Brothers easily envy each other: but the parents are glad of their children's advancement." | `genesis/36` p.5 | LACKS. The note ends "…now went to Seir againe after his fathers death." The sentence is Peters' margin note for Gen 37, not in the 1609 page. |
| John 21:17 | "bear the burden of the Principality, to undertake…", "giveth no difference of love had been sufficient" | `john/21` p.3 | LACKS. Print: "but vvhen it commeth to the gouernement of the Church … al vvoman kind muſt needes vvholy giue place to the burden and greatnes thereof". Side finding: modern read "when to cometh"; fixed to "when it cometh". |
| Lev 18:6 | "(1 Cor. 5. v. 1.) even among the Pagans, the unlawful match of a son and mother", "only positively. So", "which sheweth the degree was not of nature, but only positive", "the law ruling at that time of the Synagogue commanded it (Deu. 25. 5. 20) neither did Jacob question…", "where the penalty was only…" and the other hunks | `leviticus/18` p.4 (line crops) and `leviticus/19` p.2 (the note runs on there) | LACKS. The print matches the rebuilt modern throughout ("But beſides the right line … by poſitiue only. So this preſent law … the ſame law commanded (Deut. 25.) …"; "as appeareth by Laban, who after he had deceiued Iacob … neither did that holie Patriarch thinke it vnlawful to keepe them both. And when Iudas matched his ſecond ſonne"). |
| Matt 27:46 | The English Catechism of R. H. 1583 quotation and "Quite contrary to the holy Scriptures…"; "(remaining as yet in his body)"; "his descending was in soul (parting forth of the body) into that place, where the Fathers…"; "he sweat blood,"; "Yea destitute of such consolation, as his holy Martyrs…" | `matthew/27` p.4 (b2, b3) and p.5 b0 | LACKS (all seven hunks). Print p.4: "that his soule suffered the very paines of Hel vpon the Crosse. Whereas in deede by these wordes out of the Psalme, our Sauiour wil signifie no more but … (as before in the garden when he was but toward his Passion) he saith he [p.5] was forſaken, for two cauſes … left to die in extreme paines as a mere man." Then verse 59. |
| Ps 13:1 | "nor could be justified," | `psalms/13` p.2 | Duplicate in the old modern ("nor could be justified, nor could be justified"); the print has it once, as modern now reads. |
| Rom 7:19 | "All which S. Augustine clearly teacheth to. 4. in exposition: quarundam propos. ad Rom. propos. 44. 45. and 46. and in many other places." | `romans/7` p.3 | LACKS. The note ends "vvhich doth moſt euidently proue free vvill." and verse 25 follows. |
| Rom 9:17 | "as S. Augustin teacheth. Ser. 88. de temp. Where … we intend to recite some more upon the 7. or 9. chapt. of Exodus; if God will give us means to set forth the old Testament in English." | `romans/9` p.5 | LACKS. Print: "in vvhoſe iudgements there be many things ſecrete, but nothing vniuſt." then verse 20. |
| Rom 13:1 | "not being the cause of their evil doings, turned and ordered the same to good effects. S. August. tract. 112. in Ioan. S. Tho, 1. p. q. 19. a. 9." | `romans/13` p.2 | LACKS. Print: "…but they vvere out of the compaſſe of his cauſing and ordinance." then verse 2. |
| Tobias 10:1 | "principal points, and plain" | `tobias/10` p.2 line crops | LACKS. Print: "reduced to two heades, or principal partes. For in this Mariage there were certaine neceſſarie, and as it were eſſential pointes, without which it had not benne a lawful nor right contract". Side finding: modern read "as by the law essential"; fixed to "as it were essential". |
| Mark 10:30 | "do note:" | `mark/11` p.1 (OCR and zoom) | LACKS: print "…and S. Paulinus: but the principal meaning". Side finding: the colon had been dropped from modern with the words; restored (odr-original has it). |
| 1 Tim 2:1 | second "Pater noster" | — | Duplicate word in the old modern; print has one. |
| Apoc 1:20 | "are the" | `apocalypse/1` p.4 OCR | Print: "The ſtarres of the Church, as the Churches them felues are the golden candleſtickes"; modern is right. |
| Rom 4:1 | "justice nor", "he had" | odr-original | Word fix; odr-original (from the print) reads "no other eſtimation of iuſtice … before his faith". |
| Acts 8:38 | "S. Paul Ian. 25. Act. 22, 4. Gal. 1, 13." | not examined | Excluded by the brief (another agent holds the Acts notes). |

Single-word deletions (a, the, an, of, also, giveth, undertake, …) and the glued-word splits (`itnot`, `hunter,</i>a`,
`of Assirians`, `August.2.`, `2.3.`) were counted as word fixes and skipped as instructed.

## What changed

- Restored: **nothing** (no candidate is in the print).
- Fixed, all against the print and all in modern only (odr-original already had them): Apoc 1:6 "thatare one is" to
  "that every one is"; John 21:17 "when to cometh" to "when it cometh"; Tobias 10:1 "as by the law essential" to "as
  it were essential"; Mark 10:30 colon after "S. Paulinus"; Gen 36:6 "chap. 22. v. 4" to "v. 3" (print: "chap. 22.
  v. 3", a misprint for 32; recorded in `docs/odr-errata.md`).
- No lemma spans moved; `npx vitest run`: 537 passed before and after, no pin edited.

## Seen, not changed

- Gen 36 note 6 (modern) ends the marker text "Esau's last parting from Jacob. (c)": the stray "(c)" is a margin-letter leak.
- Tobias 10:1: one line read of the print gives "(as then it is was not)", another "(as then it was not)"; modern keeps
  "(as then it was not)". Unsettled by the readers; left as it is.
- Lev 18:6 note: the passage runs onto `leviticus/19` p.2 in the scan set, so the chapter folders do not hold only that chapter's pages.
- The repair of 00721721 left a few other glitches of the same class ("thatare", "to cometh"). Only the ones met in
  these hunks were fixed; a scan for modern words missing from odr-original in the other 171 annotations was not run.

## Counts

Candidates (distinct passages or clauses in deleted-text hunks, Acts excluded): **25**. Restored: **0**.
Stayed removed (print lacks it, or the old text was a duplicate or garble that the repaired text replaces): **25**.
Unsettled: **0** (Acts 8:38 not examined by the brief).
