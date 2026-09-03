# ODR Export Bundle

## Goal

Generate the `janvier-s/original-douay-rheims` distribution bundle from `static/data/odr/**` with a single scripted run, and correct the `/download` page copy to match what the corpus now contains.

The bundle is currently hand-maintained and predates a large amount of corpus work: verse text repairs, annotation re-anchoring, catchword spans, chapter articles. Its published description is measurably stale (it claims 1,707 annotations; there are 1,677). Scripting the export makes the published data reproducible and makes drift detectable.

## Scope

**In:** the 1582/1610 Rheims-Douay material only — verse text, inline notes, cross-references, chapter summaries, book intros, chapter articles, annotations with sub-notes, and the ODR reference matter.

**Out:** `static/data/textual-notes/` and `static/data/glossary/`.

The exclusion is a licensing decision, not a technical one. Both directories are modern third-party scholarship citing living authors and in-copyright works (Oborski 2022, Biasi 2016), sourced from a corpus outside this repo (`build-textual-notes-data.ts:16`, `build-glossary-data.ts:14`). The distribution repo asserts CC0 1.0 across all files. Shipping that material under CC0 would relicense work that is not ours to relicense. Keeping the bundle ODR-only keeps the CC0 claim true, so the `/download` licence copy needs no change.

Also out: `static/data/vul/` (Latin Vulgate). Public domain and safe to ship, but out of scope for a repo named for the Douay-Rheims. Revisit separately.

## Source Material

`static/data/odr/` — 76 book files plus three non-book artifacts (`search-index.json`, `search-notes-index.json`, `search-suggestions.json`) which the export must skip.

Corroborated by `books.ts:5`: 49 OT (46 canonical + 3 appendix) + 27 NT = 76.

### Counts

| Quantity | Value |
|---|---|
| Books | 76 |
| Chapters | 1,361 |
| Verses | 37,180 |
| Verse notes (`notes[]`) | 8,533 across 6,939 verses |
| Cross-references | 1,989 across 1,914 verses |
| Chapter summary notes | 210 |
| Intros | 84, carrying 689 notes |
| End matters | 5 in 4 books, carrying 151 notes |
| Articles | 9 in 9 chapters, carrying 440 notes |
| Annotations | 1,677 in 397 files |
| Annotation sub-notes | 3,609 |
| **Notes of every kind** | **13,632** |
| Marker tokens in text | 13,608 |
| Reference files | 26 (14 `ot/` + 12 `nt/`) |

The last two lines reconcile exactly, which is the check that the markup model is right: 13,632 notes less the 26 that are never referenced leaves 13,606, and 13,608 marker tokens less the 2 that cannot bind leaves the same 13,606. Every note and every marker is accounted for.

Reference matter lives at `static/data/reference/odr/{ot,nt}/`, **not** under `static/data/odr/`.

### Book file shape

```
{ book, book_title, short_title, hebrew_title, intros[], chapters[], endMatters[] }
intros[]:     { title, text, notes[] }        notes[]: { marker, text }
endMatters[]: { title, text, notes[] }        notes[]: { marker, text }
chapters[]:   { chapter, verses[], summary, summary_notes[], articles[] }
  summary_notes[]: { marker, text }
  articles[]:      { title, text, notes[] }   notes[]: { marker, text }
verses[]:     { verse, text, has_annotation, lemmas, cross_refs[], notes[] }
  cross_refs[]: { text }
  notes[]:      { label, text }
```

Two note vocabularies coexist. Verse notes key on **`label`** (a string); every other notes array keys on **`marker`** (a number, or the string `"◦"`). The export must not assume one.

`endMatters` appears on four books — `2-machabees`, `acts`, `job`, `psalms` — and is shaped like `intros[]`. It carries its own markup and notes. Nothing in the previous draft mentioned it; a glob over known keys would have dropped it silently.

`book_title`/`short_title`/`hebrew_title` are absent on the appendix books, which carry `version_abbr`/`date` instead.

Annotation sidecars at `static/data/odr/<book>/annotations/<NNN>.json`:

```
{ chapter, annotations[ { verse, part, title, text, notes[] } ] }
notes[]:  { marker, text }
```

### Inline markup vocabulary

The complete vocabulary, measured across all 76 book files **and** the 397 annotation sidecars. Nine tags, none carrying attributes. Counts are tag pairs:

| Tag | Pairs | Appears in | Meaning | Resolves against |
|---|---|---|---|---|
| `<i>` | 10,640 | 11 contexts, everywhere | italic | — |
| `<na>` | 8,700 | verse text (8,490), chapter summary (210) | note marker | verse `notes[]` by `label`; `summary_notes[]` by `marker` |
| `<mn>` | 4,875 | annotation (3,603), intro (683), article (439), endMatter (150) — all `.text` | marginal note marker | that block's `notes[]` by `marker` |
| `<cr>` | 1,989 | verse text | cross-reference marker | verse `cross_refs[]` positionally |
| `<sc>` | 1,457 | verse text (1,348), annotation text (109) | small caps | — |
| `<alt>` | 106 | verse text | span a marginal variant applies to | the adjacent marker |
| `<br>` | 54 | intro text | paragraph break — **void, never closed** | — |
| `<col-left>` | 1 | annotation text | two-column layout | — |
| `<col-right>` | 1 | annotation text | two-column layout | — |

Every tag but `<br>` is balanced: open and close counts match exactly for all eight.

**The markup does not recurse.** No marker tag — `<na>`, `<mn>`, or `<cr>` — ever appears inside a note's own text; note bodies contain `<i>` and nothing else. So resolving a marker can never surface further markers, and the apparatus is exactly two levels deep rather than arbitrarily nested. The tokenizer needs no recursion, and the sub-note flattening below is a one-pass operation.

**`<na>` and `<mn>` are not interchangeable, and the earlier draft had them backwards.** No verse anywhere contains `<mn>`, and no intro, article, or annotation contains `<na>`. `<na>` is the verse-and-summary marker; `<mn>` is the marker used in prose apparatus. Getting this wrong resolves every verse note against the wrong array.

`<alt>`, `<br>`, `<col-left>`, and `<col-right>` were absent from the earlier draft entirely. Under the fail-loud rule below, an unknown tag is fatal, so omitting them would have failed the export on 268 occurrences.

`<col-left>`/`<col-right>` occur once, in the Romans 9 annotation, wrapping two parallel lists. They are preserved verbatim in `bible/tagged/` and `annotations/`. USFM has no column model inside a note, so in `usfm-study/` they collapse to sequential text, which is the same containment limit as the paragraph breaks.

#### Marker tokens

Markers are **not** all `[n]`. Three forms occur, and the lettered form is the most common:

| Form | Example | Binds to |
|---|---|---|
| bracketed number | `<na>[1]</na>` | `label`/`marker` `"1"` |
| parenthesised letter | `<na>(a)</na>` | `label`/`marker` `"a"` |
| ring | `<mn>◦</mn>` | positional, see below |

One tag may carry **several** tokens: `<na>(c)[1]</na>` is two markers at one position, binding to notes `"c"` and `"1"`. This occurs 33 times. Tag content is therefore parsed as a *sequence* of tokens, never as a single label.

Any `<cr>[n]</cr> → cross_refs[n-1]` index arithmetic is wrong for the lettered form and must not be used.

#### Resolution rule

> Within one text, the **k-th occurrence** of token `t` binds to the **k-th entry** of that block's notes array whose `label`/`marker` equals `t`. A `◦` token that matches no entry binds instead to the next not-yet-consumed note in array order.

The `◦` fallback is needed because one array can hold many notes all marked `"◦"`:

```
1-esdras notes = ["◦", 1, 2, … 14, "◦", 15, … 41, "◦", "◦", 42, …]
```

Verified against the corpus: this rule binds **13,606 of 13,608** markers, using the `◦` fallback twice. The two failures and the 26 unreferenced notes are catalogued below as source defects, not as rule gaps.

### Known source irregularities

- **Three appendix books carry no `book_title`/`short_title`** — `3-esdras`, `4-esdras`, `prayer-of-manasses`. They have `version_abbr`/`date` instead. USFM requires `\h` and `\mt1`, so titles come from `books.ts` (`odrName`) for these.
- **`prayer-of-manasseh.json` was a dead byte-identical duplicate** of `prayer-of-manasses.json`. Nothing referenced it (`books.ts:474`, `resolve.ts:54`, `FloatingNav.svelte` all use `-manasses`). Deleted as part of this work.
- **No slug→USFM book code map exists** anywhere in the repo. One must be authored, and the export fails on any slug missing from it. See below for the Esdras family, which is the only non-obvious part.

#### Marker defects, exhaustively

Two markers in the corpus cannot bind, and both are transcription defects rather than unhandled forms:

| Ref | Source | Problem |
|---|---|---|
| `1 Timothy 2:6` | `…for all, <na>[1]</na> <alt>whose testimony</alt> in due times is confirmed. <na>[1]</na>` | marker `[1]` printed twice against a single note |
| `Ecclesiasticus 14:10` | `…he shall not <na>(†)</na> have his fill of bread…` | `†` marker, and the verse has no `notes` array at all |

A further **26 notes are never referenced** from their text (`1-john 4:21`, `john 21:25`, `matthew intro`, `romans intro`, `acts ann 8:38` among them).

These 28 cases are the complete known set. They are fixed data, so the export pins them: the tolerance list is enumerated in `export-lib.ts`, and anything *outside* it is fatal. A new unbound marker means the corpus changed and the export should stop.

#### Summary overflow: `verse: 0`

49 chapters across 27 books hold a verse numbered 0. It is never scripture: it is the tail of a chapter summary that ran past its field, and it finishes the summary's sentence.

```
numbers 25  summary: "…Phinees his zeal in stabbing to death two fornicators is commended"
            verse 0: "by God, and rewarded."
```

USFM verse numbers start at 1, so emitting these as `\v 0` is both invalid and a claim that the editor's summary is text of the Bible. Each fragment is appended to the `\cd` it continues, and the chapter's verse loop skips it.

12 of the 49 sit in a chapter with no `summary` at all — the head of the summary never made it into the corpus — so the fragment becomes the whole `\cd`. 10 carry `notes` and one, the Tobias preface at `tobias 0:0`, carries five `cross_refs`; those travel with the words, in marker order, in the same trailing `\f`/`\x` form `\cd` already gives summary notes, because a one-line `\cd` cannot keep a note at its marker.

The fragments tokenize as `verse` blocks, not `summary` ones: `acts 7:0` contains `<sc>Jesus</sc>`, which the summary vocabulary forbids.

#### The duplicate verse in 3-Esdras 2

`3-esdras` chapter 2 numbers two entries `1`:

```
verse 1: "CYRUS king of the Persians reigning for the accomplishment of the word of our Lord by the mouth of Jeremy,"
verse 1: "Cyrus king of the Persians reigning … by the mouth of Jeremy, 2. . v. 22. 2. . v. 1. & 6. v. 3. . v. 12. & 29. v."
```

Two readings of one verse, differing in capitalisation, the second trailing malformed cross-reference residue. It is the only repeated verse number in the corpus.

This is a defect in `static/data/odr/`, which the export only reads. Which reading is canonical is an editorial judgment about scripture and belongs to the corpus maintainer, so the export neither repairs it nor silently drops one: the first keeps `\v 1`, the second becomes `\v 1b`. **The segment letter records a corpus defect. It is not a claim that the printed text divides this verse.**

Pinned as `KNOWN_DUPLICATE_VERSE`, a fourth inventory on the same terms as the other three: a repeated verse number at any unpinned ref is fatal.

#### `<alt>` anchoring

`<alt>` marks the span of printed text a marginal variant reading applies to; the note supplies the alternative:

```
are you not <na>[1]</na> <alt>men</alt>?     notes: [{label:"1", text:"<i>carnal</i>"}]
```

It is New Testament only (21 books, 106 spans). It normally follows its marker, but not always:

| Position | Count |
|---|---|
| directly after `<na>` | 101 |
| directly after `<cr>` | 4 |
| directly *before* `<na>` | 1 |

So `<alt>` binds to the **nearest adjacent marker on either side**, and that marker may be a `<cr>`. A rule that only looks backwards for `<na>` misses five cases.

### Book codes: the composite-book rule

Four places in the ODR carry a book that USFM also publishes in split form. One rule settles all of them:

> **Ship the composite the source actually has.** Where the corpus presents one book, emit one file under the code that denotes that composite. Never split a book into the pieces USFM offers for translations that print them separately, because that invents a structure the ODR does not have.

| Book | ODR chapters | What the extra chapters are | Code | Rejected |
|---|---|---|---|---|
| `esther` | 16 | 11–16 are the Greek additions | `ESG` | `EST` (Hebrew Esther) |
| `daniel` | 14 | 13 is Susanna, 14 is Bel | `DAG` | `DAN` (Hebrew Daniel) |
| `baruch` | 6 | 6 is the Letter of Jeremiah | `BAR` | `BAR`+`LJE` split |
| `4-esdras` | 16 | 1–2 preface, 15–16 conclusion | `2ES` | `EZA`+`5EZ`+`6EZ` split |

The registry supports each directly: Daniel "has a Hebrew version (DAN) and a longer Greek LXX version (DAG)", Esther likewise "a Hebrew version (EST) and a Greek version (ESG)", and `BAR` "notes differences in chapter counts … and mentions that the Letter of Jeremiah (LJE) is treated separately".

### Esdras book codes

The ODR follows Vulgate numbering, so its four Esdras books are not the four a modern reader expects. The USFM registry (`ubsicap/usfm`, `docs/identification/books.rst`) names the Vulgate equivalences directly, which decides every case:

| slug | ODR name | Chapters | USFM | Paratext № |
|---|---|---|---|---|
| `1-esdras` | 1 Esdras | 10 | `EZR` | 15 |
| `2-esdras` | 2 Esdras | 13 | `NEH` | 16 |
| `3-esdras` | 3 Esdras | 9 | `1ES` | 82 |
| `4-esdras` | 4 Esdras | 16 | `2ES` | 83 |
| `prayer-of-manasses` | Prayer of Manasses | 1 | `MAN` | 84 |

The registry entries, quoted:

- `1ES` — "The 9 chapter book of Greek Ezra in the LXX … called '3 Esdras' in the Vulgate"
- `2ES` — "The 16 chapter book of Latin Esdras … called '4 Esdras' in the Vulgate; for the 12 chapter Apocalypse of Ezra use `EZA`"
- `EZR` — "for Hebrew Ezra, sometimes called 1 Ezra or 1 Esdras"
- `NEH` — "called 2 Esdras in the Vulgate"

**`EZA`/`5EZ`/`6EZ` are rejected.** They are not an alternative spelling of the same book. `EZA` is the 12-chapter Ezra Apocalypse alone, `5EZ` the 2-chapter Latin preface, `6EZ` the 2-chapter Latin conclusion — three codes for translations that publish the pieces as separate books. The corpus does not: `4-esdras.json` is one 16-chapter book whose chapter 1 opens "The second Book of Esdras the Prophet, the son of Sarei…" (the preface), whose chapter 3 opens the apocalypse, and whose chapter 15 begins the conclusion. That composite is precisely what `2ES` denotes. Splitting it would ship three files where the source has one book and invent a structure the ODR does not have.

`SCHEMA.md` carries this table and the reasoning, so a consumer expecting `EZA` understands why it is absent.

### Filename ordering

USFM filenames are `<NN>-<CODE>.usfm`, where **`NN` is the book's position in the ODR canon (01–76), not its Paratext number.**

Paratext numbers the deuterocanon from 68 upward, so Tobias, Judith, Wisdom, Ecclesiasticus, Baruch, and the Machabees would all sort *after* Revelation, and the three appendix books after those. That is not the order the ODR prints, and a bundle named for the ODR should list its books in the ODR's own order. The Paratext number is recorded in `manifest.json` for consumers who want it.

Under this scheme the appendix books land at 47–49, immediately after Malachie and before Matthew, which is where the ODR puts them.

## Architecture

Two modules, following the convention `odr-lemma-lib.ts:1-4` sets — pure helpers kept apart from their script so tests import them without running a build.

**`scripts/export-lib.ts`** — pure, no `fs`:
- markup tokenizer, and `stripMarkup(tagged) → raw`
- `parseMarkers(tagContent) → token[]`, handling `[1]`, `(a)`, `◦`, and multi-token tags
- `bindNotes(text, notes, kind)` implementing the resolution rule, with the known-defect list
- `renderUsfm(book, { includeAnnotations })`
- book title/code resolution with the `books.ts` fallback
- manifest counting

The tokenizer is **context-aware**: which tags are legal, and which array a marker resolves against, both depend on whether it is reading a verse, a summary, or a prose block. That context is a parameter, not a guess.

**`scripts/build-export-bundle.ts`** — all I/O. Reads the corpus, writes the tree. Flags: `--out <dir>` (default `dist-export/`, gitignored), `--only <book>` for iteration.

One source read; four derived serializations of the verse text (`bible/raw/`, `usfm/`, `usfm-study/`, and the tagged canonical form itself), plus two verbatim copies (`annotations/`, `reference/`) and one derived index.

This is the design's central property: the bundle stores the corpus several times over, and that redundancy is safe only because a single run derives every copy. Hand-maintained, it would drift — which is how the published bundle went stale in the first place.

## Output Tree

```
manifest.json               schema version, generated date, source commit, counts
SCHEMA.md                   markup vocabulary, USFM mapping, book-code choices
LICENSE                     CC0 1.0
bible/tagged/<book>.json    CANONICAL — markup preserved, cross_refs, notes
bible/raw/<book>.json       derived — markup stripped, notes/refs kept structured
usfm/<NN-BBB>.usfm          derived — \f + \x only (v1-compatible)
usfm-study/<NN-BBB>.usfm    derived — the same, plus \ef annotations
annotations/<book>/<NNN>.json   1,677 annotations, 397 files
reference/{ot,nt}/*.json    26 files from static/data/reference/odr/, verbatim
index/lemmas/<book>.json    derived — catchword spans, with match tier
```

### Why `index/lemmas/` is separate

`lemmas` is `[start, length, part]` where start/length are character offsets into the *tagged* text, markup included (`odr-lemma-lib.ts:18-22`), produced by fuzzy catchword matching across five confidence tiers down to `'partial'`.

It is derived (`build-odr-lemmas.ts:68` deletes and regenerates it wholesale), it is coupled to markup byte offsets so any tag edit silently invalidates it, and it carries a confidence tier that inlining into verse objects would flatten into apparent fact. Separating it keeps `bible/tagged/` changing only when the text changes, and lets a consumer filter on `tier`.

`SCHEMA.md` must state that these offsets are valid only against `bible/tagged/`.

**Accepted inconsistency:** `has_annotation` is already an inline derived flag in the published verse objects. It stays there for compatibility. The schema is not pure and the spec says so rather than pretending otherwise.

### Why the USFM trees are split

v1's `usfm/` is text + `\f` + `\x`. Adding `\ef` annotations inline would force every existing consumer to strip 3,609 note blocks to get back what they had, and roughly triples the file size. Splitting preserves v1 consumers and serves study consumers separately. It also matches UBS's own model, where study content is a distinct Paratext project rather than a layer inside the translation.

Both trees are one `renderUsfm()` call differing by the `includeAnnotations` flag, so they cannot diverge.

## USFM Mapping

| Source | USFM |
|---|---|
| `book_title`, else `books.ts` `odrName` | `\h`, `\toc1-3`, `\mt1` |
| `intros[]` | `\is` + `\ip` |
| `endMatters[]` | `\is` + `\ip`, emitted after the last chapter |
| `chapters[].summary` | `\cd` |
| `summary_notes[]` | `\f + \ft …\f*` on the `\cd` |
| `chapters[].articles` | `\is` heading + `\ip` |
| `<sc>…</sc>` | `\sc …\sc*` in body text, `\+sc …\+sc*` inside a note |
| `<i>…</i>` | `\it …\it*` in body text, `\+it …\+it*` inside a note |
| `<br>`, and `\n\n` in prose | end the `\ip`, open a new one |
| `<col-left>`, `<col-right>` | flattened to sequential text |
| `<cr>…</cr>` + its `cross_refs` entry | `\x - \xt …\x*` inline at the marker |
| verse `notes[]` (`label`) | `\f <label> \fr c.v \ft …\f*`, reusing the original token |
| `<alt>…</alt>` | body text kept plain; the span becomes `\fq` inside the bound note |
| annotations (`usfm-study/` only) | `\ef - \fr c.v \fq <title> \ft <text>\ef*` |

`<alt>` needs no invented body-text marker. USFM already models "the words this note is about" as `\fq` *inside* the note, which is exactly what `<alt>` encodes:

```usfm
are you not \f 1 \fr 3.4 \fq men \ft \+it carnal\+it*\f* ?
```

The span stays legible in the body, and the association survives in the form USFM was designed for. Note the `\+it`: a footnote is a character environment, so any character marker inside one takes the `\+` prefix on both the opening and the closing form. Body text takes the bare form. This is the rule stated below for `\+nd`, and it applies to every character marker this export emits.

`\eft` does not exist. USFM 3.0 deliberately avoided minting parallel content markers for study notes: `\ef` reuses the ordinary footnote content markers (`\fr`, `\fq`, `\fk`, `\ft`). Confirmed against the spec, not assumed.

**Prose paragraphs are lost inside notes.** `\n\n` breaks occur 278 times, and where they fall inside an annotation or a note body, USFM has no legal paragraph marker within a note. They collapse to a space there, and survive only in intro/article/endMatter prose, which renders as real `\ip` paragraphs. This is the same containment limit as the sub-notes, and it lands the same way: JSON is canonical, USFM is a projection.

### Annotation sub-notes: the flattening

**USFM notes cannot nest.** The spec permits nested *character* markers inside notes via the `\+` prefix (`\fk the \+nd Lord\+nd*`), but there is no legal way to place an `\f` or `\ef` inside another. In the spec's own examples `\ef` and `\f` are always siblings.

The corpus has two levels of apparatus, and exactly two: 3,609 sub-notes inside 1,677 annotation texts, addressed by 3,603 `<mn>` markers (the six-note gap being part of the 26 unreferenced notes catalogued above). The format has no representation for this. Rather than misrepresent it, flatten explicitly:

```usfm
\ef - \fr 1.1: \fq In the beginning. \ft Holy Moyses telleth what was done¹
… he could not believe the Gospel² … \fq ¹ \ft S. Aug. l. 11. de Gen. ad lit.
c. 4. \fq ² \ft Contra Epist. Fund. c. 5.\ef*
```

Each `<mn>` marker becomes a Unicode superscript at its original character position; sub-notes follow as a trailing `\fq`/`\ft` run inside the same `\ef`. Position, text, and association all survive. Structural containment does not — a parser sees one flat note.

The superscript is derived from the note's *ordinal within its annotation*, not from the marker token, because the token may be `[1]`, `(a)`, or `◦` and the `◦` form carries no number to render.

Therefore: **`bible/tagged/` and `annotations/` are canonical and lossless; `usfm-study/` is a faithful-but-flattened projection.** `SCHEMA.md` states this. The flattening lives in one function with its own test.

Note that annotations attach at *verse* granularity via an exact `verse` field, so `\ef` placement is exact. The fuzzy catchword matching is only needed for intra-verse highlighting, which is why it stays quarantined in `index/lemmas/`.

## Error Handling

The export fails loudly rather than emitting damaged output. Fatal conditions:

- a marker that does not bind under the resolution rule **and is not on the known-defect list**
- a note never referenced from its text, likewise not on that list
- an unknown tag surviving the tokenizer
- `<mn>` found in a verse, or `<na>` found in an intro, article, or annotation
- a book slug with no USFM code in the map
- a lemma span out of bounds for its tagged text

The known-defect list is the 28 cases enumerated above, held as explicit refs in `export-lib.ts`. Encoding them as data rather than as a tolerant matcher is the point: a tolerant matcher would absorb the next defect silently, whereas an exact list makes any new one fail the build. If a listed defect is ever repaired in the corpus, its entry going unused is itself an error, so the list cannot rot.

Silent degradation is what let the published bundle drift. A dangling `\x` is worse than a failed build.

## Testing

Unit tests on the pure lib: markup round-trips, nesting (`<sc>` inside `<i>`), stripper idempotence, superscript flattening, and each fatal condition above raising. Marker parsing gets its own cases per form — `[1]`, `(a)`, `◦`, and the multi-token `(c)[1]` — plus the `◦` positional fallback against an array mixing `"◦"` with numbers.

**`scripts/export.corpus.test.ts`** — a whole-corpus invariant test, mirroring the precedent set by `odr-lemmas.corpus.test.ts`. Across all 76 books it asserts the measured numbers directly, so any drift fails:

| Invariant | Expected |
|---|---|
| markers binding under the resolution rule | 13,606 of 13,608 |
| unbound markers | exactly the 2 listed defects |
| unreferenced notes | exactly the 26 listed |
| `<mn>` in verse text, `<na>` in prose blocks | 0 |
| tags outside the nine-tag vocabulary | 0 |
| unbalanced tags (open ≠ close), `<br>` excepted | 0 |
| chapters repeating a verse number | exactly the 1 listed |
| marker tags inside a note body | 0 |
| `<alt>` spans, each adjacent to a marker | 106 |
| lemma spans out of bounds | 0 |
| `<` surviving into `bible/raw/` | 0 |

Asserting exact counts rather than "no errors" is deliberate. A tolerant assertion passes just as happily when a book stops being read at all.

The lemma-bounds check is the one that catches a future text pass silently invalidating offsets.

## Download Page Changes

`src/routes/download/+page.svelte:63-98`:

- annotation count 1,707 → **1,677**
- add `usfm-study/` and `index/lemmas/` bullets; describe the `usfm/` split
- `reference/` — "26 JSON files" is still accurate, leave it
- licence copy unchanged, since ODR-only keeps CC0 true

The counts become readable from `manifest.json`, so future drift is mechanically catchable rather than discovered years later.

## Delivery

The distribution repo is not on this machine and network access is sandboxed, so this work produces `dist-export/` locally for the user to review and move across. Regenerating the repo in place is a follow-up once it is cloned.

## Out of Scope

- Restructuring the published layout (a v2 bundle). v1's real defect is redundancy, and scripting the export fixes redundancy without breaking paths.
- Shipping Vulgate text, textual notes, or the glossary.
- Deleting or reformatting anything in `static/data/odr/` beyond the duplicate already removed. Per `odr-corpus-json.ts:1-9`, the corpus is a deliberate mix of minified and indented files and must not be reformatted.
