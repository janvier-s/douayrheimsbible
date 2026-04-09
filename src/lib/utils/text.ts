/** Strip <cr>, <na> tags and their content; keep only <i> as HTML italic. */
export function stripTags(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<(?!\/?i\b)[^>]*>/gi, '')
		.replace(/  +/g, ' ')
		.trim();
}
