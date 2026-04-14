/**
 * Uploads the pre-built search indexes to Cloudflare KV.
 * Run after build-search-index.ts whenever the index changes.
 *
 * Usage:  npx tsx scripts/upload-search-index.ts
 * Requires CLOUDFLARE_API_TOKEN in env, or an active `wrangler login` session.
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'static', 'data', 'odr');

const INDEXES = [
	{ file: 'search-index.json', key: 'search-index' },
	{ file: 'search-notes-index.json', key: 'search-notes-index' }
];

async function upload() {
	for (const { file, key } of INDEXES) {
		const filePath = join(DATA_DIR, file);
		const content = await readFile(filePath, 'utf-8');
		const mb = (content.length / 1024 / 1024).toFixed(2);
		console.log(`Uploading ${key} (${mb} MB)…`);

		// wrangler kv key put reads value from stdin when given --stdin flag,
		// or from a file with --path. Use --path to avoid shell escaping issues.
		execSync(`npx wrangler kv key put --binding=SEARCH_INDEX "${key}" --path="${filePath}"`, {
			stdio: 'inherit'
		});

		console.log(`✓ ${key} uploaded`);
	}
}

upload().catch((e) => {
	console.error(e);
	process.exit(1);
});
