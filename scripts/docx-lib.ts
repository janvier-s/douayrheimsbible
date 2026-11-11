// scripts/docx-lib.ts
// @ts-nocheck: build helper run with tsx
// DOCX export through pandoc. The Markdown is rendered by epub-lib.ts and
// shared with the EPUB. This file owns what is DOCX-specific: the styled
// reference document, the title page (title, subtitle, cover, page break),
// and a structural check of the finished file.

import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { runPandoc } from './epub-lib.js';

export const PAGE_BREAK = '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n';

const FONT = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman" />';

/** Rewrites pandoc's default styles.xml: serif fonts, black centered headings, justified body. */
export function restyle(styles: string): string {
	let s = styles.replace(
		/(<w:rPrDefault>\s*<w:rPr>\s*)<w:rFonts[^>]*\/>/,
		`$1${FONT}`
	);
	const patch = (id: string, size: number | null) => {
		const re = new RegExp(`(<w:style [^>]*w:styleId="${id}"[\\s\\S]*?)(</w:style>)`);
		s = s.replace(re, (_m, body, end) => {
			body = body
				.replace(/<w:rFonts[^>]*\/>/, FONT)
				.replace(/<w:color[^>]*\/>/, '')
				.replace(/<\/w:pPr>/, '<w:jc w:val="center" /></w:pPr>');
			if (size) body = body.replace(/<w:sz w:val="\d+" \/>/, `<w:sz w:val="${size}" />`);
			return body + end;
		});
	};
	patch('Heading1', 36);
	patch('Heading2', 30);
	patch('Heading3', 24);
	patch('Title', 56);
	patch('Subtitle', 28);
	// The abstract heading is pandoc's; the title page needs only the cover.
	s = s.replace(
		/(<w:style [^>]*w:styleId="AbstractTitle"[\s\S]*?)(<\/w:style>)/,
		(_m, body, end) => body.replace(/<w:rPr>/, '<w:rPr><w:vanish />') + end
	);
	s = s.replace(
		/(<w:style [^>]*w:styleId="BodyText"[\s\S]*?<w:pPr>[\s\S]*?)(<\/w:pPr>)/,
		'$1<w:jc w:val="both" />$2'
	);
	return s;
}

/** Builds reference.docx in `dir` from pandoc's default and returns its path. */
export function makeReferenceDocx(dir: string): string {
	const pandoc = process.env.PANDOC ?? 'pandoc';
	const base = join(dir, 'reference-default.docx');
	const unpacked = join(dir, 'ref');
	execFileSync(pandoc, ['-o', base, '--print-default-data-file', 'reference.docx']);
	mkdirSync(unpacked, { recursive: true });
	execFileSync('unzip', ['-q', '-o', base, '-d', unpacked]);
	const stylesPath = join(unpacked, 'word', 'styles.xml');
	writeFileSync(stylesPath, restyle(readFileSync(stylesPath, 'utf8')));
	const out = join(dir, 'reference.docx');
	rmSync(out, { force: true });
	execFileSync('zip', ['-q', '-r', '-X', out, '.'], { cwd: unpacked });
	return out;
}

/** Title page lives in the abstract so it precedes the table of contents. */
export function writeFrontMatter(dir: string, cover: string, name: string): string {
	const path = join(dir, `front-${name}.yaml`);
	const abstract = `![Title page of the 1582 Rheims New Testament](cover.jpg){width=4.2in}\n\n${PAGE_BREAK}`;
	writeFileSync(path, `abstract: |\n${abstract.replace(/^/gm, '  ')}\n`);
	return path;
}

export function buildDocx(markdown: string, meta, outPath: string, ctx: { work: string; cover: string; reference: string }) {
	const frontFile = writeFrontMatter(ctx.work, ctx.cover, meta.identifier.replace(/\W+/g, '-'));
	runPandoc('docx', `${markdown.replace(/^/, PAGE_BREAK + '\n')}`, { ...meta, referenceDoc: ctx.reference, frontFile, cwd: ctx.work }, outPath);
}

/** Structural check: the zip is sound and every XML part is well formed. */
export function checkDocx(path: string): string[] {
	const problems: string[] = [];
	const t = spawnSync('unzip', ['-tq', path], { encoding: 'utf8' });
	if (t.status !== 0) return [`unzip -t failed: ${t.stdout}${t.stderr}`];
	const parts = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8' }).split('\n').filter((p) => /\.(xml|rels)$/.test(p));
	for (const part of parts) {
		const xml = execFileSync('unzip', ['-p', path, part.replace(/[[\]*?]/g, '\\$&')], { maxBuffer: 1 << 29 });
		const r = spawnSync('xmllint', ['--noout', '-'], { input: xml, encoding: 'utf8', maxBuffer: 1 << 26 });
		if (r.status !== 0) problems.push(`${part}: ${r.stderr.split('\n')[0]}`);
	}
	if (!parts.includes('word/document.xml')) problems.push('no word/document.xml');
	return problems;
}
