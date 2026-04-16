/**
 * Build a search suggestion map from glossary terms + curated theological terms.
 *
 * For each term, finds all verses/annotations where it appears, then computes
 * co-occurrence with other terms. Terms that share many passages are "related".
 *
 * Output: static/data/odr/search-suggestions.json
 *   { [term]: string[] }  — each term maps to its top related terms
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchTokenizer, processTerm, foldLigatures } from '../src/lib/search/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');
const REF_DIR = join(PROJECT_ROOT, 'static', 'data', 'reference');

// ── Curated theological terms (not in the glossaries) ───────────────────────

const CURATED_TERMS: string[] = [
	// Marian
	'Full of Grace',
	'Mother of God',
	'Immaculate',
	'Magnificat',
	'Annunciation',
	'Visitation',
	'Virgin',
	'Handmaid',
	'Blessed among women',

	// Sacramental
	'Transubstantiation',
	'Real Presence',
	'Body and Blood',
	'Bread of Life',
	'Living Bread',
	'Eucharist',
	'Communion of Saints',
	'Confession',
	'Penance',
	'Confirmation',
	'Holy Orders',
	'Matrimony',
	'Extreme Unction',
	'Anointing',
	'Absolution',

	// Ecclesial
	'Thou art Peter',
	'Keys of the Kingdom',
	'Rock',
	'Gates of Hell',
	'Primacy',
	'Apostolic Succession',
	'Tradition',
	'Bishop',
	'Presbyter',
	'Deacon',
	'Pope',
	'Vicar',

	// Doctrinal
	'Original Sin',
	'Purgatory',
	'Justification',
	'Predestination',
	'Free Will',
	'Merit',
	'Salvation',
	'Redemption',
	'Propitiation',
	'Sanctification',
	'Imputation',
	'Election',
	'Reprobation',
	'Mortal Sin',
	'Venial Sin',
	'Indulgence',
	'Intercession',
	'Infallible',
	'Deposit of Faith',
	'Inspiration',

	// Biblical phrases & figures
	'Daily Bread',
	'Good Shepherd',
	'Lamb of God',
	'Word made Flesh',
	'Living Water',
	'Light of the World',
	'Way Truth Life',
	'Alpha and Omega',
	'Son of Man',
	'Son of God',
	'Kingdom of Heaven',
	'Kingdom of God',
	'Eternal Life',
	'Resurrection of the Dead',
	'Last Judgment',
	'Second Coming',
	'Beatitudes',
	'Blessed are the poor',
	'Our Father',
	'Our Father',
	'Hail Mary',
	'Sign of the Cross',
	'Trinity',
	'Holy Ghost',
	'Incarnation',
	'Nativity',
	'Passion',
	'Crucified',
	'Ascension',
	'Pentecost',
	'Transfiguration',
	'Last Supper',
	'Gethsemani',
	'Crown of Thorns',
	'Stations of the Cross',

	// Moral / Virtues & Vices
	'Charity',
	'Faith',
	'Hope',
	'Prudence',
	'Temperance',
	'Fortitude',
	'Humility',
	'Chastity',
	'Obedience',
	'Poverty',
	'Pride',
	'Envy',
	'Wrath',
	'Sloth',
	'Gluttony',
	'Lust',
	'Covetousness',
	'Works of Mercy',
	'Alms',
	'Fasting',
	'Prayer',

	// OT themes
	'Covenant',
	'Promised Land',
	'Exodus',
	'Pasch',
	'Manna',
	'Ten Commandments',
	'Ark of the Covenant',
	'Tabernacle',
	'Temple',
	'Sacrifice',
	'Burnt Offering',
	'Prophet',
	'Messias',
	'Suffering Servant',
	'Root of Jesse',
	'Star of Jacob',
	'Emmanuel',
	'Wisdom',
	'Fear of the Lord',
	'Day of the Lord',

	// Apologetics / Catholic distinctives
	'Penance',
	'Relics',
	'Saints',
	'Veneration',
	'Images',
	'Holy Water',
	'Virginity',
	'Eunuch',
	'Religious Life',
	'Monastery',
	'Tithe',
	'Excommunication',
	'Heresy',
	'Schism',
	'Council',
	'Vulgate',
	'Canon of Scripture',
	'Canonical',
	'Church Fathers',
	'Doctors of the Church'
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<[^>]+>/g, '');
}

function normalizeForLookup(text: string): string {
	return foldLigatures(text).toLowerCase().replace(/['']/g, "'").trim();
}

/**
 * Tokenize a term into search words (lowercased, ligatures folded).
 * Multi-word terms become multiple tokens.
 */
function termTokens(term: string): string[] {
	return normalizeForLookup(term)
		.split(/\s+/)
		.map((w) => w.replace(/[.,;:!?()"']/g, '').replace(/-/g, ''))
		.filter((w) => w.length > 1);
}

// ── Load all verse + annotation text ────────────────────────────────────────

interface Doc {
	id: string; // "book:chapter:verse" or "book:chapter:ann-N"
	text: string; // cleaned plain text
}

async function loadAllDocs(): Promise<Doc[]> {
	const docs: Doc[] = [];

	const files = await readdir(DATA_DIR);
	for (const file of files.sort()) {
		if (!file.endsWith('.json') || file.startsWith('search-')) continue;
		const raw = await readFile(join(DATA_DIR, file), 'utf-8');
		const book = JSON.parse(raw);
		if (!book.book || !book.chapters) continue;

		const slug = file.replace('.json', '');

		for (const ch of book.chapters) {
			for (const v of ch.verses) {
				docs.push({
					id: `${slug}:${ch.chapter}:${v.verse}`,
					text: stripHtml(v.text).toLowerCase()
				});
				// Inline notes
				if (v.notes) {
					for (const n of v.notes) {
						if (n.text) {
							docs.push({
								id: `${slug}:${ch.chapter}:${v.verse}`,
								text: stripHtml(n.text).toLowerCase()
							});
						}
					}
				}
			}
		}

		// Annotation sidecars
		const annotDir = join(DATA_DIR, slug, 'annotations');
		try {
			const annFiles = await readdir(annotDir);
			for (const annFile of annFiles.sort()) {
				if (!annFile.endsWith('.json')) continue;
				const annRaw = await readFile(join(annotDir, annFile), 'utf-8');
				const annData = JSON.parse(annRaw);
				if (!annData.annotations) continue;

				for (let i = 0; i < annData.annotations.length; i++) {
					const ann = annData.annotations[i];
					const parts: string[] = [];
					if (ann.title) parts.push(stripHtml(ann.title));
					if (ann.text) parts.push(stripHtml(ann.text));
					if (ann.notes) {
						for (const n of ann.notes) {
							if (n.text) parts.push(stripHtml(n.text));
						}
					}
					if (parts.length) {
						docs.push({
							id: `${slug}:${annData.chapter}:${ann.verse || 0}`,
							text: parts.join(' ').toLowerCase()
						});
					}
				}
			}
		} catch {
			// No annotations for this book
		}
	}

	return docs;
}

// ── Extract glossary terms ──────────────────────────────────────────────────

async function extractGlossaryTerms(): Promise<string[]> {
	const terms: string[] = [];

	// OT glossary
	try {
		const otRaw = await readFile(join(REF_DIR, 'ot', 'glossary.json'), 'utf-8');
		const ot = JSON.parse(otRaw);
		for (const para of ot.paragraphs) {
			if (!para.letter || !para.entries) continue;
			for (const entry of para.entries) {
				const match = entry.match(/^<i>([^<]+)<\/i>/);
				if (match) {
					let t = match[1].replace(/[.,]+$/, '').trim();
					t = t.replace(/^S\.\s+/, 'Saint ');
					// Skip non-searchable entries like "The Church", "Ages from the third"
					if (/^(The |Ages from)/i.test(t)) continue;
					terms.push(t);
				}
			}
		}
	} catch {
		console.warn('Could not load OT glossary');
	}

	// NT explication words
	try {
		const ntRaw = await readFile(join(REF_DIR, 'nt', 'explication-words.json'), 'utf-8');
		const nt = JSON.parse(ntRaw);
		for (const section of nt.entries) {
			if (!section.words) continue;
			for (const w of section.words) {
				const word = stripHtml(w.word).trim();
				if (word && word !== 'and') terms.push(word);
			}
		}
	} catch {
		console.warn('Could not load NT explication words');
	}

	return terms;
}

// ── Extract terms + cross-references from Table of Catholic Truths ─────────

interface CrossRef {
	from: string;
	to: string;
}

/** Normalize a term from the Table of Catholic Truths to title case */
function cleanTruthsTerm(term: string): string {
	// Strip leading articles/prefixes like "The B.", "The ", "S. "
	term = term
		.replace(/^The B\.\s*/i, '')
		.replace(/^The\s+/i, '')
		.replace(/^S\.\s+/i, 'Saint ');
	// Convert ALL CAPS to Title Case (e.g. "ABSOLUTION" → "Absolution")
	if (/^[A-Z\s']+$/.test(term) && term.length > 2) {
		term = term
			.toLowerCase()
			.split(/\s+/)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}
	return term.replace(/[.,]+$/, '').trim();
}

async function extractCatholicTruthsTerms(): Promise<{
	terms: string[];
	crossRefs: CrossRef[];
}> {
	const terms: string[] = [];
	const crossRefs: CrossRef[] = [];

	try {
		const raw = await readFile(join(REF_DIR, 'nt', 'table-catholic-truths.json'), 'utf-8');
		const data = JSON.parse(raw);

		for (const section of data.entries) {
			if (!section.entries) continue;
			for (const entry of section.entries) {
				// Extract main term from italic heading
				const titleMatch = entry.match(/^<i>([^<]+)<\/i>/);
				if (titleMatch) {
					let term = titleMatch[1].replace(/[.,]+$/, '').trim();
					term = cleanTruthsTerm(term);
					if (term.length > 1) terms.push(term);
				}

				// Extract "See <i>X</i>" cross-references
				const from = cleanTruthsTerm(titleMatch?.[1]?.replace(/[.,]+$/, '').trim() ?? '');
				if (!from) continue;
				const sees = [...entry.matchAll(/[Ss]ee\s+<i>([^<]+)<\/i>/g)];
				for (const s of sees) {
					// May contain comma-separated targets: "Priests, Holy Orders, Monastical"
					const targets = s[1].split(/[,&]/).map((t: string) => cleanTruthsTerm(t));
					for (const target of targets) {
						if (target.length > 1 && target !== from) {
							crossRefs.push({ from, to: target });
						}
					}
				}
			}
		}
	} catch {
		console.warn('Could not load Table of Catholic Truths');
	}

	return { terms, crossRefs };
}

// ── Build co-occurrence graph ───────────────────────────────────────────────

async function buildSuggestions(): Promise<void> {
	console.log('\nBuilding search suggestions...');

	// 1. Collect all terms
	const glossaryTerms = await extractGlossaryTerms();
	const { terms: truthsTerms, crossRefs } = await extractCatholicTruthsTerms();
	const allTermsRaw = [...new Set([...glossaryTerms, ...truthsTerms, ...CURATED_TERMS])];
	console.log(
		`  Terms: ${glossaryTerms.length} glossary + ${truthsTerms.length} truths table + ${CURATED_TERMS.length} curated = ${allTermsRaw.length} unique`
	);
	console.log(`  Cross-references from Table of Catholic Truths: ${crossRefs.length}`);

	// 2. Load all docs
	const docs = await loadAllDocs();
	console.log(`  Documents: ${docs.length} (verses + notes + annotations)`);

	// 3. For each term, find which doc IDs contain it
	//    Use unique chapter-level IDs to avoid over-counting verse-level noise
	const termDocSets = new Map<string, Set<string>>();
	const validTerms: string[] = [];

	for (const term of allTermsRaw) {
		const tokens = termTokens(term);
		if (tokens.length === 0) continue;

		const matchingDocs = new Set<string>();

		for (const doc of docs) {
			const docText = foldLigatures(doc.text);
			// All tokens must appear in the doc
			if (tokens.every((t) => docText.includes(t))) {
				// Use chapter-level key for co-occurrence
				const parts = doc.id.split(':');
				matchingDocs.add(`${parts[0]}:${parts[1]}`);
			}
		}

		if (matchingDocs.size > 0) {
			termDocSets.set(term, matchingDocs);
			validTerms.push(term);
		}
	}

	console.log(`  Terms with matches: ${validTerms.length} / ${allTermsRaw.length}`);

	// 4. Compute pairwise co-occurrence and build suggestion map
	const MAX_SUGGESTIONS = 5;
	const suggestions: Record<string, string[]> = {};

	// Compute IDF for each term — penalise ultra-common terms like "Jesus", "God"
	const totalChapters = new Set<string>();
	for (const docs of termDocSets.values()) {
		for (const d of docs) totalChapters.add(d);
	}
	const N = totalChapters.size;
	const idf = new Map<string, number>();
	for (const [term, docs] of termDocSets) {
		idf.set(term, Math.log(N / (1 + docs.size)));
	}

	// Build a cross-reference lookup from Table of Catholic Truths
	// Bidirectional: if A→see B, both (A,B) and (B,A) are related
	const crossRefPairs = new Set<string>();
	for (const ref of crossRefs) {
		const a = normalizeForLookup(ref.from);
		const b = normalizeForLookup(ref.to);
		crossRefPairs.add(`${a}||${b}`);
		crossRefPairs.add(`${b}||${a}`);
	}

	function hasCrossRef(termA: string, termB: string): boolean {
		return crossRefPairs.has(`${normalizeForLookup(termA)}||${normalizeForLookup(termB)}`);
	}

	for (const termA of validTerms) {
		const docsA = termDocSets.get(termA)!;
		if (docsA.size < 1) continue;

		const scores: Array<{ term: string; score: number }> = [];

		for (const termB of validTerms) {
			if (termA === termB) continue;
			// Skip if same base word (e.g. "Baptism" vs "baptism")
			if (normalizeForLookup(termA) === normalizeForLookup(termB)) continue;
			// Skip if one term's tokens are a subset of the other (e.g. "Holy Ghost" vs "Ghost")
			const tokA = termTokens(termA);
			const tokB = termTokens(termB);
			if (tokA.every((t) => tokB.includes(t)) || tokB.every((t) => tokA.includes(t))) continue;

			const docsB = termDocSets.get(termB)!;

			// Count shared chapter-level docs
			let overlap = 0;
			for (const d of docsA) {
				if (docsB.has(d)) overlap++;
			}

			// Cross-referenced terms from the Table of Catholic Truths get a boost
			// even with minimal co-occurrence (these are expert-curated relationships)
			const isCrossRef = hasCrossRef(termA, termB);

			if (overlap > 0 || isCrossRef) {
				// Jaccard similarity: overlap / union
				const union = Math.max(docsA.size + docsB.size - overlap, 1);
				const jaccard = overlap / union;
				// IDF weight: prefer specific terms over common ones
				const idfB = idf.get(termB) ?? 0;
				const idfMax = Math.log(N);
				const idfWeight = idfB / idfMax; // 0..1, higher = rarer
				// Minimum overlap threshold (waived for cross-referenced terms)
				if (!isCrossRef) {
					const minOverlap = tokB.length > 1 ? 2 : 3;
					if (overlap < minOverlap) continue;
				}
				// Score: Jaccard * IDF + cross-reference bonus
				let score = jaccard * idfWeight;
				if (isCrossRef) score += 0.5; // strong boost for expert-curated links
				scores.push({ term: termB, score });
			}
		}

		// Sort by score descending, take top N
		scores.sort((a, b) => b.score - a.score);
		const topRelated = scores.slice(0, MAX_SUGGESTIONS).map((s) => s.term);

		if (topRelated.length > 0) {
			suggestions[termA] = topRelated;
		}
	}

	// 5. Also build a lowercase lookup index for runtime matching
	//    (user might search "baptism" but the term is stored as "Baptism")
	const lookupIndex: Record<string, string> = {};
	for (const term of Object.keys(suggestions)) {
		lookupIndex[normalizeForLookup(term)] = term;
		// Also index individual significant words for partial matching
		const tokens = termTokens(term);
		if (tokens.length === 1 && tokens[0].length > 3) {
			lookupIndex[tokens[0]] = term;
		}
	}

	const output = { suggestions, lookup: lookupIndex };
	const json = JSON.stringify(output);
	const outPath = join(DATA_DIR, 'search-suggestions.json');
	await writeFile(outPath, json);
	console.log(
		`  Output: ${Object.keys(suggestions).length} terms with suggestions (${(json.length / 1024).toFixed(1)} KB)`
	);
	console.log(`  → ${outPath}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

buildSuggestions().catch((e) => {
	console.error(e);
	process.exit(1);
});
