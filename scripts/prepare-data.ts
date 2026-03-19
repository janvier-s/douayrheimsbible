import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ODR_SOURCE = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR', 'ODR');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');

async function main() {
	// Source data lives in SCRIPTURA (local only) — skip gracefully on CI where
	// static/data/odr/ is already committed and doesn't need regeneration.
	try {
		await readdir(ODR_SOURCE);
	} catch {
		console.log(`Source not found at ${ODR_SOURCE} — skipping (using committed data).`);
		return;
	}

	await mkdir(OUT_DIR, { recursive: true });

	const files = await readdir(ODR_SOURCE);
	let count = 0;

	for (const file of files) {
		if (!file.endsWith('.json')) continue;

		const raw = await readFile(join(ODR_SOURCE, file), 'utf-8');
		const data = JSON.parse(raw);

		// Skip non-book files (e.g. 00-intro.json)
		if (!data.book) continue;

		// Derive slug: strip leading NN- prefix, normalise known spelling variants
		const rawSlug = file.replace(/^\d+-/, '').replace('.json', '');
		const SLUG_MAP: Record<string, string> = {
			'prayer-of-manasseh': 'prayer-of-manasses'
		};
		const slug = SLUG_MAP[rawSlug] ?? rawSlug;

		await writeFile(join(OUT_DIR, `${slug}.json`), JSON.stringify(data));
		count++;
		console.log(`✓ ${slug}`);
	}

	console.log(`\nPrepared ${count} books → ${OUT_DIR}`);
}

main().catch(console.error);
