// @ts-nocheck — build script run with tsx, not part of the Svelte app
/**
 * Mirrors the original-spelling data (kept outside the repo) into
 * static/data/odr-original so it ships as static assets and the runtime URL
 * /data/odr-original/... stays unchanged.
 *
 * Source: $ODR_ORIGINAL_DIR, default ../odr-original relative to the repo.
 * iCloud conflict copies ("001 2.json", "1-john 3.json") are never copied.
 *
 * Run: npx tsx scripts/sync-odr-original.ts   (also runs as predev / prebuild)
 */
import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const CONFLICT_COPY = /\s\d+(\.[^.]+)?$/;

export function resolveOriginalDir(env = process.env): string {
	return resolve(env.ODR_ORIGINAL_DIR || join(ROOT, '..', 'odr-original'));
}

export function syncOriginal(
	src = resolveOriginalDir(),
	dest = join(ROOT, 'static/data/odr-original')
) {
	if (!existsSync(src)) {
		if (existsSync(dest)) {
			console.log(`odr-original source not found at ${src} — keeping existing ${dest}`);
			return 0;
		}
		throw new Error(
			`odr-original source not found at ${src}. Set ODR_ORIGINAL_DIR to the original-spelling data folder.`
		);
	}
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(dest, { recursive: true });
	let n = 0;
	cpSync(src, dest, {
		recursive: true,
		filter: (p) => {
			const base = p.split('/').pop();
			if (base === '.DS_Store' || base.endsWith('.icloud')) return false;
			if (CONFLICT_COPY.test(base)) return false;
			if (statSync(p).isFile()) n++;
			return true;
		}
	});
	console.log(`Synced ${n} original-spelling files from ${src}`);
	return n;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	syncOriginal();
}
