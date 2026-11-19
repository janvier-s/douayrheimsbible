# 1582 Rhemes New Testament — Editorial Rules & Transcription Conventions

This document records the exact rules, typesetting conventions, and technical requirements established for transcribing, proofreading, and publishing the **1582 Rhemes New Testament** on English Wikisource ([Index:1582_Rhemes_New_Testament.pdf](https://en.wikisource.org/wiki/Index:1582_Rhemes_New_Testament.pdf)) and maintaining the corresponding EEBO-TCP TEI XML corpus (`A16049.xml` in [original-douay-rheims-nt](https://github.com/janvier-s/original-douay-rheims-nt)).

Every rule here has been learned through audits against high-resolution facsimiles (Sancta Clara, Peters, Bodleian) and community proofreading on Wikisource. **Always check your work against these rules and run the linter before publishing.**

---

## 1. Hyphen Split Across Page Boundaries (`{{hws}}` / `{{hwe}}`)

When a word is hyphenated across a page break, Wikisource uses `{{hws|...}}` (hyphen-word-start) at the end of the first page and `{{hwe|...}}` (hyphen-word-end) at the beginning of the next page so the word is joined seamlessly when transcluded to the mainspace.

### The Rule: Always provide `title=` when the word contains templates or markup

`{{hws}}` generates an underlying HTML span:

```html
<span class="hyphen-split" title="FULLWORD">PREFIX-</span>
```

> [!CAUTION]
> If parameter 2 contains any template (like `{{ls}}`, `{{sc}}`), formatting (like `''`), or HTML quotes, MediaWiki expands the template **inside the HTML `title` attribute**, creating corrupt HTML that breaks transclusion and fails site validation:
>
> ❌ **Broken (corrupts HTML):**
> `{{hws|{{ls}}ignifi|{{ls}}ignification}}`  
> Expands to: `<span class="hyphen-split" title="<span class="long-s">ſ</span>ignification">...</span>`
>
> ✅ **Correct:**
> `{{hws|{{ls}}ignifi|{{ls}}ignification|title=signification}}`  
> Expands to: `<span class="hyphen-split" title="signification">...</span>`

### Summary:

- **Parameter 1**: The printed prefix on page N (including `{{ls}}` if present, e.g. `{{ls}}ignifi`).
- **Parameter 2**: The visual full word with formatting (e.g. `{{ls}}ignification`).
- **`|title=` Parameter**: **Mandatory** whenever parameter 2 contains `{{ls}}`, formatting, or special markup. Must contain clean plain text (ASCII/Unicode without nested HTML or templates).
- On page N+1, mirror with `{{hwe|suffix|fullword}}` (e.g. `{{hwe|cation|{{ls}}ignification}}`).

---

## 2. Small Capitals (`{{sc}}`) & Sacred Names

The 1582 edition employs distinct typographic hierarchies using small capitals.

### 2.1 Sacred Names in Text (`IESVS`, `LORD`, `GOD`)

In continuous prose and verse text, sacred names are set with a standard full capital for the initial letter and small capitals for the remainder:

- Print: **I<small>ESVS</small>** → Wikisource: `{{sc|Iesvs}}`
- Print: **I<small>ESVM</small>** → Wikisource: `{{sc|Iesvm}}`
- Print: **I<small>ESV</small>** → Wikisource: `{{sc|Iesv}}`
- Print: **C<small>HRIST</small>** → Wikisource: `{{sc|Christ}}`
- Print: **L<small>ORD</small>** → Wikisource: `{{sc|Lord}}`
- Print: **G<small>OD</small>** → Wikisource: `{{sc|God}}`

### 2.2 Capitalized Small Capitals in Display and Title Typography

In running heads, section headings, book arguments, and solemn declarations, words often appear in letter-spaced capitals or capitalized small caps:

- Where the scan clearly shows capitalized small caps (e.g. **I E S V M** or **I E S V S C H R I S T**):
  - Do **not** leave them as naked spaced letters (`I E S V M`) from raw OCR.
  - Wrap the small capitals in `{{sc|...}}`: e.g. `{{sc|Iesvm}}` or `{{sc|I E S V M}}` per visual weight in the scan.
  - If the initial letter is a full-height display capital and the subsequent letters are spaced small caps, format as `I {{sc|e s v m}}` or `{{sc|Iesvm}}`.

### 2.3 Post-Drop-Cap Continuation

At the start of a chapter following a large decorative drop-cap (initial woodcut), the remainder of the first word (and sometimes the following word) is set in capitals or small capitals:

- Example (Page 31, Matt 1:1): Initial **T**, followed by `{{sc|He booke}}`.

---

## 3. Long-s (`ſ`) & Early Modern Orthography

### 3.1 Wikisource (`.wiki`) vs XML Corpus (`.xml`)

- **Wikisource Pages**: Always use `{{ls}}` for the long-s character (`ſ`).  
  _Why?_ The `{{ls}}` template displays `ſ` in the Page: namespace to match the facsimile, but automatically resolves to modern `s` in mainspace transclusion, preserving full-text searchability and accessibility.
- **EEBO-TCP XML (`A16049.xml`)**: Always store the literal Unicode long-s `ſ` (`U+017F`). Do not use wiki templates in XML.

### 3.2 Orthographic Rules

- **`u` and `v`**: Retain exact 1582 print distribution (`vpō`, `vnto`, `euery`, `haue`, `giue`, `loue`).
- **`vv` vs `w`**: Retain `vv` where printed as two separate characters (`vvorke`, `vvould`, `vvhen`). Roman margin notes often use a roman `w` that resembles a capital `W`; retain `w` there.
- **Macrons / Titlos**: Vowels with macrons indicating an omitted _m_ or _n_ (`cōmaunded`, `vpō`, `frō`, `thē`, `mā`) must be preserved as precomposed Unicode characters or combining macrons in strict NFC form.
- **Ligatures**:
  - Double long-s: `ſſ` (two `{{ls}}` in wiki: `{{ls}}{{ls}}`).
  - Long-s + short-s: `ſs` (`{{ls}}s` in wiki; often appears as `ß` in italic summaries).
  - Abbreviations ending in _s_: End in long-s before punctuation (e.g. `P{{ls}}.` for Psalm, `Chry{{ls}}.` for Chrysostom).
- **No modern quotation marks**: The 1582 text never uses curly or straight double quotes (`"`, `“`, `”`). Quotations are indicated by italics or marginal pointers.

---

## 4. Numbered & Ordered Lists: Paragraphs vs `#` / `<ol>`

Early Modern books do not use modern HTML-style indented numbered lists.

> [!IMPORTANT]
> **Never use MediaWiki `#` or `<ol>` in running prose.**
>
> 1. **Margin Note Collision**: Browser `<ol>` elements inject a default `40px` (`2.5em`) left padding. On verso pages with `margin=left`, this shifts the entire column inward and causes left-margin notes to overlap text or require brittle `margin-offset=22` adjustments.
> 2. **Page Break Disruption**: Native MediaWiki `#` lists cannot span across page breaks without resetting to `1.` or requiring raw `<ol start="...">` tags.
> 3. **Typesetting Fidelity**: The 1582 print sets numbered items as standard paragraphs with hanging or inline numerals.

### Correct Practice:

Format numbered items as plain paragraphs with standard line breaks:

```wikitext
1. The firſt reaſon is...

2. The ſecond conſideration...
```

Or, if italicized in print:

```wikitext
''1. The firſt reaſon...''

''2. The ſecond conſideration...''
```

---

## 5. Margin Notes (`{{MarginNote}}`)

Margin notes are placed using the standard `{{MarginNote}}` template.

### 5.1 Placement & Margins

- **Recto Pages (Odd numbers)**:
  - **Outer margin**: `margin=right` (used for glosses, subject summaries, lectionary directions).
  - **Inner margin**: `margin=left` (used for Scripture cross-references and citations).
- **Verso Pages (Even numbers)**:
  - **Outer margin**: `margin=left` (used for glosses, subject summaries, lectionary directions).
  - **Inner margin**: `margin=right` (used for Scripture cross-references and citations).
- **Front Matter**: Follow the physical layout of the page (usually outer margins, or both margins for parallel annotations).

### 5.2 Mandatory Parameters

Every `{{MarginNote}}` must include:

1. `|margin=left` or `|margin=right`
2. `|margin-width=65` (standard fixed width across all pages)
3. `|text=...` (the note content; must never be empty)
4. `|margin-offset=<n>` (optional: vertical offset in pixels or line units to align with a specific line or prevent overlapping adjacent notes)

### 5.3 Formatting Inside Margin Notes

- **Line breaks**: Use `{{br}}`. Never use `<br>` or literal newlines inside `|text=`.
- **Italics**: Must be self-contained within each note (`''...''`).
- **Punctuation spacing**: Do **not** leave a space before `{{MarginNote}}` when it immediately precedes punctuation:
  - ✅ `...confe{{ls}}{{ls}}ion{{MarginNote|margin=right|margin-width=65|text=...}}:`
  - ❌ `...confe{{ls}}{{ls}}ion {{MarginNote|margin=right|margin-width=65|text=...}}:`

---

## 6. Page Break Formatting Balance

MediaWiki parses every page in the `Page:` namespace as an independent document.

> [!WARNING]
> Unbalanced markup across page boundaries causes parser corruption and immediate linter failure (`E-ital`, `E-bold`).

- **Italics across page breaks**:
  - Close the italic tag before the end of Page N: `...end of page text.''`
  - Reopen the italic tag at the beginning of Page N+1: `''Start of next page text...`
- **Bold across page breaks**: Follow the same close-and-reopen rule for `'''`.
- **Never use 4+ consecutive apostrophes**: `''''` causes parser ambiguity between italics and bold.

---

## 7. Unicode Normalization: Strict NFC

All text saved to Wikisource is automatically normalized by MediaWiki to **NFC** (Normalization Form C: canonical decomposition, followed by canonical composition).

- **Why it matters**: If files on disk are saved in NFD (decomposed) or non-standard Unicode:
  - Greek oxia (`U+1FFD`) is normalized by MediaWiki to tonos (`U+0384`).
  - Combining characters will recompose.
  - Local diffs will forever report spurious changes against live pages, breaking automated sync and verification.
- **Rule**: All generator scripts, audit tools, and manual edits must normalize text with `unicodedata.normalize('NFC', text)` before saving. This is enforced as error `E-nfc` in `lint.py`.

---

## 8. Polytonic Greek & Foreign Text

- **Wikisource Pages**:
  - Wrap polytonic Greek in `{{lang|grc|...}}`.
  - Accents (acute, grave, circumflex), breathings (smooth, rough), and iota subscripts must be fully restored from facsimiles.
- **EEBO-TCP XML**:
  - Wrap Greek in `<foreign xml:lang="grc">...</foreign>`.
  - Never leave legible Greek passages as `<gap>` or transliterated Latin.

---

## 9. EEBO-TCP XML Maintenance & README Numbers

The source XML (`sources/eebo-tcp/A16049.xml`) and its upstream repository [original-douay-rheims-nt](https://github.com/janvier-s/original-douay-rheims-nt) serve as the digital transcription foundation.

### When Backfilling Gaps or Correcting Text:

1. **Restore Gaps**: Replace `<gap .../>` elements with the verified reading (wrapped in `<foreign xml:lang="grc">` for Greek, or supplied text).
2. **Remove OCR / Printer Duplications**: Delete duplicated marginal notes or repeated phrases resulting from historical transcription errors.
3. **Recount XML Tags**: Always run an exact tag count on the XML file:
   - `<gap>`
   - `<desc>`
   - `<foreign>`
   - `<note>`
4. **Update README.md**:
   - Update the tag count tables in the README to reflect the exact new numbers (e.g. decreasing `gap` count, increasing `foreign` count).
5. **Update `<teiHeader>`**:
   - Add a `<change>` entry inside `<revisionDesc>` documenting the date, editor, and scope of corrections.
6. **XML Well-Formedness Check**:
   - Always validate the XML using `python3 -c "import xml.etree.ElementTree as ET; ET.parse('A16049.xml')"` before committing.

---

## 10. Wikisource Bot Publishing Protocol

All automated publishing via `scripts/wikisource/wikipost.py` must adhere strictly to Wikimedia bot and proofreading policies:

1. **Pre-Publish Linting**:
   - Always run `python3 scripts/wikisource/lint.py <pages_dir>` first.
   - Zero errors (`0 error(s)`) is required. Warnings should be reviewed.
2. **Protection of Human Edits**:
   - The bot checks `last_author` on every page.
   - If another user edited the page, the bot will skip it.
   - Inspect their edits manually against the 1582 scans. If their improvements are valid or our audit encompasses them, pass `--adopt-others <page_numbers>` explicitly.
3. **Rate Limiting**:
   - Use `--delay 12` (minimum 12 seconds between page edits) to prevent HTTP 429 throttling and respect Wikimedia API guidelines.
4. **Descriptive Edit Summaries**:
   - Include specific descriptions of changes made (e.g. `audit against 1582 print: restore margin notes, polytonic Greek, fix hws title, NFC`).
5. **Manifest Tracking**:
   - Every published page must have its SHA1, live `revid`, and status `posted` updated in `wikisource/1582-rhemes-nt/manifest.json`.
