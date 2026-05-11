import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTranslationBook } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { TRANSLATIONS, konamiUnlocked } from '$lib/stores/compare';
import type { Chapter } from '$lib/data/types';
import { get } from 'svelte/store';

export const load: PageLoad = async ({ params, fetch }) => {
	const { translation: translationId, book: slug, chapter: chapterStr } = params;

	const translation = TRANSLATIONS.find((t) => t.id === translationId && t.id !== 'odr');
	if (!translation) throw error(404, `Unknown translation: ${translationId}`);
	if (!translation.live && !get(konamiUnlocked))
		throw error(403, `This translation is not yet available`);

	const bookMeta = getBookBySlug(slug);
	if (!bookMeta) throw error(404, `Book not found: ${slug}`);

	if (translation.ntOnly && bookMeta.testament === 'OT') {
		return {
			bookMeta,
			chapter: null,
			totalChapters: 0,
			translationId,
			ntOnly: true,
			translationLabel: translation.label
		};
	}

	const chapterNum = parseInt(chapterStr, 10);
	if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

	let book;
	try {
		book = await loadTranslationBook(translationId, slug, fetch);
	} catch {
		throw error(404, `${translation.label}: ${bookMeta.odrName} not available`);
	}

	// TranslationChapter is structurally compatible with Chapter (extra fields are optional)
	const chapter = book.chapters.find((c) => c.chapter === chapterNum) as Chapter | undefined;
	if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

	return {
		bookMeta,
		chapter,
		totalChapters: book.chapters.length,
		translationId,
		ntOnly: false,
		translationLabel: translation.label,
		seoName: translation.seoName ?? translation.label,
		seoDesc: (translation.seoDesc ?? '')
			.replace(/\{book\}/g, bookMeta.odrName)
			.replace(/\{chapter\}/g, String(chapterNum))
	};
};
