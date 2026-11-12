# Original-spelling ODR: notes that disagree with the Sancta scrape

Lettered gloss notes that already held 1609-looking text but whose extracted Sancta-scrape segment differed a lot
(similarity < 0.9). All 19 were checked against the scans in November 2026.

## Fixed (9)

- **ecclesiasticus 29:1 a**: was "See previous note"; now the 1609 gloss, with its v. 3 continuation joined by " · ".
- **isaie 26:1 c**: the keyed gloss ("Fensed vvith vval…") was missing; it now comes first, joined to the unkeyed S. Ierom note.
- **isaie 40:1 a**: the section heading "The sixt part…" was duplicated into the gloss. It now sits only in the `1` note, which is now in 1609 spelling.
- **job 30:10 b**: the v. 10 gloss ("Our Sauiour also suffered this reproch. Mat. 26.") was missing. It is now joined to the v. 11 Hebrew note, matching the modern note's structure.
- **leviticus 10:2 a**: the first gloss ("Such as receiued more…") was missing.
- **psalms 13:3 d**: the keyed gloss ("Without faith in Christ…") was missing.
- **psalms 15:10 x**: "Eternal" corrected to the print's "Perfect".
- **psalms 69:2 d**: the keyed gloss ("but most present nede…") was missing.
- **psalms 104:36 v**: the keyed gloss "The tenth plague." was missing; the print reads "boyles", not "byles".
- Also fixed in passing: psalms 42:5 m, 44:5 p and 46:7 h, which held the neighbouring note's text (see the modernised-notes audit).

## Correct as they are (extractor truncation or a different scrape block)

canticle-of-canticles 6:7 f, exodus 3:5 b, jeremie 50:1 a, psalms 33:8 f, 49:8 k, 54:4 d, 118:98 b.

## Second witnesses: Salette and Peters (November 2026)

The Salette facsimile OCR and Peters' modernised edition (`~/facsimiles/ocr-2026-11-12/`) were compared with every
lettered note. Peters matches 4,750 of 5,180 notes at 90% or better. Fixes that came out of this pass:

- **psalms 141:8 q**: "Al this happened in figure of Christ…" is a separate end-of-psalm paragraph (margin: "The
  prophetical sense of this Psalme"). Gloss q now ends at "commodiously."; the full paragraph is a chapter `articles`
  entry in both datasets.
- **1-machabees 2:65 e**: the first sentence ("In al affayres order is of singular importance…") was missing.
- **psalms 54:1 c, jeremie 49:17 d**: the endings ("this life.", "this prophet.") were missing.
- **proverbs 30:15 e**: the v. 16 margin gloss ("Enuie, Luxurie, Auarice, & Ambition.") is joined, as in the modern text.
- **Chapter summaries**: 89 chapters (in 27 books, both datasets) carried the next chapter's argument, so every
  chapter after a summary-less one was shifted by one. Each summary is now on its own chapter. The 1609 text comes from
  the Sancta headings, and in Psalms 29 head notes ("… The N. key.") are restored. Where the original's argument ran on
  into a verse-0 fragment, the 1609 text was split at the same place.

Truncations that are in the print itself (the margin note stops at the foot of the page) are left as printed:
ezechiel 25:4 b, isaie 2:6 b, leviticus 21:17 c.

The modern dataset has 79 notes cut short where the 1609 note is complete; see `odr-modern-truncated-notes.md`.
