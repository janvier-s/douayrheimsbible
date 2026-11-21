# sync-odr: Mark and John (2026-11-21)

`python3 -I scripts/wikisource/rh.py sync-odr mark john` (spelling corpus: all books, a pair counts as spelling at 3+ uses).

| Book | Structure | Content |
|---|---|---|
| Mark | 0 | 53 |
| John | 6 | 111 |

Most content findings are one-off spelling pairs that the counting rule reports by design (`ſtouping`/`stooping`, `els where`/`elsewhere`, `preaſſe`/`press`). Below is the shortlist that looks like real differences. **Nothing has been fixed.** Each item is `loc | odr-original | odr`. Check against the scan, then fix `odr` (or the original, if it fails to reproduce the print) as a ledger entry.

## Structure (John)

- `*` in an annotation margin note, only in odr-original: 6:64a14/mn2, 8:34a1/mn2
- `*` only in odr: 14:12a1/mn3, 14:12a1/mn4, 20:23a4/mn3, 20:23a4/mn4

## A heading in a different verse (John)

- 10:11 has *The good Paſtor giueth his life for his ſheepe.* in odr-original; odr has it at 10:12.

## Words only in odr (missing from odr-original, or added in odr)

- mark 1:8a4/mn2 `li.`
- john 5:1/note1 `Imber` · 6:32a2/mn4 `Lu.` · 9:2 `Jesus answered:` · 9:22a2/mn3 `The Church's Excommunication.` · 10:22a4/mn1 `Judas Machabæus.` · 11:21/note1 `also the and day.` · 15:18/note1 `Octob.` · 20:19/note2 `And for peace.` · 20:19a1/mn4 `Mat.` · 21:1 `to the Disciples`

## Words only in odr-original (dropped in odr)

- john 1:16 `al` · 8:21/note1 `in` · 12:6a2/mn◦ `the` · 17:10 `my` · 19:23/note2 `Mt. Mr. Luc.` · 19:39 `the` · 21:17a1 `S.` · 21:19/note1 `Decembris`
- The print's reference letters (a, b, c), kept in odr-original and dropped in odr: john arg:0 (9 letters), 4:10, 5:6, 8:12, 9:7, 10:16, 10:30, 11:13, 12:24, 14:16, 20:11. At 5:6/note1, 11:13/note1 and 14:16/note1, odr has a `c` in the note instead. Probably intended, so decide once for all of them.

## Different words

- mark 2:5/note1 parties / party's · 4:16 thy / they · 5:38 Archſynagogs / Archsynagogue's · 5:41 vvenches / wench's · 6:9a4 vvare / wear · 7:22 vvickedneſſe, / wickednesses, · 11:32 feared / fear · 12:31 they / thy
- john 15:26/note2 after / within the Octave, of · 18:sum theeues / thief's · 19:15a1 neere / need · 20:19a1 flightes / slights · 20:19a1 od / of · 21:17a1 cure / care

Regenerate the full list, with one proposed `odr` entry per finding (each `new` still to be modernised), using `--out FILE` (not under `fixes/` or `static/data`).
