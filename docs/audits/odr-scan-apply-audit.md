# ODR scan-batch apply audit (Nov 16 2026)

Input: `docs/audits/scan-batch-results.jsonl` (82 worklist notes, 85 questions) read against
`static/data/odr-original` and `static/data/odr`. Method: normalised word diff between each `print_text` and our
note (ignoring long s, vv, hyphenation, italics, leading marker), then a second diff of modern against the print for
the notes where odr-original already matched. Fixes are exact string replacements on the raw JSON (62 edits, 28 files,
48 lines, every old string unique in its file). Lemma spans re-run for both datasets: no change. `job.json` restored.
`npx vitest run`: 537 passed before and after, no pins edited.

## Counts

| | notes |
|---|---|
| Worklist | 82 |
| Found by the batch | 63 |
| Not found by the batch ("absent") | 19 |
| Edits applied | 62 (37 in odr-original, 25 in odr) in 28 files |
| Found notes already right in both texts | 21 |

## Fixed in odr-original

- Wrong or missing word: Eccl 43:2 a (`ſenſes`→`ſenſles`, `whole`→`whoſe`), Ezech 20:14 c (`At`→`As`),
  Ps 25:4 d (+`confidence of`), 71:2 d (+`is`), 77:46 r (stray `∷` where the print has `a`), 92:1 f (`a ſoule`→`in ſoule`),
  107:4 c (`ſuffered`→`auerred`), 108:9 g (`poſte title`→`poſteritie`), 118:8 q (`leiſt`→`left`),
  131:11 q (`Act. 1.`→`Act. 2. v. 30`), Isaie 19:1 a (+`B.` Sauiour), Daniel 11:38 n (opens "The God of povvre", not "Maozim,"),
  Gen 3:14 c (St.→S., modernised words respelt), Hab 3:1 (modernised spellings respelt to print), 1 John 2:16 (stray "all." removed, respelt).
- Spelling slips against the print: Ps 78:1 `fane`→`faine`, 81:8 `eing`→`ſeing`, 101:5 `ſauour`→`fauour`, 117:12 `trooper`→`troupes`,
  140:2 `ſume`→`fume`, Isaie 3:1 `here`→`nere`, Isaie 45:4 (`li. 11. Antiq.`, `verie`), Numbers 19:2 c (`reueled and`, `diuers`), Micheas 7:14 `rodde;`, Ps 81:7 stray `sap.` removed.
- Possessive apostrophes removed where the print confirms the form: Daniel 3:90 (`S. Ieroms vvordes.`), Esther 11:1 (`Amans`, `Iewes`),
  Prov 27:3 (`fooles`; the note also continues "for it hath no mercie."), Prov 27:5 (`enemies`, `freindlie`),
  Matt 4:18 (`Andrewes`), Matt 9:9 (`Matthewes`), Luke 6:12 (`Bartlemewes`), Luke 6:17 (`Alholowes eue`).
- Gen 46:1: `Iacob`, `Ioſephs`, and the print's opening "The eight and laſt part of this booke." (also added to odr).

## Fixed in odr (modern)

- Stray letter after the cross-reference removed: 1 Mac 1:10 (D), 1:16 (F), 4:27 (O), 6:16 (S), 6:17 (V), 7:38 (B).
- Words that differ from the print: 1 John 2:16 (`in his` removed), Amos 9:11 (`the Gentiles`), Deut 11:14 (`seeding and before harvest`),
  Ezech 45:16 (`As the people`), Hab 3:2 (`an ox`), Joel 3:2 (`on the east side`), Judges 20:13 (`and contempt`), Numbers 19:10 (`needed`),
  Ps 6:6 (`no conversion.`: the note was cut off), 49:14 (`sacrifice`), 55:6 (`wresting`), 61:5 (`A most`), 64:6 (`voice`), 81:1 (`process`), 82:5 (`Catholics`),
  1 Peter 3:3 (`ours`), Romans 5:2 (`the certainty`), Prov 27:3 (note completed), Gen 46:1 (opening sentence).

## Left, and why

- Modern archaisms and spelling pairs: `Whilst`/`Whiles`, `astonished`/`astonied`, `bound`/`bond`, `indeed`/`in dede`, `always`/`Alwayes`, `Saint`/`S.` (modern expands the abbreviation throughout).
- `Gētils`, `certaitie` (tilde), `quæſt.` vs print `queſt.`: ligature and abbreviation conventions already decided elsewhere.
- Leviticus 23:36 "(h)" vs the print's `∷` marker: marker convention, not text.
- Habacuc 3:1 ends "and Damnation" in our text; the Flash read has no "and" (single witness, left).
- Whole-note divergences, **unsettled**: Ps 61:5 i, 83:4 g, 89:1 a, 107:4 c, 118:8 q, 118:62 g. The batch's print text is a different (often shorter) wording of the note than ours
  (e.g. Ps 89:1 cites Genebrard, S. Hieronymus ep. 139 and S. Remigius; ours is a long gloss about Esdras). Only the single words the questions asked about were applied.
  These need a full re-read from the page, and a decision about which edition our note text follows.
- Ps 6:6, Ps 48:15 and similar: the batch's print text runs on into the next lettered note; our split is correct (not a defect).

## The 19 "absent" notes, re-checked

The batch's explanation (lectionary notes live in a back index) is wrong. The lectionary readings are printed in the **inner (gutter) margin** beside the verse, e.g.
`The Gospel vpõ S. Matthewes day.` at Matt 9:9 (hires/1.jpg, left gutter, y≈1650). The batch read only the outer margin. The margin OCR files
(`<n>.left.txt` / `.right.txt`) carry the text; a few are OCR-garbled.

The 1582 print's wording is often **not** the wording of our numbered ("1"/"2") notes, which list saints and dates the print does not carry at that verse. Those were left unchanged.

| # | Ref | Result |
|---|---|---|
| 0 | 1 Cor 4:9 [2] | Print has `a The Epiſtle vpon S. Iames day, Iul. 25.` (v. 9) and `b The Epiſtle for a Confeſſor that is not a Biſhop.` (v. 10). No Simon and Jude. **Unsettled**, left. |
| 1 | 1 Cor 12:27 [1] | Print near v. 27 has no Bartholomew note; the gutter note at 13:1 is `The Epiſtle vpon the Sunday of Quinquageſme`. **Unsettled**, left. |
| 10 | 2 Cor 10:17 [2] | Gutter notes on the page are glosses and a Greek note; no Lucy/Martha/Agnes/Potentiana. **Unsettled**, left. |
| 11, 12 | 2 Tim 2:8, 3:10 | No George's-day note on either page (glosses and citations only). **Unsettled**, left. |
| 13 | Acts 28:8 | Neither margin shows the gloss on the page read; OCR search for "imposition" finds nothing. **Unsettled**; `Apoſtles` kept. |
| 30 | John 15:1 [2] | Print gutter: `The Goſpel vpõ Sunday after the Aſcenſion` (p. 3); no George. **Unsettled**, left. |
| 33 | Luke 5:27 [2] | Gutter notes are `...vpõ the 4 Sunday after Pentecoſt`, `...Friday in Whitſonweeke`; no Matthew's eve. **Unsettled**, left. |
| 34 | Luke 6:12 [1] | **Found**: `The Goſpel vpõ S. BartlemeWes day.` (image read). Possessive fixed. |
| 35 | Luke 6:17 [1] | **Found in part**: `The Goſpel vpõ AlholoWes eue. And for many Martyrs.` (image read). `Allhallows'` → `Alholowes`; Fabian, Sebastian and Dionyse not printed here, left. |
| 36 | Luke 10:1 [1] | Print gutter has only `b The Goſpel vpon the Aſſumption of our Lady Aug. 15` (v. 38). No Mark or Luke. **Unsettled**, left. |
| 37 | Luke 11:33 [2] | Print: `The Goſpel for a Confeſſor that is Biſhop.` (page 2). No Martin. Left. |
| 38 | Luke 12:35 [1] | Print: `The goſpel for a Cõfeſſor that is not a Biſhop` and `...for S. Paulinus Iun. 22.`. No Silvester/Antony/Dominic. Left. |
| 39 | Mark 16:18 [1] | Gloss not located (the page's gutter shows `The Goſpel vpõ the Aſcenſion day.` at v. 14 and cross-references only). **Unsettled**; the `in` question stays open. |
| 40 | Matt 4:18 [2] | **Found**: `The Goſpel vpõ S. Andrewes day.` Possessive fixed. |
| 41 | Matt 9:9 [2] | **Found** (image read): `The Goſpel vpõ S. MatthéWes day.` (no date in the print). `Matthewes` fixed; "Sept. 21." is ours, left. |
| 42 | Matt 13:44 [1] | Print: `The Goſpel for Virgins & other holy Women` (13:3 gutter, p. 3). No Lucy or Anne. Left. |
| 43 | Matt 19:3 [1] | **Found as a variant**: `The Goſpel for Mariage. And for S. Agatha Febr. 5.` (no possessive). Our wording differs; left. |
| 44 | Matt 25:1 [1] | Print: `The Goſpel for holy Virgins.` at v. 1; no Catharine. Left. |

Counts: 4 found in print (34, 35 in part, 40, 41) and fixed; 1 found as a variant (43) and left; 14 not carrying our wording (left, unsettled).

## Unsettled summary

1. The six whole-note psalm divergences above.
2. 14 lectionary notes whose saints/dates are not in the print margin at that verse (full list above); may belong to another edition's lectionary, or sit on a page not read.
3. Acts 28:8 and Mark 16:18 glosses, not located.
4. Daniel 3:90: the batch's transcription read `vvrordes`; `vvordes` is a best reading (medium confidence).
5. Old dataset question still open: these audits found many notes whose text follows a different version than the page scans. Worth deciding which edition the odr-original notes are meant to follow before more word-level work.

Not touched: `odr-original/hebrews/annotations/007.json` bodies and annotation titles.

## Second pass: scrape, Peters and page re-reads (Nov 16 2026)

Policy: the scan wins. Scrape = `sancta-scrape/data/<book>/<ch>.json`; Peters = `ocr-2026-11-12/peters-columns`; page reads with `agy --model gemini-3.8-flash-low`
on crops of the hires pages (psalm notes are set inline under the verse, not in a margin).

**The batch's `print_text` is not reliable for psalm notes.** Where it disagreed with both the scrape and our text, the page said otherwise: Ps 89:1 a, 83:4 g, 118:62 g
(page and scrape = ours; the batch text was a blend of neighbouring notes), Ps 61:5 i (page = ours). Six of my first-pass edits were taken from those answers and were reverted after the page read:
Ps 78:1 `fane` (print), Ps 81:8 `eing` (print misprint), Ps 101:5 `ſauour` (print; odr corrected to `savour`), Ps 118:8 `leiſt` (print), Isaie 45:4 `very` (print),
Habacuc 3:1 `differed`, `& damnation` (print). Ps 81:7 h now ends `Sap. 6.` as printed. Confirmed on the page: Ps 25:4 (confidence of), 71:2 (is), 77:46 (a), 92:1 (in ſoule),
107:4 (auerred), 117:12 (troupes), 131:11 (Act. 2), 140:2 (fume), Dan 11:38, Eccl 43:2 (ſenſles), Isa 3:1 (nere), 19:1 (B.), Mic 7:14 (rodde;), Gen 3:14, Num 19:2, Prov 27:3 and 27:5, Hab 3:1.
Not visible on the crops: Eccl 43:2 "whoſe" (kept: the line break shows "by whoſe in-fluence"). Left as the batch gave them, unchecked on the page: Esther 11:1 `Amans`, `Iewes`.

**Lectionary notes.** The scrape (which matches the page) has a print note at every one of these verses except 1 Cor 12:27, 2 Cor 10:17, 2 Tim 2:8, 2 Tim 3:10 and Acts 28:8.
Our numbered notes are expansions of the print note (saints and dates added). Following "scan wins", the notes were reduced to the printed wording in both texts:
1 Cor 4:9 [2], Luke 5:27 (orig), 6:12, 6:17, 10:1, 11:33, 12:35, Matt 9:9, 13:44, 19:3, 25:1 (Matt 4:18 already matched). The dates and extra saints dropped are listed in the git diff.

| Result | Items |
|---|---|
| Print note found and text now follows it | 1 Cor 4:9, Luke 5:27, 6:12, 6:17, 10:1, 11:33, 12:35, Matt 4:18, 9:9, 13:44, 19:3, 25:1 |
| Mark 16:18 | print and scrape both read "Miracles the Church…": orig correct, odr's `in` kept; errata |
| Peters | silent on all of these lectionary notes; no vote from it |
| **Still unsettled** | John 15:1 [1]/[2] (print has one note, "The Goſpel for one Martyr."; ours has two longer ones); and the five notes with **no print counterpart at all** (1 Cor 12:27 Bartholomew, 2 Cor 10:17 Lucy/Martha/Agnes/Potentiana, 2 Tim 2:8 and 3:10 George, Acts 28:8). They are additions, not in the scrape or on the page. Left in place pending a decision on whether to delete them. |

## Lectionary notes: the Table of Epistles and Gospels (Nov 16 2026)

The saints' days in the numbered lectionary notes come from the print's back-of-book *Table of the Epistles and Gospels* (`static/data/reference/odr/nt/table-epistles-gospels.json`),
placed at the verse where each reading begins. They are print content, but they are not margin notes. Decision: the margin note carries the printed wording only;
the table-derived text is kept in an extra field on the same note, so no verse marker or label changes.

- `table_text` (string): the former combined note text, on 1 Cor 4:9 [2], Luke 6:12, 6:17, 10:1, 11:33, 12:35, Matt 9:9, 13:44, 19:3, 25:1 and John 15:1 [1]
  (John 15:1 [1] now reads "The Goſpel for one Martyr.", confirmed at verse 1 on the page). Both datasets.
- `table_only: true`: notes with no margin counterpart, whose whole text is table-derived: 1 Cor 12:27 [1], 2 Cor 10:17 [2], 2 Tim 2:8 [1], 2 Tim 3:10 [1], John 15:1 [2].
- Matt 4:18 and Luke 5:27 already equal the printed wording (their old text added nothing); no field.
- The saints' possessives inside `table_text` keep the apostrophes of the reference table; the table's own print spelling has not been read from the page.
- The reader does not display these fields yet, so the saints and dates no longer show beside those verses until the UI is taught to read `table_text` and `table_only`.
- **Still open:** Acts 28:8 [1] ("Miraculous healing by imposition of the Apostles hands"). It is a gloss, not a table entry, and is in neither the scrape nor the page read. Left unchanged.
- **Still open:** the Challoner-style additions removed in commit `00721721` (Rom 13:1, Matt 27:46 and any others) have not been re-checked against the page. Planned next.

## Four page-scan checks (Nov 16 2026)

Pages read from the hires/plain page images in `~/facsimiles/sancta/` (crops in 4 overlapping bands, then read by eye; `agy` transcriptions of Acts bands
were unreliable and were not used as evidence).

| # | Note | Result |
|---|---|---|
| 1 | Acts 28:8 [1] "Miraculous healing by impoſition of the Apoſtles hands." | **Absent from the print.** Read the whole of p. 370 (Acts 28, bottom: v. 5-7, left margin carries only the Malta note of v. 1 and right margin the verse-5 cross-reference), p. 371 (v. 8-17: no marginal text beside v. 7-13 on either side) and p. 372 (v. 24-28: only the Esa. 6, 9 cross-references and the v. 27 gloss). No note near Acts 28:7-10. **Not deleted**; left in both texts, flagged here as an addition with no print counterpart. |
| 2 | Esther 11:1 [1] | **Found, one defect fixed.** The note is set across the left and right margins of the v. 1 area (pp. 1052-1053): `The firſt part. The preſage, and occaſion of Eſthers aduancement` / `and Amans perſecuting the Iewes.` No apostrophes confirmed. The print spells out `and`; ours had `&`, now `and` (odr-original only). |
| 3 | Ecclesiasticus 43:2 a | **Confirmed, no change.** Page 1 ends `Of which al cor-/poral crea-`; the next page's margin runs `tures receiue / their light: & / by whoſe in-/fluence al ge-/neration of / creatures pro-/cedeth: wher-/of is this / Maxime in / Philoſophie,`. `whoſe` is right. |
| 4 | Numbers 19:2 [1] | **Found, fixed.** Print: `The ſame things ſaith S. Auguſt. (q. 33.) and Theodoret (q. 36. in Num) which were ſhadowed and prefigured in the old Teſtament, are reueled and manifeſted in the New. And this ſpecial ſacrifice prefigured diuers particular things in Chriſts Paſſiõ.` odr-original: `Aug.` → `Auguſt.`, `Theodo.` → `Theodoret`, `&` → `and`, `Num.)` → `Num)`. odr: `Aug.` → `August.`, `Theodo.` → `Theodoret`, `Num.)` → `Num)`. (`ſhadowed` in the print's gutter looks long-ſ; our text keeps the round s before h per the print rules, not changed.) |

Lemma spans: `build-odr-lemmas` reports no change needed (the edits are in verse notes, not annotation passages); nothing written.

**Still open:** Acts 28:8 [1] stays as an addition with no print counterpart (see item 1).
