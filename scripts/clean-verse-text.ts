// @ts-nocheck — build script helper run with tsx, not part of the Svelte app

/**
 * Clean translation verse text at build time so JSON/API consumers get clean
 * data. Kept in its own module so generate-knox-acrostics.ts can apply the
 * same cleaning when it locates acrostic initials in the source text, without
 * importing prepare-data.ts and setting its build off.
 */
export function cleanVerseText(text: string): string {
	return (
		text
			// KJV: USFM word-level markup  \+w WORD|strong="HXXXX"\+w*
			.replace(/\\\+w\s+(.*?)\|[^\\]*\\\+w\*/g, '$1')
			// KJV: USFM translator-added-words markup  \+add WORD(S)\+add*
			.replace(/\\\+add\s+(.*?)\\\+add\*/g, '$1')
			// KJV: pilcrow paragraph markers
			.replace(/¶\s*/g, '')
			// Vulgate: section bracket markers
			.replace(/[\[\]]/g, '')
			// Knox/DRC: inline footnote marker numbers glued to a word/punctuation, anywhere in
			// the verse (e.g. "...Christ.1 And" → "...Christ. And", "strength.8 Not" → "strength. Not")
			.replace(/([.;?!,)’”…:a-zA-Z])\d{1,2}(?=[\s)"'’”]|$)/g, '$1')
			// Collapse runs of whitespace
			.replace(/  +/g, ' ')
			.trim()
	);
}
