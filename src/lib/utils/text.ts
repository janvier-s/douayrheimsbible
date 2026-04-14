/** Strip <cr>, <na> tags and their content; keep only <i> as HTML italic. */
export function stripTags(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<(?!\/?i\b)[^>]*>/gi, '')
		.replace(/  +/g, ' ')
		.trim();
}

/** Normalize a single ALL-CAPS word to "First letter upper, rest lower" form
 *  so font-variant:small-caps can render the lowercase letters as small caps. */
function normalizeWord(word: string): string {
	return word.charAt(0) + word.slice(1).toLowerCase();
}

/** Convert ALL CAPS words (2+ letters) to capitalized small-caps spans, then
 *  merge adjacent spans so "THE LORD GOD" becomes one span, not three.
 *  Also handles <sc>…</sc> element tags from source JSON by normalizing
 *  their ALL-CAPS content and converting to <span class="sc">.
 *  Capitalization: first letter upper, rest lower — font-variant:small-caps
 *  then renders the lowercase letters as small capitals (the standard technique).
 *  e.g. "LORD GOD" → '<span class="sc">Lord God</span>' */
export function allcapsToSmallcaps(html: string): string {
	// Step 0: convert <sc>…</sc> element tags (from source JSON) to spans,
	// normalizing ALL CAPS words inside so font-variant:small-caps takes effect.
	let result = html.replace(/<sc>([\s\S]*?)<\/sc>/g, (_, content: string) => {
		const normalized = content.replace(/\b([A-Z]{2,})\b/g, normalizeWord);
		return `<span class="sc">${normalized}</span>`;
	});
	// Pass 1: wrap each remaining bare ALL-CAPS word individually
	result = result.replace(/(?<![<\w/])(\b[A-Z]{2,}\b)(?![^<]*>)/g, (_, word: string) => {
		return `<span class="sc">${normalizeWord(word)}</span>`;
	});
	// Pass 2: merge consecutive small-caps spans separated only by whitespace
	// so multi-word phrases render as a single span rather than broken up.
	result = result.replace(/<\/span>(\s+)<span class="sc">/g, '$1');
	return result;
}
