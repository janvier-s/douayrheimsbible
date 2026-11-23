# KJV 1611 — supplied-word correction (Genesis 1)

## Target

`Page:BibleKJV1611-002.pdf/2`, base revision `16482170`.

Two marks inserted by the full italics sweep are removed:

| Verse | Before | After |
|---|---|---|
| Genesis 1:27 | `in his {{smaller|owne}} Image` | `in his owne Image` |
| Genesis 1:30 | `wherein {{smaller|there}} {{smaller|is}} life` | `wherein there {{smaller|is}} life` |

Everything else on the page is byte-for-byte unchanged.

## Evidence

- CrossWire's [KJV 1611 Genesis 1 transcription](https://wiki.crosswire.org/KJV_1611),
  manually made from the UPenn 1611 scan and preserving original supplied-word
  italics, has plain `owne` in 1:27 and marks only `is` in 1:30.
- Wikisource's pre-sweep revision `11123978` of the same page (proofread against
  the `BibleKJV1611-002.pdf` scan) already had plain `owne` and only
  `{{smaller|is}}` at 1:30. The sweep added both erroneous marks.
- Our local `kjv-1611` `<i>` data follows the 1769 Blayney supplied-word scheme,
  which is why it supplied both marks; it is not a 1611 witness.

The local build ledger and generated `genesis.json` are updated to match.

## Posting

Posted to Wikisource as revision `16482298` under `Sokonok@douayrheims`, summary
"Proofread: remove two 1611 supplied-word marks not in the print (KJV 1611)".
The edit used the live revid `16482170` as a `baserevid` guard, and the page was
re-fetched and verified byte-for-byte against the draft. No other text or
page-quality metadata changed.
