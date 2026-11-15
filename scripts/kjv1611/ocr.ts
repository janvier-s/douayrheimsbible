// OCR the downloaded 1611 page images with local Tesseract (eng, TSV, 3x upscale, --psm 1).
// Output: ~/facsimiles/kjv-1611/ocr/<page>.tsv. Skips pages that already have a TSV (resumable).
// Usage: npx tsx scripts/kjv1611/ocr.ts [BookPrefix ...]
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'fs';
import { homedir, tmpdir, cpus } from 'os';
import { join } from 'path';

const run = promisify(execFile);
const HOME = join(homedir(), 'facsimiles/kjv-1611');
const PAGES = join(HOME, 'pages');
const OUT = join(HOME, 'ocr');
mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), 'kjv1611-ocr');
mkdirSync(tmp, { recursive: true });

const index: Record<string, string[]> = JSON.parse(readFileSync(join(PAGES, 'index.json'), 'utf8'));
const prefixes = process.argv.slice(2);
const files = [
	...new Set(
		Object.entries(index)
			.filter(([k]) => k.startsWith('book:'))
			.flatMap(([, v]) => v)
	)
].filter((f) => !prefixes.length || prefixes.some((p) => f.startsWith(p + '-Chapter')));

async function ocr(file: string) {
	const base = file.replace(/\.webp$/, '');
	const tsv = join(OUT, base + '.tsv');
	if (existsSync(tsv)) return false;
	const png = join(tmp, base + '.png');
	await run('magick', [join(PAGES, file), '-resize', '300%', png]);
	await run('tesseract', [png, join(tmp, base), '--psm', '1', '-l', 'eng', 'tsv']);
	rmSync(png, { force: true });
	renameSync(join(tmp, base + '.tsv'), tsv);
	return true;
}

const todo = files.filter((f) => !existsSync(join(OUT, f.replace(/\.webp$/, '.tsv'))));
console.log(`${todo.length} of ${files.length} pages to OCR`);
let done = 0;
const workers = Math.max(1, Math.min(6, cpus().length - 2));
await Promise.all(
	Array.from({ length: workers }, async () => {
		for (let f = todo.shift(); f; f = todo.shift()) {
			try {
				await ocr(f);
			} catch (e) {
				console.error('FAIL', f, (e as Error).message.slice(0, 120));
			}
			if (++done % 50 === 0) console.log(`ocr ${done}`);
		}
	})
);
console.log('ocr complete');
