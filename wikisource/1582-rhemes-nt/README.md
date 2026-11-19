# Wikisource: 1582 Rhemes New Testament

Page wikitext for [Index:1582_Rhemes_New_Testament.pdf](https://en.wikisource.org/wiki/Index:1582_Rhemes_New_Testament.pdf),
generated from `static/data/odr-original`. `pages/<n>.wiki` is the content of
`Page:1582_Rhemes_New_Testament.pdf/<n>`. The NT text starts at page 31, which is
printed page 3, so the printed page number is `n - 28` near the start.

These files are derived: fix the data, regenerate, and publish again. Never hand-edit
a page here; the next publish would overwrite it.

## Workflow

Progress per book is logged in [BOOKS.md](BOOKS.md); the method for checking a
book against the scans, learned on Matthew, is in [PLAYBOOK.md](PLAYBOOK.md).
The comprehensive editorial rules, typesetting conventions (small caps, long-s, lists,
margin notes, `{{hws}}`, NFC), and XML maintenance procedures are documented in
[RULES.md](RULES.md).

```bash
# 1. generate pages for a book from the data and the OCR (scratch output)
python3 -I scripts/wikisource/generate.py "$PWD" matthew 31 /tmp/ws-out
# 2. read report.txt (mark differences against the scan), fix the data, repeat
# 2b. lint the output (exit 1 on errors; see the docstring for the checks)
python3 -I scripts/wikisource/lint.py /tmp/ws-out
# 3. once the chapters are checked against the scans, publish those pages here
python3 -I scripts/wikisource/publish.py /tmp/ws-out 31-41
```

Starting a book at its Argument page (Mark: 114) generates that page too. Set
`WS_NO_ORNAMENTS=1` to leave out the woodcut images that `ornaments.json` adds; the
published pages have none yet.

`manifest.json` tracks each page: `sha1` of the text and `status`
(`generated` → `reviewed` → `posted`, with the posted `revid`). A page that changes
after posting gets `changed_since_post`, so whoever uploads compares it with the
live page first and never overwrites a Wikisource proofreader's edits.

## Conventions (follow Page 4, the proofread preface)

- `ſ` is written `{{ls}}` (or modern `s` in mainspace transclusion) per [Wikisource Style guide/Orthography#Best Practices](https://en.wikisource.org/wiki/Wikisource:Style_guide/Orthography#Best_Practices); u/v, vv and macrons (`cōmaunded`, `vpō`) are kept as printed.
- Printed marks stay in the text: `†` verse start, `*` citation, `∷` gloss, `‖` annotation catchword, `⊣` end of a liturgical reading.
- Margin notes use `{{MarginNote}}`: citations in the inner margin, glosses and lectionary notes in the outer one.
- Pages go up at quality level 1 (not proofread) unless a person has proofread them against the scan.
