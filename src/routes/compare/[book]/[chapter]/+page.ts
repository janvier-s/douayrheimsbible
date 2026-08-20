import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadTranslationBook } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { kjvPsalmsForDr, precedingSplitSibling, alignDrPsalmToKjv } from '$lib/data/psalm-mapping';
import { TRANSLATIONS } from '$lib/stores/compare';

export const load: PageLoad = async ({ params, fetch }) => {
	const { book: slug, chapter: chapterStr } = params;

	const bookMeta = getBookBySlug(slug);
	if (!bookMeta) throw error(404, `Book not found: ${slug}`);

	const chapterNum = parseInt(chapterStr, 10);
	if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

	// Always load ODR (base text)
	const odrBookData = await loadBook(slug, fetch);
	const chapter = getChapter(odrBookData, chapterNum);
	if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

	// Load all other live translations in parallel (skip RSV which is hidden)
	const otherTranslations = TRANSLATIONS.filter(
		(t) => t.id !== 'odr' && t.live && !(t.ntOnly && bookMeta.testament === 'OT')
	);

	const translationResults = await Promise.allSettled(
		otherTranslations.map((t) => loadTranslationBook(t.id, slug, fetch))
	);

	// Build verse map per translation (plain objects — Map is not serializable by SvelteKit)
	const verseMaps: Record<string, Record<number, string>> = {
		odr: Object.fromEntries(chapter.verses.map((v) => [v.verse, v.text]))
	};

	// The KJV numbers the psalms from the Hebrew, every other translation here
	// from the Vulgate, so its psalms need remapping onto the DR numbering the
	// comparison rows are keyed by. Every other book joins on the plain number.
	const remapPsalms = slug === 'psalms';
	let kjvPsalmLabel: string | null = null;

	for (let i = 0; i < otherTranslations.length; i++) {
		const result = translationResults[i];
		const t = otherTranslations[i];
		if (result.status !== 'fulfilled') {
			verseMaps[t.id] = {};
			continue;
		}

		if (remapPsalms && t.id === 'kjv') {
			const kjvChapters = kjvPsalmsForDr(chapterNum);
			const kjvRefs = [];
			const textByRef: Record<string, string> = {};
			for (const num of kjvChapters) {
				const ch = result.value.chapters.find((c) => c.chapter === num);
				for (const v of ch?.verses ?? []) {
					kjvRefs.push({ chapter: num, verse: v.verse });
					textByRef[`${num}:${v.verse}`] = v.text;
				}
			}

			const sibling = precedingSplitSibling(chapterNum);
			const siblingCount = sibling
				? (odrBookData.chapters.find((c) => c.chapter === sibling)?.verses ?? []).filter(
						(v) => v.verse > 0
					).length
				: 0;

			const mapping = alignDrPsalmToKjv({
				drVerseCount: chapter.verses.filter((v) => v.verse > 0).length,
				kjvRefs,
				precedingSiblingVerseCount: siblingCount
			});

			verseMaps[t.id] = Object.fromEntries(
				[...mapping].map(([drVerse, ref]) => [
					drVerse,
					textByRef[`${ref.chapter}:${ref.verse}`] ?? ''
				])
			);

			// Surface the KJV's own numbering so a reader citing it is not misled.
			const used = [...new Set([...mapping.values()].map((r) => r.chapter))];
			if (used.length > 0) {
				kjvPsalmLabel =
					used.length === 1
						? `Psalm ${used[0]}`
						: `Psalms ${used[0]}\u2013${used[used.length - 1]}`;
			}
			continue;
		}

		const ch = result.value.chapters.find((c) => c.chapter === chapterNum);
		verseMaps[t.id] = ch ? Object.fromEntries(ch.verses.map((v) => [v.verse, v.text])) : {};
	}

	return {
		bookMeta,
		chapter,
		totalChapters: odrBookData.chapters.length,
		verseMaps,
		kjvPsalmLabel,
		showLayoutTopBar: false
	};
};
