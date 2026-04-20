import { ALL_BOOKS } from '$lib/data/books';

// Translation prefixes with live data — all books (OT + NT)
const LIVE_TRANSLATIONS = ['odr', 'vul', 'drc', 'knox', 'kjv', 'cpdv', 'haydock'] as const;
// NT-only translations
const LIVE_TRANSLATIONS_NT_ONLY = ['conf'] as const;

const SITE = 'https://thedouayrheims.com';

export const prerender = true;

export function GET() {
	const urls: string[] = [];

	// Homepage
	urls.push(entry('/', '1.0', 'monthly'));

	// Chapter pages for each live translation (OT + NT)
	for (const prefix of LIVE_TRANSLATIONS) {
		const priority = prefix === 'odr' ? '0.8' : '0.7';
		for (const book of ALL_BOOKS) {
			for (let ch = 1; ch <= book.chapters; ch++) {
				urls.push(entry(`/${prefix}/${book.slug}/${ch}`, priority, 'yearly'));
			}
		}
	}

	// NT-only translations
	for (const prefix of LIVE_TRANSLATIONS_NT_ONLY) {
		for (const book of ALL_BOOKS.filter((b) => b.testament === 'NT')) {
			for (let ch = 1; ch <= book.chapters; ch++) {
				urls.push(entry(`/${prefix}/${book.slug}/${ch}`, '0.7', 'yearly'));
			}
		}
	}

	// Compare pages (all books/chapters)
	for (const book of ALL_BOOKS) {
		for (let ch = 1; ch <= book.chapters; ch++) {
			urls.push(entry(`/compare/${book.slug}/${ch}`, '0.5', 'yearly'));
		}
	}

	// Book index pages
	urls.push(entry('/books/old-testament', '0.7', 'monthly'));
	urls.push(entry('/books/new-testament', '0.7', 'monthly'));

	// Content pages
	urls.push(entry('/history', '0.9', 'monthly'));
	urls.push(entry('/about', '0.9', 'monthly'));
	urls.push(entry('/history/the-douay-rheims', '0.9', 'monthly'));
	urls.push(entry('/articles', '0.9', 'monthly'));
	urls.push(entry('/history/origins', '0.9', 'monthly'));
	urls.push(entry('/history/translation-philosophy', '0.9', 'monthly'));
	urls.push(entry('/history/rheims-1582', '0.9', 'monthly'));
	urls.push(entry('/history/annotations', '0.9', 'monthly'));
	urls.push(entry('/history/forbidden-bible', '0.9', 'monthly'));
	urls.push(entry('/history/influence-on-kjv', '0.9', 'monthly'));
	urls.push(entry('/history/challoner', '0.9', 'monthly'));
	urls.push(entry('/history/after-challoner', '0.9', 'monthly'));
	urls.push(entry('/history/america', '0.9', 'monthly'));
	urls.push(entry('/history/original-tongues', '0.9', 'monthly'));
	urls.push(entry('/history/scripture-for-all', '0.9', 'monthly'));

	// Static pages
	urls.push(entry('/search', '0.6', 'monthly'));
	urls.push(entry('/download', '0.5', 'monthly'));
	urls.push(entry('/api', '0.5', 'monthly'));
	urls.push(entry('/contact', '0.3', 'yearly'));
	urls.push(entry('/privacy', '0.2', 'yearly'));
	urls.push(entry('/terms', '0.2', 'yearly'));

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=86400'
		}
	});
}

function entry(path: string, priority: string, changefreq: string): string {
	return `  <url>
    <loc>${SITE}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}
