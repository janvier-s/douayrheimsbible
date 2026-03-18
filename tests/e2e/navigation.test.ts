import { test, expect } from '@playwright/test';

test('floating nav opens and navigates to a chapter', async ({ page }) => {
	await page.goto('/odr/mark/3');
	await page.click('button:has-text("▾")');
	await expect(page.locator('text=Old Testament')).toBeVisible();
	await page.click('text=New Testament');
	await page.click('text=John');
	await page.click('[data-chapter="1"]');
	await expect(page).toHaveURL('/odr/john/1');
});

test('floating nav highlights current book and chapter', async ({ page }) => {
	await page.goto('/odr/mark/3');
	await page.click('button:has-text("▾")');
	await expect(page.locator('[data-active-book="true"]')).toContainText('Mark');
	await expect(page.locator('[data-active-chapter="3"]')).toBeVisible();
});
