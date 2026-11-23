# Book status: 1582 Rhemes NT on Wikisource

State on 2026-11-21. Update it by hand when a book's state changes.

- **Checked:** the data (`odr-original`, and `odr` for content) was read against the 1582 scans and fixed.
- **Generated:** `rh.py generate` writes the pages, and a golden test (`books.json` `golden: true`) holds them byte for byte.
- **Proofread:** a person read the pages against the scan (Wikisource level 3 or more, with a named proofreader).
- **Posted:** the live page equals `pages/<n>.wiki` (`manifest.json` `status: posted`).

| Pages   | Book or part                                | Checked against the scans                  | Generated   | Proofread | Posted           |
| ------- | ------------------------------------------- | ------------------------------------------ | ----------- | --------- | ---------------- |
| 1–30    | Front matter                                | XML audited against the scans (NT repo)    | no (frozen) | 15 of 30  | yes (2026-11-21) |
| 31–113  | Matthew                                     | yes (2026-11-17)                           | yes, golden | no        | yes (2026-11-21) |
| 114–160 | Mark (Argument 114)                         | yes (2026-11-18)                           | yes, golden | no        | yes (2026-11-21) |
| 161–241 | Luke (Argument 161)                         | yes (2026-11-19)                           | yes, golden | no        | yes (2026-11-21) |
| 242–308 | John (Argument 242)                         | yes (2026-11-19)                           | yes, golden | no        | yes (2026-11-21) |
| 309–313 | Tables (Evangelical History)                | XML audited (NT repo)                      | no (frozen) | no        | yes (2026-11-21) |
| 314–401 | Acts (Argument 314–316)                     | partial: NT-wide passes, Phase 1 reconcile | yes, golden | no        | yes (2026-11-21) |
| 402–404 | Tables after Acts                           | XML audited (NT repo)                      | no (frozen) | no        | yes (2026-11-21) |
| 405–451 | Romans (Epistles' Argument and own 405–409) | partial: NT-wide passes, Phase 1 reconcile | yes, golden | no        | yes (2026-11-21) |
| 452–496 | 1 Corinthians (Argument 452)                | yes (2026-11-23)                           | yes, golden | no        | yes (2026-11-23) |
| 497–521 | 2 Corinthians                               | yes (2026-11-23)                           | yes, golden | no        | yes (2026-11-23) |
| 522–539 | Galatians (Argument 522)                    | yes (2026-11-23)                           | yes, golden | no        | yes (2026-11-23) |
| 540–552 | Ephesians (Argument 540)                    | yes (2026-11-23)                           | yes, golden | no        | yes (2026-11-23) |
| 553–562 | Philippians (Argument 553)                  | yes (2026-11-23)                           | yes, golden | no        | yes (2026-11-23) |
| 563–572 | Colossians (Argument 563)                   | yes (2026-11-24)                           | yes, golden | no        | yes (2026-11-24) |
| 573–    | 1 Thessalonians to the Apocalypse           | partial: NT-wide passes                    | no          | no        | no               |

The NT-wide passes fixed one class of error across the whole NT without reading each book in full: variant readings, lectionary notes (vpon → vpō), annotation margin notes, and a few one-offs.

History: the per-book rounds for Matthew to John are in [docs/audits/2026-11-17-books-log.md](../../docs/audits/2026-11-17-books-log.md), and the reconciliation of all six books in [docs/audits/2026-11-21-phase1-reconcile.md](../../docs/audits/2026-11-21-phase1-reconcile.md). Open items are listed at the end of [RULES.md](RULES.md#open-items).
