# 1582 Rhemes New Testament: rules

These are the rules for the 1582 Rhemes New Testament on English Wikisource ([Index:1582_Rhemes_New_Testament.pdf](https://en.wikisource.org/wiki/Index:1582_Rhemes_New_Testament.pdf)), for the data the pages are generated from (`static/data/odr-original`, `static/data/odr`) and for the TEI source `A16049.xml`. This file is the authority: where another doc disagrees, this one wins. [PLAYBOOK.md](PLAYBOOK.md) says how to do the work.

Every rule ends with an `Enforced by:` line naming the lint code (`E-…` error, `W-…` warning, from `scripts/wikisource/rhemes/lint.py`), the fidelity feature (`scripts/wikisource/rhemes/fidelity.py`) or the tool that checks it. A rule that no code checks says `review (no code)`. The [Enforcement index](#enforcement-index) maps each code and feature back to its rule; `scripts/wikisource/tests/test_docs.py` keeps the two in step.

## 1. The print wins

### 1.1 Reproduce the facsimile

Reproduce the 1582 print as faithfully as possible: long s, u/v and i/j, vv and w, macrons and titlos, ligatures, roman and italic, small caps, the print's marks and its layout. Never modernise or normalise a print form. Fidelity features are counted on every page: lint refuses a drop against git `HEAD`, and `rh.py post` against the live revision. A drop that is meant (one of §2, or a reading settled by the evidence ladder, §6.3) needs `--allow-loss FEATURE:SCOPE` or `--allow-shift FEATURE:SCOPE` with `--reason "…"`, and the reason goes in the commit message. A shift is a feature that turned into its modern sibling (ſ→s, vv→w).

Enforced by: `E-loss`, `E-shift`, wikipost, golden tests

### 1.2 Misprints are kept; only odr is corrected

`odr-original` and the wiki pages reproduce the print with its misprints (`thy likevvise`, `be began`, `thee Ievves`), citations included. Only `odr` (modern spelling) gets corrections. A content fix (wording, notes, marks, citations, later-edition text) goes into both datasets, each in its own spelling; a spelling fix (ſ, vv, macrons, 1582 forms) goes into `odr-original` only. Don't add words that the print lacks, and follow its word order and its verse numbering (Mark IX opens at Vulgate 8:39).

Enforced by: review (no code)

### 1.3 The print over EEBO-TCP

`A16049.xml` is evidence, not ground truth. EEBO typists dropped lines (homoeoteleuton), misread contractions and made typing errors. Where the XML and the print disagree, the print wins.

Enforced by: review (no code)

## 2. The owner's editorial removals (the only ones)

### 2.1 The verse-start † is kept

The print sets † at the start of every verse but a chapter's first, which opens with the drop initial. In the sidenotes format (§5.3) the page keeps it: `{{verse|chapter=1|verse=2|align=float}}† Abraham begat`. The owner reversed the earlier removal on 2026-11-22. Every other † stays too (§4.8).

Enforced by: `W-mark`

### 2.2 No printer's signatures

Signature marks in the foot (`D iij`) are left out, following Help:Formatting conventions.

Enforced by: `W-signature`, generator

### 2.3 Ornament images off for now

Woodcut initials, headpieces and tailpieces aren't emitted. 19 of the files aren't on Commons yet. A book gets them when `books.json` sets `"ornaments": true` for it (or `--ornaments` is given), after the owner has reviewed or uploaded the files.

Enforced by: books.json, generator

## 3. Orthography

### 3.1 Long s

Pages write long s as `{{ls}}`: `{{ls}}{{ls}}` for ſſ and `{{ls}}s` for ſs (`po{{ls}}sible`). It shows as ſ in the Page: namespace and as s when transcluded, so the text stays searchable. The data and `A16049.xml` keep the literal ſ (U+017F). Round `s` is counted for information, so that a shift ſ→s shows. The print never sets round s before long s (sſ), so a page or reading with `s{{ls}}` is a misread.

Enforced by: `ls`, `s`, `E-shift`, ladder

### 3.2 Long s in small caps and abbreviations

Inside `{{sc|…}}` long s is set as round s (`{{sc|the gospel}}`). Elsewhere an abbreviation ends in ſ before its point, as printed: `P{{ls}}.`, `Chry{{ls}}.`, `Ambro{{ls}}.`.

Enforced by: generator, golden tests

### 3.3 u/v and i/j

Keep the print's distribution: `vpō`, `vnto`, `euery`, `haue`, `Iesvs`. A modern `j` doesn't appear.

Enforced by: `v_initial`, `u_initial`, `j`

### 3.4 vv and w

Keep vv where the print has two letters (`vvorke`, `vvhen`) and w where it has one. The roman w in the margin notes looks like a capital W; it is still w. The OCR often reads vv as w, so check it on the scan.

Enforced by: `vv`, `w`

### 3.5 Macrons and titlos

Keep each macron or titlo for an omitted m or n (`cōmaunded`, `vpō`, `thē`, `Quīquagesme`). Write it as the macron U+0304 (precomposed where NFC has a form: ō, ē, ā, ū, ī; combining on n and q: n̄, q̄), as `A16049.xml` does. A tilde (U+0303: õ, ã, ñ) is an OCR code point, never the print's.

Enforced by: `macron`, data tests

### 3.6 Ligatures and &c.

Keep æ, œ and &c. as printed.

Enforced by: `ae`, `oe`, `etc`

### 3.7 NFC

All text is Unicode NFC. MediaWiki saves NFC, so a non-NFC page never matches live (Greek oxia becomes tonos, combining marks recompose). Generators and tools normalise before writing, and the data tests (`tests/test_data_encoding.py`) check every string of `odr-original` and `odr`.

Enforced by: `E-nfc`, data tests

### 3.8 No double quotes

The print has no double quotes; quotations are in italics. The OCR reads the annotation mark ‖ as a quote mark (§4.8).

Enforced by: `dquote`, `W-quote`

### 3.9 Greek

Polytonic Greek goes in `{{lang|grc|…}}` with its accents, breathings and iota subscripts as printed. In the XML it is `<foreign xml:lang="grc">`; a legible passage is never left as `<gap>`.

Enforced by: generator

## 4. Typography

### 4.1 Roman and italic

Set roman and italic as printed. Each Page: is parsed alone, so an italic run that crosses a page break is closed at the end of one page and reopened at the start of the next. Never write four or more apostrophes in a row. The running head and the footer are balanced on their own.

Enforced by: `italic`, `E-ital`, `E-foot-ital`

### 4.2 Nothing inside an open italic run

A margin note, or any template with `''` inside, never sits inside an open italic run: close the italics before it and reopen them after. Each note's own italics are self-contained.

Enforced by: `E-tpl-italic`

### 4.3 Bold

Bold (`'''`) is balanced on each page.

Enforced by: `E-bold`

### 4.4 Small caps

Small capitals are kept as `{{sc|…}}` (in the XML, `<hi rend="smallcaps">`):

- sacred names with a full capital first: `{{sc|Iesvs}}`, `{{sc|Christ}}`, `{{sc|Lord}}`, `{{sc|God}}`;
- display capitals in headings and arguments, never left as spaced letters from the OCR;
- the rest of the first word after a drop initial (§4.6).

Enforced by: `sc`

### 4.5 Running heads

Running heads use `{{rh|…}}`, in small caps: the middle title in lowercase (`{{sc|the gospel}}`, `{{sc|according to s. matthew.}}`), the side words capitalized (`{{sc|Cha. VI.}}`, `{{sc|Holy}} weeke.`), Roman numerals kept as capitals. The centred head of the Preface pages (4–24) is `{{rh/1|{{larger|{{sc|the preface}}}}}}` and `{{sc|to the reader.}}`, in lowercase small caps the same way. The other front-matter pages (1–3, 25–28) have no running head in the print, so they carry the only `W-header` warnings.

Enforced by: `W-rh-caps`, `W-header`

### 4.6 Drop initials

A chapter's woodcut initial is `{{dropinitial|…}}`, carrying the verse marker, with the rest of the word in small caps: `{{dropinitial|T|fl={{verse|chapter=1|verse=1}}}}{{sc|He}} booke`. In the sidenotes format (§5.3) the verse number goes in the margin like the others, before the initial, and so does a left note whose anchor falls in the lines beside the initial (a float after the initial is pushed right by its width): `{{verse|chapter=1|verse=1|align=float}}{{outside L|''Luc. 3, 31.''}}{{dropinitial|T}}{{sc|He}} booke of the * generation`. The verse numbers are placed by `Index:1582_Rhemes_New_Testament.pdf/styles.css`, which sets them just left of the text column, so that a drop initial or a note on the same line cannot push them aside. The same stylesheet starts each note below the one before it on the same side (`clear`), so notes never overlap, and sets the left notes 1em further out than `{{outside L}}` does, clear of two-digit verse numbers.

Enforced by: `dropinitial`

### 4.7 Type sizes

Larger and smaller type are kept with `{{larger|…}}`, `{{smaller|…}}` and their variants.

Enforced by: `size`

### 4.8 Print marks

The print's marks stay in the text: `*` (citation), `∷` (gloss), `‖` (annotation mark, written `{{sup|‖}}`), `⊣` (end of a liturgical reading), and † wherever it isn't a verse start. Lectionary notes and headings that the print sets without a ∷ have none. In the data, a verse note's place is `<na>` and a citation's `<cr>`; a ledger entry may not drop one without an `allow`.

Enforced by: `star`, `quad`, `bar`, `sup_bar`, `tack`, `dagger`, `note_mark`

## 5. Page structure and Wikisource conventions

### 5.1 Page skeleton

A page is `<noinclude><pagequality level="1" user="" />{{rh|…}}</noinclude>`, then the body, then `<noinclude>{{continues|…}}</noinclude>`. A page in the sidenotes format (§5.3) opens its header with `{{sidenotes begin}}` and ends its footer with `{{sidenotes end}}` on its own line. Braces are balanced. There are no stray `<i>`, `<b>`, `<br>` or data tags (`<na>`, `<cr>`, `<alt>`) and no generator sentinels (`⟦ ⟧`, `{{MINNER|`, `{{MOUTER|`).

Enforced by: `E-tag`, `E-brace`, `E-sentinel`

### 5.2 Honest page status

The generator writes level 1 (not proofread). Level 3 or more needs a named proofreader who read the page against the scan. `rh.py post` keeps the live page's level and proofreader, so a post never demotes a human's proofreading.

Enforced by: `E-status`, wikipost

### 5.3 Margin notes

Every page is in the sidenotes format of the validated 1610 Douai Old Testament pages ([Page:1610_Douai_Old_Testament.pdf/336](https://en.wikisource.org/wiki/Page:1610_Douai_Old_Testament.pdf/336), 337): Matthew 1 from 2026-11-22, the rest of the book, the Argument pages and the frozen pages the same day. It is the generator's default; `books.json` `sidenotes: false` or `[first, last]` would narrow it for a book. `{{MarginNote}}` is no longer used. Each note is `{{outside L|…}}` (left margin) or `{{outside R|…}}` (right; it stays on the right for readers too, which the owner chose over `{{outside RL}}` on 2026-11-22), set straight after its anchor in the text, as the print shows it: a citation after its `*` (`the * {{outside L|''Luc. 3, 31.''}} generation`), a gloss after its `∷`, which the print repeats in the note (`∷ {{outside RL|∷ ''de qua''.}} of vvhom`). A note the print sets without an anchor (lectionary notes, headings, the annotations' side notes such as `Virginitie preferred`) has none. The side follows the print, note by note: by default as below, with the exceptions in `overrides.py` (`INNER_NOTES`, `OUTER_NOTES`). The text goes in `1=` when it holds a top-level `=`, and a line that would open with `*` or `#` starts with `<nowiki/>`.

Notes are never empty. On recto (odd) pages the inner margin is left and the outer right; on verso pages it's the reverse. Citations go in the inner margin; glosses, summaries and lectionary notes go in the outer. A margin `*` before a citation stays in the note (`* Mr. 12, 18.`). Line breaks inside a note are `{{br}}`. Leave no space before the template when punctuation follows it.

**Margin letters.** Where the print sets a letter (`a`, `b`, `c`, `d`) over the annotated word, it sets the same letter at the head of the margin note, and the XML has `<note n="c">`. `odr-original` keeps both: `c <na>[1]</na>` in the verse text and `c …` at the start of the note (inside the `<i>` for a Greek note). `odr` carries no letters: its note text has none and its text has no letter. A letter at the end of a verse text (Romans 8:37) is the marker for the next verse's note and stays. When the XML puts a note in a verse and the data has it in the next, move the note and its anchor in both datasets (John 10:16). A misprinted citation in such a note stays in `odr-original` and the XML and is corrected in `odr` (Acts 22:20: print `Act. 7, 38`, `odr` `7, 58`).

Enforced by: `E-margin`, `margin_note`

### 5.4 Verse markers

Verses are `{{verse|chapter=N|verse=M}}`. In the sidenotes format they are `{{verse|chapter=N|verse=M|align=float}}` followed by the print's † (§2.1): the number floats in the left margin, as `{{verseline}}` sets it on the 1610 pages, without `{{verseline}}`'s white background, which shows in dark mode. A chapter's first verse is set before its drop initial (§4.6). Verses are in the print's order and numbering, with none repeated or skipped.

Enforced by: `verse`, `E-verse`

### 5.5 The annotation mark never splits a word

`{{sup|‖}}` sits before the word its annotation explains, never inside a word. A one- or two-letter fragment before it means a stale lemma offset.

Enforced by: `E-lemma-split`

### 5.6 Hyphenated words across pages

A word split across a page break is `{{hws|prefix|full word|title=…}}` at the foot and `{{hwe|suffix|full word|title=…}}` at the head of the next page. Both always carry a plain-text `title=`, with no templates, `''` or ſ: `{{hws|Ha|Hauing|title=Hauing}}` (Template:Hyphenated word start).

Enforced by: `E-hw-title`

### 5.7 Catchwords

The print's catchword goes in `{{continues|…}}` in the footer, never in a `{{rh}}` cell.

Enforced by: `W-catchword`

### 5.8 {{nop}} at a paragraph's foot

When a paragraph ends at the foot of a page and the next page opens a new one, the page ends with `{{nop}}` on its own line (Help:Page breaks).

Enforced by: `W-nop`

### 5.9 No single line breaks

A paragraph is one line; paragraphs are separated by a blank line. The print's paragraphs, full and half indents alike, are kept.

Enforced by: `W-linebreak`

### 5.10 Spacing

No double spaces, no space before `, . ; : ? ! )` or after `(`, no trailing spaces.

Enforced by: `W-space`

### 5.11 No list markup

Never use `#` or `<ol>` in running text: the list padding pushes the column into the left margin notes, and a list can't continue across a page break. Numbered items are plain paragraphs (`1. The firſt reaſon…`).

Enforced by: generator

### 5.12 Tables in dark mode

MediaWiki's night mode forces dark text on any element whose style contains `background`. So tables never use `background` in a style, and never use `!` header cells: use `|` cells with `'''bold'''`. The container is `{| style='border-collapse: collapse; border: none; width: 100%;'`.

Enforced by: `E-darkmode`

### 5.13 Complete page run

`pages/` holds every page from 1 to the last, with no gaps.

Enforced by: `E-gap`

## 6. Sources and data

### 6.1 Pages come from the data

The pages are generated from `static/data/odr-original` by `rh.py generate` (`scripts/wikisource/rhemes/generate.py`). Never edit a generated page: fix the data or the generator and regenerate. The frozen pages (`manifest.json` `source: frozen`: front matter 1–30, the tables 309–313 and 402–404) have no generator and are edited by hand, still under lint's fidelity check. No script sweeps over `pages/*.wiki` or the live pages.

Enforced by: golden tests, `E-loss`, `E-shift`

### 6.2 Data writes

Data JSON is written only through `jsonfmt.write_like()`, which keeps each file's format, while holding the `$(git rev-parse --git-common-dir)/odr-data.lock` mkdir lock (in a worktree that is the main checkout's `.git`). Scripts run as `python3 -I`. `rh.py fix apply --write` and `rh.py reconcile adopt --write` do both.

Enforced by: review (no code)

### 6.3 The evidence ladder

Letter-shape and spelling conflicts are settled by the evidence ladder in [PLAYBOOK.md](PLAYBOOK.md#the-evidence-ladder), cheapest first: the XML with an OCR reading, the XML alone, then OCR, the book's majority, the macron and the stem rule, and scans last, because they cost the most tokens. Every decision is kept in `reconcile/<book>.jsonl`, and every scan reading in `reconcile/scan-readings.jsonl`.

Enforced by: reconcile verify

### 6.4 Maintaining A16049.xml

`A16049.xml` (repo `original-douay-rheims-nt`) keeps the literal ſ and no wiki templates. When you restore a `<gap>` or remove a transcription duplicate: recount `<gap>`, `<desc>`, `<foreign>` and `<note>` and update the counts in that repo's README; add a `<change>` to `<revisionDesc>`; and check that the file still parses (`python3 -c "import xml.etree.ElementTree as ET; ET.parse('A16049.xml')"`). Then record the edit in the ledger (§6.5): commit it in that repo and run `rh.py fix propose-diff xml <before> <after> --out <dir>`. That command turns the diff into entries; check them, then append them. It never adds an `allow` by itself: an edit that loses a print feature is printed, and gets an `allow` and a `note` only once you have checked the scan.

Enforced by: review (no code)

### 6.5 The fixes ledger

Every data fix is one entry in `fixes/<book>.jsonl`, applied with `rh.py fix apply`. That command is a dry run unless you pass `--write`. With `--write` it takes the lock, writes all or nothing, and refuses a fidelity loss. The XML's front matter and the microfilm appendix use `fixes/front.jsonl` and `fixes/back.jsonl`. Fixes to the 1609/10 Old Testament data (no pages yet) go in `docs/fixes-ot/<book>.jsonl`, in the same format with `A11777.xml` as the XML; check and apply them with `--fixes docs/fixes-ot`. An entry is one JSON line with these keys, in this order:

- `id`: `<book>-<loc>-<letter>`, unique in the file.
- `target`: some of `odr-original`, `odr` and `xml`.
- `loc`: `<book> <loc>`, as in `rhemes/loc.py` (`1:6a2/mn1`, `arg:0`, `3:sum`). `#key` sets another key of the same object; `old`/`new` are then JSON values, and `null` means the key is absent.
- `old`, `new`: the text before and after, unique in its string. `odr_old`/`odr_new` give the same change in `odr`'s modern spelling.
- `evidence`: what you read (a scan page, the OCR, the XML), and `date`.
- Optional: `note`, `allow` and `superseded_by` (a later entry, or `git <hash>`, that changed it again).

A decided fidelity change goes in the entry as `"allow": ["FEATURE:loss|shift"]`, with its reason in `note`, not as `--allow-*` on the command line. `rh.py detect`, `rh.py sync-odr` and `rh.py fix propose-live` only propose entries: a person checks each one and appends it. The bulk passes before the ledger (ſ, vv, macrons) and the ladder's decisions (`reconcile/<book>.jsonl`) are not entries.

Enforced by: fix check

## 7. Posting to Wikisource

### 7.1 Only with the owner's approval

Pages are posted only with the owner's approval, from the owner's own account, at least 12 s apart. The owner chose this over a separate bot account, provided the posting stays moderate.

Enforced by: wikipost, review (no code)

### 7.2 Never revert a human edit

`rh.py post` skips a page whose newest revision is by someone else. Check that editor's change against the scan. A valid change goes into the data, and only then is the page posted with `--adopt-others`. An invalid one is reported to the owner, never silently overwritten.

Enforced by: wikipost

### 7.3 No fidelity loss against live

`rh.py post` refuses, dry run included, any page whose print features would drop against the live revision, unless `--allow-loss`/`--allow-shift FEATURE:SCOPE --reason "…"` covers it. The edit carries `baserevid`, so MediaWiki refuses it if the page changed in the meantime.

Enforced by: wikipost

## Open items

- Acts p. 367 `neceſſary`: not read on the scan yet.
- 19 ornament files missing on Commons (listed in `docs/audits/2026-11-21-phase1-reconcile.md`): ornaments stay off (§2.3).
- The frozen pages (§6.1) have no generator. Front matter is costly to generate for little gain; the eight table pages would need a table renderer.

## Enforcement index

| Code or feature | Kind    | Rule  |
| --------------- | ------- | ----- |
| `E-loss`        | lint    | §1.1  |
| `E-shift`       | lint    | §1.1  |
| `W-mark`        | lint    | §2.1  |
| `W-signature`   | lint    | §2.2  |
| `ls`            | feature | §3.1  |
| `s`             | feature | §3.1  |
| `E-shift`       | lint    | §3.1  |
| `v_initial`     | feature | §3.3  |
| `u_initial`     | feature | §3.3  |
| `j`             | feature | §3.3  |
| `vv`            | feature | §3.4  |
| `w`             | feature | §3.4  |
| `macron`        | feature | §3.5  |
| `ae`            | feature | §3.6  |
| `oe`            | feature | §3.6  |
| `etc`           | feature | §3.6  |
| `E-nfc`         | lint    | §3.7  |
| `dquote`        | feature | §3.8  |
| `W-quote`       | lint    | §3.8  |
| `italic`        | feature | §4.1  |
| `E-ital`        | lint    | §4.1  |
| `E-foot-ital`   | lint    | §4.1  |
| `E-tpl-italic`  | lint    | §4.2  |
| `E-bold`        | lint    | §4.3  |
| `sc`            | feature | §4.4  |
| `W-rh-caps`     | lint    | §4.5  |
| `W-header`      | lint    | §4.5  |
| `dropinitial`   | feature | §4.6  |
| `size`          | feature | §4.7  |
| `star`          | feature | §4.8  |
| `quad`          | feature | §4.8  |
| `note_mark`     | feature | §4.8  |
| `bar`           | feature | §4.8  |
| `sup_bar`       | feature | §4.8  |
| `tack`          | feature | §4.8  |
| `dagger`        | feature | §4.8  |
| `E-tag`         | lint    | §5.1  |
| `E-brace`       | lint    | §5.1  |
| `E-sentinel`    | lint    | §5.1  |
| `E-status`      | lint    | §5.2  |
| `E-margin`      | lint    | §5.3  |
| `margin_note`   | feature | §5.3  |
| `verse`         | feature | §5.4  |
| `E-verse`       | lint    | §5.4  |
| `E-lemma-split` | lint    | §5.5  |
| `E-hw-title`    | lint    | §5.6  |
| `W-catchword`   | lint    | §5.7  |
| `W-nop`         | lint    | §5.8  |
| `W-linebreak`   | lint    | §5.9  |
| `W-space`       | lint    | §5.10 |
| `E-darkmode`    | lint    | §5.12 |
| `E-gap`         | lint    | §5.13 |
| `E-loss`        | lint    | §6.1  |
| `E-shift`       | lint    | §6.1  |
