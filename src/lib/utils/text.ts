/** Strip <cr>, <na> tags and their content; keep only <i> as HTML italic. */
export function stripTags(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<(?!\/?i\b)[^>]*>/gi, '')
		.replace(/  +/g, ' ')
		.trim();
}

/** Convert ALL CAPS words (2+ letters) to capitalized small-caps spans, then
 *  merge adjacent spans so "THE LORD GOD" becomes one span, not three.
 *  Capitalization: first letter upper, rest lower — font-variant:small-caps
 *  then renders the lowercase letters as small capitals (the standard technique).
 *  e.g. "LORD GOD" → '<span class="sc">Lord God</span>' */
export function allcapsToSmallcaps(html: string): string {
	// Pass 1: wrap each ALL-CAPS word individually
	let result = html.replace(/(?<![<\w/])(\b[A-Z]{2,}\b)(?![^<]*>)/g, (_, word: string) => {
		const capitalized = word.charAt(0) + word.slice(1).toLowerCase();
		return `<span class="sc">${capitalized}</span>`;
	});
	// Pass 2: merge consecutive small-caps spans separated only by whitespace
	// so multi-word phrases render as a single span rather than broken up.
	result = result.replace(/<\/span>(\s+)<span class="sc">/g, '$1');
	return result;
}
