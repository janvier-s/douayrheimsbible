import { test, expect } from '@playwright/test';

test('/about page loads with correct title', async ({ page }) => {
	await page.goto('/about');
	await expect(page).toHaveTitle(/About This Website/);
});

test('/about/stats page renders all eight stat cards', async ({ page }) => {
	await page.goto('/about/stats');
	const cards = page.locator('.stat-card');
	await expect(cards).toHaveCount(8);
});

// The other figures are hand-maintained in the page and move with each data
// fix, so only the fixed canon count is pinned here.
test('/about/stats leads with the 76 books', async ({ page }) => {
	await page.goto('/about/stats');
	await expect(page.locator('.stat-number').first()).toHaveText('76');
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
