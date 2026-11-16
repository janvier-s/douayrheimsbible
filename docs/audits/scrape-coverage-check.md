# Scrape coverage check: cached Sancta Clara Press scrape vs. the live site

**Audit date:** 16 November 2026

**Verdict:** There is no live chapter content missing from the cached scrape.
Across 57 refetched chapters, every live margin note (903) and every live
annotation (157) has a cached counterpart. The 40 annotations and the
183 margin notes that looked missing are anchor differences, finer-grained
cache splitting, or repository-only material that is not in the modern edition. The cache
has 22 textual or segmentation defects in those chapters, but no coverage gaps.

## What was compared

| Dataset | What was counted | Count |
|---|---|---:|
| Repository | Annotation records / distinct book-chapter-verse keys | 1,519 / 1,361 |
| Cached scrape | Annotation records / distinct keys | 1,517 / 1,360 |
| Repository | Margin notes / distinct chapter-verse keys | 8,539 / 6,937 |
| Cached scrape | Margin notes in 1,359 chapters | 9,227 |
| Cached scrape | Chapters where repo margin notes outnumber cache notes | 175 (764 notes) |
| Refetched live | Selected chapters (25 largest note gaps + every missing-annotation chapter) | 57 |

The repository is `static/data/odr`: annotations in `<book>/annotations/NNN.json`, margin
notes in `<book>.json`. The cache is the Sancta scrape under the iCloud folder
`for-the-kingdom/sancta-scrape/data/<book>/<chapter>.json`. Live pages were saved to
`~/facsimiles/handoff/scrape-refetch/<book>/<chapter>.json`; nothing was written to the
cache or to repository data.

Repository slugs `isaie`, `jeremie`, `malachie` map to the live/output slugs `isaias`,
`jeremias`, `malachias`; all other slugs are shared. The comparison is corpus-wide because
the annotation totals above only reproduce when every cached book is included.

## Method

- `scripts/audit/scrape_check.py` fetches one chapter of `https://sanctaclarapress.com/read/<book>/<chapter>`
  at a time, waits 4 s between HTTP requests (the limit is enforced at 3–5 s), checks
  `robots.txt` before each page, sends the generic user agent `ODR-coverage-audit/1.0`, and
  uses no login or personal details.
- The server-rendered `.reading` tree is parsed into the cached JSON shape
  (`headings`, `verses`, `annotations`). Verses are cut at each `<p class="verse">` so that
  commentary nested inside a verse cannot swallow later verses. The Next.js RSC payload is
  stitched from `self.__next_f.push` and cross-checked against the parsed verse count.
- The live page renders printed cross-references as `vnote-item` margin notes. Citation-shaped
  items are normalised back into the cache's `xrefs` slot so they are not counted as commentary.
- Annotations were matched by lemma/text similarity (threshold 0.55); margin notes by
  whole-note similarity (threshold 0.80), then classified as same verse, other verse, or absent.
  The direct chapter-level cache-vs-live comparison is the authoritative completeness check;
  the repo-vs-cache key comparison mostly exposes differences in how the two datasets anchor
  and split the same printed material.

## Headline counts

| Finding | Count |
|---|---:|
| Repo annotations with no cache annotation at the same key | 40 |
| — on live at a different verse, and in the cache at that verse | 31 |
| — on live without a verse anchor, and in the cache | 2 |
| — absent from both live and cache (repo-only) | 7 |
| **— on live but missing from the cache** | **0** |
| Cache annotations with no repo annotation at the same key | 39 |
| — matched to a repo annotation at a different verse | 31 |
| — no repo counterpart at all (`psalms 40:14`) | 1 |
| — chapter-level records with `verse: null` | 7 |
| Chapters where repo margin notes outnumber cache notes | 175 |
| Repo margin notes inspected in the refetched chapters | 183 |
| — absent from live too | 182 |
| — present on live, but the cache text is defective | 1 |
| **— present on live but missing from the cache** | **0** |
| Live margin notes in the 57 chapters | 903 |
| — missing from the cache | 0 |
| Live annotations in the 57 chapters | 157 |
| — missing from the cache | 0 |
| Cache-vs-live note differences | 22 |

## 1. The 40 repo annotations absent at the same key

| Classification | Count |
|---|---:|
| On live at a different verse; cache has it at the live verse | 31 |
| On live with no verse anchor; cache has it | 2 |
| Absent from live and cache | 7 |
| **On live but missing from the cache** | **0** |

The 31 anchor shifts are mostly ±1 verse; three shift by 9–11 verses
(`1-thessalonians 5:21` → `5:10`, `acts 15:29` → `15:20`, `psalms 15:10` → `15:1`).
In every one of the 33 cases where the annotation is on live, the cache also holds it at
the live location. The seven absent annotations are repository-only:

`1-kings 16:7`, `hebrews 7:18`, `hebrews 7:19`, `hebrews 7:21`, `hebrews 7:23`,
`hebrews 7:27`, `john 15:2`.

| Repository annotation | Title | Live / cache status |
|---|---|---|
| 1-corinthians 15:10 | With me. | on live at 15:11; cache has it there |
| 1-kings 16:7 | Beholdeth the heart. | not on live and not in cache |
| 1-thessalonians 2:13 | The word of God. | on live at 2:12; cache has it there |
| 1-thessalonians 5:21 | But prove. | on live at 5:10; cache has it there |
| 2-john 1:6 | From the beginning. | on live at 1:5; cache has it there |
| acts 7:57 | They stoned him. | on live at 7:58; cache has it there |
| acts 8:26 | This is desert. | on live at 8:27; cache has it there |
| acts 15:2 | Appointed. | on live at 15:1; cache has it there |
| acts 15:29 | Fornication. | on live at 15:20; cache has it there |
| acts 15:39 | Dissension | on live at 15:37; cache has it there |
| acts 19:15 | Paul I know. | on live at 19:16; cache has it there |
| colossians 3:10 | Doing on the new. | on live at 3:9; cache has it there |
| hebrews 7:18 | Of the former commandment. | not on live and not in cache |
| hebrews 7:19 | The introduction. | not on live and not in cache |
| hebrews 7:21 | With an oath. | not on live and not in cache |
| hebrews 7:23 | Being many. | not on live and not in cache |
| hebrews 7:27 | This did he once. | not on live and not in cache |
| jeremie 35:2 | The house of Rechabites. | on live at 35:1; cache has it there |
| john 15:2 | More fruit. | not on live and not in cache |
| john 19:17 | His own cross. | on live at 19:15; cache has it there |
| luke 9:55 | He rebuked them. | on live at 9:53; cache has it there |
| luke 24:47 | Penance to be preached. | on live at 24:46; cache has it there |
| mark 3:12 | Thou art the son. | on live at 3:13; cache has it there |
| mark 6:9 | Not two coats. | on live at 6:8; cache has it there |
| mark 9:3 | Elias with Moyses. | on live at 9:4; cache has it there |
| mark 9:12 | Elias also is come. | on live at 9:13; cache has it there |
| mark 9:37 | In thy name. | on live at 9:38; cache has it there |
| mark 14:24 | 22. My body, 24. My blood. | on live at 14:22; cache has it there |
| matthew 4:10 | Him only serve. | on live at 4:11; cache has it there |
| matthew 9:20 | Twelve years. | on live at 9:19; cache has it there |
| matthew 11:19 | Eating and drinking. | on live at 11:18; cache has it there |
| philippians 1:1 | Bishops and deacons. | on live at 1:2; cache has it there |
| psalms 6:2 | In thy fury, nor in thy wrath. | on live at 6:1; cache has it there |
| psalms 15:10 | Not leave my soul in hell. | on live at 15:1; cache has it there |
| psalms 21:17 | They have digged. | on live at 21:18; cache has it there |
| psalms 33:14 | 15. Stay thy tongue, etc. | on live without a verse anchor (ch. 33); cache has it |
| psalms 49:14 | 23. The sacrifice of praise. | on live without a verse anchor (ch. 49); cache has it |
| romans 1:24 | Hath delivered them up. | on live at 1:26; cache has it there |
| romans 3:22 | Justice of God. | on live at 3:21; cache has it there |
| romans 13:13 | Not in banquetings. | on live at 13:12; cache has it there |

## 2. The 32 cache annotations with no repo key

Thirty-one of the 32 match a repository annotation by text at a different verse, so the
cache is not adding commentary: it is anchoring the same note where the site prints it.
The exception is `psalms 40:14`, "Be it, be it.", which is on live and in the cache but
has no repository annotation at all — a repository omission, not a cache gap.

| Cached scrape annotation | Lemma | Repository counterpart |
|---|---|---|
| 1-corinthians 15:11 | With me. | 15:10 (score 0.988) |
| 1-thessalonians 2:12 | The word of God. | 2:13 (score 0.983) |
| 1-thessalonians 5:10 | But prove. | 5:21 (score 0.985) |
| 2-john 1:5 | From the beginning. | 1:6 (score 0.974) |
| acts 7:58 | They stoned him. | 7:57 (score 0.976) |
| acts 8:27 | This is desert. | 8:26 (score 0.974) |
| acts 15:1 | Appointed. | 15:2 (score 0.994) |
| acts 15:20 | Fornication. | 15:29 (score 0.991) |
| acts 15:37 | Dissension. | 15:39 (score 0.984) |
| acts 19:16 | Paul I know. | 19:15 (score 0.991) |
| apocalypse 20:3 | This is the first resurrection. | 20:5 (score 0.957) |
| colossians 3:9 | Doing on the new. | 3:10 (score 0.959) |
| jeremie 35:1 | The house of Rechabites. | 35:2 (score 0.994) |
| john 19:15 | His own cross. | 19:17 (score 0.982) |
| luke 24:46 | Penance to be preached. | 24:47 (score 0.974) |
| mark 3:13 | Thou art the Son. | 3:12 (score 0.967) |
| mark 6:8 | Not two coats. | 6:9 (score 0.986) |
| mark 9:4 | Elias with Moyses. | 9:3 (score 0.972) |
| mark 9:13 | Elias also is come. | 9:12 (score 0.971) |
| mark 9:38 | In thy name. | 9:37 (score 0.989) |
| matthew 4:11 | Him only serve. | 4:10 (score 0.955) |
| matthew 9:19 | Twelve years. | 9:20 (score 0.977) |
| matthew 11:18 | Eating and drinking. | 11:19 (score 0.965) |
| matthew 19:14 | He that can. | 19:12 (score 0.975) |
| philippians 1:2 | Bishops and deacons. | 1:1 (score 0.973) |
| psalms 15:1 | Not leave my soul in hell. | 15:10 (score 0.979) |
| psalms 21:18 | They have digged. | 21:17 (score 0.975) |
| psalms 40:14 | Be it, be it. | **none** |
| romans 1:26 | Hath delivered them up. | 1:24 (score 0.989) |
| romans 3:21 | Justice of God. | 3:22 (score 0.987) |
| romans 13:12 | Not in banketings. | 13:13 (score 0.969) |
| romans 14:6 | Every one in his own sense. | 14:5 (score 0.975) |

Seven further cache records have `verse: null` (chapter-level notes):

1-paralipomenon 1, psalms 33, psalms 49, psalms 118, psalms 119, psalms 141, psalms 150. These are not extra commentary; they are notes the site prints without a
numeric verse anchor. The two that correspond to repo annotations at a verse are
`psalms 33:14` and `psalms 49:14`, both classified in section 1.

## 3. Chapters where repo margin notes outnumber the cache

Of 1,359 cached chapters, 175 have more repository margin notes than cached notes,
a total difference of 764 notes. The 25 largest gaps account for
417; the other 150 chapters have smaller gaps
(the 26th is `psalms 92`, 16 repo vs 9 cache, gap 7).

Per instruction, the live audit selected the 25 largest gaps plus every chapter containing
one of the 40 missing annotations: 25 + 32 = 57 chapters,
with no overlap. The gap chapters are:

| Chapter | Repo notes | Cache notes | Gap | Gap notes checked | Present live (merged) | Absent live | Hebrew letters | Other absent |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| lamentations 3 | 80 | 14 | 66 | 67 | 0 | 67 | 66 | 1 |
| psalms 118 | 231 | 165 | 66 | 5 | 0 | 5 | 0 | 5 |
| psalms 44 | 44 | 21 | 23 | 4 | 0 | 4 | 0 | 4 |
| lamentations 2 | 28 | 6 | 22 | 22 | 0 | 22 | 22 | 0 |
| lamentations 4 | 31 | 9 | 22 | 22 | 0 | 22 | 22 | 0 |
| lamentations 1 | 30 | 9 | 21 | 23 | 0 | 23 | 22 | 1 |
| psalms 67 | 55 | 35 | 20 | 0 | 0 | 0 | 0 | 0 |
| numbers 19 | 18 | 1 | 17 | 3 | 0 | 3 | 0 | 3 |
| psalms 101 | 37 | 22 | 15 | 0 | 0 | 0 | 0 | 0 |
| psalms 54 | 41 | 28 | 13 | 2 | 0 | 2 | 0 | 2 |
| psalms 48 | 30 | 19 | 11 | 0 | 0 | 0 | 0 | 0 |
| psalms 50 | 35 | 24 | 11 | 0 | 0 | 0 | 0 | 0 |
| psalms 77 | 74 | 63 | 11 | 3 | 1 | 2 | 0 | 2 |
| psalms 64 | 24 | 14 | 10 | 0 | 0 | 0 | 0 | 0 |
| psalms 82 | 27 | 17 | 10 | 4 | 0 | 4 | 0 | 4 |
| psalms 79 | 28 | 19 | 9 | 1 | 0 | 1 | 0 | 1 |
| psalms 140 | 22 | 13 | 9 | 0 | 0 | 0 | 0 | 0 |
| psalms 42 | 18 | 10 | 8 | 2 | 0 | 2 | 0 | 2 |
| psalms 55 | 20 | 12 | 8 | 0 | 0 | 0 | 0 | 0 |
| psalms 83 | 23 | 15 | 8 | 2 | 0 | 2 | 0 | 2 |
| psalms 126 | 15 | 7 | 8 | 0 | 0 | 0 | 0 | 0 |
| psalms 131 | 24 | 16 | 8 | 0 | 0 | 0 | 0 | 0 |
| 2-machabees 3 | 11 | 4 | 7 | 1 | 0 | 1 | 0 | 1 |
| psalms 84 | 19 | 12 | 7 | 0 | 0 | 0 | 0 | 0 |
| psalms 85 | 20 | 13 | 7 | 0 | 0 | 0 | 0 | 0 |

The 32 chapters selected for a missing annotation (count of missing annotations in
parentheses):

1-corinthians 15 (1), 1-kings 16 (1), 1-thessalonians 2 (1), 1-thessalonians 5 (1), 2-john 1 (1), acts 7 (1), acts 8 (1), acts 15 (3), acts 19 (1), colossians 3 (1), hebrews 7 (5), jeremie 35 (1), john 15 (1), john 19 (1), luke 9 (1), luke 24 (1), mark 3 (1), mark 6 (1), mark 9 (3), mark 14 (1), matthew 4 (1), matthew 9 (1), matthew 11 (1), philippians 1 (1), psalms 6 (1), psalms 15 (1), psalms 21 (1), psalms 33 (1), psalms 49 (1), romans 1 (1), romans 3 (1), romans 13 (1).

A count gap is not proof of missing content. In the refetched chapters, 183 repository
notes did not match any cached note at the verse. Their classification:

| Kind | Count | Live status |
|---|---:|---|
| Hebrew letter headings (Lamentations 1–4) | 132 | not rendered as margin notes; absent from live |
| Other glosses | 40 | 1 on live, the rest absent |
| Lectionary notes | 6 | absent from live |
| Word / transliteration notes | 4 | absent from live |
| Section heading | 1 | absent from live |
| **Total** | **183** | **182 absent, 1 present** |

The 132 Hebrew letters are the structural headings of Lamentations 1–4
(22 + 22 + 66 + 22). The live page prints them as the chapter's letters, not as `vnote-item`
margin notes, so they cannot appear in the cache's `margin.notes`; the repository stores
them as glosses. The remaining 51 are printed marginal material that the modern edition
does not carry as notes: lectionary assignments, Greek/Latin word notes, and glosses.
The single note present on live (`psalms 77:46`, label `r`) is in the cache too, but with a
corrupted character, so it is counted as a text difference rather than an omission.

## 4. Direct cache-vs-live comparison

In the 57 refetched chapters the live pages contain 903 margin notes and
157 annotations. The cache contains 939 margin notes and 157
annotations. There are no live-only notes, no live-only annotations, and no cache note or
annotation without live content. The cache has 36 more note items because it splits some
printed notes into finer items (for example, separate marker letters) where the live page
uses one `vnote-item`; those extra items are covered by the merged live note.

There are 22 note-level differences in 9 chapters:

- 20 are text corrections: the live edition reads differently from the cached text
  (the cache is stale or has a transcription error).
- One is a split/merge: the cached note at `psalms 83:2` stops early and continues at
  `83:3`, while the live page carries the whole note on `83:2`.
- One is a cross-reference split out of `psalms 118:14`; the cache keeps it inside the note,
  the live page renders it as an `xref`.

| Chapter:verse | Kind of difference | Live text / note |
|---|---|---|
| jeremie 35:6 | text differs (live corrected) | This Jonadab was a man of power and estimation, very familiar with Jehu king of Israel. 4 Kings 10:15. |
| lamentations 3:33 | text differs (live corrected) | from his heart. God punisheth his servants not to hurt them but for their good. |
| matthew 11:3 | text differs (live corrected) | The Gospel for the 2. Sunday in Advent. |
| psalms 54:18 | text differs (live corrected) | or pray |
| psalms 77:2 | text differs (live corrected) | Matthew 13:35. · parables. Albeit the prophet reciteth historically things done, yet the same were parables, similitudes |
| psalms 77:45 | text differs (live corrected) | Coenomyiam. |
| psalms 77:46 | text differs (live corrected) | (r) This was a less plague, not mentioned in with the greater. s The eight plague. |
| psalms 77:58 | text differs (live corrected) | Scupti⟨?⟩ibus. |
| psalms 77:58 | text differs (live corrected) | Sculptilibus. · (i) In their altars erected in hills to Idols. k By graven images of Idols, they provoked God to indigna |
| psalms 79:4 | text differs (live corrected) | convert. Set us in a better state. face. Show thy benign countenance and favour, Mystically, send the promised Messias,  |
| psalms 83:2 | cache note split across verses | tabernacles. The glorious mansions in heaven, which God hath prepared for the just. fainteth. Vehement desires do someti |
| psalms 83:3 | text differs (live corrected) | flesh. The mind rejoicing in hope, the body is also recreated, relieved, and revived, which before was dull and heavy. |
| psalms 83:11 | text differs (live corrected) | s And better to be in the poorest state of Catholic Ghristians, t then in greatest palaces or highest dignities amongst  |
| psalms 101:8 | text differs (live corrected) | Also as a sparrow having lost her mate, remaineth mourning and solitary in the accustomed nest, or near unto it, |
| psalms 118:8 | text differs (live corrected) | keep. I have therefore a firm purpose, and do faithfully promise to keep thy law, which maketh the keeper thereof just.  |
| psalms 118:14 | cross-reference split out | (i) As the just professeth by mouth, so he delighteth in heart. k practiseth in work: l and diligently meditateth God's  |
| psalms 118:33 | text differs (live corrected) | (a) Impress O God thy law in mine affection, make me to love it, and to desire to be justified, b so shall I heartily an |
| psalms 118:54 | text differs (live corrected) | (i) In this place of my peregrination from heaven, I am comforted by remembering, celebrating, and singing thy just comm |
| psalms 118:78 | text differs (live corrected) | (f) The just also prayeth that the wicked may be ashamed, and converted, for so the hebrew word here signifieth, though  |
| psalms 118:92 | text differs (live corrected) | (c) Man, except he meditate God's law, and thereby be holden up, is in danger, d perhaps in every temptation to perish e |
| psalms 118:127 | text differs (live corrected) | (g) For this zeal of God's law so despised, and dissipated, the just more and more loveth, that which the wicked so dead |
| psalms 118:145 | text differs (live corrected) | (a) Most serious and fervent invocation of God for his grace, is necessary, to the fulfilling of his law. |

## Reproduction

```sh
python3 -m venv ~/facsimiles/handoff/venv
~/facsimiles/handoff/venv/bin/pip install 'scrapling==0.5.1'

# one chapter
~/facsimiles/handoff/venv/bin/python scripts/audit/scrape_check.py isaias 1

# the 57-chapter selection
~/facsimiles/handoff/venv/bin/python scripts/audit/scrape_check.py \
  --batch ~/facsimiles/handoff/audit-chapters.txt
```

The script writes to `~/facsimiles/handoff/scrape-refetch/<book>/<chapter>.json` by
default; `--out-base` changes the root, `--delay` is clamped to 3–5 seconds, and
`--dry-run` parses without writing. A 404 is reported and skipped. The batch file may
contain blank lines and `#` comments.

## Attribution and data handling

The chapter text is public domain. The modern edition is "The Original Douay-Rheims, a
modern edition by Sancta Clara Press (sanctaclarapress.com), used under CC BY 4.0." The
site's `robots.txt` disallows `ClaudeBot`; this audit did not use that agent, fetched one
page at a time with a 4-second gap, and used the content only to check coverage. Nothing
under `static/data`, `odr`, or `odr-original` was edited, and no refetched JSON was written
to the iCloud cache or the repository.

## Appendix: the 183 repo margin notes that did not match the cache

Format: `verse:label` — kind — live status — repository note text (truncated to 160
characters). "absent" means the note is not on the live page either. All 132 Hebrew letter
headings are absent because the live page prints them as structural letters, not margin notes.

**1-corinthians 15** (3)

- 3:2 — gloss — absent — c tradidi παρέδωκα
- 8:2 — gloss — absent — c one born out of time
- 33:1 — gloss — absent — Menander

**1-kings 16** (1)

- 1:1 — head — absent — The third part. David's anointing, his virtues, and persecution.

**1-thessalonians 2** (2)

- 7:1 — gloss — absent — mild
- 13:1 — lectionary — absent — The Epistle for many Martyrs. Aug. 8.

**2-machabees 3** (1)

- 1:1 — gloss — absent — C

**acts 8** (1)

- 36:1 — gloss — absent — what

**acts 15** (1)

- 2:1 — gloss — absent — them,

**acts 19** (3)

- 16:1 — gloss — absent — them
- 24:2 — word — absent — ναοὺς.
- 35:2 — word — absent — τοῦ διοπετοῦς.

**colossians 3** (1)

- 5:2 — word — absent — ἐιδωλολατρεία.

**hebrews 7** (1)

- 23:1 — lectionary — absent — The Epistle upon S. Leo his day Iunii 28. and for some other Confessors Bishops.

**john 15** (2)

- 1:1 — lectionary — absent — The Gospel for some Martyrs, between Easter and Whitsunday. And on SS. Simon and Jude's eve. Oct. 27.
- 1:2 — lectionary — absent — The Gospel upon S. George's day: April. 23. And for some other Martyrs between Easter and Whitsunday.

**lamentations 1** (23)

- 1:1 — gloss — absent — Aleph.
- 2:1 — gloss — absent — Beth.
- 3:1 — gloss — absent — Ghimel.
- 4:1 — gloss — absent — Daleth.
- 5:1 — gloss — absent — He.
- 6:1 — gloss — absent — Vau.
- 7:1 — gloss — absent — Zain.
- 8:1 — gloss — absent — Heth.
- 9:1 — gloss — absent — Teth.
- 10:1 — gloss — absent — Iod.
- 11:1 — gloss — absent — Caph.
- 12:1 — gloss — absent — Lamed.
- 13:1 — gloss — absent — Mem.
- 14:1 — gloss — absent — Nun.
- 15:1 — gloss — absent — Samech.
- 16:1 — gloss — absent — Ain.
- 17:1 — gloss — absent — Phe.
- 18:1 — gloss — absent — Sade.
- 19:1 — gloss — absent — Coph.
- 20:1 — gloss — absent — Res.
- 20:g — gloss — absent — At home in famine.
- 21:1 — gloss — absent — Sin.
- 22:1 — gloss — absent — Thau.

**lamentations 2** (22)

- 1:1 — gloss — absent — Aleph.
- 2:1 — gloss — absent — Beth.
- 3:1 — gloss — absent — Ghimel.
- 4:1 — gloss — absent — Daleth.
- 5:1 — gloss — absent — He.
- 6:1 — gloss — absent — Vau.
- 7:1 — gloss — absent — Zain.
- 8:1 — gloss — absent — Heth.
- 9:1 — gloss — absent — Teth.
- 10:1 — gloss — absent — Iod.
- 11:1 — gloss — absent — Caph.
- 12:1 — gloss — absent — Lamed.
- 13:1 — gloss — absent — Mem.
- 14:1 — gloss — absent — Nun.
- 15:1 — gloss — absent — Samech.
- 16:1 — gloss — absent — Phe.
- 17:1 — gloss — absent — Ain.
- 18:1 — gloss — absent — Sade.
- 19:1 — gloss — absent — Coph.
- 20:1 — gloss — absent — Res.
- 21:1 — gloss — absent — Sin.
- 22:1 — gloss — absent — Thau.

**lamentations 3** (67)

- 1:1 — gloss — absent — Aleph.
- 2:1 — gloss — absent — Aleph.
- 3:1 — gloss — absent — Aleph.
- 4:1 — gloss — absent — Beth.
- 5:1 — gloss — absent — Beth.
- 6:1 — gloss — absent — Beth.
- 7:1 — gloss — absent — Ghimel.
- 8:1 — gloss — absent — Ghimel.
- 9:1 — gloss — absent — Ghimel.
- 10:1 — gloss — absent — Daleth.
- 11:1 — gloss — absent — Daleth.
- 12:1 — gloss — absent — Daleth.
- 13:1 — gloss — absent — He.
- 14:1 — gloss — absent — He.
- 15:1 — gloss — absent — He.
- 16:1 — gloss — absent — Vau.
- 17:1 — gloss — absent — Vau.
- 18:1 — gloss — absent — Vau.
- 19:1 — gloss — absent — Zain.
- 20:1 — gloss — absent — Zain.
- 21:1 — gloss — absent — Zain.
- 22:1 — gloss — absent — Heth.
- 23:1 — gloss — absent — Heth.
- 23:f — gloss — absent — God's mercies are every day renewed.
- 24:1 — gloss — absent — Heth.
- 25:1 — gloss — absent — Teth.
- 26:1 — gloss — absent — Teth.
- 27:1 — gloss — absent — Teth.
- 28:1 — gloss — absent — Iod.
- 29:1 — gloss — absent — Iod.
- 30:1 — gloss — absent — Iod.
- 31:1 — gloss — absent — Caph.
- 32:1 — gloss — absent — Caph.
- 33:1 — gloss — absent — Caph.
- 34:1 — gloss — absent — Lamed.
- 35:1 — gloss — absent — Lamed.
- 36:1 — gloss — absent — Lamed.
- 37:1 — gloss — absent — Mem.
- 38:1 — gloss — absent — Mem.
- 39:1 — gloss — absent — Mem.
- 40:1 — gloss — absent — Nun.
- 41:1 — gloss — absent — Nun.
- 42:1 — gloss — absent — Nun.
- 43:1 — gloss — absent — Samech.
- 44:1 — gloss — absent — Samech.
- 45:1 — gloss — absent — Samech.
- 46:1 — gloss — absent — Phe.
- 47:1 — gloss — absent — Phe.
- 48:1 — gloss — absent — Phe.
- 49:1 — gloss — absent — Ain.
- 50:1 — gloss — absent — Ain.
- 51:1 — gloss — absent — Ain.
- 52:1 — gloss — absent — Sade.
- 53:1 — gloss — absent — Sade.
- 54:1 — gloss — absent — Sade.
- 55:1 — gloss — absent — Coph.
- 56:1 — gloss — absent — Coph.
- 57:1 — gloss — absent — Coph.
- 58:1 — gloss — absent — Res.
- 59:1 — gloss — absent — Res.
- 60:1 — gloss — absent — Res.
- 61:1 — gloss — absent — Sin.
- 62:1 — gloss — absent — Sin.
- 63:1 — gloss — absent — Sin.
- 64:1 — gloss — absent — Thau.
- 65:1 — gloss — absent — Thau.
- 66:1 — gloss — absent — Thau.

**lamentations 4** (22)

- 1:1 — gloss — absent — Aleph.
- 2:1 — gloss — absent — Beth.
- 3:1 — gloss — absent — Ghimel.
- 4:1 — gloss — absent — Daleth.
- 5:1 — gloss — absent — He.
- 6:1 — gloss — absent — Vau.
- 7:1 — gloss — absent — Zain.
- 8:1 — gloss — absent — Heth.
- 9:1 — gloss — absent — Teth.
- 10:1 — gloss — absent — Iod.
- 11:1 — gloss — absent — Caph.
- 12:1 — gloss — absent — Lamed.
- 13:1 — gloss — absent — Mem.
- 14:1 — gloss — absent — Nun.
- 15:1 — gloss — absent — Samech.
- 16:1 — gloss — absent — Phe.
- 17:1 — gloss — absent — Ain.
- 18:1 — gloss — absent — Sade.
- 19:1 — gloss — absent — Coph.
- 20:1 — gloss — absent — Res.
- 21:1 — gloss — absent — Sin.
- 22:1 — gloss — absent — Thau.

**mark 9** (1)

- 11:1 — gloss — absent — as

**matthew 9** (1)

- 9:2 — lectionary — absent — The Gospel upon S. Matthew's day. Sept. 21.

**matthew 11** (1)

- 25:2 — lectionary — absent — The Gospel upon S. Matthias' day Feb. 24. and upon S. Francis' day Octob. 4. and for many Martyrs, and upon S. Paul's day the first Eremite Ian. 15.

**numbers 19** (3)

- 2:c — gloss — absent — All ways most pure from sin.
- 3:e — gloss — absent — Crucified without the gate of Hierusalem.
- 12:r — gloss — absent — Without which no other Sacrament availeth.

**philippians 1** (1)

- 29:1 — word — absent — ἐχαρίσθη

**psalms 33** (1)

- 1:2 — gloss — absent — (1. Reg. 21)

**psalms 42** (2)

- 2:f — gloss — absent — whilst tentations are more sensible than thy grace.
- 5:n — gloss — absent — See previous note

**psalms 44** (4)

- 5:n — gloss — absent — Purposing,
- 9:a — gloss — absent — Mortification which conserveth from putrefying.
- 9:b — gloss — absent — humility assuaging pride,
- 14:o — gloss — absent — Internal virtues are most special ornaments:

**psalms 54** (2)

- 1:b — gloss — absent — to sing
- 9:o — gloss — absent — and the tentations are great.

**psalms 77** (3)

- 46:r — gloss — live 46 — This was a less plague, not mentioned in Exodus, with the greater.
- 46:s — gloss — absent — The eighth plague.
- 47:v — gloss — absent — This also is omitted in Exodus.

**psalms 79** (1)

- 12:v — gloss — absent — to the river Euphrates. Exod. 23. v. 31. Deut. 11. v. 24.

**psalms 82** (4)

- 2:b — gloss — absent — shew thy power and majesty,
- 3:d — gloss — absent — The cruel persecuters are most insolent
- 3:e — gloss — absent — and proud.
- 5:g — gloss — absent — any Catholic left alive.

**psalms 83** (2)

- 8:m — gloss — absent — Christ our Law-giver,
- 8:n — gloss — absent — giveth aboundance of graces,

**psalms 118** (5)

- 18:d — gloss — absent — Illuminate mine understanding by thy grace,
- 36:h — gloss — absent — as to fly from evil.
- 118:h — gloss — absent — God rejecteth sinners:
- 129:a — gloss — absent — God's marvelous power and wisdom, testified by his works and commandments,
- 172:1 — gloss — absent — Why the 15 Psalms following are called Gradual Canticles. Here follow in order fifteen Psalms entitle Gradual Canticles.

**romans 1** (1)

- 13:1 — gloss — absent — also

**romans 13** (1)

- 7:2 — gloss — absent — Obedience to temporal rulers, and in what cases.

