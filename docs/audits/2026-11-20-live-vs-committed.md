# Live Wikisource vs committed pages (2026-11-20)

Read-only fetch of all 451 `Page:1582_Rhemes_New_Testament.pdf/1-451` revisions, compared with
`wikisource/1582-rhemes-nt/pages/` at `janvier-s/odr-wikisource` 494f0400 (text compared after
`wikipost.norm`, which ignores the `pagequality` tag; fidelity via `scripts/wikisource/fidelity.py`).

**Verdict: committed == live on all 451 pages.** No text drift and no fidelity findings. The committed pages
are the published truth that Phase 1 reconciles the generator against.

- Identical text: 451 / 451
- Manifest `revid` ≠ live revid: 1 page. Page 266: manifest 16474655, live 16475295 by ShakespeareFan00, text identical apart from the `pagequality` tag or trailing whitespace, which `norm` ignores. Record the new revid when the manifest is next touched.
- Latest live revision by someone other than the bot (Sokonok): 6 pages, all with text equal to ours:

| Page | Live revid | Date | Live status |
|---|---|---|---|
| 18 | 16472136 | 2026-11-18 | level 1 |
| 22 | 16473148 | 2026-11-19 | level 3 |
| 243 | 16475115 | 2026-11-19 | level 1 |
| 266 | 16475295 | 2026-11-19 | level 1 |
| 407 | 16475098 | 2026-11-19 | level 1 |
| 408 | 16475099 | 2026-11-19 | level 1 |

- Live page-status levels across the 451 pages: level 1: 434, level 3: 17. `wikipost.py` keeps the live level and user (`preserve_pagequality`).

Fetch note: the first unpaced run of `wikifetch.py 1-451` got HTTP 429. A paced re-run (25 pages per request, 3 s apart,
backoff on 429) succeeded. Phase 3's `rh fetch` should pace and back off like that.
