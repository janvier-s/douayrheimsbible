export interface ChangelogEntry {
	/** Display label, e.g. "1.6" or "Beta" */
	version: string;
	/** Human-readable date or range, e.g. "November 12, 2026" */
	date: string;
	/** ISO date of the release, used for the <time> element */
	iso: string;
	changes: string[];
}

/** Newest first. Written for readers: features and visible fixes only. */
export const CHANGELOG: ChangelogEntry[] = [
	{
		version: '1.6',
		date: 'November 12, 2026',
		iso: '2026-11-12',
		changes: [
			'Switch the Douay-Rheims text between modern and original spelling.',
			'New Facsimile tab in the study panel, with the original pages hosted on the site.',
			'Optional inline clarifications from Sancta Clara Press (CC BY 4.0), off by default.',
			'Verse-only download formats on the Downloads page.',
			'Copy annotations with their formatting intact.',
			'Updated Challoner statistics and reference pages.',
			'Removed a duplicated verse in 3 Esdras 2:1.',
			'Fixes to the mobile study panel and the Reading options menu.'
		]
	},
	{
		version: '1.5',
		date: 'August 22 to 31, 2026',
		iso: '2026-08-22',
		changes: [
			'New Glossa Ordinaria tab in the Vulgate study panel, with glossed verses underlined in the text.',
			'The Vulgate follows its own paragraph and poetry layout.',
			'Glossary and Textual Notes tabs added to the Vulgate panel.',
			'KJV marginal notes added, and the KJV psalm superscriptions restored. KJV psalms line up with the Vulgate numbering when you compare them.',
			'Words quoted by an annotation are tinted in place, replacing the old underline.',
			'Reading options regrouped into Appearance, Reading and Text Options, with tooltips and a bionic-bold option.',
			'On mobile, the header and tab bar hide as you scroll.',
			'New typefaces throughout.'
		]
	},
	{
		version: '1.4',
		date: 'May 17 to August 4, 2026',
		iso: '2026-05-17',
		changes: [
			'Latin book names and Roman numerals for the Vulgate: full Liber titles, Caput and Psalmus, and the æ ligature.',
			'The study panel updates as you scroll across chapter boundaries and fades between tabs.',
			'The 1582 Rheims title page and manuscript images added to the history articles. Images open larger when clicked.',
			'Better citation formatting in the study panel and in compare.'
		]
	},
	{
		version: '1.3',
		date: 'April 22 to May 13, 2026',
		iso: '2026-04-22',
		changes: [
			'Church Fathers mode: commentary on each chapter, drawn from two collections and tagged by author, century and tradition.',
			'Toggle between Douay-Rheims and modern book names.',
			'New About pages for features, translations and statistics.',
			'Search-engine and sharing improvements, plus proper app icons.',
			'Mobile study mode as a slide-up panel.',
			'Option to skip the intro page on return visits.'
		]
	},
	{
		version: '1.2',
		date: 'April 20, 2026',
		iso: '2026-04-20',
		changes: ['Haydock commentary integration.', 'Cross-reference links and study panel URL fixes.']
	},
	{
		version: '1.1',
		date: 'April 18 to 19, 2026',
		iso: '2026-04-18',
		changes: [
			'Offline reading: download the text and read without a connection.',
			'Confraternity footnotes, commentary and introductions in a tabbed study panel.',
			'Knox notes and verse-reference popovers.'
		]
	},
	{
		version: '1.0',
		date: 'April 18, 2026',
		iso: '2026-04-18',
		changes: [
			'Multi-translation reader, with side-by-side comparison of every available translation.',
			'Study panel with Douay-Rheims and CPDV notes and Confraternity introductions.',
			'Search covers prefaces and introductions.',
			'Drop caps and hanging verse numbers.',
			'Self-hosted fonts, an RSS feed and a working contact form.'
		]
	},
	{
		version: 'Beta',
		date: 'March 19 to April 17, 2026',
		iso: '2026-03-19',
		changes: [
			'March 19: first public build with chapter reading, infinite scroll, floating navigation and search.',
			'March 26: study mode with inline annotations.',
			'March 28: the History section, with its first nine articles.',
			'April 4: Psalms added.',
			'April 8: mobile tab bar.',
			'April 10: dedicated search page, with spelling variants matched.',
			'April 15: clickable cross-references.'
		]
	}
];
