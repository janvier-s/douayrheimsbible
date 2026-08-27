/**
 * OSIS range types and parsing.
 *
 * Deliberately dependency-free. `bible-passage-reference-parser` compiles to a
 * ~150KB chunk, and most consumers only need to read an OSIS string that has
 * already been produced elsewhere (from `data-osis` attributes, stored
 * cross-references, or the parser's own output). Keeping `parseOsis` in its own
 * module means those consumers do not pull the grammar in with it.
 *
 * Import the grammar-backed helpers (`parseReference`, `parseAllReferences`)
 * from `./reference` only where free-text input actually has to be parsed.
 */

export interface OsisRange {
	/** Raw OSIS string e.g. "Matt.3.2-Matt.3.12" */
	osis: string;
	/** OSIS book code e.g. "Matt" */
	book: string;
	startChapter: number;
	startVerse?: number;
	endChapter: number;
	endVerse?: number;
}

export function parseOsis(osis: string): OsisRange | null {
	// Formats: "Book.Ch", "Book.Ch.V", "Book.Ch.V-Book.Ch.V", "Book.Ch-Book.Ch"
	const rangeMatch = osis.match(/^([^.]+)\.(\d+)(?:\.(\d+))?(?:-[^.]+\.(\d+)(?:\.(\d+))?)?$/);
	if (!rangeMatch) return null;

	const [, book, sCh, sV, eCh, eV] = rangeMatch;
	return {
		osis,
		book,
		startChapter: parseInt(sCh, 10),
		startVerse: sV ? parseInt(sV, 10) : undefined,
		endChapter: eCh ? parseInt(eCh, 10) : parseInt(sCh, 10),
		endVerse: eV ? parseInt(eV, 10) : sV ? parseInt(sV, 10) : undefined
	};
}
