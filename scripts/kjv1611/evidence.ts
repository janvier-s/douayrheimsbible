// Long-s evidence from the 1611 page OCR.
// For each book: align the OCR word stream to the verse words of static/data/kjv-1611 (banded LCS on
// OCR-folded keys), then read what the OCR shows at every s. Writes
//   ~/facsimiles/kjv-1611/long-s-evidence.tsv   slug chapter verse offset word ocr verdict conf
//   ~/facsimiles/kjv-1611/cluster-policy.json   { OT|APOC|NT: { f|h|k|b: long|round } }
// Usage: npx tsx scripts/kjv1611/evidence.ts [--only=<site slug>]
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PAGE_BOOKS } from './fetch-pages';
import { sectionOf } from './slugs';
import { tokenize, type ClusterPolicy } from './lib';
import { foldCompare, sVerdicts, alignBanded } from './evidence-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HOME = join(homedir(), 'facsimiles/kjv-1611');
const DATA = join(ROOT, 'static/data/kjv-1611');
const BAND = 1500;
type OcrWord = { text: string; conf: number };

function readOcr(file: string): OcrWord[] {
	const p = join(HOME, 'ocr', file.replace(/\.webp$/, '.tsv'));
	if (!existsSync(p)) return [];
	const out: OcrWord[] = [];
	for (const line of readFileSync(p, 'utf8').split('\n').slice(1)) {
		const c = line.split('\t');
		if (c.length < 12 || c[0] !== '5') continue;
		const conf = Number(c[10]);
		const text = c[11]?.trim();
		if (text && conf >= 0) out.push({ text, conf });
	}
	return out;
}

function main() {
	const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
	const index: Record<string, string[]> = JSON.parse(
		readFileSync(join(HOME, 'pages/index.json'), 'utf8')
	);
	const rows: string[] = [];
	const counts = { long: 0, round: 0, none: 0 };
	const clusters: Record<string, Record<string, { long: number; round: number }>> = {};
	for (const [slug, groups] of Object.entries(PAGE_BOOKS)) {
		if (only && slug !== only) continue;
		const files = groups.flatMap((g) => index[`book:${g[0]}`] ?? []);
		if (!files.length) {
			console.log(`${slug}: no pages`);
			continue;
		}
		const ocr = files.flatMap(readOcr);
		const book = JSON.parse(readFileSync(join(DATA, `${slug}.json`), 'utf8'));
		const toks: { ch: number; v: number; text: string; start: number; raw: string }[] = [];
		for (const c of book.chapters)
			for (const v of c.verses) {
				if (v.modern) continue;
				const text = (v.text as string).replace(/ſ/g, 's');
				for (const t of tokenize(text)) {
					if (foldCompare(t.raw))
						toks.push({ ch: c.chapter, v: v.verse, text, start: t.start, raw: t.raw });
				}
			}
		const okeys = ocr.map((w) => foldCompare(w.text));
		const keep = okeys.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
		const m = alignBanded(
			toks.map((t) => foldCompare(t.raw)),
			keep.map((i) => okeys[i]),
			BAND
		);
		let aligned = 0;
		toks.forEach((t, i) => {
			const w = m[i] >= 0 ? ocr[keep[m[i]]] : undefined;
			const verdicts = w ? sVerdicts(t.raw, w.text) : [];
			if (w && verdicts.length) aligned++;
			const seen = new Set<number>();
			for (const vd of verdicts) {
				seen.add(vd.index);
				const offset = t.start + vd.index;
				rows.push([slug, t.ch, t.v, offset, t.raw, w!.text, vd.verdict, w!.conf].join('\t'));
				counts[vd.verdict]++;
				const nxt = t.text[offset + 1];
				if (nxt === 'f' || nxt === 'h' || nxt === 'k' || nxt === 'b') {
					const c = ((clusters[sectionOf(slug)] ??= {})[nxt] ??= { long: 0, round: 0 });
					c[vd.verdict]++;
				}
			}
			for (let k = 0; k < t.raw.length; k++) {
				if (t.raw[k] === 's' && !seen.has(k)) {
					rows.push(
						[slug, t.ch, t.v, t.start + k, t.raw, w?.text ?? '', 'none', w?.conf ?? ''].join('\t')
					);
					counts.none++;
				}
			}
		});
		console.log(`${slug}: ${toks.length} words, ${aligned} read, ocr ${ocr.length}`);
	}
	if (!only) {
		writeFileSync(
			join(HOME, 'long-s-evidence.tsv'),
			'slug\tchapter\tverse\toffset\tword\tocr\tverdict\tconf\n' + rows.join('\n') + '\n'
		);
		const policy: Record<string, ClusterPolicy> = {};
		for (const [sec, cl] of Object.entries(clusters))
			for (const [k, c] of Object.entries(cl)) {
				const n = c.long + c.round;
				if (n < 20 && !(n >= 5 && (c.long === 0 || c.round === 0))) continue;
				(policy[sec] ??= {})[k as 'f'] = c.long >= c.round ? 'long' : 'round';
			}
		writeFileSync(
			join(HOME, 'cluster-policy.json'),
			JSON.stringify({ policy, clusters, counts }, null, 1)
		);
	} else {
		writeFileSync(join(HOME, `long-s-evidence.${only}.tsv`), rows.join('\n') + '\n');
		console.log(JSON.stringify(clusters));
	}
	console.log(`verdicts: long ${counts.long} round ${counts.round} none ${counts.none}`);
}
main();
