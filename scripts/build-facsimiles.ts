/**
 * Convert the Sancta Clara Press facsimile scans into web-sized WebP files.
 *
 *   npx tsx scripts/build-facsimiles.ts [srcDir] [outDir]
 *
 * Defaults: ~/facsimiles/sancta -> ~/facsimiles/web. Output is NOT committed; it is
 * uploaded to object storage and served from PUBLIC_FACSIMILE_BASE.
 *
 *   <book>/<chapter>/<n>.webp     1400px wide, for the viewer
 *   <book>/<chapter>/<n>-t.webp    320px wide, for thumbnails
 *
 * Book slugs follow this repo (isaie, jeremie, malachie), not Sancta's. Resumable:
 * existing outputs are skipped.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const src = process.argv[2] ?? join(homedir(), 'facsimiles/sancta');
const out = process.argv[3] ?? join(homedir(), 'facsimiles/web');
const RENAME: Record<string, string> = {
	isaias: 'isaie',
	jeremias: 'jeremie',
	malachias: 'malachie'
};
const CONCURRENCY = 6;

const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8')) as {
	chapters: Record<string, string[]>;
};

const jobs: { from: string; to: string }[] = [];
for (const all of Object.values(manifest.chapters)) {
	// Where a chapter has a <ch>/hires/ set (a better scan of the same pages), use only that.
	const hires = all.filter((r) => r.includes('/hires/'));
	const files = hires.length ? hires : all;
	for (const rel of files) {
		// Some New Testament scans live under <book>/<ch>/hires/<n>.jpg.
		const parts = rel.split('/');
		const book = parts[0];
		const ch = parts[1];
		const n = parts[parts.length - 1].replace(/\.jpg$/, '');
		const dir = join(out, RENAME[book] ?? book, ch);
		jobs.push({ from: join(src, rel), to: join(dir, `${n}.webp`) });
	}
}

let done = 0;
let failed = 0;
async function convert({ from, to }: { from: string; to: string }) {
	const thumb = to.replace(/\.webp$/, '-t.webp');
	if (existsSync(to) && existsSync(thumb)) return;
	if (!existsSync(from)) {
		failed++;
		console.warn('missing source', from);
		return;
	}
	mkdirSync(dirname(to), { recursive: true });
	const img = sharp(from, { failOn: 'none' });
	await img
		.clone()
		.resize({ width: 1400, withoutEnlargement: true })
		.webp({ quality: 78 })
		.toFile(to);
	await img.clone().resize({ width: 320 }).webp({ quality: 70 }).toFile(thumb);
}

async function worker() {
	while (jobs.length) {
		const job = jobs.pop()!;
		try {
			await convert(job);
		} catch (e) {
			failed++;
			console.warn('failed', job.from, (e as Error).message);
		}
		if (++done % 250 === 0) console.log(`${done} done, ${failed} failed`);
	}
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`finished: ${done} processed, ${failed} failed`);
