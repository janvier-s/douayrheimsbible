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
					// '/' intentionally omitted — homepage goes through the Worker so its
					// embedded SvelteKit manifest always reflects the current build's chunk
					// hashes.  Serving it as a static file risks a stale manifest that
					// causes MIME-type errors when client-side navigating to ODR pages.
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
		paths: {
			// Use absolute /_app/... paths in all prerendered pages so that
			// 404.html works correctly when Cloudflare serves it as a fallback
			// for deep URLs (e.g. /odr/invalidbook/16) where relative paths
			// would resolve to the wrong location.
			relative: false
		},
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		}
	}
};

export default config;
