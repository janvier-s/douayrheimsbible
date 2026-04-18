import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTranslationBook, loadTranslationNotes, loadConfIntro } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { TRANSLATIONS } from '$lib/stores/compare';
import type { TranslationChapter, TranslationNote } from '$lib/data/translation-types';

export const load: PageLoad = async ({ params, fetch }) => {
  const { translation: translationId, book: slug, chapter: chapterStr } = params;

  const translation = TRANSLATIONS.find((t) => t.id === translationId && t.live && t.id !== 'odr');
  if (!translation) throw error(404, `Unknown translation: ${translationId}`);

  const bookMeta = getBookBySlug(slug);
  if (!bookMeta) throw error(404, `Book not found: ${slug}`);

  if (translation.ntOnly && bookMeta.testament === 'OT') {
    throw error(404, `${translation.label} is NT-only`);
  }

  const chapterNum = parseInt(chapterStr, 10);
  if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

  const hasNotes = translationId === 'drc' || translationId === 'cpdv';
  const hasIntro = translationId === 'conf';

  const [book, notes, intro] = await Promise.all([
    loadTranslationBook(translationId, slug, fetch),
    hasNotes ? loadTranslationNotes(translationId, slug, chapterNum, fetch) : Promise.resolve(null),
    hasIntro ? loadConfIntro(slug, fetch) : Promise.resolve(null),
  ]);

  const chapter: TranslationChapter | undefined = book.chapters.find((c) => c.chapter === chapterNum);
  if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

  return {
    translation,
    bookMeta,
    chapter,
    totalChapters: book.chapters.length,
    notes: notes as TranslationNote[] | null,
    intro: intro as string[] | null,
  };
};
