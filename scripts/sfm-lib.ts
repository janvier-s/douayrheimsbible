/**
 * Shared helpers for the one-off USFM extraction scripts
 * (`extract-drc-reference.ts`, `extract-haydock-reference.ts`).
 *
 * These three functions were copy-pasted between those scripts and had begun to
 * drift: `readSfm` was still byte-identical, `writeJson` had picked up two
 * different log formats, and `cleanInline` had gained Haydock-only footnote
 * rules on one side. They are reconciled here, with the Haydock-specific rules
 * behind an explicit option so they cannot silently apply to other sources.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export function readSfm(srcDir: string, filename: string): string {
	return readFileSync(join(srcDir, filename), 'utf-8');
}

export function writeJson(outDir: string, subdir: string, slug: string, data: unknown): void {
	const dir = join(outDir, subdir);
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${slug}.json`);
	writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
	console.log(`  wrote ${file}`);
}

export interface CleanInlineOptions {
	/**
	 * Strip `\f ... \f*` footnotes and `{ ... |}` curly-brace footnotes.
	 *
	 * Haydock's source marks commentary footnotes this way. Other sources use
	 * braces for legitimate text, so this stays off unless asked for.
	 */
	stripFootnotes?: boolean;
}

export function cleanInline(text: string, opts: CleanInlineOptions = {}): string {
	let out = text
		// \w word\w* → word
		.replace(/\\w\s+/g, '')
		.replace(/\\w\*/g, '')
		// \rq ref\rq* → ref  (must remove \rq* BEFORE \rq to avoid leaving *)
		.replace(/\\rq\*/g, '')
		.replace(/\\rq/g, ' ')
		// \it text\it* → <i>text</i>
		.replace(/\\it\s+/g, '<i>')
		.replace(/\\it\*/g, '</i>')
		// \em text\em* → <i>text</i>
		.replace(/\\em\s+/g, '<i>')
		.replace(/\\em\*/g, '</i>');

	if (opts.stripFootnotes) {
		out = out
			// Strip \f footnotes (inline: \f ... \f*)
			.replace(/\\f\s+.*?\\f\*/gs, '')
			// Strip curly-brace footnotes used by Haydock: { text |}
			.replace(/\{[^}]*\|?\}/g, '');
	}

	return (
		out
			// remove other backslash markers that might remain
			.replace(/\\ib\d*/g, '')
			.replace(/\\iq\b/g, '')
			.replace(/\\b\d*/g, '')
			// remove stray backslash-tag remnants (e.g. \tcr)
			.replace(/\\[a-z]+\d*/g, '')
			// remove <> artifacts from source
			.replace(/<>/g, ' ')
			// collapse multiple spaces
			.replace(/\s{2,}/g, ' ')
			.trim()
	);
}
