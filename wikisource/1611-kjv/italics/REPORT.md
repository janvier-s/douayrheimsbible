# KJV 1611 Wikisource — supplied-word italics (posted 2026-11-22)

## What this is

Our `static/data/kjv-1611/*.json` marks supplied words with `<i>…</i>`, taken
from the source site's italics. The Wikisource 1611 edition represents the same
print feature with `{{smaller|…}}`. Many verses on the Wikisource pages already
have that markup; a small number are missing it.

This batch adds the missing `{{smaller|…}}` markup for the verses that were
part of the bulk triage (the `proverbs`, `john`, `philemon`, `hebrewes`,
`thessalonians` and `obadiah` sections).

## Changes (14 supplied-word marks in 13 replacements)

| Page         | Verse         | Live                           | Draft                                              |
| ------------ | ------------- | ------------------------------ | -------------------------------------------------- |
| `011.pdf/59` | Proverbs 1:5  | `A wiſe man wil heare`         | `A wiſe {{smaller\|man}} wil heare`                |
| `021.pdf/55` | John 1:6      | `name was Iohn`                | `name {{smaller\|was}} Iohn`                       |
| `021.pdf/55` | John 1:7      | `all men through him`          | `all {{smaller\|men}} through him`                 |
| `021.pdf/55` | John 1:9      | `That was the true light`      | `{{smaller\|That}} was the true light`             |
| `021.pdf/55` | John 1:17     | `Moſes, but grace`             | `Moſes, {{smaller\|but}} grace`                    |
| `021.pdf/55` | John 1:18     | `declared him.`                | `declared {{smaller\|him}}.`                       |
| `024.pdf/4`  | 1 Thess 1:1   | `{{smaller\|which is}} in God` | `{{smaller\|which is}} {{smaller\|in}} God`        |
| `024.pdf/19` | Philemon 1:1  | `Timothie our brother`         | `Timothie {{smaller\|our}} brother`                |
| `024.pdf/19` | Philemon 1:2  | `to our beloued Apphia`        | `to {{smaller\|our}} beloued Apphia`               |
| `024.pdf/19` | Philemon 1:9  | `beſeech thee, being`          | `beſeech {{smaller\|thee}}, being`                 |
| `024.pdf/19` | Philemon 1:19 | `written it … repay it:`       | `written {{smaller\|it}} … repay {{smaller\|it}}:` |
| `024.pdf/20` | Hebrews 1:3   | `brightneſſe of his glory`     | `brightneſſe of {{smaller\|his}} glory`            |
| `024.pdf/20` | Hebrews 2:1   | `let them ſlip`                | `let {{smaller\|them}} ſlip`                       |

Verses whose italics are **already** present on Wikisource were left untouched
(e.g. Proverbs 1:7/1:9/1:18/1:19/1:21, John 1:8/1:12, Hebrews 1:2/1:8/1:9,
Philemon 1:18, Obadiah 1:3).

## Drafts

The `.wiki` files are exact proposed replacements, based on **current live**
wikitext (not the stale triage cache), each differing from its base only by the
insertions above. Base revisions:

- `Page-BibleKJV1611-011.pdf-59.wiki` — rev 16482048
- `Page-BibleKJV1611-021.pdf-55.wiki` — rev 13152429
- `Page-BibleKJV1611-024.pdf-19.wiki` — rev 16482015
- `Page-BibleKJV1611-024.pdf-20.wiki` — rev 16482051
- `Page-BibleKJV1611-024.pdf-4.wiki` — rev 16482052

## Posted

All five edits were made under `Sokonok@douayrheims` with the summary
"Proofread: restore 1611 supplied-word italics (KJV 1611)", each guarded by its
live revid and verified byte-for-byte against the draft afterwards.

| Page                      | Revision                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BibleKJV1611-011.pdf/59` | [rev 16482111](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-011.pdf/59&oldid=16482111) |
| `BibleKJV1611-021.pdf/55` | [rev 16482112](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-021.pdf/55&oldid=16482112) |
| `BibleKJV1611-024.pdf/19` | [rev 16482113](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/19&oldid=16482113) |
| `BibleKJV1611-024.pdf/20` | [rev 16482114](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/20&oldid=16482114) |
| `BibleKJV1611-024.pdf/4`  | [rev 16482115](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/4&oldid=16482115)  |

Quality levels and all other text were left unchanged.

## Remaining work

A broader verse-level sweep of all 150 `Page:` files found at least **228 more**
missing italic marks on section-less continuation pages (Genesis 109, Esther 26,
Philippians 23, Colossians 19, John, Proverbs, Psalms, Acts, Obadiah,
Revelation, Matthew, Philemon, Romans and 2 Thessalonians). That batch needs its
own drafts and review before any posting.
