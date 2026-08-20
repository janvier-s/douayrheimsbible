/**
 * Regenerates scripts/data/kjv-psalm-titles.json from the KJV USFM.
 *
 * The KJV prints a psalm's superscription as an unnumbered heading above verse
 * 1, and USFM carries it as a \d (descriptive title) marker. The conversion
 * that produced static/data/kjv dropped it, so the compare view had nothing to
 * show on the row where the Douay-Rheims prints its own title as verse 1.
 *
 * 116 of the 150 psalms have one. The other 34 are untitled in Hebrew, so
 * their absence here is the correct reading, not a gap.
 *
 * Run with: npx tsx scripts/generate-kjv-psalm-titles.ts
 * Requires the SCRIPTURA sources; the generated JSON is committed so builds
 * without them still get the titles.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, '..');
const USFM = join(
	PROJECT_ROOT,
	'..',
	'SCRIPTURA',
	'sources',
	'ODR',
	'KJV',
	'eng-kjv_usfm',
	'20-PSAeng-kjv.usfm'
);
const OUT = join(HERE, 'data', 'kjv-psalm-titles.json');

/** Reduces a \d line to the words it prints. */
function plainTitle(usfm: string): string {
	return (
		usfm
			.replace(/\\\+?w\s+([^|\\]*)\|[^\\]*\\\+?w\*/g, '$1') // \w Psalm|strong="H4210"\w*
			// Closing tags first: \add* would otherwise lose its backslash to the
			// opening-tag rule and leave a stray asterisk in the text.
			.replace(/\\\+?(?:nd|add|it|qs)\*/g, '')
			.replace(/\\\+?(?:nd|add|it|qs)\s/g, '')
			.replace(/\\[a-z]+\*?/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	);
}

async function main() {
	const usfm = await readFile(USFM, 'utf-8');
	const titles: Record<string, string> = {};
	const parts = usfm.split(/\\c (\d+)/);
	for (let i = 1; i < parts.length - 1; i += 2) {
		const chapter = parseInt(parts[i], 10);
		// Stop at the next chapter so a title is never read from the wrong psalm.
		const body = parts[i + 1];
		const m = body.match(/\\d ([^\n]*)/);
		if (!m) continue;
		const title = plainTitle(m[1]);
		if (title) titles[String(chapter)] = title;
	}

	const rows = Object.entries(titles)
		.map(([ch, t]) => `\t${JSON.stringify(ch)}: ${JSON.stringify(t)}`)
		.join(',\n');
	await writeFile(OUT, `{\n${rows}\n}\n`);
	console.log(`kjv psalm titles: ${Object.keys(titles).length} of 150 psalms`);
	for (const ch of ['3', '38', '51', '145']) {
		if (titles[ch]) console.log(`  ${ch}: ${titles[ch]}`);
	}
}

main();
