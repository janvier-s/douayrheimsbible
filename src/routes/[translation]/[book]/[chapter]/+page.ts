import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTranslationBook } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { TRANSLATIONS } from '$lib/stores/compare';
import type { TranslationChapter } from '$lib/data/translation-types';

export const load: PageLoad = async ({ params, fetch }) => {
  const { translation: translationId, book: slug, chapter: chapterStr } = params;

  // Only accept known live non-ODR translations
  const translation = TRANSLATIONS.find((t) => t.id === translationId && t.live && t.id !== 'odr');
  if (!translation) throw error(404, `Unknown translation: ${translationId}`);

  const bookMeta = getBookBySlug(slug);
  if (!bookMeta) throw error(404, `Book not found: ${slug}`);

  if (translation.ntOnly && bookMeta.testament === 'OT') {
    throw error(404, `${translation.label} is NT-only`);
  }

  const chapterNum = parseInt(chapterStr, 10);
  if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

  const book = await loadTranslationBook(translationId, slug, fetch);
  const chapter: TranslationChapter | undefined = book.chapters.find((c) => c.chapter === chapterNum);
  if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

  return {
    translation,
    bookMeta,
    chapter,
    totalChapters: book.chapters.length
  };
};
