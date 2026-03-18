import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ODR_SOURCE = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR', 'ODR');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	const files = await readdir(ODR_SOURCE);
	let count = 0;

	for (const file of files) {
		if (!file.endsWith('.json')) continue;

		const raw = await readFile(join(ODR_SOURCE, file), 'utf-8');
		const data = JSON.parse(raw);

		// Skip non-book files (e.g. 00-intro.json)
		if (!data.book) continue;

		// Derive slug: strip leading NN- prefix
		const slug = file.replace(/^\d+-/, '').replace('.json', '');

		await writeFile(join(OUT_DIR, `${slug}.json`), JSON.stringify(data));
		count++;
		console.log(`✓ ${slug}`);
	}

	console.log(`\nPrepared ${count} books → ${OUT_DIR}`);
}

main().catch(console.error);
