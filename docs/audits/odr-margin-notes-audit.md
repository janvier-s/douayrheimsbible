# ODR margin notes: second audit (16 Nov 2026)

Follows `odr-modern-truncated-notes.md` and `odr-original-modernised-notes.md`. Same majority vote as the
annotations (`odr-annotations-modern-audit.md`): modern note, 1609 note, scrape modern note, matched by text.

## Fixed

- **Modern notes still cut short or spliced**: 40 more notes completed (the first pass used a 0.75 length
  threshold and missed them). Ps 43:26 t was folded into 43:25 s and its `(t)` marker was missing; restored.
  Ps 25:6 e had verse text and a truncated note from elsewhere spliced in; restored from the 1609 note.
  2 Par 36:22 b carried the heading of the next article; restored. Num 3:38 d read "numbered" where the 1609
  has "joined".
- **Wrong or dropped words in modern notes**: 112 word-level fixes in 109 notes where the 1609 text and the
  scrape agree against modern (a dropped `ill`, `spiritual`, `a Martyr that`; `is` for `it`; `the` for `that`).
- **Stray margin letter** ("c A marvelous dignity…") stripped from 465 NT notes (291 modern, 174 original).
- **Modern possessive apostrophes in odr-original notes**: 49 removed (`Gods`, `Chriſts`, `Churches`).

## Left alone

- 37 possessives in original notes whose 1609 form is not known without a scan: saints' days (`S. Matthew's
  eue`, `S. George's day`, `S. Lucy's`) and `enemy's`, `fool's`.
- Style differences where modern keeps an archaism (`sanctified` for `sanctifieth`): intended.
- Notes with ligature spellings (`Æ`, `Œ`): modern keeps them on purpose.
- `isaie 3:1 a` reads "till here the end of this world" in the 1609 text and the scrape; modern keeps
  "till near the end", which is the sense.

## Unmatched notes (third pass)

2,643 notes had no scrape match on their first three words. Why: 1,647 match once fuzzy (they differ by a
leading letter or number), 454 are merged into a longer scrape note, 398 are partial matches, 144 are not in
the scrape at all (liturgical "The Epistle upon…" notes, argument headings).

Matching was widened (opening words anywhere in a scrape note, else best fuzzy match of 0.7 or more) and the
vote re-run on the new matches: 88 hunks. Because a fuzzy match is weaker evidence, each hunk was checked
against Peters' modernised edition (`~/facsimiles/ocr-2026-11-12/peters-columns`, searched for the hunk's
surrounding words with each reading):

- Peters carries the vote's reading: 46 hunks, applied (`seed`→`feed`, `people`→`peoples`, a dropped `the`).
- Peters carries modern's reading: 14 hunks, rejected (the scrape and the 1609 note are the odd ones).
- Both or neither: 28 hunks, not applied. They need a scan.

Peters is a modern-wording witness: it can confirm or reject a modern fix but not 1609 spelling.

## Not covered

The 144 notes absent from the scrape, and the 28 hunks above, have not had the three-way vote.
