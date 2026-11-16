# Modern ODR annotations: audit against the 1609 text and the Sancta scrape

Run on 16 Nov 2026 over all 1,519 annotation parts in `static/data/odr/<book>/annotations/` (1,361 verse
annotations). Witnesses: odr-original (the 1609 spelling), the Sancta scrape's `annotations[].modern` and
`.original`. Method: consonant-skeleton word alignment, majority vote of modern, original and scrape modern
(same method as the verse audit, see `odr-modern-vs-original-audit` in memory).

Rule: where modern differs from the 1609 text and the scrape agrees with the 1609 text, modern is wrong.
Where modern agrees with the 1609 text but not with the scrape (archaisms, `cannot`, `free-will`, `indeed`),
the scrape is the one that differs and modern stays.

## Fixed (171 annotations, about 310 word-level changes)

- Dropped passages, usually at a page or column break: 1 Cor 1:5, 1 Tim 1:20, 2 Cor 2:17, Apoc 1:1 / 1:6 / 1:10 /
  12:15 / 22:20, Gen 28:11, Lev 8:7, John 21:17 (3.5k chars), Rom 12:6, Mark 10:4, Dan 12:7 and others.
- Margin-note text spliced into the annotation text: Acts 8:38, 2 Macc 15:39, Matt 27:46 (replaced by the 1609
  wording), Lev 18:6 (rebuilt around its 16 markers).
- Wrong or dropped words, found only because original and scrape agree: `had` for `hath`, `in`/`it` for `is`,
  `of` for `or`, a dropped `not` (Luke 3:20, Gen 47:22), `Theodorete` for `Eusebius` (1 Tim 4:5).
- Challoner-style additions the 1609 lacks, removed: for example "and not being the cause of their evil
  doings, turned and ordered the same to good effects" (Rom 13:1) and the "(parting forth of the body)…"
  passage in Matt 27:46.
- Glued words (`inmanner` x6, `thatguiltiness`, `soulsuffered`, `starsof`, `choosingthe`, …): 41 split.
- Misplaced or duplicated text: the "These Angels also hinder the devil" paragraph sat in Gen 3:22 and 3:24;
  removed from 3:22. Ps 13:1 had "nor could be justified" twice.

## Deliberately not changed

- 1 Cor 14:27. The original runs the "More ample declaration of the 14. chapter" into the annotation;
  modern keeps it as the chapter `articles` entry. Both are intended, so modern must not be "completed".
- Spelling and style variants: `indeed`/`in deed`, `cannot`/`can not`, `free-will`/`free will`, `baptise`.
- 1 John 2:1 (`Marie` for `M A R I E`) and Isa 37:35 (citation spacing).

## Original-spelling annotations (odr-original)

Checked against the scrape's `original` text and the modern text by the same vote. The 1609 words themselves
are sound: no dropped words or OCR junk survive the vote (the only disagreement is note-marker placement).
What was wrong is spelling:

- 36 annotations (2 Cor 1:24, 2 Pet 1:15, Exod 7:3, Mark 2:10, Matt 7:21, 16:19, 17:9 and others) were whole
  passages in modern spelling with a long s laid over them (`heretics`, `words`, `glory`, `Jude`). 1,176 words
  were rewritten from the scrape's 1609 spelling (`heretikes`, `wordes`, `glorie`, `Iude`), with s turned to
  ſ by the print rule: ſ for a non-final s except before f, before h and k in the Old Testament, final s
  round, medial ss as ſſ. The scrape's `vv` and `w` were taken as they stand; the scrape cannot tell vv from
  w, so those two are not independently verified.
- 74 possessive apostrophes removed (`God's` to `Gods`, `Church's` to `Churches`). The scrape keeps them in
  those annotations too, but the facsimile OCR has none (24 hits for `Pharaos heart`, `Churches authority`),
  so the apostrophes are modern leaks.

## Still open

- Psalm 49:14 (`The sacrifice of praise.]`), 1 John 5:3 (`Mat. 11, v. 30.`) and Gal 2:7 (`Calu. li. 4…`) are
  citations in the 1609 text that modern keeps in `cross_refs`.
- Annotation titles (the `title` lemma) are not yet compared.
- Hyphenated compounds and capitalisation in the original (`Palm-Sunday`, `work-days`) were not checked
  against the scans.
