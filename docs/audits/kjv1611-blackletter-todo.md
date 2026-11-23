# KJV 1611: remaining blackletter italics (to-do, 2026-11-23)

About 12,600 italic words in `static/data/kjv-1611/` have never been checked against the scan.
The erosion test could not reach them because the OCR gave no usable word box. Perhaps 2,000 of
them are blackletter and should lose `<i>`. Nothing in the data or `fixes.tsv` has changed yet.
See `kjv1611-supplied-handoff.md` for the background and the rules.

## Dropped
- Page-level "wash out the roman": too noisy (80 of 112 known-roman words found).
- "Garbled OCR means blackletter": no signal. Roman and blackletter words are misread at the same rate.
- The gap measure between two cleanly read neighbours: it works, but only reaches a few hundred words.

## State
- Crops: all 12,601 are made (`$S/fc/crops/`). Batches of 20 are in `$S/full/b/f*.json`.
- Flash: 3 of 631 batches are done (`*.res.json`). The rest stopped when agy's sign-in expired.
- `$S` = `/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible-ws-phase0/c0b84bd8-c6b2-4f80-8d74-b89d17ca60f1/scratchpad`.
  It is a temporary folder that a reboot can clear. If it is gone, the crops can be rebuilt with `fc/mk.py`
  (keep a copy of the scripts).

## To do
1. **Sign agy in again:** run `agy` in a terminal, finish the browser sign-in, quit. Test with one call.
2. **Resume Flash:** rerun the Flash half of `$S/full/pipe.sh`. Finished batches are skipped. Use 3 calls
   at a time with `nice -n 10`; the crop stage is done, so the CPU load is light.
3. **Neon second opinion:** send every word Flash calls blackletter to Gemini 4 Neon, mixed with known roman
   and blackletter words (`$S/labels.json`) to measure accuracy. A word loses `<i>` only when both say blackletter.
   Opus in agy has no quota until about Nov 29.
4. **Check by eye:** view a random sample of about 40 removals on the scan. If more than 1 or 2 are wrong,
   tighten the rules before writing anything.
5. **Write fixes:** add the agreed words to `scripts/kjv1611/fixes.tsv` as their own block with a new witness tag
   (for example `scan-1611-flash-neon`). Words called roman or unsure keep their `<i>`.
6. **Rebuild** with `--evidence` (see the handoff's Rules), check that only `<i>` tags changed, and copy the
   result into `static/data/kjv-1611/`.
7. **Report** the counts and the measured accuracy, then **commit only after the owner's OK**.
   Expect some leftovers: Flash misses about 1 blackletter word in 8.

Do not post to Wikisource; this is local data only. Leave `scripts/ot/prep.py` alone.
