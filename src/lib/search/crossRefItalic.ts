/**
 * Italic-reference linkification.
 *
 * Split out from `crossRefParser.ts` because these two functions are the only
 * things in that module that need `bible-passage-reference-parser`, which
 * compiles to a ~150KB chunk. Keeping them here means the tokenizer and the
 * other linkifiers (used by ChapterView and CrossRefText on the reader route)
 * no longer drag the grammar into the reader's eager module graph.
 */

import type { OsisRange } from './osis';
import { parseAllReferences } from './reference';
import { ABBREV_TO_OSIS, normalizeForParser, refUrl } from './crossRefParser';

export function parseItalicRef(text: string, conservative = false): OsisRange[] | null {
	// Quick check: if text has no digits, it's unlikely to be a reference
	if (!/\d/.test(text)) return null;

	// Check for patristic / non-biblical indicators — author names, work structures, Latin terms
	if (
		/\b(?:Homi|ho|Epist|Serm|Ser|Tract|lib|li|cont|Baptis|Martyres|Dialog|adv|Poenit|principio|Iovinian|Ambr|Hiero|Greg|Origen|Orig|Aug|Chrys|Clem|Cypr|Cyril|Iren|Tert|Ath|Bas|Epiph|Hilar|Isid|Prosp|Cassi|Alcuin|Bede|Anselm|Aquin|Bernard|Annot|Testa|Praef|Conc|Decret)\b/i.test(
			text
		)
	)
		return null;

	// Latin citation context: "in c. 2.", "c. 8. v. 34.", "sub finem", "prope finem", "l. 2. de", "ad Ro."
	if (/\b(?:prope|finem|ibidem|supra|infra)\b/i.test(text)) return null;
	if (/\bc\.\s*\d/i.test(text)) return null;
	if (/\bsub\s+\w/i.test(text)) return null;
	if (/\bl\.\s*\d/i.test(text)) return null;
	if (/\bad\s+[A-Z]/i.test(text)) return null;

	// Greek text mixed with refs — likely a scholarly citation, not a standalone reference
	if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(text)) return null;

	// Four-digit year = publication reference, not Bible
	if (/\b1[4-9]\d{2}\b/.test(text)) return null;

	// Conservative mode: extra checks for reference pages with mixed patristic content
	if (conservative) {
		// Reject if text starts with a bare number+period followed by an abbreviation
		// that is NOT a known numbered book. "1. Lu. v. 78." → "1Lu" not in map → reject.
		// But "1. Cor. 4, 1." → "1Cor" IS in map → allow.
		const leadingMatch = text.match(/^\s*(\d+)\.\s+([A-Z][a-z]\w*)/);
		if (leadingMatch) {
			const numberedKey = leadingMatch[1] + leadingMatch[2];
			if (!ABBREV_TO_OSIS[numberedKey]) {
				return null;
			}
		}
		// Reject if text contains lowercase Latin words mixed with refs
		// (genuine refs are mostly abbreviations + numbers)
		const stripped = text
			.replace(/<[^>]+>/g, '')
			.replace(/\d+/g, '')
			.replace(/[.,;:&v]/g, '')
			.trim();
		const words = stripped.split(/\s+/).filter((w) => w.length > 2);
		const lowerWords = words.filter((w) => w[0] === w[0].toLowerCase());
		if (lowerWords.length > 1) return null;
	}

	const normalized = normalizeForParser(text);
	const refs = parseAllReferences(normalized);

	return refs.length > 0 ? refs : null;
}

/**
 * Preprocess an HTML string: wrap <i> tags whose content parses as a Bible
 * reference in an <a class="verse-ref"> link. Non-ref italic spans are left untouched.
 */
export function linkifyItalicRefs(
	html: string,
	conservative = false,
	translationPrefix?: string
): string {
	return html.replace(/<i>([\s\S]*?)<\/i>/g, (match, content) => {
		const refs = parseItalicRef(content, conservative);
		if (!refs || refs.length === 0) return match;
		const osisStr = refs.map((r) => r.osis).join(',');
		const url = refUrl(osisStr, translationPrefix);
		return `<a class="verse-ref" data-osis="${osisStr}" href="${url}" target="_blank" rel="noopener"><i>${content}</i></a>`;
	});
}
