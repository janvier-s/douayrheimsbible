# Wikisource Publishing Protocol (1582 Rhemes NT)

Moved from `RULES.md` in [original-douay-rheims-nt](https://github.com/janvier-s/original-douay-rheims-nt), which now covers only the text and its TEI encoding. Script and manifest paths below are relative to this repository and may change with the Wikisource pipeline refactor.

All automated publishing via `scripts/wikisource/wikipost.py` must adhere strictly to Wikimedia bot and proofreading policies:

1. **Pre-Publish Linting**:
   - Always run `python3 scripts/wikisource/lint.py <pages_dir>` first.
   - Zero errors (`0 error(s)`) is required. Warnings should be reviewed.
2. **Protection of Human Edits**:
   - The bot checks `last_author` on every page.
   - If another user edited the page, the bot will skip it.
   - Inspect their edits manually against the 1582 scans. If their improvements are valid or our audit encompasses them, pass `--adopt-others <page_numbers>` explicitly.
3. **Rate Limiting**:
   - Use `--delay 12` (minimum 12 seconds between page edits) to prevent HTTP 429 throttling and respect Wikimedia API guidelines.
4. **Descriptive Edit Summaries**:
   - Include specific descriptions of changes made (e.g. `audit against 1582 print: restore margin notes, polytonic Greek, fix hws title, NFC`).
5. **Manifest Tracking**:
   - Every published page must have its SHA1, live `revid`, and status `posted` updated in `wikisource/1582-rhemes-nt/manifest.json`.
