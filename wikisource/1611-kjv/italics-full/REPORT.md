# KJV 1611 Wikisource — full italics sweep (posted 2026-11-22)

## Method

Every one of the 150 `Page:BibleKJV1611-*.pdf/*` wikitext files was matched
verse-by-verse against `static/data/kjv-1611/*.json` (long-s and `⁊`/`&`
normalised). For each local `<i>…</i>` span, the corresponding live words were
located by token alignment and wrapped in `{{smaller|…}}` — the convention the
1611 Wikisource edition already uses for supplied words. Words already wrapped
were skipped. Multi-word spans are wrapped word-by-word, which renders the same.

## Scope

- **48 pages**, **252 insertions** (individual marks).
- 344 italics were already present on the live pages and were left untouched.
- 4 candidates could not be matched to a live verse and were omitted.
- The five pages from the earlier italics batch are excluded; page `024.pdf/4`
  appears only for its Colossians 4 section, which was not touched earlier.

## By book

| Book | Marks |
|---|---:|
| `genesis` | 231 |
| `esther` | 91 |
| `philippians` | 41 |
| `colossians` | 32 |
| `psalms` | 22 |
| `proverbs` | 20 |
| `apocalypse` | 14 |
| `abdias` | 12 |
| `matthew` | 7 |
| `john` | 5 |
| `acts` | 4 |
| `1-corinthians` | 2 |
| `1-paralipomenon` | 1 |
| `romans` | 1 |
| `2-thessalonians` | 1 |

## By page

| Page | Marks | Revision |
|---|---:|---:|
| `BibleKJV1611-002.pdf/1` | 2 | 14667899 |
| `BibleKJV1611-002.pdf/10` | 3 | 14861682 |
| `BibleKJV1611-002.pdf/11` | 1 | 11485606 |
| `BibleKJV1611-002.pdf/12` | 17 | 11485617 |
| `BibleKJV1611-002.pdf/13` | 12 | 11485627 |
| `BibleKJV1611-002.pdf/14` | 3 | 11485638 |
| `BibleKJV1611-002.pdf/15` | 6 | 11485639 |
| `BibleKJV1611-002.pdf/16` | 6 | 11485640 |
| `BibleKJV1611-002.pdf/17` | 5 | 14675689 |
| `BibleKJV1611-002.pdf/18` | 1 | 14674490 |
| `BibleKJV1611-002.pdf/19` | 11 | 14675770 |
| `BibleKJV1611-002.pdf/2` | 4 | 11123978 |
| `BibleKJV1611-002.pdf/20` | 5 | 14675897 |
| `BibleKJV1611-002.pdf/3` | 2 | 11123979 |
| `BibleKJV1611-002.pdf/4` | 2 | 11301360 |
| `BibleKJV1611-002.pdf/48` | 14 | 10959274 |
| `BibleKJV1611-002.pdf/5` | 2 | 11123980 |
| `BibleKJV1611-002.pdf/6` | 4 | 14861613 |
| `BibleKJV1611-002.pdf/7` | 7 | 14861628 |
| `BibleKJV1611-002.pdf/9` | 4 | 14861675 |
| `BibleKJV1611-003.pdf/1` | 11 | 15942900 |
| `BibleKJV1611-010.pdf/11` | 3 | 11519637 |
| `BibleKJV1611-010.pdf/12` | 5 | 11493147 |
| `BibleKJV1611-010.pdf/13` | 5 | 11493152 |
| `BibleKJV1611-010.pdf/14` | 2 | 11519653 |
| `BibleKJV1611-010.pdf/15` | 3 | 11493160 |
| `BibleKJV1611-010.pdf/16` | 4 | 11541382 |
| `BibleKJV1611-010.pdf/17` | 9 | 14468294 |
| `BibleKJV1611-010.pdf/19` | 4 | 11493169 |
| `BibleKJV1611-010.pdf/51` | 2 | 13211237 |
| `BibleKJV1611-010.pdf/52` | 1 | 12675248 |
| `BibleKJV1611-010.pdf/53` | 1 | 12759469 |
| `BibleKJV1611-011.pdf/60` | 3 | 11925151 |
| `BibleKJV1611-011.pdf/61` | 3 | 9054547 |
| `BibleKJV1611-016.pdf/17` | 10 | 10959451 |
| `BibleKJV1611-020.pdf/22` | 4 | 14668028 |
| `BibleKJV1611-020.pdf/27` | 4 | 9014544 |
| `BibleKJV1611-021.pdf/57` | 5 | 11485692 |
| `BibleKJV1611-023.pdf/1` | 4 | 6303655 |
| `BibleKJV1611-023.pdf/56` | 9 | 12786615 |
| `BibleKJV1611-023.pdf/57` | 4 | 11925179 |
| `BibleKJV1611-023.pdf/58` | 7 | 11925199 |
| `BibleKJV1611-023.pdf/59` | 5 | 11925207 |
| `BibleKJV1611-024.pdf/1` | 7 | 12786041 |
| `BibleKJV1611-024.pdf/2` | 2 | 11711477 |
| `BibleKJV1611-024.pdf/3` | 9 | 11711529 |
| `BibleKJV1611-024.pdf/4` | 5 | 16482115 |
| `BibleKJV1611-024.pdf/66` | 10 | 11605846 |

## Posted

All 48 edits were made under `Sokonok@douayrheims` with the summary
"Proofread: restore 1611 supplied-word italics (KJV 1611)", each guarded by its
live revid. All 48 pages were verified byte-for-byte against their drafts after
posting. Quality levels and all other text were left unchanged.
