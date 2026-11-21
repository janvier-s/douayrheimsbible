# Deleted Wikisource scripts

Deleted in Phase 5 of the Wikisource pipeline refactor (owner, 2026-11-21: one-off scripts are deleted, not archived). Git history keeps each one; restore it with `git show <commit>:scripts/wikisource/<name>.py`. The pipeline now runs through `python3 -I scripts/wikisource/rh.py` (`wikisource/1582-rhemes-nt/PLAYBOOK.md`).

| Script | Last commit | What it did | Replaced by |
| --- | --- | --- | --- |
| `scripts/wikisource/backfill_front_xml.py` | e2078fc4 (2026-11-19) | Wrote the front-matter audit's readings into `A16049.xml` | XML entries in `fixes/front.jsonl`; `test_xml_ledger_replays_history` |
| `scripts/wikisource/backfill_matthew_xml.py` | 00c03647 (2026-11-19) | Wrote Matthew's scan readings into `A16049.xml` | XML entries in `fixes/matthew.jsonl`; same test |
| `scripts/wikisource/backfill_mark_xml.py` | 765ce6b8 (2026-11-19) | Wrote Mark's scan readings into `A16049.xml` | XML entries in `fixes/mark.jsonl`; same test |
| `scripts/wikisource/backfill_luke_xml.py` | b2c6edae (2026-11-19) | Wrote Luke's scan readings into `A16049.xml` | XML entries in `fixes/luke.jsonl`; same test |
| `scripts/wikisource/backfill_john_xml.py` | 392bc00c (2026-11-19) | Wrote John's scan readings into `A16049.xml` | XML entries in `fixes/john.jsonl`; same test |
| `scripts/wikisource/fix_microfilm_duplicates.py` | 43ef5017 (2026-11-19) | Removed the 50 microfilm-duplicate `<gap>` stubs from `A16049.xml` and listed them in `<back>` | XML entries; same test |
| `scripts/wikisource/apply_wordfixes.py` | a6a5d953 (2026-11-18) | Word fixes read on the scans (Luke, John) in odr-original and odr | JSON entries "applied in b2c6edae / 98229fd0" (John 19:17a1 now at 19:15a1); `test_json_entries_replay_history`; `rh.py fix apply` |
| `scripts/wikisource/fix_john_argument.py` | 392bc00c (2026-11-19) | John's Argument as printed (first pass) | JSON entries "applied in 392bc00c"; same test |
| `scripts/wikisource/fix_john_argument2.py` | 6247b7af (2026-11-19) | John's Argument margin notes as printed | JSON entries "applied in 6247b7af"; same test |
| `scripts/wikisource/fix_john_argument3.py` | f87d3353 (2026-11-19) | John's Argument letter keys a/b/c | JSON entries "applied in f87d3353"; same test |
