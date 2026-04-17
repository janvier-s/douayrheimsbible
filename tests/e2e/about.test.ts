import { test, expect } from '@playwright/test';

test('/about page loads with correct title', async ({ page }) => {
	await page.goto('/about');
	await expect(page).toHaveTitle(/About This Website/);
});

test('/about page renders all eight stat cards', async ({ page }) => {
	await page.goto('/about');
	const cards = page.locator('.stat-card');
	await expect(cards).toHaveCount(8);
});

test('/about stat cards show correct key numbers', async ({ page }) => {
	await page.goto('/about');
	await expect(page.locator('.stat-number').first()).toContainText('76');
	await expect(page.locator('.stat-number').nth(2)).toContainText('37,196');
	await expect(page.locator('.stat-number').nth(3)).toContainText('1,707');
});

test('/history/about redirects to /history/the-douay-rheims', async ({ page }) => {
	await page.goto('/history/about');
	await expect(page).toHaveURL('/history/the-douay-rheims');
});

test('/history/the-douay-rheims page loads', async ({ page }) => {
	await page.goto('/history/the-douay-rheims');
	await expect(page).toHaveTitle(/^About the Douay-Rheims Bible/);
});

test('/about link in site footer points to correct URL', async ({ page }) => {
	await page.goto('/');
	const footerLink = page.locator('footer').getByRole('link', { name: 'About the Translation' });
	await expect(footerLink).toHaveAttribute('href', '/history/the-douay-rheims');
});
