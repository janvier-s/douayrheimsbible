# Notes & Cross-Refs Gaps

Audit of `static/data/odr/` verse data. Verses where `<na>` or `<cr>` anchors appear in text but the corresponding array is empty or missing entries.

---

## Notes — empty `notes[]`

All 35 entries below were populated from screenshots on 2026-05-20.

| Book | Ch | V | Markers | Status |
|------|----|---|---------|--------|
| 1-kings | 8 | 18 | `(c)[1]` | ✅ fixed |
| 1-paralipomenon | 21 | 1 | `(a)[1]` | ✅ fixed |
| 2-machabees | 2 | 20 | `[1]` `(d)` | ✅ fixed |
| 2-paralipomenon | 35 | 1 | `(a)[1]` | ✅ fixed |
| amos | 1 | 2 | `[1]` | ✅ fixed |
| amos | 9 | 11 | `(e)[1]` | ✅ fixed |
| ecclesiastes | 5 | 3 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 16 | 15 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 18 | 22 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 23 | 30 | `(k)[1]` | ✅ fixed |
| ecclesiasticus | 28 | 2 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 35 | 1 | `(a)[1]` | ✅ fixed |
| ecclesiasticus | 35 | 6 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 38 | 9 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 38 | 17 | `(c)[1]` | ✅ fixed |
| ecclesiasticus | 44 | 17 | `(c)[1]` | ✅ fixed |
| ecclesiasticus | 44 | 20 | `(d)[1]` | ✅ fixed |
| ecclesiasticus | 46 | 23 | `(e)[1]` | ✅ fixed |
| ecclesiasticus | 47 | 22 | `(d)[1]` | ✅ fixed |
| ecclesiasticus | 48 | 14 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 49 | 16 | `(b)[1]` | ✅ fixed |
| ecclesiasticus | 50 | 1 | `(a)[1]` | ✅ fixed |
| genesis | 2 | 22 | `(c)[1]` | ✅ fixed |
| genesis | 6 | 9 | `(c)[1]` | ✅ fixed |
| genesis | 6 | 22 | `(d)[1]` | ✅ fixed |
| genesis | 21 | 12 | `(b)[1]` | ✅ fixed |
| habacuc | 2 | 1 | `(a)[1]` | ✅ fixed |
| josue | 24 | 32 | `(e)[1]` | ✅ fixed |
| lamentations | 3 | 23 | `[1]` `(f)` | ✅ fixed |
| lamentations | 3 | 47 | `[1]` `(l)` | ✅ fixed |
| malachie | 3 | 14 | `(g)[1]` | ✅ fixed |
| tobias | 0 | 1 | `[1]` | ✅ fixed |
| wisdom | 3 | 2 | `(b)[1]` | ✅ fixed |
| wisdom | 6 | 4 | `(a)[1]` | ✅ fixed |
| wisdom | 8 | 9 | `(b)[1]` | ✅ fixed |
| wisdom | 10 | 10 | `(h)[1]` | ✅ fixed |

**Excluded as normal:** `ecclesiasticus 14:10` (`(†)` dagger marker — no note expected)

---

## Notes — misaligned markers

Pattern: combined label `(m n)` in source with `(n)↑` (back-reference); data had only the second marker. First marker added with the shared note text.

| Book | Ch | V | Action | Status |
|------|----|---|--------|--------|
| apocalypse | 3 | 14 | Added `[2]` = "Ecclesiastici 24, 9. 14. Col. 1, 15." | ✅ fixed |
| esther | 12 | 6 | Fixed truncated `(a)` text; added `[1]` = "ch. 3. v. 1." | ✅ fixed |
| malachie | 4 | 5 | Prepended `(b)` + `[1]` before existing `(c)` | ✅ fixed |
| psalms | 1 | 1 | Prepended `(a)` + `[1]` before existing `(b)(c)(d)` | ✅ fixed |
| psalms | 34 | 15 | Prepended `(o)` before existing `(p)(q)(r)` | ✅ fixed |
| psalms | 41 | 3 | Prepended `(d)` before existing `(e)(f)` | ✅ fixed |
| psalms | 49 | 1 | Added `(b)` after existing `(a)` | ✅ fixed |
| psalms | 56 | 10 | Prepended `(m)` before existing `(n)` | ✅ fixed |
| psalms | 77 | 51 | Added `(b)` after existing `(a)` | ✅ fixed |
| psalms | 89 | 10 | Prepended `(l)` before existing `(m)(n)` | ✅ fixed |
| psalms | 98 | 6 | Added `[1]` + `(g)` after existing `(f)` | ✅ fixed |
| psalms | 104 | 23 | Added `[1]` = "Gen 46." after existing `(h)` | ✅ fixed |
| psalms | 105 | 1 | Added `[1]` = "Judith 13. v. 21." after existing `(a)` | ✅ fixed |
| psalms | 115 | 3 | Prepended `(e)` before existing `(f)` | ✅ fixed |
| psalms | 124 | 5 | Fixed truncated `(e)` text; added `(f)` | ✅ fixed |

**Excluded as normal:** `genesis 16:6` (marker `[7]` — no note expected beyond existing 1–6)

---

## Cross-refs — `<cr>` tag mismatch

| Book | Ch | V | Issue | Status |
|------|----|---|-------|--------|
| 2-thessalonians | 2 | 17 | Text had `<cr>[1]</cr>` but note was in `notes[]` not `cross_refs[]` — changed to `<na>[1]</na>` | ✅ fixed |
