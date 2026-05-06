import { ALL_BOOKS } from '$lib/data/books';
import { TRANSLATION_CONFIGS } from '$lib/data/reference';
import fathersManifest from '../../../static/data/fathers/manifest.json';

// Translation prefixes with live data — all books (OT + NT)
const LIVE_TRANSLATIONS = ['odr', 'vul', 'drc', 'knox', 'kjv', 'cpdv', 'haydock'] as const;
// NT-only translations
const LIVE_TRANSLATIONS_NT_ONLY = ['conf'] as const;

const SITE = 'https://thedouayrheims.com';

// Static content published / last significantly updated
const DATE_BIBLE_TEXT = '2024-03-01';
const DATE_CONTENT = '2025-04-01';
const DATE_TODAY = new Date().toISOString().slice(0, 10);

export const prerender = true;

export function GET() {
	const urls: string[] = [];

	// Homepage
	urls.push(entry('/', '1.0', 'monthly', DATE_TODAY));

	// Chapter pages for each live translation (OT + NT)
	for (const prefix of LIVE_TRANSLATIONS) {
		const priority = prefix === 'odr' ? '0.8' : '0.7';
		for (const book of ALL_BOOKS) {
			for (let ch = 1; ch <= book.chapters; ch++) {
				urls.push(entry(`/${prefix}/${book.slug}/${ch}`, priority, 'yearly', DATE_BIBLE_TEXT));
			}
		}
	}

	// NT-only translations
	for (const prefix of LIVE_TRANSLATIONS_NT_ONLY) {
		for (const book of ALL_BOOKS.filter((b) => b.testament === 'NT')) {
			for (let ch = 1; ch <= book.chapters; ch++) {
				urls.push(entry(`/${prefix}/${book.slug}/${ch}`, '0.7', 'yearly', DATE_BIBLE_TEXT));
			}
		}
	}

	// Compare pages (all books/chapters)
	for (const book of ALL_BOOKS) {
		for (let ch = 1; ch <= book.chapters; ch++) {
			urls.push(entry(`/compare/${book.slug}/${ch}`, '0.5', 'yearly', DATE_BIBLE_TEXT));
		}
	}

	// Book index pages
	urls.push(entry('/books/old-testament', '0.7', 'monthly', DATE_CONTENT));
	urls.push(entry('/books/new-testament', '0.7', 'monthly', DATE_CONTENT));

	// Content pages
	urls.push(entry('/history', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/about', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/the-douay-rheims', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/articles', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/origins', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/translation-philosophy', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/rheims-1582', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/annotations', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/forbidden-bible', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/influence-on-kjv', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/challoner', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/after-challoner', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/america', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/original-tongues', '0.9', 'monthly', DATE_CONTENT));
	urls.push(entry('/history/scripture-for-all', '0.9', 'monthly', DATE_CONTENT));

	// Reference material
	urls.push(entry('/reference', '0.7', 'monthly', DATE_CONTENT));
	for (const config of TRANSLATION_CONFIGS) {
		urls.push(entry(`/reference/${config.id}`, '0.7', 'monthly', DATE_CONTENT));
		for (const article of config.articles) {
			urls.push(
				entry(
					`/reference/${config.id}/${article.section}/${article.slug}`,
					'0.6',
					'yearly',
					DATE_CONTENT
				)
			);
		}
	}

	// About sub-pages
	urls.push(entry('/about/features', '0.8', 'monthly', DATE_CONTENT));
	urls.push(entry('/about/translations', '0.8', 'monthly', DATE_CONTENT));
	urls.push(entry('/about/stats', '0.7', 'monthly', DATE_CONTENT));

	// Fathers/patristic commentary pages
	for (const [slug, chapters] of Object.entries(fathersManifest)) {
		for (const ch of chapters as number[]) {
			urls.push(entry(`/fathers/${slug}/${ch}`, '0.6', 'monthly', DATE_CONTENT));
		}
	}

	// Static pages
	urls.push(entry('/search', '0.6', 'monthly', DATE_CONTENT));
	urls.push(entry('/download', '0.5', 'monthly', DATE_CONTENT));
	urls.push(entry('/api', '0.5', 'monthly', DATE_CONTENT));
	urls.push(entry('/contact', '0.3', 'yearly', DATE_CONTENT));
	urls.push(entry('/privacy', '0.2', 'yearly', DATE_CONTENT));
	urls.push(entry('/terms', '0.2', 'yearly', DATE_CONTENT));

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

function entry(path: string, priority: string, changefreq: string, lastmod: string): string {
	return `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}
