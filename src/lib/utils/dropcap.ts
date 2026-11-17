/** With small caps turned off, a chapter's opening <sc> run is unwrapped to
 *  plain text so the drop cap can still find its letter. */
export function stripOpeningSmallCaps(html: string): string {
	const mark = html.match(/^<mark [^<>]*>/);
	if (mark) return mark[0] + stripOpeningSmallCaps(html.slice(mark[0].length));
	return html.replace(/^<sc>([\s\S]*?)<\/sc>/, '$1');
}

/** Wrap the first letter of a chapter's rendered opening in a dropcap span.
 *
 *  The print sets a chapter's first word or phrase in capitals after the drop
 *  cap ("IN THE beginning"), which the reader shows as small caps. So when the
 *  text opens on a small-caps run, the cap comes out of that run and the rest
 *  of it stays in small caps: drop cap "I", then "n the" in small caps. */
export function injectDropcap(html: string): string {
	// A margin note the print sets with no mark in the text is still a button
	// at the verse start in study mode. Leave it in front and cap the letter after it.
	const lead = html.match(/^(?:<button [^<>]*>[^<]*<\/button>\s*)+/);
	if (lead) return lead[0] + injectDropcap(html.slice(lead[0].length));
	// A catchword that opens the verse would put its tint behind the dropcap,
	// and a block of colour behind a three-line letter reads as a mistake.
	// Find the letter inside the mark, then hoist the cap out in front of it.
	const mark = html.match(/^<mark [^<>]*>/);
	if (mark) {
		const inner = injectDropcap(html.slice(mark[0].length));
		const cap = inner.match(/^<span class="dropcap">[^<]*<\/span>/);
		return cap ? cap[0] + mark[0] + inner.slice(cap[0].length) : mark[0] + inner;
	}
	// A run that was only the cap itself ("A Psalm") leaves no span behind.
	const sc = html.match(/^<span class="sc">([A-Za-zÀ-ÿ])(<\/span>)?/);
	if (sc) {
		const reopen = sc[2] ? '' : '<span class="sc">';
		return `<span class="dropcap">${sc[1]}</span>${reopen}${html.slice(sc[0].length)}`;
	}
	return html.replace(/^([A-Za-zÀ-ÿ])/, '<span class="dropcap">$1</span>');
}
