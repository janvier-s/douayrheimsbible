// scripts/odr-corpus-json.ts
// Reading and writing the committed ODR corpus without disturbing it.
//
// static/data/odr/ is hand-maintained and checked in (see the note in
// prepare-data.ts), and it is a mix of minified and 2-space-indented JSON: 52
// of the 78 book files are minified, 26 are not, and the annotation sidecars
// vary the same way. A codemod that reformats what it touches buries its own
// change in a diff of the whole file, so every write goes back the way it was
// found.

import { readFileSync } from 'fs';

export interface CorpusFile<T = unknown> {
	/** The file exactly as it was on disk, kept so the write can match it. */
	raw: string;
	data: T;
}

export function readJson<T = unknown>(path: string): CorpusFile<T> {
	const raw = readFileSync(path, 'utf-8');
	return { raw, data: JSON.parse(raw) as T };
}

/** The data as this file would have written it: same indentation, same trailing
 *  newline or none. */
export function serialize(raw: string, data: unknown): string {
	const pretty = raw.startsWith('{\n') || raw.startsWith('[\n');
	const out = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
	return raw.endsWith('\n') ? `${out}\n` : out;
}
