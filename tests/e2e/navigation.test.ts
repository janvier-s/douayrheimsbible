import { test, expect } from '@playwright/test';

test('floating nav opens and navigates to a chapter', async ({ page }) => {
	await page.goto('/odr/mark/3');
	await page.getByRole('button', { name: /^Navigate — / }).click();
	await expect(page.getByRole('tab', { name: 'Old Testament' })).toBeVisible();
	await page.getByRole('tab', { name: 'New Testament' }).click();
	await page.getByRole('button', { name: 'John', exact: true }).click();
	await page.locator('[data-book-grid="john"] a[href="/odr/john/1"]').click();
	await expect(page).toHaveURL('/odr/john/1');
});

test('floating nav highlights current book and chapter', async ({ page }) => {
	await page.goto('/odr/mark/3');
	await page.getByRole('button', { name: /^Navigate — / }).click();
	await expect(page.locator('[data-active-book="true"]:visible')).toContainText('Mark');
	await expect(page.locator('[data-book-grid="mark"] a[aria-current="page"]')).toHaveText('3');
});
