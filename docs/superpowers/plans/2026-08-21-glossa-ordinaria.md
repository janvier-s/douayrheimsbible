# Glossa Ordinaria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Vulgate reader a study panel containing a single **Glossa** tab with the Latin Glossa Ordinaria, anchored verse by verse.

**Architecture:** A build script converts an external corpus of 1,334 chapter JSONs into per-chapter sidecar files under `static/data/glossa/<slug>/<chapter>.json`, exactly mirroring the existing `haydock-commentary` sidecar. Pure helpers (book map, author sigla, lemma extraction) live in their own module so they are unit-testable without triggering the build. The panel and reader consume the data through a loader function that copies `loadHaydockCommentary` line for line.

**Tech Stack:** SvelteKit 2, Svelte 5 runes (StudyPanel and VerseList are already migrated; match their idiom), TypeScript, tsx for build scripts, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-21-glossa-ordinaria-vulgate-design.md`

## Global Constraints

- **No em dashes** in any code comment, commit message, UI copy, or doc. Use periods, semicolons, colons, or parentheses. Avoid "not X but Y" constructions.
- **Latin stays Latin.** No translation of gloss text. Attributions render as Latin names.
- **Svelte 4 vs 5:** `CLAUDE.md` forbids migrating components to runes. `StudyPanel.svelte` and `VerseList.svelte` are *already* rune-based (`$state`, `$derived`, `$props`, `run()` from `svelte/legacy`). Match each file's existing idiom. Do not migrate anything new.
- **Prettier + ESLint must pass.** Run `npm run lint` before every commit. Tabs for indentation, single quotes, as configured.
- **Build must survive a missing source tree.** Cloudflare has no source corpus. Every source read is wrapped so absence logs and skips.
- **Generated JSON is committed** to git, like every other `static/data/` sidecar.
- Empty-state copy is exactly `Nulla glossa.`
- Anonymous byline is exactly `Glossa`.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/glossa-lib.ts` (create) | Pure helpers only: book map, author table, `normalizeLatin`, `extractLemma`, `expandAuthor`. No fs, no side effects, safe to import from tests. |
| `scripts/build-glossa-data.ts` (create) | Side-effecting build. Reads corpus, validates, writes sidecars. Mirrors `build-fathers-data.ts`. |
| `scripts/prepare-data.ts` (modify) | Dynamic-import the glossa build; add `'glossa'` to the manifest section list. |
| `src/lib/data/loader.ts` (modify) | `GlossaEntry` type and `loadGlossa`. |
| `src/lib/stores/studyPanel.ts` (modify) | Add `'glossa'` to the `StudyTab` union. |
| `src/lib/components/StudyPanel.svelte` (modify) | Tab definition, load block, render block, styles. |
| `src/lib/components/VerseList.svelte` (modify) | Load glossa; add the `vul` branch to `annotatedVerseSet`. |
| `tests/unit/glossa-lib.test.ts` (create) | Covers every pure helper. |
| `tests/unit/loader.test.ts` (modify) | Covers `loadGlossa`. |
| `tests/e2e/glossa.test.ts` (create) | Panel behaviour in a real browser. |

`scripts/glossa-lib.ts` exists separately from the build script for a concrete reason: `scripts/prepare-data.ts` calls `main()` at module load, so anything importable from a test must not live in a script that builds on import. `build-fathers-data.ts` has the same shape and is imported dynamically for the same reason.

---

### Task 1: Pure helpers for the Glossa build

**Files:**
- Create: `scripts/glossa-lib.ts`
- Test: `tests/unit/glossa-lib.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `GLOSSA_BOOK_MAP: Record<string, string>` (source dir name to project slug, 73 entries)
  - `GLOSSA_AUTHORS: Record<string, string>` (siglum to Latin name, 20 entries)
  - `normalizeLatin(s: string): string`
  - `expandAuthor(siglum: string | null | undefined): string | undefined`
  - `extractLemma(text: string, verseText: string): { lemma?: string; body: string }`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/glossa-lib.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	GLOSSA_BOOK_MAP,
	GLOSSA_AUTHORS,
	normalizeLatin,
	expandAuthor,
	extractLemma
} from '../../scripts/glossa-lib.js';

describe('normalizeLatin', () => {
	it('folds case, diacritics, ligatures and j/i', () => {
		expect(normalizeLatin('In principio creavit Deus cælum')).toBe(
			'in principio creauit deus caelum'
		);
		expect(normalizeLatin('Jesus œconomia')).toBe('iesus oeconomia');
	});

	it('reduces punctuation to single spaces', () => {
		expect(normalizeLatin('Dixitque Deus : Fiat lux.')).toBe('dixitque deus fiat lux');
	});
});

describe('expandAuthor', () => {
	it('expands a short siglum', () => {
		expect(expandAuthor('AUG')).toBe('Augustinus');
		expect(expandAuthor('BEDA')).toBe('Beda');
	});

	it('collapses long and short forms of the same Father', () => {
		expect(expandAuthor('AUGUSTINUS')).toBe(expandAuthor('AUG'));
		expect(expandAuthor('HIERONYMUS')).toBe(expandAuthor('HIERON'));
		expect(expandAuthor('AMBROSIUS')).toBe(expandAuthor('AMBR'));
	});

	it('returns undefined for an absent author', () => {
		expect(expandAuthor(null)).toBeUndefined();
		expect(expandAuthor(undefined)).toBeUndefined();
		expect(expandAuthor('')).toBeUndefined();
	});

	it('throws on an unrecognised siglum', () => {
		expect(() => expandAuthor('PROSP')).toThrow('Unknown Glossa author siglum: PROSP');
	});
});

describe('extractLemma', () => {
	const v8 = 'Novissime autem omnium tamquam abortivo, visus est et mihi.';

	it('splits a verified lemma off the body', () => {
		const r = extractLemma('Abortivo. Abortivus dicitur quia extra tempus.', v8);
		expect(r.lemma).toBe('Abortivo.');
		expect(r.body).toBe('Abortivus dicitur quia extra tempus.');
	});

	it('keeps the ", etc." terminator on the lemma', () => {
		const verse = 'Quod si Christus non resurrexit, vana est fides vestra.';
		const r = extractLemma('Quod si Christus non, etc. Si Christus non resurrexit.', verse);
		expect(r.lemma).toBe('Quod si Christus non, etc.');
		expect(r.body).toBe('Si Christus non resurrexit.');
	});

	it('leaves text whole when the candidate is not in the verse', () => {
		const text = 'lib. IX Moral., cap. 7 Peccatum vero cum voce, culpa est in actione.';
		const r = extractLemma(text, v8);
		expect(r.lemma).toBeUndefined();
		expect(r.body).toBe(text);
	});

	it('drops a stray leading stop left by damaged source punctuation', () => {
		const verse = 'Percusseruntque eos in ore gladii.';
		const text = 'Percusseruntque. . Alia editio habet, etc., usque ad quia ibi.';
		const r = extractLemma(text, verse);
		expect(r.lemma).toBe('Percusseruntque.');
		expect(r.body).toBe('Alia editio habet, etc., usque ad quia ibi.');
	});

	it('leaves text whole when no terminator is present at all', () => {
		const text = 'Affectus boni animi semper proclivis est ad pietatem';
		const r = extractLemma(text, v8);
		expect(r.lemma).toBeUndefined();
		expect(r.body).toBe(text);
	});

	it('leaves text whole against a Canticle rubric slot', () => {
		const r = extractLemma('Osculetur me. Id est incarnetur.', 'Sponsa');
		expect(r.lemma).toBeUndefined();
	});

	it('rejects a candidate of two characters or fewer', () => {
		const r = extractLemma('In. Aliquid de hoc.', 'In principio creavit Deus.');
		expect(r.lemma).toBeUndefined();
	});

	it('matches across diacritics and Vulgate punctuation spacing', () => {
		const verse = 'Terra autem erat inanis et vacua, et tenebræ erant super faciem abyssi.';
		const r = extractLemma('Tenebræ erant. Id est privatio lucis.', verse);
		expect(r.lemma).toBe('Tenebræ erant.');
		expect(r.body).toBe('Id est privatio lucis.');
	});
});

describe('GLOSSA_BOOK_MAP', () => {
	it('covers all 73 source directories', () => {
		expect(Object.keys(GLOSSA_BOOK_MAP)).toHaveLength(73);
	});

	it('maps every slug to a distinct book', () => {
		const slugs = Object.values(GLOSSA_BOOK_MAP);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('handles the Samuel/Kings and Esdras renumbering', () => {
		expect(GLOSSA_BOOK_MAP['09_1_samuel']).toBe('1-kings');
		expect(GLOSSA_BOOK_MAP['11_1_rois']).toBe('3-kings');
		expect(GLOSSA_BOOK_MAP['16_nehemie']).toBe('2-esdras');
		expect(GLOSSA_BOOK_MAP['28_siracide']).toBe('ecclesiasticus');
	});

	it('keeps the diacritic in the Joel directory key', () => {
		expect(GLOSSA_BOOK_MAP['36_joël']).toBe('joel');
	});
});

describe('GLOSSA_AUTHORS', () => {
	it('has 20 sigla', () => {
		expect(Object.keys(GLOSSA_AUTHORS)).toHaveLength(20);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/glossa-lib.test.ts`
Expected: FAIL, cannot resolve `../../scripts/glossa-lib.js`.

- [ ] **Step 3: Write the implementation**

Create `scripts/glossa-lib.ts`:

```ts
// scripts/glossa-lib.ts
// Pure helpers for the Glossa Ordinaria build. No fs, no side effects, so
// tests can import this without kicking off a build (prepare-data.ts runs
// main() at module load, which is why this lives apart from the build script).

/** Source directory name (French) to project book slug. All 73 book dirs. */
export const GLOSSA_BOOK_MAP: Record<string, string> = {
	'01_genese': 'genesis',
	'02_exode': 'exodus',
	'03_levitique': 'leviticus',
	'04_nombres': 'numbers',
	'05_deuteronome': 'deuteronomy',
	'06_josue': 'josue',
	'07_juges': 'judges',
	'08_ruth': 'ruth',
	'09_1_samuel': '1-kings',
	'10_2_samuel': '2-kings',
	'11_1_rois': '3-kings',
	'12_2_rois': '4-kings',
	'13_1_chroniques': '1-paralipomenon',
	'14_2_chroniques': '2-paralipomenon',
	'15_esdras': '1-esdras',
	'16_nehemie': '2-esdras',
	'17_tobie': 'tobias',
	'18_judith': 'judith',
	'19_esther': 'esther',
	'20_1_maccabees': '1-machabees',
	'21_2_maccabees': '2-machabees',
	'22_job': 'job',
	'23_psaumes': 'psalms',
	'24_proverbes': 'proverbs',
	'25_ecclesiaste': 'ecclesiastes',
	'26_cantique_des_cantiques': 'canticle-of-canticles',
	'27_sagesse': 'wisdom',
	'28_siracide': 'ecclesiasticus',
	'29_isaie': 'isaie',
	'30_jeremie': 'jeremie',
	'31_lamentations': 'lamentations',
	'32_baruch': 'baruch',
	'33_ezechiel': 'ezechiel',
	'34_daniel': 'daniel',
	'35_osee': 'osee',
	'36_joël': 'joel',
	'37_amos': 'amos',
	'38_abdias': 'abdias',
	'39_jonas': 'jonas',
	'40_michee': 'micheas',
	'41_nahum': 'nahum',
	'42_habacuc': 'habacuc',
	'43_sophonie': 'sophonias',
	'44_aggee': 'aggeus',
	'45_zacharie': 'zacharias',
	'46_malachie': 'malachie',
	'47_matthieu': 'matthew',
	'48_marc': 'mark',
	'49_luc': 'luke',
	'50_jean': 'john',
	'51_actes': 'acts',
	'52_romains': 'romans',
	'53_1_corinthiens': '1-corinthians',
	'54_2_corinthiens': '2-corinthians',
	'55_galates': 'galatians',
	'56_ephesiens': 'ephesians',
	'57_philippiens': 'philippians',
	'58_colossiens': 'colossians',
	'59_1_thessaloniciens': '1-thessalonians',
	'60_2_thessaloniciens': '2-thessalonians',
	'61_1_timothee': '1-timothy',
	'62_2_timothee': '2-timothy',
	'63_tite': 'titus',
	'64_philemon': 'philemon',
	'65_hebreux': 'hebrews',
	'66_jacques': 'james',
	'67_1_pierre': '1-peter',
	'68_2_pierre': '2-peter',
	'69_1_jean': '1-john',
	'70_2_jean': '2-john',
	'71_3_jean': '3-john',
	'72_jude': 'jude',
	'73_apocalypse': 'apocalypse'
};

/** Author siglum to Latin name. The corpus uses both short and long forms
 *  for the same Father, so several sigla map to one name. */
export const GLOSSA_AUTHORS: Record<string, string> = {
	AUG: 'Augustinus',
	AUGUSTINUS: 'Augustinus',
	BEDA: 'Beda',
	GREG: 'Gregorius',
	GREGORIUS: 'Gregorius',
	ISID: 'Isidorus',
	ISIDORUS: 'Isidorus',
	HIERON: 'Hieronymus',
	HIERONYMUS: 'Hieronymus',
	STRAB: 'Strabus',
	AMBR: 'Ambrosius',
	AMBROSIUS: 'Ambrosius',
	LEO: 'Leo',
	ALCUIN: 'Alcuinus',
	ORIGENES: 'Origenes',
	ANSELM: 'Anselmus',
	CHRYSOSTOMUS: 'Chrysostomus',
	CYPR: 'Cyprianus',
	RABANUS: 'Rabanus',
	CASSIODORUS: 'Cassiodorus'
};

/** Folds Latin orthography so a gloss catchword can be compared against
 *  Vulgate verse text: case, diacritics, æ/œ ligatures, u/v and i/j, and
 *  the Clementine edition's spaced punctuation. */
export function normalizeLatin(s: string): string {
	return s
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/æ/g, 'ae')
		.replace(/œ/g, 'oe')
		.replace(/[^a-z]+/g, ' ')
		.replace(/j/g, 'i')
		.replace(/v/g, 'u')
		.trim();
}

/** Expands a source siglum to its Latin name. Anonymous entries (the bulk of
 *  the corpus) yield undefined; the UI supplies the "Glossa" byline. */
export function expandAuthor(siglum: string | null | undefined): string | undefined {
	if (!siglum) return undefined;
	const name = GLOSSA_AUTHORS[siglum];
	if (!name) throw new Error(`Unknown Glossa author siglum: ${siglum}`);
	return name;
}

/** Each gloss opens with a catchword lifted from the verse. Split it off only
 *  when it can be verified against the verse text, so nothing is ever split on
 *  a guess. Roughly 81.9% of the corpus verifies. */
export function extractLemma(
	text: string,
	verseText: string
): { lemma?: string; body: string } {
	const trimmed = text.trim();
	const m = /^(.{2,80}?)(,\s*etc\.|\.)(\s|$)/.exec(trimmed);
	if (!m) return { body: trimmed };

	const candidate = normalizeLatin(m[1]);
	if (candidate.length <= 2) return { body: trimmed };
	if (!normalizeLatin(verseText).includes(candidate)) return { body: trimmed };

	return {
		lemma: m[1] + m[2],
		// Some source entries carry a stray second stop after the catchword
		// ("Percusseruntque. . Alia editio…"); drop it from the body.
		body: trimmed.slice(m[0].length).replace(/^[.\s]+/, '')
	};
}
```

Note on `normalizeLatin` ordering: `[^a-z]+` runs before the `j`/`v` folds so
that stripping diacritics and punctuation cannot reintroduce characters the
folds should have caught.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/glossa-lib.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add scripts/glossa-lib.ts tests/unit/glossa-lib.test.ts
git commit -m "feat(glossa): add pure helpers for the Glossa Ordinaria build"
```

---

### Task 2: The build script

**Files:**
- Create: `scripts/build-glossa-data.ts`
- Modify: `scripts/prepare-data.ts` (dynamic import near line 442; manifest section list at lines 515-524)
- Generated: `static/data/glossa/**` (1,124 files, ~5.26 MB, committed)

**Interfaces:**
- Consumes: `GLOSSA_BOOK_MAP`, `GLOSSA_AUTHORS`, `normalizeLatin`, `expandAuthor`, `extractLemma` from Task 1.
- Produces: `static/data/glossa/<slug>/<chapter>.json`, an array of
  `{ verse: number; lemma?: string; text: string; author?: string }` in verse
  order, source order preserved inside each verse. Also `export async function buildGlossaData(): Promise<void>`, a no-op wrapper matching `build-fathers-data.ts`.

- [ ] **Step 1: Write the build script**

Create `scripts/build-glossa-data.ts`. It mirrors `build-fathers-data.ts`: build logic at module load, `@ts-nocheck` because it runs under tsx.

```ts
// scripts/build-glossa-data.ts
// @ts-nocheck: build script run with tsx
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import {
	GLOSSA_BOOK_MAP,
	expandAuthor,
	extractLemma
} from './glossa-lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'glossa');
const VUL_DIR = join(PROJECT_ROOT, 'static', 'data', 'vul');

/** The corpus lives outside this repo. Probe in order, and skip cleanly when
 *  none is present so Cloudflare builds use the committed JSON. */
function resolveSource(): string | null {
	const candidates = [
		process.env.GLOSSA_SOURCE,
		join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'GLOSSA', 'glossa_ordinaria'),
		join(
			homedir(),
			'Development',
			'for-the-kingdom',
			'commentary',
			'sources',
			'glossa_ordinaria'
		)
	];
	for (const c of candidates) {
		if (c && existsSync(c)) return c;
	}
	return null;
}

const SOURCE = resolveSource();

if (!SOURCE) {
	console.log('Glossa source not found; skipping build (using committed data).');
} else {
	buildGlossa(SOURCE);
}

function buildGlossa(source: string) {
	// ── Validate the book map against the source tree ────────────────
	const dirs = readdirSync(source, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	const unmapped = dirs.filter((d) => !(d in GLOSSA_BOOK_MAP));
	if (unmapped.length > 0) {
		throw new Error(`Glossa source dirs missing from GLOSSA_BOOK_MAP: ${unmapped.join(', ')}`);
	}
	const absent = Object.keys(GLOSSA_BOOK_MAP).filter((d) => !dirs.includes(d));
	if (absent.length > 0) {
		throw new Error(`GLOSSA_BOOK_MAP entries absent from source: ${absent.join(', ')}`);
	}

	let entries = 0;
	let lemmas = 0;
	let files = 0;
	let books = 0;

	for (const [dir, slug] of Object.entries(GLOSSA_BOOK_MAP)) {
		const vulPath = join(VUL_DIR, `${slug}.json`);
		if (!existsSync(vulPath)) {
			throw new Error(`GLOSSA_BOOK_MAP slug has no Vulgate data: ${slug}`);
		}
		const vul = JSON.parse(readFileSync(vulPath, 'utf-8'));
		const verseText = new Map<string, string>();
		for (const ch of vul.chapters) {
			for (const v of ch.verses) verseText.set(`${ch.chapter}:${v.verse}`, v.text);
		}

		let bookHadContent = false;

		for (const file of readdirSync(join(source, dir))) {
			if (!file.startsWith('chapitre_') || !file.endsWith('.json')) continue;
			const chapterData = JSON.parse(readFileSync(join(source, dir, file), 'utf-8'));
			const out: object[] = [];

			for (const c of chapterData.commentaries) {
				entries++;
				const verse = parseInt(c.verse_ref.split(':')[1], 10);
				const vt = verseText.get(c.verse_ref);
				if (vt === undefined) {
					throw new Error(`Dangling Glossa ref ${slug} ${c.verse_ref} (${dir}/${file})`);
				}
				const { lemma, body } = extractLemma(c.text, vt);
				if (lemma) lemmas++;
				const author = expandAuthor(c.author);
				out.push({
					verse,
					...(lemma ? { lemma } : {}),
					text: body,
					...(author ? { author } : {})
				});
			}

			if (out.length === 0) continue;
			out.sort((a, b) => a.verse - b.verse);

			const bookDir = join(OUT_DIR, slug);
			mkdirSync(bookDir, { recursive: true });
			writeFileSync(join(bookDir, `${chapterData.chapter}.json`), JSON.stringify(out));
			files++;
			bookHadContent = true;
		}

		if (bookHadContent) books++;
	}

	const pct = ((lemmas / entries) * 100).toFixed(1);
	console.log(`✓ Glossa: ${entries} entries, ${lemmas} lemmas (${pct}%).`);
	console.log(`✓ Glossa: ${files} chapter files across ${books} books.`);
}

// ── Export for pipeline integration ─────────────────────────────

export async function buildGlossaData(): Promise<void> {
	// Already runs on import; this is a no-op wrapper for prepare-data.ts,
	// matching build-fathers-data.ts.
}
```

`out.sort` is a stable sort in Node, so source order inside a verse survives.

- [ ] **Step 2: Run the build script directly**

Run: `npx tsx scripts/build-glossa-data.ts`

Expected output, exactly:

```
✓ Glossa: 14486 entries, 11859 lemmas (81.9%).
✓ Glossa: 1124 chapter files across 55 books.
```

If entries is not 14486, or lemmas is not 11859, stop and investigate before
continuing. Those are measured facts about the current corpus, not estimates.

- [ ] **Step 3: Verify the output shape and size**

```bash
du -sh static/data/glossa
find static/data/glossa -name '*.json' | wc -l
cat static/data/glossa/1-corinthians/15.json | python3 -m json.tool | head -20
ls static/data/glossa/ezechiel 2>&1
```

Expected: about 5.3 MB (5.26 MB measured); 1124 files; the first entry of 1 Corinthians 15 carrying
`verse`, `text` and, where verified, `lemma`; and `ls` on `ezechiel` reporting
no such directory, since that book has no glosses.

- [ ] **Step 4: Wire the build into the pipeline**

In `scripts/prepare-data.ts`, directly after the Fathers block (around line
442), insert:

```ts
	// ── Glossa Ordinaria (Latin, for the Vulgate panel) ─────────────
	try {
		await import('./build-glossa-data.js');
		console.log('Glossa Ordinaria data built.');
	} catch (e) {
		console.log(`Glossa build skipped: ${e instanceof Error ? e.message : e}`);
	}
```

The message reports the cause, because the validation assertions above throw and
would otherwise vanish silently.

In the same file, add `'glossa'` to the `sections` array (lines 515-524), after
`'haydock-crossrefs'`:

```ts
		'haydock-crossrefs',
		'glossa'
```

- [ ] **Step 5: Rebuild the manifest and verify the gate**

Run: `npx tsx scripts/prepare-data.ts`

Then:

```bash
python3 -c "
import json
m = json.load(open('static/data/manifests/sidecars.json'))
g = m['glossa']
print('books:', len(g))
print('genesis has ch1:', 1 in g['genesis'])
print('ezechiel present:', 'ezechiel' in g)
"
```

Expected: `books: 55`, `genesis has ch1: True`, `ezechiel present: False`.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add scripts/build-glossa-data.ts scripts/prepare-data.ts static/data/glossa static/data/manifests/sidecars.json
git commit -m "feat(glossa): build Glossa Ordinaria sidecars from the source corpus"
```

---

### Task 3: Loader

**Files:**
- Modify: `src/lib/data/loader.ts` (add after the `loadHaydockCommentary` block, which ends at line 211)
- Test: `tests/unit/loader.test.ts`

**Interfaces:**
- Consumes: the sidecar files and manifest entry from Task 2.
- Produces:
  - `export interface GlossaEntry { verse: number; lemma?: string; text: string; author?: string }`
  - `export function loadGlossa(slug: string, chapter: number, fetch: typeof globalThis.fetch): Promise<GlossaEntry[] | null>`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/loader.test.ts`:

```ts
import { loadGlossa } from '../../src/lib/data/loader.js';

describe('loadGlossa', () => {
	it('fetches from the correct URL for a chapter that has glosses', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ verse: 1, text: 'Non dicit: In principio dicit Deus.' }]
		});
		const result = await loadGlossa('genesis', 1, mockFetch as unknown as typeof fetch);
		expect(mockFetch).toHaveBeenCalledWith('/data/glossa/genesis/1.json');
		expect(result).toEqual([{ verse: 1, text: 'Non dicit: In principio dicit Deus.' }]);
	});

	it('resolves null without fetching when the manifest has no entry', async () => {
		const mockFetch = vi.fn();
		const result = await loadGlossa('ezechiel', 1, mockFetch as unknown as typeof fetch);
		expect(result).toBeNull();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('caches by slug and chapter', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ verse: 1, text: 'Prima glossa.' }]
		});
		await loadGlossa('john', 1, mockFetch as unknown as typeof fetch);
		await loadGlossa('john', 1, mockFetch as unknown as typeof fetch);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});
});
```

The second test relies on the real committed manifest, which after Task 2 has no
`ezechiel` key under `glossa`. That is the behaviour worth locking down.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/loader.test.ts`
Expected: FAIL, `loadGlossa` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/lib/data/loader.ts`, immediately after the `loadHaydockCommentary`
function (line 211) and before the `// ── Haydock book introductions ──` banner:

```ts
// ── Glossa Ordinaria (per chapter) ──────────────────────────────────

export interface GlossaEntry {
	verse: number;
	/** Catchword from the verse, present only where the build could verify it. */
	lemma?: string;
	text: string;
	/** Absent for the anonymous gloss; the panel renders "Glossa" instead. */
	author?: string;
}

const glossaCache = new Map<string, Promise<GlossaEntry[] | null>>();

export function loadGlossa(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<GlossaEntry[] | null> {
	const key = `${slug}/${chapter}`;
	if (!glossaCache.has(key)) {
		if (!hasSidecar('glossa', slug, chapter)) {
			glossaCache.set(key, Promise.resolve(null));
			return glossaCache.get(key)!;
		}
		const promise = fetch(`/data/glossa/${slug}/${chapter}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load Glossa: ${res.status}`);
			return res.json() as Promise<GlossaEntry[]>;
		});
		promise.then(null, () => glossaCache.delete(key));
		glossaCache.set(key, promise);
	}
	return glossaCache.get(key)!;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/loader.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run check
npm run lint
git add src/lib/data/loader.ts tests/unit/loader.test.ts
git commit -m "feat(glossa): add the Glossa chapter loader"
```

---

### Task 4: Study panel tab

**Files:**
- Modify: `src/lib/stores/studyPanel.ts:4-12` (the `StudyTab` union)
- Modify: `src/lib/stores/prefs.ts:34` (a second, hand-duplicated copy of the
  same union, typed out rather than imported; `switchTab` assigns a `StudyTab`
  into `studyDefaultTab`, so leaving this one behind fails `npm run check`)
- Modify: `src/lib/components/StudyPanel.svelte` (imports; state near line 66; `buildVisibleTabs` line 167; `groupByVerse` line 290; load block after line 688; render block after line 1655; styles)

**Interfaces:**
- Consumes: `loadGlossa`, `GlossaEntry` from Task 3.
- Produces: a `'glossa'` member of `StudyTab`, consumed by Task 5 only through the store type.

- [ ] **Step 1: Add the tab to the store union**

In `src/lib/stores/studyPanel.ts`, extend the union:

```ts
export type StudyTab =
	| 'intro'
	| 'commentary'
	| 'article'
	| 'end'
	| 'footnotes'
	| 'annotations'
	| 'notes'
	| 'cross-refs'
	| 'glossa';
```

- [ ] **Step 2: Add imports and state to StudyPanel**

In the import from `$lib/data/loader` (lines 13-21), add `loadGlossa`. In the
type-only import on line 22, add `GlossaEntry`:

```ts
	import type { HaydockCommentaryEntry, HaydockIntro, GlossaEntry } from '$lib/data/loader';
```

After the Haydock commentary state block (lines 64-66), add:

```ts
	// ── Glossa Ordinaria (Vulgate) ──────────────────────────────────
	let glossa: GlossaEntry[] | null = $state(null);
	let glossaLoading = $state(false);
	let lastGlossaKey = '';
```

- [ ] **Step 3: Add the derived flag and the tab**

Next to `let isHaydock = $derived(...)` on line 606, add:

```ts
	let isVul = $derived(translationId === 'vul');
```

In `buildVisibleTabs`, replace the final `return [];` (line 170) with:

```ts
		if (tid === 'vul') {
			// Always shown, including the 18 books the Glossa never covered.
			return [{ id: 'glossa', label: 'Glossa' }];
		}
		return [];
	}
```

- [ ] **Step 4: Generalise groupByVerse**

`groupByVerse` (lines 290-301) is typed to `HaydockCommentaryEntry` but only
ever touches `.verse`. Make it generic so the Glossa render can reuse it:

```ts
	function groupByVerse<T extends { verse: number }>(
		entries: T[]
	): { verse: number; entries: T[] }[] {
		const map = new Map<number, T[]>();
		for (const e of entries) {
			if (!map.has(e.verse)) map.set(e.verse, []);
			map.get(e.verse)!.push(e);
		}
		return Array.from(map.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([verse, entries]) => ({ verse, entries }));
	}
```

- [ ] **Step 5: Add the load block**

After the Haydock commentary `run(() => { ... })` block (ends line 688), add:

```ts
	run(() => {
		const key = `vul/${currentBookSlug}/${currentChapterNum}`;
		if (isVul && currentBookSlug && key !== lastGlossaKey) {
			lastGlossaKey = key;
			const slug = currentBookSlug;
			const chNum = currentChapterNum;
			glossaLoading = true;
			glossa = null;
			loadGlossa(slug, chNum, fetch)
				.then((data) => {
					if (`vul/${slug}/${chNum}` === lastGlossaKey) {
						glossa = data;
						glossaLoading = false;
						// After Svelte renders the sections, wire up the scroll observer
						tick()
							.then(() => tick())
							.then(setupPanelObserver);
					}
				})
				.catch(() => {
					if (`vul/${currentBookSlug}/${currentChapterNum}` === lastGlossaKey) {
						glossaLoading = false;
					}
				});
		} else if (!isVul) {
			glossa = null;
		}
	});
```

- [ ] **Step 6: Add the render block**

Add a branch immediately after the Haydock cross-refs branch closes, which is
the last Haydock branch in the chain. Locate it by its
`<!-- ═══ Haydock: Cross-Refs tab ═══ -->` comment marker rather than by line
number, since earlier edits in this task shift the file:

```svelte
					<!-- ═══ Vulgate: Glossa Ordinaria tab ═══ -->
				{:else if $studyPanel.activeTab === 'glossa' && isVul}
					{#if glossaLoading}
						<div class="empty-state"><p>Loading commentary...</p></div>
					{:else if glossa && glossa.length > 0}
						{@const grouped = groupByVerse(glossa)}
						<div class="content-block glossa-block">
							<p class="content-eyebrow">Glossa Ordinaria</p>
							{#each grouped as group (group.verse)}
								<div
									class="verse-section"
									class:verse-section-active={$studyPanel.annotatedVerse === group.verse}
									bind:this={sectionEls[group.verse]}
									data-section-verse={group.verse}
								>
									<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
									<div
										class="verse-section-header verse-section-header-sticky"
										onclick={() => copyVerseLink(group.verse)}
									>
										{group.verse === 0 ? 'Chapter' : `Verse ${group.verse}`}
									</div>
									{#each group.entries as entry, i}
										<div class="glossa-entry" data-panel-id="panel-{group.verse}-glossa-{i}">
											{#if entry.lemma}
												<p class="glossa-lemma sc">{entry.lemma}</p>
											{/if}
											{#if entry.text}
												<p class="glossa-text">{entry.text}</p>
											{/if}
											<p class="glossa-author">{entry.author ?? 'Glossa'}</p>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>Nulla glossa.</p>
						</div>
					{/if}
```

The copy-link button markup from the Haydock header is deliberately left out;
the header stays clickable through `copyVerseLink`. Gloss text is interpolated,
not `{@html}`, because the corpus is plain text with no markup. The `{#if
entry.text}` guard matters: in 13 entries the lemma consumes the whole gloss,
leaving an empty body that would otherwise render as a blank paragraph.

- [ ] **Step 7: Add styles**

In the `<style>` block, next to the `.haydock-entry` rules (around line 2285):

```css
	.glossa-entry {
		margin-bottom: 1.1rem;
	}

	.glossa-entry:last-child {
		margin-bottom: 0;
	}

	.glossa-lemma {
		font-variant: small-caps;
		letter-spacing: 0.04em;
		font-weight: 600;
		margin-bottom: 0.15rem;
	}

	.glossa-text {
		line-height: 1.6;
	}

	.glossa-author {
		margin-top: 0.2rem;
		text-align: right;
		font-style: italic;
		opacity: 0.7;
		font-size: 0.85em;
	}
```

`.sc` on the lemma supplies `font-variant: small-caps` from `app.css:539`; the
local rule repeats it so the element reads correctly if the global class is ever
scoped away.

- [ ] **Step 8: Typecheck and verify in the browser**

```bash
npm run check
npm run dev
```

Open `http://localhost:5173/vul/genesis/1`, switch to study mode, and confirm:
the Glossa tab is present and selected; verse sections render; lemmas appear in
small caps; anonymous entries read `Glossa`. Then open `/vul/ezechiel/1` and
confirm the tab is present with `Nulla glossa.`

- [ ] **Step 9: Lint and commit**

```bash
npm run lint
git add src/lib/stores/studyPanel.ts src/lib/components/StudyPanel.svelte
git commit -m "feat(glossa): show the Glossa tab in the Vulgate study panel"
```

---

### Task 5: Reader verse underline

**Files:**
- Modify: `src/lib/components/VerseList.svelte` (imports; state near line 102; load block near line 107; `annotatedVerseSet` lines 167-191)

**Interfaces:**
- Consumes: `loadGlossa`, `GlossaEntry` from Task 3.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Add state and loading**

In `VerseList.svelte`, add `loadGlossa` to the `$lib/data/loader` import and
`GlossaEntry` to the type import. Beside the `haydockCommentary` state (line
102), add:

```ts
	let glossa: GlossaEntry[] | null = $state(null);
	let lastGlossaKey = '';
```

In the same `run(() => { ... })` that loads Haydock commentary (lines 107-115),
after the existing Haydock branch, add a parallel branch:

```ts
		if (browser && translationId === 'vul' && key !== lastGlossaKey) {
			lastGlossaKey = key;
			loadGlossa(bookSlug, chapterNum, fetch)
				.then((data) => {
					if (`${bookSlug}/${chapterNum}` === lastGlossaKey) glossa = data;
				})
				.catch(() => {});
		} else if (translationId !== 'vul') {
			glossa = null;
		}
```

Read the surrounding block before editing and match how `key`, `bookSlug` and
`chapterNum` are already derived there; reuse them rather than recomputing. The
trailing `.catch(() => {})` is required, not decorative: `loadGlossa` rejects on
a non-ok response, and all five sibling loaders in this file absorb that the same
way. Without it a failed fetch becomes an unhandled promise rejection.

- [ ] **Step 2: Add the vul branch to annotatedVerseSet**

In `annotatedVerseSet` (lines 167-191), after the `haydock` branch and before
the `hasTranslationNotes` branch:

```ts
		if (translationId === 'vul') {
			if (glossa) for (const e of glossa) set.add(e.verse);
			return set;
		}
```

Position matters. It must come before `hasTranslationNotes`, which would
otherwise not match `vul` but should not be relied on to stay that way.

- [ ] **Step 3: Typecheck and verify in the browser**

```bash
npm run check
npm run dev
```

At `http://localhost:5173/vul/genesis/1` in study mode, verses carrying glosses
show the dotted underline and clicking one scrolls the panel to that verse. At
`/vul/ezechiel/1`, no verse is underlined.

- [ ] **Step 4: Lint and commit**

```bash
npm run lint
git add src/lib/components/VerseList.svelte
git commit -m "feat(glossa): underline glossed verses in the Vulgate reader"
```

---

### Task 6: End-to-end tests

**Files:**
- Create: `tests/e2e/glossa.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 through 5.
- Produces: nothing.

- [ ] **Step 1: Write the tests**

Create `tests/e2e/glossa.test.ts`:

```ts
import { test, expect } from '@playwright/test';

/** Study mode lives inside the single `reading-prefs` JSON blob that
 *  prefs.ts:94 reads. loadPrefs merges over DEFAULTS, so a partial object is
 *  safe, and stamping the current PREFS_VERSION skips the migration chain. */
async function useStudyMode(page: import('@playwright/test').Page) {
	await page.addInitScript(() => {
		localStorage.setItem('reading-prefs', JSON.stringify({ readingMode: 'study', _v: 21 }));
	});
}

test('Vulgate study panel renders the Glossa', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/genesis/1');
	await expect(page.locator('.glossa-block')).toBeVisible();
	await expect(page.locator('.glossa-block .content-eyebrow')).toHaveText('Glossa Ordinaria');
});

test('Glossa renders verse sections and entries for Genesis 1', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/genesis/1');
	await expect(page.locator('.glossa-block .verse-section').first()).toBeVisible();
	await expect(page.locator('.glossa-entry').first()).toBeVisible();
	await expect(page.locator('.glossa-lemma').first()).toBeVisible();
});

test('every gloss carries a byline', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/genesis/1');
	await expect(page.locator('.glossa-author').first()).toHaveText(/\S/);
});

test('books without glosses show the empty state', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/ezechiel/1');
	await expect(page.getByText('Nulla glossa.')).toBeVisible();
	await expect(page.locator('.glossa-block')).toHaveCount(0);
});
```

These assert the rendered panel rather than a tab chip, on purpose.
`StudyPanel.svelte:765` sets `showTabBar = visibleTabs.length > 1`, so the
Vulgate's single tab renders no tab bar at all; `getByRole('tab', …)` could
never match. The panel still reaches the Glossa, because the guard at
`StudyPanel.svelte:761-762` snaps `activeTab` to `visibleTabs[0]` when the
stored tab is not among the visible ones. Do not add a tab bar to make a test
pass.

- [ ] **Step 2: Run the tests**

Run: `npm run test:e2e -- glossa`
Expected: 4 passing.

- [ ] **Step 3: Run the full suite**

```bash
npm run test
npm run check
npm run lint
```

Expected: all green. Report any failure with its output rather than working
around it.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/glossa.test.ts
git commit -m "test(glossa): cover the Vulgate Glossa tab end to end"
```

---

## Self-Review

**Spec coverage.** Source resolution, book mapping, sigla, lemma extraction,
output shape, manifest: Task 2 (helpers in Task 1). Loader: Task 3. Store union,
tab, panel render, empty state, small caps, byline: Task 4. Reader underline:
Task 5. Unit, build assertion, and e2e testing: Tasks 1, 2, 3, 6. The spec's
"out of scope" list stays out.

**Types.** `GlossaEntry` is defined once in Task 3 and imported by Tasks 4 and 5.
`loadGlossa` keeps one signature across all three. `extractLemma` returns
`{ lemma?, body }` in Task 1 and is destructured as `{ lemma, body }` in Task 2.
`GLOSSA_BOOK_MAP` and `expandAuthor` are named identically wherever used.

**Known soft spots**, flagged rather than hidden:
- Task 4 Step 6 places a branch inside a long `{:else if}` chain by line number.
  Line numbers shift as earlier steps edit the file. Locate the branch by its
  `<!-- ═══ Haydock: Cross-Refs tab ═══ -->` comment rather than trusting 1655.
- Task 6's study-mode seeding and its avoidance of `getByRole('tab', …)` were
  both settled during the pre-flight scan; see the rulings in
  `.superpowers/sdd/2026-08-21-glossa-ordinaria/progress.md`. Do not "fix" the
  tests back to querying a tab chip.
