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
					// ODR pages (/odr/*/*) intentionally NOT excluded — they go through the
					// Worker so the HTML always reflects the current build's chunk hashes.
					// Serving prerendered HTML as static files risks Cloudflare's CDN
					// caching stale HTML with old chunk references, causing MIME errors.
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
		},
		// Inline component CSS chunks smaller than 8KB directly into the HTML
		// instead of emitting them as separate <link> tags. Eliminates 5
		// render-blocking stylesheet requests (~14KB total) flagged by Lighthouse.
		inlineStyleThreshold: 8192
	}
};

export default config;
