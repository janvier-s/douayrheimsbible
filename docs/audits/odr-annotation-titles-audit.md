# ODR annotation titles: audit against the 1609 text and the Sancta scrape

Run on 16 Nov 2026. The `title` of every annotation part in `static/data/odr/<book>/annotations/` and
`static/data/odr-original/<book>/annotations/` was compared with the scrape's `modern.lemma` and
`original.lemma`. Method as in `odr-annotations-modern-audit.md`: consonant-skeleton comparison (lowercase,
vowels dropped, u/v, i/j, y/i, vv/w, long s, doubled letters folded; punctuation and tags ignored), then
majority vote of modern, original, scrape modern, scrape original. Each of our parts was paired with the scrape
entry at the same verse or within two verses, by best title similarity.

## Counts

- 1,519 annotation parts in each dataset (1,361 verses). Modern and original agree part for part.
- 1,507 have a scrape counterpart and were compared four ways. 12 have none (1 Kings 16:7, 1 Thess 5:21, Heb
  7:18, 7:19, 7:21, 7:23, 7:27, John 15:2 x2, Ps 9:21, Ps 15:10, Ps 33:14, Ps 49:14); those were compared with
  each other only.
- Before fixing, 1,415 of the 1,507 agreed on all four titles by skeleton. 49 differed only between modern and
  original (spelling and archaism, intended), leaving about 43 where a vote mattered.
- Fixed: 11 modern titles, 12 original titles (23 files, one title each). After the fixes 1,461 of 1,507 agree on
  all four by skeleton; the other 46 are the spelling and archaism differences listed under "Left alone".
- Lemma spans rebuilt with `build-odr-lemmas.ts --write` for the 9 verses whose title changed. Every title still
  anchors; the pins in `scripts/export.corpus.test.ts` did not move, so no pin was edited. `npx vitest run`:
  537 passed before and after (the csp-headers test passed in this worktree too).

## Fixed in odr (11)

| Verse | Was | Now | Why |
|---|---|---|---|
| Acts 20:35 | More blessed to give. | It is a more blessed thing to give. | truncated; 1609 title, both scrape titles and the verse agree |
| Acts 28:5 | Shaking off the beat. | …the beast. | typo |
| Apoc 1:6 | All kingdoms and Priests. | A kingdom and Priests. | wrong words; verse and all witnesses agree |
| Gen 4:7 | Shalt not thou receive. | Shalt thou not receive. | word order |
| Matt 16:19 (3) | …thou shall bind. | …thou shalt bind. | typo |
| Matt 17:19 | Why could we not. | Why could not we. | word order; verse and scrape agree |
| Mark 15:11 | Chief Priest. | Chief Priests. | number |
| Ps 144:1 | will exalt thee. | I will exalt thee. | dropped word |
| Rom 8:24 | By hope saved | By hope we are saved. | dropped words |
| Rom 10:20 | That asked not. | That asked not of me. | truncated |
| Rom 13:13 | Not in banquetings. | Not in banketings. | modernised; the verse and both scrape titles read `banketings` |

## Fixed in odr-original (12)

- Wrong words (2): Matt 17:19 `could we not` to `could not we`; Rom 13:13 `banquetings` to `banketings`.
- Print rule, round s where long s belongs (4): Mark 1:5 `Confeſsing` to `Confeſſing`, 2 Cor 12:11 `measure` to
  `meaſure`, Prov 1:24 `refused` to `refuſed`, Ps 88:39 `hast` to `haſt`.
- Modern spelling restored from the scrape's 1609 title (6): John 19:17 `croſs` to `croſſe`, Mark 6:9 `coats` to
  `coates`, Matt 9:20 `years` to `yeres`, Ps 31:2 `ſins` to `ſinnes`, Rom 1:24 `up` to `vp`, 2 Cor 1:24
  `over-rule` to `ouerrule` (the scrape, the facsimile OCR and the annotation body all have `ouerrule`).

## Titles that do not appear in their verse

Titles are lemmas, often shortened or paraphrased, so absence is not an error. With every punctuation-separated
piece required to be a skeleton substring of the verse: 222 modern and 239 original titles fail. Most are
omissions or reorderings (`Take and eat`, `Folly manifest`). 15 modern and 23 original titles have under 70%
of their words in the verse; they are paraphrases or citations, not misplaced (`Hung himself`, `Wench arise`,
`Sixty six. 27. Seventy.`, `Hand, foot, eye.`). No title was found that belongs to another verse: the only ones
whose words sit in a neighbouring verse and not their own are Mark 5:41 `Wench arise` and Num 17:8 `Aaron's
rod`, which the lemma builder already handles. The builder anchors all 1,518 modern titles; 1 original title
(see its report) matches the neighbouring verse.

## Left alone

- Modern titles adjusted to the modern verse where the 1609 title differs from its own verse: Matt 10:12 (`Peace
  be to`), 13:11 (`it is given`), 13:29 (`perhaps`), 28:19 (`therefore` for `then`), Rom 8:17 (`we suffer` for
  `they suffer`). The scrape agrees with the 1609 title, so by the vote these are wrong, but the title is the
  anchor for the lemma tint, and fixing it would drop the tint on a verse that reads exactly so. Decision for
  the owner.
- Archaisms and spelling variants intentional in modern: `cannot`, `in deed`, `Cherubins` (scrape modern says
  `Cherubims`), `Melchisedech`, `Hierusalem`, `middes`, `etc.` vs `&c.`, `Saints` vs `Saincts`, `Ægyptian`.
- Scrape typos, not ours: Matt 17:21 `aud`, Matt 5:33 and 17:19 trailing `.)`, Gen 36:6 `/` in place of `8.`.
- Acts 15:29: the scrape entry nearest by verse is a different annotation (`Rejoiced upon the consolation`);
  our title matches the verse.
- Ps 33:14 and 49:14: known (title carries a citation; see `odr-annotations-modern-audit.md`).

## Needs the scans (not changed)

- Gen 1:1 original `In the beginnig.`: scrape original has the same typo; the title is in no verse form. Print
  typo or transcription slip? Scan `~/facsimiles/sancta/genesis/1/hires/`.
- Gen 36:6 original `btother` and Gen 48:16 original `delinereth`: scrape original and the scan OCR both read
  so, which suggests the 1609 print has these misprints. Left as printed; modern reads `brother` and `delivereth`.
- Matt 17:20 `Faith as a mustard seed.`: modern and original have `a`; scrape modern and original both drop it
  (the verse has it).
- Ps 9:21: title empty in modern, original and scrape; the annotation may have lost its lemma.
- Matt 28:19 (`Going then` in the 1609, scrape both) and the other four harmonised titles above, if the owner
  wants the original title restored in modern.
- Hyphenation of compounds in original titles (`over-rule`-type) is unchecked beyond the scrape; the scrape
  strips hyphens in places.
