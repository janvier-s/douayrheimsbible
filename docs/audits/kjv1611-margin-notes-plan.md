# KJV 1611 margin notes → Wikisource: prep plan

Target: https://en.wikisource.org/wiki/Bible_(King_James_Version,_1611)
Written 2026-11-23. Nothing has been built yet; this is the plan and the findings behind it.

## Findings

**Verse data** (`static/data/kjv-1611/*.json`): only `verse` and `text` (plus a few `modern` / `supplied` keys). No `†`, `ǁ` or `*` characters, no marginalia field.

**Notes data** (`static/data/kjv-notes-1611/<book>/<chapter>.json`):
- 76 books, 1,348 chapter files, 11,525 entries, shape `{verse, text}`.
- Exactly one entry per verse. Several notes in one verse are joined into one string with `" , "` (2,206 entries), e.g. `"Or, prosperitie. , Or, in the time of mine affliction. , Psa.116.2. and 137.7."`.
- No anchor word and no marker symbol is recorded.
- Spelling is modernised (`aduisement`, `speach`), but the print keeps ſ and u/v. The "print wins" rule applies, so the notes need the same long-s / u/v treatment as the verse text.
- Common openers: `Or,` 2721, `Heb.` 1935, `Hebr` 1102, `Chap` 952, then book-name cross-references (Psal., Exod., Deut., Mat., …).

**Live Wikisource pages** already carry proofread margin notes in this form:

```
ǁ{{MarginNote|margin=right|margin-width=65|text-align=left|text=ǁ ''Or, Cornet.''}} Trumpet
```

The marker sits in the text, the template follows it, then the anchored word. Examples: Psalms 150 and Proverbs 1 (local copies in `wikisource/1611-kjv/batch5/`, e.g. `Page-BibleKJV1611-011.pdf-59.wiki`). In those, `†` marks `Hebr.` readings and `ǁ` marks `Or,` alternatives.

**Risk:** generating whole pages would erase notes proofreaders already placed (same trap as the italics sweep). Patch existing pages; do not regenerate them.

## Plan

1. **Split** each joined note string on `" , "` into separate notes. Classify each as `Hebr/Heb/Gr` literal reading, `Or,` alternative, or cross-reference (`Chap.`, `Psal.`, book names).
2. **Restore print spelling** in the note text (ſ, u/v, etc.) using the same evidence as the verse text (`long-s-evidence.tsv`). Never modernise.
3. **Anchor**: choose the word each note attaches to. For `Hebr./Gr./Or,` notes, the note text is the clue (the alternative rendering of a word in the verse). For cross-references, anchor with the scan: OCR word boxes in `~/facsimiles/kjv-1611/ocr/*.tsv` have x/y positions, so margin-column text can be tied to a line and then a word (same technique as `supplied.py`).
4. **Marker**: assign `†` / `ǁ` / `*` / letter. Check whether the print assigns by kind or by running order per page or chapter before fixing the rule.
5. **Store** the result as structured data. Suggested: a `notes` array per verse, `{marker, anchor, text}`, with the anchor as an inline token in `text` so the supplied-word `<i>` work keeps working. Record every change through `scripts/kjv1611/fixes.tsv`-style ledger entries.
6. **Emit** `marker{{MarginNote|margin=right|margin-width=65|text-align=left|text=marker ''note''}}` at post time, **patching** already-proofread pages.
7. **Guard**: diff against live wikitext and fail if a MarginNote that exists live would be dropped or moved.

## Validation

Use the pages already proofread on Wikisource (Psalms 150, Proverbs 1, and others with MarginNote) as labelled ground truth. Measure how often the heuristic picks the right word and the right marker before trusting it on the rest.

## Open decision

Cross-reference notes (the large majority) often attach to a phrase, not a word:
- Option 1: anchor with the print position from OCR. More faithful, more work.
- Option 2: one marker per verse, no precise placement. Cheaper, less faithful.

Recommended start: a spike on Proverbs 1 and Psalms 150, comparing the heuristic's anchors with the posted pages.

## Constraints that still apply

- Never post to Wikisource without the owner's approval; never revert another editor's change.
- Rebuild kjv-1611 only with `npx tsx scripts/kjv1611/build.ts --evidence=$HOME/facsimiles/kjv-1611/long-s-evidence.tsv`, building to a scratch `--out` first.
- Supplied-word italics work is in progress; see `docs/audits/kjv1611-supplied-handoff.md`.
