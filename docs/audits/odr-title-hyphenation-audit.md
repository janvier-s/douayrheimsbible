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

## Unsettled / not done

- 41 original titles begin with `W` (`Who is made.`, `What ſocietie.`, ...) and 4 with `VV`. Whether each of the 41 is
  printed `VV` was not checked; only Prov 9:1 was, because it surfaced here. A follow-up scan pass would settle it.
- Titles outside the compound list were not checked for space-vs-glue beyond the scrape comparison, which agrees
  with ours except for the spelling cases in `odr-annotation-titles-audit.md`.
- No print misprints turned up, so `odr-errata.md` is unchanged.
