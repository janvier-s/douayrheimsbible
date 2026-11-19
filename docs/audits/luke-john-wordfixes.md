# Luke and John: word, missing and extra findings (2026-11-18)

After the w/vv pass, `ocrdiff.py luke|john` was rerun and every finding class was read on the
scan (crop sheets). Fixes are in `scripts/wikisource/apply_wordfixes.py` (the edit list; it
asserts each old string occurs once) plus the whole-word Luke 1:sum Precurſor/Circunciſion fix.

- **missing** (Luke 75, John 178): all margin notes, catchwords, signatures (Hh iij) or the
  John 20:15-17 margin notes that Transkribus tagged as body on pdf302. No real missing word.
- **extra** (6 + 5): real in 4: Luke 1:6a2 word order (here it is), John arg (no "for" before
  fourtene), John 21:17a1 (no "was" before the cure). The rest are marker glyphs (c, 11., 4.) or
  words clipped at the line end by the OCR.
- **word** (both-attested, Luke 54, John 66, those with a scan box): real spelling and wording defects
  below; the rest are OCR misreads (he/be, his/hu, vs/ys), macron forms (cōmeth, mā) and
  marker letters. `both-unattested` rows (OCR form occurs <2 times in the data) and margin items without a box
  were not read.

Half-modernised annotations found (ſ present, modern forms): Luke 24:47a2 (all, only, go, err,
Heretics); John 19:17a1 (blood, truly, Cross, piece, need, Christs, days), 20:23a4 (ſinne, is ſelf,
Physician, too), 21:17a1 (condemned, only, therefore). John Argument: Jews x6 -> Iewes/Ievves,
owne -> ovvne, eight -> eighteth, of -> or, this -> his, extra "for". Wording changes went into both
odr-original and odr; pure spelling only into odr-original.

Not applied: 20:23a4 "confeſsion", Pſal. in 21:17a1 (print Pſ.), macrons (generator handles them).
