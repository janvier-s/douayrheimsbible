import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				// Only send dynamic routes to the Worker; pre-rendered ODR pages
				// are served as static assets, avoiding the _routes.json limit.
				include: ['/*'],
				exclude: [
					'/',
					'/odr/*/*',
					'/api',
					'/articles',
					'/books/*',
					'/compare',
					'/contact',
					'/download',
					'/history',
					'/history/*',
					'/privacy',
					'/terms',
					'/data/**',
					'/_app/**',
					'/fonts/*',
					'/favicon*',
					'/apple*',
					'/site*'
				]
			}
		}),
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		}
	}
};

export default config;
