import { test, expect } from '@playwright/test';

// A click on Reading options before the page has hydrated used to be lost:
// the server-rendered button has no handler yet, so the reader had to reload.
// Holding back the app's JavaScript makes that window wide enough to hit.
const pages = ['/odr/genesis/1', '/compare', '/fathers'];

for (const viewport of [
	{ name: 'desktop', width: 1280, height: 800 },
	{ name: 'mobile', width: 390, height: 800 }
]) {
	for (const path of pages) {
		test(`${viewport.name} ${path}: Reading options clicked before hydration opens`, async ({
			page
		}) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			let release!: () => void;
			const held = new Promise<void>((r) => (release = r));
			await page.route('**/_app/immutable/**', async (route) => {
				await held;
				await route.continue();
			});

			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const button = page.locator('button[aria-label="Reading options"]:visible').first();
			await button.click();
			release();

			await expect(
				page.locator('[role="dialog"][aria-label="Reading options"]:visible').first()
			).toBeVisible();
		});
	}
}
