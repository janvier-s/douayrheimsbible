// src/lib/data/reference.ts
// Manifest for /reference section — per-translation front/back matter articles

export type TranslationRefId = 'odr' | 'conf' | 'drc' | 'haydock';

export interface ReferenceArticle {
	slug: string;
	title: string;
	/** Section within the translation (ot/nt for ODR, front/back for Conf, etc.) */
	section: string;
	category: 'front' | 'back';
	/** Short description for the index page */
	desc: string;
}

export interface TranslationRefConfig {
	id: TranslationRefId;
	label: string;
	shortLabel: string;
	year: string;
	desc: string;
	/** Section groupings for the index page */
	sections: Array<{
		key: string;
		label: string;
		categories: Array<{ key: 'front' | 'back'; label: string }>;
	}>;
	articles: ReferenceArticle[];
}

// ── ODR ─────────────────────────────────────────────────────────────────────

const ODR_OT_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'title-page',
		title: 'Title Page',
		section: 'ot',
		category: 'front',
		desc: 'Title page of the 1609 Douay Old Testament.'
	},
	{
		slug: 'approbatio',
		title: 'Approbatio',
		section: 'ot',
		category: 'front',
		desc: 'Latin approval from three Douay theology professors.'
	},
	{
		slug: 'preface',
		title: 'Preface to the Old Testament',
		section: 'ot',
		category: 'front',
		desc: 'The translators\u2019 preface defending the vernacular translation from the Vulgate.'
	},
	{
		slug: 'censura',
		title: 'Censura',
		section: 'ot',
		category: 'front',
		desc: 'Latin certification of fidelity to the Catholic faith.'
	},
	{
		slug: 'privilege',
		title: 'Privilege',
		section: 'ot',
		category: 'front',
		desc: 'French royal privilege granting exclusive printing rights.'
	},
	// Back matter
	{
		slug: 'historical-table-age-1',
		title: 'Historical Table: The First Age',
		section: 'ot',
		category: 'back',
		desc: 'From the Creation to the Great Flood.'
	},
	{
		slug: 'historical-table-age-2',
		title: 'Historical Table: The Second Age',
		section: 'ot',
		category: 'back',
		desc: 'From the Flood to the call of Abraham.'
	},
	{
		slug: 'historical-table-age-3',
		title: 'Historical Table: The Third Age',
		section: 'ot',
		category: 'back',
		desc: 'From Abraham to the Egyptian period.'
	},
	{
		slug: 'historical-table-age-3b',
		title: 'Historical Table: The Third Age (cont.)',
		section: 'ot',
		category: 'back',
		desc: 'Continuation of the Third Age.'
	},
	{
		slug: 'historical-table-age-4',
		title: 'Historical Table: The Fourth Age',
		section: 'ot',
		category: 'back',
		desc: 'From the Law at Sinai to the early kings.'
	},
	{
		slug: 'historical-table-age-5',
		title: 'Historical Table: The Fifth Age',
		section: 'ot',
		category: 'back',
		desc: 'The kingdoms of Israel and Judah through the captivity.'
	},
	{
		slug: 'historical-table-age-6',
		title: 'Historical Table: The Sixth Age',
		section: 'ot',
		category: 'back',
		desc: 'From the restoration to the birth of Christ.'
	},
	{
		slug: 'epistles-table',
		title: 'Table of Epistles',
		section: 'ot',
		category: 'back',
		desc: 'Old Testament readings appointed for Catholic feast days.'
	},
	{
		slug: 'glossary',
		title: 'Glossary',
		section: 'ot',
		category: 'back',
		desc: 'Index of principal theological and historical topics in the Old Testament.'
	}
];

const ODR_NT_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'title-page',
		title: 'Title Page',
		section: 'nt',
		category: 'front',
		desc: 'Title page of the 1582 Rheims New Testament.'
	},
	{
		slug: 'censure',
		title: 'Censure',
		section: 'nt',
		category: 'front',
		desc: 'Ecclesiastical approval statements certifying the translation\u2019s orthodoxy.'
	},
	{
		slug: 'preface',
		title: 'Preface to the New Testament',
		section: 'nt',
		category: 'front',
		desc: 'On the translation of Scripture into the vulgar tongues and the principles of this translation.'
	},
	{
		slug: 'scripture-authority',
		title: 'The Authority of Scripture',
		section: 'nt',
		category: 'front',
		desc: 'On the authority and infallibility of Scripture and the Church\u2019s role in interpretation.'
	},
	{
		slug: 'explication-words',
		title: 'Explication of Words',
		section: 'nt',
		category: 'front',
		desc: 'Glossary of ecclesiastical and theological terms used in the translation.'
	},
	// Back matter
	{
		slug: 'apostles-creed',
		title: 'The Apostles\u2019 Creed',
		section: 'nt',
		category: 'back',
		desc: 'The twelve articles of the Apostles\u2019 Creed.'
	},
	{
		slug: 'evangelical-history',
		title: 'The Evangelical History',
		section: 'nt',
		category: 'back',
		desc: 'Chronological harmony of the four Gospels from the Incarnation to the Ascension.'
	},
	{
		slug: 'table-catholic-truths',
		title: 'Table of Catholic Truths',
		section: 'nt',
		category: 'back',
		desc: 'Catholic doctrines derived from Scripture, arranged alphabetically.'
	},
	{
		slug: 'table-corruptions',
		title: 'Table of Corruptions',
		section: 'nt',
		category: 'back',
		desc: 'Alleged mistranslations in Protestant English Bibles of 1562\u20131580.'
	},
	{
		slug: 'table-epistles-gospels',
		title: 'Table of Epistles and Gospels',
		section: 'nt',
		category: 'back',
		desc: 'Liturgical calendar of readings for Sundays, feasts, and special occasions.'
	},
	{
		slug: 'table-paul',
		title: 'Table of St. Paul',
		section: 'nt',
		category: 'back',
		desc: 'Chronological table of St. Paul\u2019s apostolic life and journeys.'
	},
	{
		slug: 'table-peter',
		title: 'Table of St. Peter',
		section: 'nt',
		category: 'back',
		desc: 'Chronological table of St. Peter\u2019s apostolic life and martyrdom.'
	}
];

const ODR_CONFIG: TranslationRefConfig = {
	id: 'odr',
	label: 'Original Douay-Rheims',
	shortLabel: 'ODR',
	year: '1582\u20131610',
	desc: 'Front and back matter from the original Douay-Rheims Bible: prefaces, approvals, historical tables, glossaries, and liturgical calendars.',
	sections: [
		{
			key: 'ot',
			label: 'Old Testament',
			categories: [
				{ key: 'front', label: 'Front Matter' },
				{ key: 'back', label: 'Back Matter' }
			]
		},
		{
			key: 'nt',
			label: 'New Testament',
			categories: [
				{ key: 'front', label: 'Front Matter' },
				{ key: 'back', label: 'Back Matter' }
			]
		}
	],
	articles: [...ODR_OT_ARTICLES, ...ODR_NT_ARTICLES]
};

// ── Confraternity ───────────────────────────────────────────────────────────

const CONF_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'imprimatur',
		title: 'Imprimatur & Nihil Obstat',
		section: 'front',
		category: 'front',
		desc: 'Ecclesiastical approvals for the Confraternity New Testament and Commentary.'
	},
	{
		slug: 'preface',
		title: 'Preface',
		section: 'front',
		category: 'front',
		desc: 'Introduction to the Confraternity New Testament by Rev. John J. Dougherty.'
	},
	{
		slug: 'commentary-preface',
		title: 'Commentary Preface',
		section: 'front',
		category: 'front',
		desc: 'Editors\u2019 preface explaining the purpose and scope of the supplemental commentary.'
	},
	{
		slug: 'contributors',
		title: 'List of Contributors',
		section: 'front',
		category: 'front',
		desc: 'The Catholic scholars who revised and commented on each book of the New Testament.'
	},
	{
		slug: 'abbreviations',
		title: 'Abbreviations & Reference Key',
		section: 'front',
		category: 'front',
		desc: 'Abbreviations of biblical books, other abbreviations, key to references, and Psalm numbering.'
	},
	{
		slug: 'nt-background',
		title: 'The New Testament Background',
		section: 'front',
		category: 'front',
		desc: 'Historical background of Palestine, the Herod dynasty, Roman rule, and Jewish sects at the time of Christ.'
	},
	{
		slug: 'chronological-table',
		title: 'Chronological Table',
		section: 'front',
		category: 'front',
		desc: 'Key dates in Palestine, the Apostles\u2019 missions, and the Roman procurators.'
	},
	{
		slug: 'parables',
		title: 'The Parables of the Gospels',
		section: 'front',
		category: 'front',
		desc: 'Classification and interpretation of the Gospel parables by Rev. John F. McConnell.'
	},
	{
		slug: 'synoptic-relations',
		title: 'Literary Relations of the First Three Gospels',
		section: 'front',
		category: 'front',
		desc: 'The Synoptic question: literary dependence among Matthew, Mark, and Luke.'
	},
	{
		slug: 'life-of-paul',
		title: 'The Life and Epistles of St. Paul',
		section: 'front',
		category: 'front',
		desc: 'Biographical overview of St. Paul: origin, conversion, missionary journeys, and epistles.'
	},
	{
		slug: 'transcription-notes',
		title: 'Transcription Notes',
		section: 'front',
		category: 'front',
		desc: 'Editorial notes on changes made to the original printed texts for electronic transcription.'
	},
	// Back matter
	{
		slug: 'catholic-doctrine',
		title: 'New Testament References to Catholic Doctrine',
		section: 'back',
		category: 'back',
		desc: 'Scripture references for sacraments, doctrines, and Catholic teachings.'
	},
	{
		slug: 'scripture-index',
		title: 'Index of Scripture Texts',
		section: 'back',
		category: 'back',
		desc: 'Alphabetical index of theological and historical topics with New Testament references.'
	}
];

const CONF_CONFIG: TranslationRefConfig = {
	id: 'conf',
	label: 'Confraternity New Testament',
	shortLabel: 'Conf',
	year: '1941',
	desc: 'Prefaces, scholarly articles, and reference material from the Confraternity New Testament and its supplemental commentary.',
	sections: [
		{
			key: 'front',
			label: 'Front Matter & Articles',
			categories: [{ key: 'front', label: 'Front Matter' }]
		},
		{
			key: 'back',
			label: 'Back Matter',
			categories: [{ key: 'back', label: 'Back Matter' }]
		}
	],
	articles: CONF_ARTICLES
};

// ── DRC (Challoner Douay-Rheims) ──────────────────────────────────────────

const DRC_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'title-page',
		title: 'Title Page',
		section: 'front',
		category: 'front',
		desc: 'Title page of the Challoner Douay-Rheims Bible.'
	},
	{
		slug: 'preface',
		title: 'Preface',
		section: 'front',
		category: 'front',
		desc: 'Information about the Challoner Douay-Rheims version of the Sacred Bible.'
	},
	{
		slug: 'history',
		title: 'History',
		section: 'front',
		category: 'front',
		desc: 'History of the Douay-Rheims Challoner version, from the 1568 English College at Douay to the 1749 revision.'
	},
	{
		slug: 'encyclical',
		title: 'Encyclical Letter: Providentissimus Deus',
		section: 'front',
		category: 'front',
		desc: 'Pope Leo XIII\u2019s 1893 encyclical on the study of Holy Scripture, its authority, inspiration, and proper interpretation.'
	},
	{
		slug: 'prayers',
		title: 'Prayers for Reading the Holy Scriptures',
		section: 'front',
		category: 'front',
		desc: 'Prayer Before and Prayer After reading Scripture, the latter by St. Bede the Venerable.'
	},
	{
		slug: 'nt-preface',
		title: 'Preface to the New Testament',
		section: 'front',
		category: 'front',
		desc: 'The original 1582 Rheims preface defending the translation from the Latin Vulgate with ten reasons.'
	},
	// Back matter
	{
		slug: 'glossary',
		title: 'Hard Words Explicated',
		section: 'back',
		category: 'back',
		desc: 'Glossary of ecclesiastical and theological terms used in the Challoner revision.'
	},
	{
		slug: 'topical-index',
		title: 'A Table of References by Subject',
		section: 'back',
		category: 'back',
		desc: 'Catholic doctrines and topics with Scripture references from both Testaments.'
	},
	{
		slug: 'chronological-nt',
		title: 'Chronological Table of the New Testament',
		section: 'back',
		category: 'back',
		desc: 'Historical and chronological table of key events from the birth of Christ to the death of St. John.'
	},
	{
		slug: 'chronological-ot',
		title: 'Chronological Table of the Old Testament',
		section: 'back',
		category: 'back',
		desc: 'Historical and chronological table of Sacred History from the Creation to the coming of Christ.'
	},
	{
		slug: 'epistles-gospels',
		title: 'A Table of the Epistles and Gospels',
		section: 'back',
		category: 'back',
		desc: 'Epistles and Gospels for all Sundays, Holydays, and feasts of the Roman calendar.'
	}
];

const DRC_CONFIG: TranslationRefConfig = {
	id: 'drc',
	label: 'Douay-Rheims Challoner',
	shortLabel: 'DRC',
	year: '1749–1752',
	desc: 'Prefaces, encyclical on Holy Scripture, prayers, history, glossary, chronological tables, and liturgical readings from Bishop Challoner\u2019s revision of the Douay-Rheims Bible.',
	sections: [
		{
			key: 'front',
			label: 'Front Matter',
			categories: [{ key: 'front', label: 'Front Matter' }]
		},
		{
			key: 'back',
			label: 'Back Matter',
			categories: [{ key: 'back', label: 'Back Matter' }]
		}
	],
	articles: DRC_ARTICLES
};

// ── Haydock ────────────────────────────────────────────────────────────────

const HAYDOCK_ARTICLES: ReferenceArticle[] = [
	// Front matter
	{
		slug: 'title-page',
		title: 'Title Page',
		section: 'front',
		category: 'front',
		desc: 'Title page of the 1883 Haydock Catholic Family Bible.'
	},
	{
		slug: 'transcription-notes',
		title: 'Transcription Notes',
		section: 'front',
		category: 'front',
		desc: 'Publication data, citation conventions, chronology notes, and transcription changes for this electronic edition.'
	},
	{
		slug: 'foreword',
		title: 'Foreword',
		section: 'front',
		category: 'front',
		desc: 'Defense of the Latin Vulgate and account of the Vatican editions under Sixtus V and Clement VIII.'
	},
	{
		slug: 'commentators',
		title: 'Principal Commentators',
		section: 'front',
		category: 'front',
		desc: 'Alphabetical list of commentators consulted, with death years. Asterisked names are non-Catholic scholars.'
	},
	{
		slug: 'bible-history',
		title: 'A Comprehensive History of the Books of the Holy Catholic Bible',
		section: 'front',
		category: 'front',
		desc: 'Introductory essay by Rev. Bernard O\u2019Reilly on the Bible as God\u2019s covenant with mankind.'
	},
	{
		slug: 'ot-introduction',
		title: 'Introduction to the Old Testament',
		section: 'front',
		category: 'front',
		desc: 'Overview of the Old Testament with introductions to the Pentateuch, Historical Books, Prophets, and Writings.'
	},
	{
		slug: 'nt-introduction',
		title: 'Introduction to the New Testament',
		section: 'front',
		category: 'front',
		desc: 'Overview of the New Testament with introductions to each Gospel, the Acts, the Pauline and Catholic Epistles, and the Apocalypse.'
	},
	{
		slug: 'nt-preface',
		title: 'General Preface to the New Testament',
		section: 'front',
		category: 'front',
		desc: 'NT preface covering the canon, original languages, English Bible versions, Dr. Witham\u2019s remarks on translation, and prayers before reading Scripture.'
	},
	// Back matter
	{
		slug: 'chapter-summaries',
		title: 'Chapter Summaries',
		section: 'back',
		category: 'back',
		desc: 'Book-by-book chapter summaries for all 73 books of the Old and New Testaments.'
	},
	{
		slug: 'apocrypha',
		title: 'Apocrypha Introduction',
		section: 'back',
		category: 'back',
		desc: 'Introduction to the deuterocanonical books and their place in the Catholic canon.'
	}
];

const HAYDOCK_CONFIG: TranslationRefConfig = {
	id: 'haydock',
	label: 'DRC Haydock',
	shortLabel: 'Haydock',
	year: '1883',
	desc: 'Prefaces, scholarly introductions, commentator lists, and chapter summaries from the Haydock Catholic Family Bible.',
	sections: [
		{
			key: 'front',
			label: 'Front Matter & Articles',
			categories: [{ key: 'front', label: 'Front Matter' }]
		},
		{
			key: 'back',
			label: 'Back Matter',
			categories: [{ key: 'back', label: 'Back Matter' }]
		}
	],
	articles: HAYDOCK_ARTICLES
};

// ── Public API ──────────────────────────────────────────────────────────────

export const TRANSLATION_CONFIGS: TranslationRefConfig[] = [
	ODR_CONFIG,
	CONF_CONFIG,
	DRC_CONFIG,
	HAYDOCK_CONFIG
];

export function getTranslationConfig(id: string): TranslationRefConfig | undefined {
	return TRANSLATION_CONFIGS.find((c) => c.id === id);
}

export function findArticle(
	translationId: string,
	section: string,
	slug: string
): ReferenceArticle | undefined {
	const config = getTranslationConfig(translationId);
	if (!config) return undefined;
	return config.articles.find((a) => a.section === section && a.slug === slug);
}

/** All articles across all translations — used for prerendering entries */
export function allArticleEntries(): Array<{
	translation: string;
	section: string;
	slug: string;
}> {
	const entries: Array<{ translation: string; section: string; slug: string }> = [];
	for (const config of TRANSLATION_CONFIGS) {
		for (const article of config.articles) {
			entries.push({
				translation: config.id,
				section: article.section,
				slug: article.slug
			});
		}
	}
	return entries;
}

// ── Legacy compatibility helpers ────────────────────────────────────────────

/** Legacy: get ODR articles for a testament. Used by components that still
 *  reference the old API during migration. */
export const OT_ARTICLES = ODR_OT_ARTICLES;
export const NT_ARTICLES = ODR_NT_ARTICLES;
export const ALL_REFERENCE_ARTICLES = [...ODR_OT_ARTICLES, ...ODR_NT_ARTICLES];
