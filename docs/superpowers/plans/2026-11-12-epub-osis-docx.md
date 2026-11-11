# EPUB, OSIS and DOCX exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build verse-only and study editions of EPUB 3, OSIS 2.1.1 and DOCX, whole Bible plus per book, and publish them as release assets v3.1, v3.2, v3.3.

**Architecture:** Three new pure-renderer libraries under `scripts/` that consume `BookOut` (verse-only, from `verse-only-lib.ts`) or `Book` plus annotations (study, from `export-lib.ts`). EPUB and DOCX render Pandoc Markdown and call `pandoc`; OSIS is hand-written XML. `build-export-bundle.ts` writes the results under `verse-only/{epub,osis,docx}/` and `study/{epub,osis,docx}/`.

**Tech Stack:** TypeScript (tsx), vitest, Pandoc 3, sharp, xmllint, epubcheck (jar in scratch dir), OSIS 2.1.1 XSD.

**Spec:** `docs/superpowers/specs/2026-11-12-epub-osis-docx-design.md` (website repo)

## Global Constraints

- Reuse `tokenize`, `bindMarkers`, `assertOnlyKnownDefects` from `export-lib.ts` and `toVerseBook` from `verse-only-lib.ts`. No second markup parser.
- No new runtime dependency for the site; build-time tools only.
- No em dashes, no "not X but Y", no words like delve, profound, remarkable, observe, "note that" in any generated front matter, README, release text or page copy.
- One cover on every file: `static/images/dr-1582-rheims.webp` converted to JPEG with sharp.
- Corpus has 76 books (spec says 77 in one count; `BOOK_CODES` is authoritative).
- Binding errors stop the build in study editions.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. No force pushes. Leave the user's unrelated uncommitted files alone.

## Review Focus

- Verse with repeated number (`part` b, c): label must stay unique (`osisID` and DOCX/EPUB anchors).
- Books with no chapter summary or no intro (study): no empty headings or empty notes.
- Tobias preface (chapter 0) and verse-0 summary overflow: absent from verse-only, present once in study.
- Characters that break XML or Markdown (`&`, `<`, `*`, `_`, `[`) in verse text: escaped correctly in OSIS and Pandoc input.
- Nested `<i>` inside `<sc>`: valid output in all three formats.

## Task 1: Shared pieces (cover, OSIS book table, tool setup)

**Files:** Create `scripts/odr-books-osis.ts`, `scripts/odr-books-osis.test.ts`, `scripts/make-cover.ts`. Scratch dir holds epubcheck and XSD.

**Interfaces:** Produces `osisId(slug: string): string`; `makeCover(outJpg: string): Promise<void>`.

- [ ] Test: `osisId('genesis') === 'Gen'`, `osisId('apocalypse'-style slug for Revelation) === 'Rev'`, every `ALL_BOOKS` slug returns a non-empty unique id.
- [ ] Implement the table (OSIS names for the 66 shared books, `BOOK_CODES` usfm code for the rest).
- [ ] Implement `makeCover` with sharp (webp to JPEG, quality 90).
- [ ] Download epubcheck release and osisCore.2.1.1.xsd into the scratch dir; verify both run.
- [ ] Run `npx vitest run scripts`; commit.

## Task 2: Verse-only EPUB (release v3.1)

**Files:** Create `scripts/epub-lib.ts`, `scripts/epub-lib.test.ts`, `scripts/assets/epub.css`. Modify `scripts/build-export-bundle.ts`.

**Interfaces:** Produces `renderEpubMarkdown(b: BookOut, opts): string` (Pandoc Markdown, superscript verse numbers, one paragraph per chapter, `<i>` to `*..*`, `<sc>` to `[..]{.smallcaps}`); `buildEpub(markdown: string, meta: {title, cover}, outPath): void` (calls pandoc `-t epub3 --toc --split-level`); whole-Bible variant adds the title page from `reference/odr/*/title-page.json`.

- [ ] Tests: output contains `^1^`, no `<na>`/`<cr>`/summary text, escapes `*` and `_`, repeated-verse labels stay unique.
- [ ] Implement, wire into bundle under `verse-only/epub/` (per-book zip plus whole-Bible file).
- [ ] Validate: epubcheck on whole Bible and every book file, zero errors; leak check script greps verse-only output for apparatus.
- [ ] Run `npx vitest run scripts`; commit and push website repo.
- [ ] Data repo: build bundle, copy asset zips, update README rows and `src/routes/download/+page.svelte`, commit and push both, `gh release create v3.1` with assets.

## Task 3: Verse-only OSIS (release v3.2, part 1)

**Files:** Create `scripts/osis-lib.ts`, `scripts/osis-lib.test.ts`.

**Interfaces:** Produces `renderOsis(parts: OsisPart[], opts): string`. Structure: `osis/osisText/header/work`, `div type="book" osisID`, `chapter osisID="Gen.1"`, `verse osisID="Gen.1.1"` as containers (a repeated verse number gets `Gen.1.1!b`), `hi type="italic"`, `hi type="small-caps"`. Whole Bible uses `div type="bookGroup"` per testament.

- [ ] Tests: ids, escaping of `&` and `<`, italic and small-caps mapping, well-formed XML via a parse.
- [ ] Implement; wire into bundle under `verse-only/osis/`.
- [ ] Validate every file with `xmllint --noout --schema osisCore.2.1.1.xsd`.

## Task 4: Verse-only DOCX (release v3.2, part 2)

**Files:** Create `scripts/docx-lib.ts`, `scripts/docx-lib.test.ts`, `scripts/assets/make-reference-docx.ts` producing `scripts/assets/reference.docx` (Heading 1/2/3, body style, title page).

**Interfaces:** Produces `renderDocxMarkdown(b: BookOut, opts): string` (reuses Task 2 renderer) and `buildDocx(markdown, meta, outPath): void` (pandoc `--reference-doc`, `--toc`, cover on title page).

- [ ] Tests: heading levels testament > book > chapter, cover referenced.
- [ ] Implement, wire under `verse-only/docx/`.
- [ ] Validate: `unzip -t`, `xmllint --noout word/document.xml`, LibreOffice headless convert if installed.
- [ ] Run `npx vitest run scripts`; commit and push; release v3.2 (README rows, download page, assets).

## Task 5: Study editions (release v3.3)

**Files:** Modify `epub-lib.ts`, `osis-lib.ts`, `docx-lib.ts` and their tests; modify `build-export-bundle.ts`.

**Interfaces:** Consumes `Book`, annotations per chapter, `bindMarkers`, `assertOnlyKnownDefects`, `renderAnnotation`. Produces `renderStudy*` functions per format: book intro, chapter summary, `mn`/`cr` as footnotes (Pandoc `[^n]`), annotations after their verse, articles, end matter, reference documents (prefaces, tables, glossary) as front and back matter. OSIS: `note type="study"`, `note`, `note type="crossReference"` with `reference`, `div type="introduction"`, `div type="summary"`.

- [ ] Tests: footnote count equals bound marker count; unknown binding defect throws `ExportError`; a book with no intro emits none; Tobias preface appears once.
- [ ] Implement, wire under `study/{epub,osis,docx}/`.
- [ ] Validate all three formats as above; confirm study files contain the apparatus and verse-only files still do not.
- [ ] Run `npx vitest run scripts`; commit and push; release v3.3 (README rows, download page, assets).
