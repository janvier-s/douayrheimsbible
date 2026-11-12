import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadTranslationBook, loadVersification } from '$lib/data/loader';
import {
	chapterVersification,
	comparisonRows,
	alignOdrToRows,
	COLUMN_VERSIFICATION
} from '$lib/utils/versification';
import { getBookBySlug } from '$lib/data/books';
import {
	kjvPsalmsForDr,
	precedingSplitSibling,
	alignDrPsalmToKjv,
	drTitleVerseCount
} from '$lib/data/psalm-mapping';
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

	// Load all other translations in parallel (including hidden ones so they are ready if unlocked)
	const otherTranslations = TRANSLATIONS.filter(
		(t) => t.id !== 'odr' && !t.compareOnly && !(t.ntOnly && bookMeta.testament === 'OT')
	);

	// Same ODR text in 1582/1609 spelling (modern text stands in for any missing book)
	const originalBook = await loadBook(slug, fetch, 'original').catch(() => null);
	const originalChapter = originalBook ? getChapter(originalBook, chapterNum) : undefined;

	const translationResults = await Promise.allSettled(
		otherTranslations.map((t) => loadTranslationBook(t.id, slug, fetch))
	);

	// Comparison rows are keyed on the Vulgate-aligned numbering every other column
	// uses. In the chapters ODR re-divided to the 1609/1582 printing, the ODR columns
	// are translated onto those rows through versification.json.
	const versification = await loadVersification(fetch);
	const cv = chapterVersification(versification, slug, chapterNum);
	let rows = comparisonRows(
		cv,
		chapter.verses.map((v) => v.verse)
	);

	// Build verse map per translation (plain objects — Map is not serializable by SvelteKit)
	const verseMaps: Record<string, Record<number, string>> = {
		odr: alignOdrToRows(cv, Object.fromEntries(chapter.verses.map((v) => [v.verse, v.text]))),
		'odr-orig': alignOdrToRows(
			cv,
			Object.fromEntries((originalChapter ?? chapter).verses.map((v) => [v.verse, v.text]))
		)
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
			// Verse 0 is the KJV superscription, an unnumbered heading in print. It
			// belongs on the row where the Douay prints its own title, not in the
			// run of numbered verses.
			let titleRef: { chapter: number; verse: number } | null = null;
			for (const num of kjvChapters) {
				const ch = result.value.chapters.find((c) => c.chapter === num);
				for (const v of ch?.verses ?? []) {
					textByRef[`${num}:${v.verse}`] = v.text;
					if (v.verse === 0) {
						if (num === kjvChapters[0]) titleRef = { chapter: num, verse: 0 };
						continue;
					}
					kjvRefs.push({ chapter: num, verse: v.verse });
				}
			}

			const sibling = precedingSplitSibling(chapterNum);
			const siblingCount = sibling
				? comparisonRows(
						chapterVersification(versification, slug, sibling),
						(odrBookData.chapters.find((c) => c.chapter === sibling)?.verses ?? []).map(
							(v) => v.verse
						)
					).length
				: 0;

			const mapping = alignDrPsalmToKjv({
				drVerseCount: rows.length,
				kjvRefs,
				// The second half of a split psalm continues the first; the
				// superscription belongs to the first half only.
				titleRef: sibling ? null : titleRef,
				titleVerses: drTitleVerseCount(chapterNum),
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
		const own = ch ? Object.fromEntries(ch.verses.map((v) => [v.verse, v.text])) : {};
		// Challoner-numbered columns put a few verses one off the Vulgate-aligned rows.
		verseMaps[t.id] = alignOdrToRows(
			chapterVersification(COLUMN_VERSIFICATION[t.id], slug, chapterNum),
			own,
			{ tagShifted: false }
		);
	}

	// Some columns number a re-divided chapter more finely than the Vulgate (DRC Psalm 42
	// has a sixth verse). Give those verses a row of their own so none is hidden.
	if (cv) {
		const extra = new Set(rows);
		// The KJV and RSV-2CE number psalms (and some other chapters) from the Hebrew; leave them out.
		for (const [id, m] of Object.entries(verseMaps)) {
			if (id === 'kjv' || id === 'rsv2ce') continue;
			for (const k of Object.keys(m)) if (Number(k) > 0 && m[Number(k)]) extra.add(Number(k));
		}
		rows = [...extra].sort((a, b) => a - b);
	}

	return {
		bookMeta,
		chapter,
		rows,
		redivided: cv !== undefined,
		totalChapters: odrBookData.chapters.length,
		verseMaps,
		kjvPsalmLabel,
		showLayoutTopBar: false
	};
};
