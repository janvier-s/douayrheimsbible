import { bcv_parser } from 'bible-passage-reference-parser/esm/bcv_parser.js';
import * as lang from 'bible-passage-reference-parser/esm/lang/en.js';

const parser = new bcv_parser(lang);

const NORMALISE: [RegExp, string][] = [
	[/\bJosue\b/gi, 'Joshua'],
	[/\bIsaie\b/gi, 'Isaiah'],
	[/\bJeremie\b/gi, 'Jeremiah'],
	[/\bEzechiel\b/gi, 'Ezekiel'],
	[/\bOsee\b/gi, 'Hosea'],
	[/\bAbdias\b/gi, 'Obadiah'],
	[/\bJonas\b/gi, 'Jonah'],
	[/\bMicheas\b/gi, 'Micah'],
	[/\bHabacuc\b/gi, 'Habakkuk'],
	[/\bSophonias\b/gi, 'Zephaniah'],
	[/\bAggeus\b/gi, 'Haggai'],
	[/\bZacharias\b/gi, 'Zechariah'],
	[/\bMalachie\b/gi, 'Malachi'],
	[/\bMachabees\b/gi, 'Maccabees'],
	[/\bMachabee\b/gi, 'Maccabees'],
	[/\bTobias\b/gi, 'Tobit'],
	[/\bEcclus\b/gi, 'Sir'],
	[/\bEcclesiasticus\b/gi, 'Sir'],
	[/\b1\s*Paralipomenon\b/gi, '1 Chronicles'],
	[/\b2\s*Paralipomenon\b/gi, '2 Chronicles'],
	[/\bCanticle\s+of\s+Canticles\b/gi, 'Song of Solomon'],
	[/\bApocalypse\b/gi, 'Revelation'],
	[/\b1\s*Ma\b/gi, '1 Maccabees'],
	[/\b2\s*Ma\b/gi, '2 Maccabees'],
	[/\b1M\b/g, '1 Maccabees'],
	[/\b2M\b/g, '2 Maccabees']
];

function normaliseInput(input: string): string {
	return NORMALISE.reduce((s, [pat, rep]) => s.replace(pat, rep), input);
}

parser.set_options({
	book_alone_strategy: 'full_chapter',
	book_sequence_strategy: 'ignore',
	invalid_sequence_strategy: 'ignore',
	sequence_combination_strategy: 'combine',
	punctuation_strategy: 'us',
	zero_chapter_strategy: 'error',
	zero_verse_strategy: 'upgrade',
	single_chapter_1_strategy: 'chapter',
	osis_compaction_strategy: 'bc',
	captive_end_digits_strategy: 'delete',
	testaments: 'ona'
});

export interface ParsedReference {
	book: string;
	chapter: number;
	verse?: number;
}

export function parseReference(input: string): ParsedReference | null {
	const normalised = normaliseInput(input.trim()).replace(/^(\d)\s+/, '$1');

	const result = parser.parse(normalised);
	const passages = result.osis_and_indices();

	if (!passages.length) return null;

	const osisStr: string = passages[0].osis;

	// Handle range like "Mark.1-Mark.16" (book-alone with full_chapter strategy)
	const rangeMatch = osisStr.match(/^([^.]+)\.(\d+)-[^.]+\.\d+$/);
	if (rangeMatch) {
		return { book: rangeMatch[1], chapter: parseInt(rangeMatch[2], 10) };
	}

	const parts = osisStr.split('.');

	if (parts.length < 2) {
		return { book: parts[0], chapter: 1 };
	}

	return {
		book: parts[0],
		chapter: parseInt(parts[1], 10),
		verse: parts[2] ? parseInt(parts[2], 10) : undefined
	};
}
