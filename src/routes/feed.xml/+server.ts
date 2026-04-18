import type { RequestHandler } from './$types';

const SITE = 'https://thedouayrheims.com';

interface FeedItem {
	title: string;
	path: string;
	description: string;
}

const ITEMS: FeedItem[] = [
	{
		title: 'About the Douay-Rheims Bible',
		path: '/history/the-douay-rheims',
		description:
			'The first complete English Catholic translation of Sacred Scripture, rendered faithfully from the Latin Vulgate by English scholars in exile.'
	},
	{
		title: 'Born in Exile: The Origins of the Douay-Rheims Bible',
		path: '/history/origins',
		description:
			'How a community of English Catholic exiles, driven from their homeland by persecution, produced the first complete English Catholic translation of Sacred Scripture.'
	},
	{
		title: 'A Translation from the Authentic Latin',
		path: '/history/translation-philosophy',
		description:
			"Why the Douay-Rheims translators chose Saint Jerome's Vulgate over the original Greek and Hebrew, and what their fierce fidelity to that choice gave and cost them."
	},
	{
		title: 'A Bible of Arguments: The Annotations',
		path: '/history/annotations',
		description:
			'The notes that accompanied the Rheims New Testament were a sustained, scholarly engagement with Protestant readings of Scripture, and they changed everything about how the book was received.'
	},
	{
		title: 'Published in a Time of Crisis',
		path: '/history/rheims-1582',
		description:
			'The political world that greeted the Rheims New Testament in 1582, and the Protestant refutation that spread it further than its authors could have imagined.'
	},
	{
		title: 'A Bible Forbidden to Its Own Readers',
		path: '/history/forbidden-bible',
		description:
			"Catholics who produced the English New Testament at Rheims were forbidden to read it without a special license. The history of the Church's restrictions on vernacular Scripture, and the theology that lay behind them."
	},
	{
		title: 'The Challoner Revision',
		path: '/history/challoner',
		description:
			'How Bishop Richard Challoner transformed the Douay-Rheims Bible in the eighteenth century, and why the distinction between the original and the revision matters.'
	},
	{
		title: 'After Challoner: A Bible in Dispute',
		path: '/history/after-challoner',
		description:
			'The proliferation of competing editions after Challoner, and why Cardinal Wiseman declared the name Douay-Rheims an abuse of terms.'
	},
	{
		title: 'The Douay-Rheims in America',
		path: '/history/america',
		description:
			'From Maryland in 1634 to the Catholic communities of the nineteenth century, how this Bible crossed the Atlantic and took root in a new world.'
	},
	{
		title: 'From the Authentic Latin to the Original Tongues',
		path: '/history/original-tongues',
		description:
			'How the Church moved, over four centuries, from requiring the Vulgate as the basis for all translation to mandating direct use of the Hebrew and Greek originals.'
	},
	{
		title: 'How the Douay-Rheims Shaped the King James Bible',
		path: '/history/influence-on-kjv',
		description:
			'The specific debt the King James Version owes to the Catholic Bible, in phrases, in vocabulary, and in scholarly precision.'
	},
	{
		title: 'A Bible Open to All',
		path: '/history/scripture-for-all',
		description:
			'How the Catholic Church encourages all the faithful to read Scripture, and the guidance it offers for reading well.'
	}
];

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const prerender = true;

export const GET: RequestHandler = () => {
	const items = ITEMS.map(
		(item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${SITE}${item.path}</link>
      <guid isPermaLink="true">${SITE}${item.path}</guid>
      <description>${escapeXml(item.description)}</description>
    </item>`
	).join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Douay-Rheims Bible — History &amp; Articles</title>
    <link>${SITE}</link>
    <description>Articles on the history, language, and legacy of the Original Douay-Rheims Bible of 1582–1610.</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'max-age=86400'
		}
	});
};
