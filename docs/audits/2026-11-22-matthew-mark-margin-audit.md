# Matthew and Mark margin-note audit (2026-11-22), unverified candidates

Method: agy flash (low effort, two runs, all 129 pages; then high effort, one run, 46 flagged pages) listed the margin notes
on each scan page; the list was compared with the notes in the generated page. Presence only: the side and anchor-word
comparisons were too noisy (about 2,600 flags) and were dropped. Nothing below is confirmed; every item needs a look at the scan
(running heads such as HOLY weeke and note splits/merges account for most raw flags, and were removed by hand).

## On the page, not seen on the scan
matthew 44 `18, 1. 21, 36.` (also seen scan-side, probably a split) · 54 `The Gospel vpō a Martyrs day that is not a Bishop.` ·
72 `Lu. 12, 1.`, `Mat. 14, 17. 15, 34.`, `Io. 21, 15.` · 76 `2. Pet. 1, 17.` · 80 `Protection of Angels.` (scan: page 81) ·
86 `Mt. 25, 34.`, `Puritanes.` · mark 131 `∷ The narrow sea, or water.` · 156 `Good friday.` · 159 `Mt. 28, 1. Luc. 24, 1. Io. 20, 1.` (scan has them as three)

## On the scan, not on the page
matthew 31 `Gen. 12. 22.` · 45 `Iac. 1.` · 49 `Mt. 19, 29.`, `Epiph. hæ. 59.` · 71 `Luc. 10, 16` · 78 `Luc. 1, 17.`, `Mal. 4, 5.`,
`Niceph. li. 6, c. 17.`, `Greg. Niſſ. de vit. Gregori.` · 93 `Nu. 15, 38.` · 95 `1. Tim. 2.` · mark 123 `Mt. 13, 1.` · 145 `Eſa. 56, 7.` · 159 `Io. 16, 13.`

Likely splits or merges, not errors: matthew 34, 43, 68, 73, 74, 75, 76, 83, 107; mark 146, 147, 156 (TVES-DAY heading).

## Checked against the scan margins (Claude, strips of pages 72, 54, 76, 80, 81, Mark 131)
- Matthew 72, 76, 44: every note on the page is in the print; the candidates were agy merging bracketed pairs. No change.
- Matthew 54: all notes in the print except `The Gospel for ſome Martyrs, not Biſhops.` (10:26, kind lectionary): not in the XML and not in the
  margin. It is kept under PLAYBOOK step 6 only if the Table of Epistles and Gospels has it; not checked.
- Matthew 80/81: **real pagination fault.** The print sets the margin note `Protection of Angels.` at the top right of p. 81 (Matt. 18:10 annotation
  runs across the page break); the generated page 80 carries it as `{{outside L|…}}` before `A great dignitie…`. The generator needs the note on page 81.
- Mark 131 (6:45): the note `∷ The narrow ſea, or water.` is on the page but not in the print margin or the XML (data since 56073d49, the original import). Owner to decide: remove or keep.
- Not looked at on the scan: Matthew 31, 34, 36, 41, 43, 45, 49, 52, 59, 68, 71, 74, 78, 83, 86, 88, 90, 93, 95, 98, 107; Mark 118, 123, 140, 145-150, 153, 156, 159.
  Most are citation strings the flash reads got slightly wrong (compared by text), but they are not confirmed.
