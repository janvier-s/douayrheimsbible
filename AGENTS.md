# AGENTS.md — Workspace Guidelines for AI Agents

This repository (`douayrheimsbible`) contains both the SvelteKit web application for the Douay-Rheims Bible and the tooling/transcription pipeline for the 1582 Rhemes New Testament on Wikisource.

---

## 1. Wikisource 1582 Rhemes New Testament Guidelines

All wikitext pages live under `wikisource/1582-rhemes-nt/pages/` and are tracked in `manifest.json`.

### Table Styling & Dark Mode Rules (CRITICAL)

MediaWiki's Vector 2022 night mode stylesheet includes an aggressive selector:

```css
html.skin-theme-clientpref-night .mw-parser-output [style*='background'] {
	color: #202122;
}
```

Any element with `background` anywhere in its inline `style` attribute matches and forces text to `#202122` (dark charcoal), causing unreadable dark text on dark backgrounds.

1. **Never use `background` in inline styles**:
   - DO NOT write `background: transparent;`, `background: none;`, or any background color in `{|`, `|-`, or `|` style tags.
   - HTML tables and cells are transparent by default. Omit the `background` property entirely.
2. **Never use `!` (`<th>`) for table headers**:
   - `!` emits HTML `<th>`, which triggers default user-agent and MediaWiki theme cell borders and dark/light shading that clashes in dark mode.
   - Use standard table cells `|` (`<td>`) with bold wikitext instead:
     ```wikitext
     | style='width: 35px; text-align: right; padding-right: 8px;' | '''Mt.'''
     ```
3. **Standard Table Container**:
   ```wikitext
   {| style='border-collapse: collapse; border: none; width: 100%;'
   ```
4. **Pre-flight Linter Enforcement**:
   - Every page must pass `scripts/wikisource/lint.py` with **0 errors**.
   - `lint.py` automatically enforces rule `E-darkmode` (flags any `background` style or `!` header within tables).

---

### Auditing Against the Source

- Check text and layout against the Transkribus OCR exports first, because they are cheap to read:
  - Text: `/Users/Janvier/facsimiles/transkribus/pages/.../pdf*.txt`
  - Word coordinates & layout: `/Users/Janvier/facsimiles/transkribus/pages/.../pdf*.tsv`
- When the OCR cannot settle a reading (macron/stroke marks, `w` vs `vv`, long-s), crop the word from the facsimile using the TSV boxes, collage the crops into one image and look at it. Prefer one collage per batch over many single-image reads.
- Do not trust EEBO-TCP transcription (`A16049.xml`) blindly: EEBO typists frequently dropped lines (homoeoteleuton), misread Renaissance contractions/abbreviations, and introduced typist errors.

---

### Orthography & Transcription Standards

1. **Long `s` (`ſ`) & Renaissance Orthography**:
   - Preserved throughout the entire work (never modernize `ſ` to modern `s`).
   - **Wikisource (`.wiki`)**: Use `{{ls}}` for long-s (`ſ`), `{{ls}}{{ls}}` for double long-s (`ſſ`), and `{{ls}}s` for `ſs` (displays as long-s in Page namespace; renders as modern `s` on transclusion for searchability).
   - **Master TEI XML (`A16049.xml`)**: Preserve literal Unicode long-s `ſ` (`U+017F`) throughout.
   - Retain 1582 print distribution of `u`/`v`, `vv`/`w`, macrons/titlos (`cōmaunded`, `vpō`), and ligatures (`æ`, `œ`, `&c.`).
2. **Unicode NFC Normalization**:
   - All text must be normalized to Unicode NFC (canonical decomposition followed by canonical composition). MediaWiki enforces NFC upon save; non-NFC text causes checksum mismatches.
3. **Typography & Layout**:
   - Preserve Renaissance roman/italic distinctions.
   - Use standard `†` marks following verse numbers (except verse 1).
   - No double quotes `"` in the body text (the 1582 print does not use them).
   - Running heads and footers must use `{{rh|...}}` and `{{continues|...}}` templates.

---

### Publication Workflow

1. Regenerate pages using `scripts/wikisource/generate.py`.
2. Run linter:
   ```bash
   python3 scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages
   ```
   **Must output 0 errors.**
3. Post pages live using `scripts/wikisource/wikipost.py`:
   ```bash
   python3 scripts/wikisource/wikipost.py START-END
   ```
4. Update and commit `manifest.json` with the newly assigned MediaWiki revision IDs (`revid`).

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
