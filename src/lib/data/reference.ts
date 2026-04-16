// src/lib/data/reference.ts
// Manifest for /reference section — OT & NT front/back matter articles

export interface ReferenceArticle {
	slug: string;
	title: string;
	testament: 'OT' | 'NT';
	category: 'front' | 'back';
	/** Short description for the index page */
	desc: string;
}

export const OT_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'title-page',
		title: 'Title Page',
		testament: 'OT',
		category: 'front',
		desc: 'Title page of the 1609 Douay Old Testament.'
	},
	{
		slug: 'approbatio',
		title: 'Approbatio',
		testament: 'OT',
		category: 'front',
		desc: 'Latin approval from three Douay theology professors.'
	},
	{
		slug: 'preface',
		title: 'Preface to the Old Testament',
		testament: 'OT',
		category: 'front',
		desc: 'The translators\u2019 preface defending the vernacular translation from the Vulgate.'
	},
	{
		slug: 'censura',
		title: 'Censura',
		testament: 'OT',
		category: 'front',
		desc: 'Latin certification of fidelity to the Catholic faith.'
	},
	{
		slug: 'privilege',
		title: 'Privilege',
		testament: 'OT',
		category: 'front',
		desc: 'French royal privilege granting exclusive printing rights.'
	},
	// Back matter
	{
		slug: 'historical-table-age-1',
		title: 'Historical Table: The First Age',
		testament: 'OT',
		category: 'back',
		desc: 'From the Creation to the Great Flood.'
	},
	{
		slug: 'historical-table-age-2',
		title: 'Historical Table: The Second Age',
		testament: 'OT',
		category: 'back',
		desc: 'From the Flood to the call of Abraham.'
	},
	{
		slug: 'historical-table-age-3',
		title: 'Historical Table: The Third Age',
		testament: 'OT',
		category: 'back',
		desc: 'From Abraham to the Egyptian period.'
	},
	{
		slug: 'historical-table-age-3b',
		title: 'Historical Table: The Third Age (cont.)',
		testament: 'OT',
		category: 'back',
		desc: 'Continuation of the Third Age.'
	},
	{
		slug: 'historical-table-age-4',
		title: 'Historical Table: The Fourth Age',
		testament: 'OT',
		category: 'back',
		desc: 'From the Law at Sinai to the early kings.'
	},
	{
		slug: 'historical-table-age-5',
		title: 'Historical Table: The Fifth Age',
		testament: 'OT',
		category: 'back',
		desc: 'The kingdoms of Israel and Judah through the captivity.'
	},
	{
		slug: 'historical-table-age-6',
		title: 'Historical Table: The Sixth Age',
		testament: 'OT',
		category: 'back',
		desc: 'From the restoration to the birth of Christ.'
	},
	{
		slug: 'epistles-table',
		title: 'Table of Epistles',
		testament: 'OT',
		category: 'back',
		desc: 'Old Testament readings appointed for Catholic feast days.'
	},
	{
		slug: 'glossary',
		title: 'Glossary',
		testament: 'OT',
		category: 'back',
		desc: 'Index of principal theological and historical topics in the Old Testament.'
	}
];

export const NT_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'title-page',
		title: 'Title Page',
		testament: 'NT',
		category: 'front',
		desc: 'Title page of the 1582 Rheims New Testament.'
	},
	{
		slug: 'censure',
		title: 'Censure',
		testament: 'NT',
		category: 'front',
		desc: 'Ecclesiastical approval statements certifying the translation\u2019s orthodoxy.'
	},
	{
		slug: 'preface',
		title: 'Preface to the New Testament',
		testament: 'NT',
		category: 'front',
		desc: 'On the translation of Scripture into the vulgar tongues and the principles of this translation.'
	},
	{
		slug: 'scripture-authority',
		title: 'The Authority of Scripture',
		testament: 'NT',
		category: 'front',
		desc: 'On the authority and infallibility of Scripture and the Church\u2019s role in interpretation.'
	},
	{
		slug: 'explication-words',
		title: 'Explication of Words',
		testament: 'NT',
		category: 'front',
		desc: 'Glossary of ecclesiastical and theological terms used in the translation.'
	},
	// Back matter
	{
		slug: 'apostles-creed',
		title: 'The Apostles\u2019 Creed',
		testament: 'NT',
		category: 'back',
		desc: 'The twelve articles of the Apostles\u2019 Creed.'
	},
	{
		slug: 'evangelical-history',
		title: 'The Evangelical History',
		testament: 'NT',
		category: 'back',
		desc: 'Chronological harmony of the four Gospels from the Incarnation to the Ascension.'
	},
	{
		slug: 'table-catholic-truths',
		title: 'Table of Catholic Truths',
		testament: 'NT',
		category: 'back',
		desc: 'Catholic doctrines derived from Scripture, arranged alphabetically.'
	},
	{
		slug: 'table-corruptions',
		title: 'Table of Corruptions',
		testament: 'NT',
		category: 'back',
		desc: 'Alleged mistranslations in Protestant English Bibles of 1562\u20131580.'
	},
	{
		slug: 'table-epistles-gospels',
		title: 'Table of Epistles and Gospels',
		testament: 'NT',
		category: 'back',
		desc: 'Liturgical calendar of readings for Sundays, feasts, and special occasions.'
	},
	{
		slug: 'table-paul',
		title: 'Table of St. Paul',
		testament: 'NT',
		category: 'back',
		desc: 'Chronological table of St. Paul\u2019s apostolic life and journeys.'
	},
	{
		slug: 'table-peter',
		title: 'Table of St. Peter',
		testament: 'NT',
		category: 'back',
		desc: 'Chronological table of St. Peter\u2019s apostolic life and martyrdom.'
	}
];

export const ALL_REFERENCE_ARTICLES = [...OT_ARTICLES, ...NT_ARTICLES];

export function findArticle(testament: string, slug: string): ReferenceArticle | undefined {
	const list = testament === 'ot' ? OT_ARTICLES : NT_ARTICLES;
	return list.find((a) => a.slug === slug);
}
