import { test, expect } from '@playwright/test';

/** Study mode lives inside the single `reading-prefs` JSON blob that
 *  prefs.ts:94 reads. loadPrefs merges over DEFAULTS, so a partial object is
 *  safe, and stamping the current PREFS_VERSION skips the migration chain. */
async function useStudyMode(page: import('@playwright/test').Page) {
	await page.addInitScript(() => {
		localStorage.setItem('reading-prefs', JSON.stringify({ readingMode: 'study', _v: 21 }));
	});
}

test('Vulgate study panel renders the Glossa', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/genesis/1');
	await expect(page.locator('.glossa-block')).toBeVisible();
	await expect(page.locator('.glossa-block .content-eyebrow')).toHaveText('Glossa Ordinaria');
});

test('Glossa renders verse sections and entries for Genesis 1', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/genesis/1');
	await expect(page.locator('.glossa-block .verse-section').first()).toBeVisible();
	await expect(page.locator('.glossa-entry').first()).toBeVisible();
	await expect(page.locator('.glossa-lemma').first()).toBeVisible();
});

test('every gloss carries a byline', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/genesis/1');
	await expect(page.locator('.glossa-author').first()).toHaveText(/\S/);
});

test('books without glosses show the empty state', async ({ page }) => {
	await useStudyMode(page);
	await page.goto('/vul/ezechiel/1');
	await expect(page.getByText('Nulla glossa.')).toBeVisible();
	await expect(page.locator('.glossa-block')).toHaveCount(0);
});
