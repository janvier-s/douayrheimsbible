/** Strip <cr>, <na> tags and their content; keep only <i> as HTML italic. */
export function stripTags(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<(?!\/?i\b)[^>]*>/gi, '')
		.replace(/  +/g, ' ')
		.trim();
}

/** Convert ALL CAPS words (2+ letters) to capitalized small-caps spans.
 *  e.g. "JESUS" → '<span class="sc">Jesus</span>' */
export function allcapsToSmallcaps(html: string): string {
	return html.replace(/(?<![<\w/])(\b[A-Z]{2,}\b)(?![^<]*>)/g, (_, word: string) => {
		const capitalized = word.charAt(0) + word.slice(1).toLowerCase();
		return `<span class="sc">${capitalized}</span>`;
	});
}
