import type { TranslationChapter } from '$lib/data/translation-types';

export function buildVerseMap(
	chapters: TranslationChapter[],
	chapterNum: number
): Record<number, string> {
	const ch = chapters.find((c) => c.chapter === chapterNum);
	if (!ch) return {};
	return Object.fromEntries(ch.verses.map((v) => [v.verse, v.text]));
}
