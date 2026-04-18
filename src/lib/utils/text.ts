/** Strip <cr>, <na> tags and their content; keep only <i> as HTML italic.
 *  Also strips USFM word-level markup (\+w WORD|strong="HXXXX"\+w*) and ¶ pilcrow markers. */
export function stripTags(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<(?!\/?i\b)[^>]*>/gi, '')
		.replace(/\\\+w\s+(.*?)\|[^\\]*\\\+w\*/g, '$1')
		.replace(/¶\s*/g, '')
		.replace(/[\[\]]/g, '')
		.replace(/  +/g, ' ')
		.trim();
}

/** Minor words that should be fully lowercase in small-caps text (title-case
 *  convention). Articles, prepositions, conjunctions, common pronouns & auxiliaries.
 *  Fully-lowercase letters render as uniform small capitals with font-variant:small-caps,
 *  while a leading uppercase letter renders as a full-size capital. */
const SC_MINOR = new Set([
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'but',
	'by',
	'for',
	'from',
	'had',
	'has',
	'have',
	'he',
	'her',
	'him',
	'his',
	'if',
	'in',
	'into',
	'is',
	'it',
	'its',
	'may',
	'no',
	'nor',
	'not',
	'of',
	'on',
	'or',
	'our',
	'shall',
	'so',
	'than',
	'that',
	'the',
	'their',
	'them',
	'then',
	'they',
	'this',
	'to',
	'up',
	'upon',
	'us',
	'was',
	'we',
	'were',
	'who',
	'whom',
	'will',
	'with',
	'yet',
	'you',
	'your'
]);

/** Normalize an ALL-CAPS word for small-caps rendering.
 *  Minor/function words → fully lowercase (uniform small caps).
 *  Content words → first letter upper, rest lower (full-size initial cap). */
function normalizeScWord(word: string): string {
	const lower = word.toLowerCase();
	if (SC_MINOR.has(lower)) return lower;
	return word.charAt(0) + word.slice(1).toLowerCase();
}

/** Convert ALL CAPS words (2+ letters) to capitalized small-caps spans, then
 *  merge adjacent spans so "THE LORD GOD" becomes one span, not three.
 *  Also handles <sc>…</sc> element tags from source JSON by normalizing
 *  their ALL-CAPS content and converting to <span class="sc">.
 *  Uses title-case rules: minor words (articles, prepositions, conjunctions)
 *  are fully lowercased for uniform small caps; content words keep an
 *  initial capital. The first letter of each merged span is always capitalized.
 *  e.g. "THE HOLY GHOST" → '<span class="sc">the Holy Ghost</span>'
 *     → after Pass 3: '<span class="sc">The Holy Ghost</span>' */
export function allcapsToSmallcaps(html: string): string {
	// Step 0: convert <sc>…</sc> element tags (from source JSON) to spans,
	// normalizing capitalized words inside (Title Case and ALL CAPS) via
	// the minor-word list so function words become uniform small caps.
	let result = html.replace(/<sc>([\s\S]*?)<\/sc>/g, (_, content: string) => {
		const normalized = content.replace(/\b([A-Z][a-zA-Z]*)\b/g, (w) => normalizeScWord(w));
		return `<span class="sc">${normalized}</span>`;
	});
	// Pass 1: wrap each remaining bare ALL-CAPS word individually.
	// Unlike <sc> content (which has author-chosen Title Case indicating proper nouns),
	// bare ALL CAPS is ambiguous — we can't tell "FIRST" (common) from "CHURCH" (proper).
	// Lowercase everything; Pass 3 capitalizes the first letter of each merged span.
	result = result.replace(/(?<![<\w/])(\b[A-Z]{2,}\b)(?![^<]*>)/g, (_, word: string) => {
		return `<span class="sc">${word.toLowerCase()}</span>`;
	});
	// Pass 2: merge consecutive small-caps spans separated by whitespace or
	// within-sentence punctuation (commas, semicolons, colons, dashes).
	// Lookbehind ensures only <span class="sc"> closings are merged (not other spans
	// like <span class="summary-verse-ref">).
	result = result.replace(
		/(?<=<span class="sc">[^<]*)<\/span>([,;:\-\u2014\u2013\s]+)<span class="sc">/g,
		'$1'
	);
	// Pass 3: ensure the first letter of each span is always capitalized
	// (handles cases where a minor word ends up first after merge).
	result = result.replace(
		/<span class="sc">([a-z])/g,
		(_, ch: string) => `<span class="sc">${ch.toUpperCase()}`
	);
	return result;
}
