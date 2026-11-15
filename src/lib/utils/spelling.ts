/** Translations that have an original-spelling text and so show the Modern/Original switch. */
export function hasSpellingSwitch(translationId: string, compareMode: boolean): boolean {
	return !compareMode && (translationId === 'odr' || translationId === 'kjv');
}
