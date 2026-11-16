# ODR original annotation titles: hyphenation and word splitting

Run on 16 Nov 2026 on top of `odr-annotation-titles`. Scope: `title` of the 1,517 annotation parts in
`static/data/odr-original/<book>/annotations/`.

## Method

- Every title was tokenised with hyphens read as spaces (long s, vv, u/v, i/j, y/i folded) and compared with the
  modern title, the nearest Sancta scrape `original.lemma` (within two verses) and the verse text. A title was
  flagged when the sources differ only in where the spaces fall, when the verse prints two title words glued (or
  one title word split), or when it contains a hyphen.
- That gave 23 flagged titles, plus a hand list of 54 titles carrying known one-word-or-two compounds (`ſelf`,
  `an other`, `in deede`, `firſt borne`, `God ward`, `ſame`, `hundred fold`, `euery one`, `bond woman` and so on).
  Total checked: **54 titles** (the flagged set is inside the hand list, bar a few), and **2 titles with a hyphen**
  (Apoc 6:11, Matt 1:25; no other original title has one).
- Each was located in `~/facsimiles/ocr-2026-11-12/sancta-scan` and read from OCR. The 11 where OCR was ambiguous
  or disagreed with the title were then read from the page image (agy, plus a direct look at Prov 9 and Prov 30).
  Further `ſelf`/`ſelues` pairs were confirmed spaced from the image (1 Cor 7:5, 11:31, John 2:24); the rest
  agree with OCR.

## Fixed (3 titles, original only)

| Verse | Was | Now | Page |
|---|---|---|---|
| Apoc 6:11 | `fellovv-ſeruantes` | `fellovv ſeruantes` | printed spaced, no hyphen (the verse text itself has the hyphen; not touched) |
| Prov 30:23 | `A bond woman when she shal be heyre.` | `A bondvvoman, vvhen she shal be heyre.` | one word, comma, vv |
| Prov 9:1 | `Wiſdom hath built herſelf a houſe.` | `VViſdom hath built herſelf a houſe.` | printed with capital VV |

No lemma span moved (`build-odr-lemmas.ts --write` changed nothing); `npx vitest run` 537 passed before and
after. Modern titles untouched: their hyphen-or-space differences (`over-rule`, `bond-woman`, `ourselves`) are
intended.

## Confirmed as printed, left alone (51)

- Spaced: `him/them/thy/your/our ſelf(ues)` (all), `ſelf ſame`, `an other` (7 titles incl. John 21:18, which OCR
  reads glued but the image shows spaced), `Be cauſe` (Gen 49:4), `ſome vvhat` (Gen 42:7, lowercase long s),
  `firſt borne` (Lev 27:26, image), `God ward`, `hundred fold`, `in deede`, `euery one`, `no not one`.
- Hyphenated: `Firſt-borne` (Matt 1:25), a real printed hyphen mid-line.
- Glued: `himſelf` (Wis 14:15), `herſelf` (Prov 9:1), `themſelues` (Num 6:2).

## Second pass: initial W vs VV (41 titles starting W)

Crops of the 80 W-titles that could be located were cut from the `hires/` scans using the OCR word boxes
(note: TSV coordinates are for `hires/<n>.jpg`, not the plain jpg) and read by eye. About 45 strips showed the
lemma itself; the rest caught verse text. Every lemma read as an italic single-glyph `W`, with three exceptions
fixed in the same commit:

| Verse | Was | Now |
|---|---|---|
| 1 John 3:22 | `We ſhal receiue, becauſe.` | `VVe ſhal receiue, becauſe.` |
| Exod 2:3 | `When she could not conceal him.` | `VVhen she could not conceal him.` |
| Prov 2:13 | `Who leaue the right way.` | `Who leaue the right vvay.` |

Tests 537 passed; no span moved.

## Unsettled / not done

- About 35 W titles were not read from a lemma strip (the crop caught verse text, or no box matched; 4 had none:
  Eccles 10:16, Ecclus 48:10, Ps 3:1, Ps 50:2). Not checked for VV.
- Case in the print not followed by the title: Matt 17:19 `Why could not We.` and Matt 19:27 `What ſhal We haue.`
  (capital We), John 1:1 `Was the Word,`. Titles lowercase these; left as is (case, not splitting).
- Broad sweep: of 1,516 titles, 958 have the same word count in OCR as ours (spacing confirmed). The other 452
  multi-word titles were cropped from the hires scans onto 23 sheets and read with agy (`gemini-3.8-flash-low`).
  363 matched our spacing as printed. The remaining 89 were mostly crops that caught verse body text or
  line-end hyphens, not lemmas; the real candidates were rechecked by eye:
  John 21:18 `An other` and John 21:17 `Feede my ſheepe` are spaced as ours (the flash read glued was wrong).
  One real defect: Apoc 22:20 lemma prints `Come Lord Ieſus.`; title (both datasets, and the scrape) had `Ieſu` /
  `Jesu`. Fixed in odr-original and odr; the lemma span was rebuilt.
- Still unverified from a lemma strip (crop caught verse text): Gen 17:14 `shal be` (verse prints `ſhalbe`),
  Gen 47:31 `To the beds head.` (strip reads `bedshead`, gap very narrow; verse and scrape say `beds head`),
  Mark 2:25 `In neceſſity.` (verse prints `neceſsitie`), Mark 5:28 `If I ſhal touch.` (verse `touche`).
- No print misprints turned up, so `odr-errata.md` is unchanged.
