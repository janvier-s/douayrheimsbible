# AGENTS.md — Workspace Guidelines for AI Agents

This repository (`douayrheimsbible`) contains both the SvelteKit web application for the Douay-Rheims Bible and the tooling/transcription pipeline for the 1582 Rhemes New Testament on Wikisource.

---

## 1. Wikisource: 1582 Rhemes New Testament

The pipeline in `scripts/wikisource/` generates the pages in `wikisource/1582-rhemes-nt/pages/` from `static/data/odr-original` for [Index:1582_Rhemes_New_Testament.pdf](https://en.wikisource.org/wiki/Index:1582_Rhemes_New_Testament.pdf). Read these before you change anything:

- [`wikisource/1582-rhemes-nt/RULES.md`](wikisource/1582-rhemes-nt/RULES.md) says what is allowed: transcription, typography, page conventions, posting. It is the authority.
- [`wikisource/1582-rhemes-nt/PLAYBOOK.md`](wikisource/1582-rhemes-nt/PLAYBOOK.md) says how: sources, the evidence ladder, the `reconcile.py` loop, checking a book against the scans, posting.
- [`wikisource/1582-rhemes-nt/BOOKS.md`](wikisource/1582-rhemes-nt/BOOKS.md) gives the status of each book.

Hard rules:

1. **The print wins.** Never modernise ſ, vv, u/v, macrons, ligatures, italics or small caps. `odr-original` and the pages keep the print's misprints; only `odr` is corrected.
2. **Never edit a generated page.** Fix the data or the generator and regenerate. Only the frozen pages (`source: frozen` in `manifest.json`) are edited by hand.
3. **Never reduce fidelity silently.** `E-loss`/`E-shift` mean a print feature was lost: fix the cause. Override only for a decided change, with `--allow-loss`/`--allow-shift FEATURE:SCOPE --reason "…"`, and put the reason in the commit message.
4. **Never post to Wikisource without the owner's approval**, and never revert another editor's change (RULES §7).
5. **Before each commit**, run `python3 -m pytest -q scripts/wikisource/tests` and `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (0 errors).
6. Scripts run as `python3 -I`, text is NFC, and data JSON is written only through `jsonfmt.write_like()` while holding `.git/odr-data.lock`.
7. Read the XML and the OCR before the scans; scans cost the most tokens and are the last resort.

---

## 2. Web Application Guidelines (SvelteKit / Cloudflare)

### Tech Stack

- **SvelteKit 2** + **Svelte 5**
- **Tailwind CSS 3**
- **TypeScript**
- **Cloudflare Pages** + **Cloudflare Workers** (KV store for MiniSearch)

### Svelte 5 Conventions

- Use Svelte 5 runes (`$state()`, `$derived()`, `$props()`, `$effect()`).
- Use standard event attributes (`onclick`, `onmouseover`), never legacy `on:click`.
- Existing shared state in `src/lib/stores/` deliberately uses Svelte 4 stores (`writable`). Do not convert shared stores to runes unless requested.
- Build and verification commands:
  ```bash
  npm run check   # svelte-check + tsc
  npm run test    # vitest
  npm run lint    # eslint + prettier
  ```
