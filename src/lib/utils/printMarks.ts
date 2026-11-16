import type { VerseNote } from '$lib/data/types';

/**
 * The marks the 1582 Rheims New Testament prints in its text, used in place of
 * our numbered labels when the original spelling is shown.
 *
 *   *  a margin citation (every <cr>)
 *   ∷  a margin gloss on a word or phrase (gloss, word)
 *   ‖  the catchword of an annotation (drawn by CSS before each tinted lemma)
 *
 * Side headings, lectionary notes and glosses flagged `unmarked` stand in the
 * margin with no mark in the text. They still need something to click, so they
 * get ◦, the sign the annotations already use for an unmarked margin note.
 */
export const PRINT_CITATION_MARK = '*';
export const PRINT_GLOSS_MARK = '∷';
export const PRINT_UNMARKED_MARK = '◦';

export function printNoteMark(note: VerseNote | undefined): string {
	if (!note) return PRINT_GLOSS_MARK;
	if (note.unmarked || note.table_only) return PRINT_UNMARKED_MARK;
	if (note.kind === 'lectionary' || note.kind === 'head') return PRINT_UNMARKED_MARK;
	return PRINT_GLOSS_MARK;
}

/** label → printed mark, for the notes of one verse. */
export function printNoteMarks(notes: VerseNote[] | undefined): Map<string, string> {
	return new Map((notes ?? []).map((n) => [n.label, printNoteMark(n)]));
}
