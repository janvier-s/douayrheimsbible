# EPUB, OSIS and DOCX exports (verse-only and study)

## Intent

The data bundle ships JSON, USFM, Markdown, text, CSV and SQLite. Readers who
want the Bible on an e-reader, in Word, or in Bible software (SWORD, Xiphos,
Logos-style importers) have no ready file. This adds three formats, each in two
editions, for the whole Bible and for each book, published as release assets.

## Goals

- EPUB 3, DOCX and OSIS 2.1.1 files, each as a **verse-only** and a **study** edition.
- Whole-Bible file plus one file per book, per format and edition (3 x 2 x 77 = 462 files, packaged as zips of per-book files plus the whole-Bible file).
- Navigation: EPUB nav and NCX table of contents (testament > book > chapter), DOCX heading styles plus a real Word TOC field, OSIS `div` structure with `osisID` on books, chapters and verses.
- Cover: the existing 1582 title-page scan (`static/images/dr-1582-rheims.webp`, converted to JPEG with sharp) on every EPUB and as the DOCX title page. Whole-Bible files also reproduce the transcribed title page from `reference/odr/*/title-page.json`.
- Study edition adds what the printed volume carries: book introductions, chapter summaries ("arguments"), marginal notes and cross-references as real footnotes, the extended annotations after their verse, articles, end matter, and the reference documents (prefaces, tables, glossary) as front and back matter.
- Output is valid: EPUB passes epubcheck, DOCX opens in Word and LibreOffice, OSIS validates against osisCore 2.1.1.

## Non-goals

- Typeset PDF (Typst) and groff output. Separate later work.
- Per-book generated artwork. One cover only.
- Changing any corpus data. The exporters only read it.
- Reflowing or modernising the text.

## Anti-goals

- Any apparatus leaking into a verse-only file (markers, notes, summaries). The same leak check as the existing verse-only tree applies.
- Study files that silently drop notes. Binding errors stop the build, as in `export-lib.ts`.

## Constraints

- Reuse `export-lib.ts` (`tokenize`, `bindMarkers`, `assertOnlyKnownDefects`) and `verse-only-lib.ts`. Do not add a second parser for the markup.
- Written in TypeScript under `scripts/`, run from `build-export-bundle.ts` (one command builds everything).
- No new runtime dependency for the site. Build-time tools only.
- Em dashes and "not X but Y" are banned in all generated front matter, README and release text.

## Decisions made with the owner

- Cover: the single 1582 title-page image.
- Editions: verse-only and study for each format.
- Packaging: whole Bible plus per-book files.

## Calls I made (change any of them)

- **EPUB and DOCX are produced through Pandoc** (already installed, 3.x), from Pandoc Markdown that our code renders. This gives real EPUB 3 packaging and real Word footnotes and a TOC field without hand-writing OOXML. Our code owns the content and structure; Pandoc owns the container. Styles come from a project `epub.css` and `reference.docx`.
- **OSIS is hand-generated XML**, since no tool does this well. Verse-only uses `<verse osisID>` milestones inside `<chapter>` and `<div type="book">`. Study adds `<note type="study">` for annotations, `<note>` for marginal notes, `<note type="crossReference">` with `<reference>` for cross-references, and `<div type="introduction">` / `<div type="summary">` blocks.
- Italics (`<i>`) become `<hi type="italic">`, small caps `<hi type="small-caps">`; kept in EPUB, DOCX and OSIS, in both editions.
- Whole-Bible EPUB and DOCX are large (study DOCX may exceed 30 MB). Release assets are fine for that; no repo commits.
- Verse numbers in EPUB and DOCX are superscript, in a flowing paragraph per chapter for prose books and one line per verse for the Psalms and other verse-per-line books if the corpus marks them. If not marked, one paragraph per chapter throughout.
- Book identifiers follow `BOOK_CODES` (the existing USFM mapping); OSIS ids use the OSIS names for the 66 shared books and the ODR codes for the rest, listed in one table in the code.
- Validation: `epubcheck` via a downloaded jar for EPUB, `xmllint --schema` with the CrossWire osisCore 2.1.1 XSD for OSIS, a unit-level check that every DOCX opens through `unzip` and `xmllint` on `document.xml`, plus a LibreOffice headless convert if available.
- Delivery order: (1) verse-only EPUB, (2) verse-only OSIS and DOCX, (3) study editions of each. Each step is released separately as v3.1, v3.2, v3.3.

## Open for the builder

Exact CSS and DOCX style choices, file naming inside the zips, how the study
edition orders front matter, and the OSIS book-name table.
