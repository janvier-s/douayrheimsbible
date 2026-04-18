/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

// ── Cache names ────────────────────────────────────────────────
const SHELL = `shell-${version}`;
const DATA = 'data-v1';

// ── Asset categorization ───────────────────────────────────────
const BUILD_SET = new Set(build);
const DATA_FILES = files.filter((f) => f.startsWith('/data/'));

// ── Install: pre-cache app shell (JS/CSS bundles) ──────────────
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL)
			.then((cache) => cache.addAll(build))
			.then(() => self.skipWaiting())
	);
});

// ── Activate: clean old shell caches ───────────────────────────
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k))
				)
			)
			.then(() => self.clients.claim())
	);
});

// ── Fetch: route requests to correct cache strategy ────────────
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET') return;
	if (url.origin !== self.location.origin) return;

	// API routes need the Cloudflare Worker — let them through
	if (url.pathname.startsWith('/api/')) return;

	// Build assets (/_app/immutable/...): cache-first (immutable hashed filenames)
	if (BUILD_SET.has(url.pathname)) {
		event.respondWith(cacheFirst(SHELL, event.request));
		return;
	}

	// Data files + fonts: network-first, persistent cache (survives deploys)
	if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/fonts/')) {
		event.respondWith(networkFirst(DATA, event.request));
		return;
	}

	// Everything else (HTML pages, images, manifest): network-first, versioned cache
	event.respondWith(networkFirst(SHELL, event.request));
});

// ── Message handler: download-all / get-cache-status ───────────
self.addEventListener('message', (event) => {
	if (event.data?.type === 'download-all') {
		event.waitUntil(downloadAll());
	} else if (event.data?.type === 'get-cache-status') {
		event.waitUntil(getCacheStatus());
	}
});

let downloading = false;

async function downloadAll() {
	if (downloading) return;
	downloading = true;

	try {
		const cache = await caches.open(DATA);
		const total = DATA_FILES.length;
		let done = 0;
		let failed = 0;
		const BATCH = 20;

		await broadcast({ type: 'download-progress', current: 0, total });

		for (let i = 0; i < total; i += BATCH) {
			const batch = DATA_FILES.slice(i, i + BATCH);
			await Promise.allSettled(
				batch.map(async (file) => {
					try {
						const existing = await cache.match(file);
						if (existing) {
							done++;
							return;
						}
						const res = await fetch(file);
						if (res.ok) {
							await cache.put(file, res);
						} else {
							failed++;
						}
					} catch {
						failed++;
					}
					done++;
				})
			);
			await broadcast({ type: 'download-progress', current: done, total });
		}

		if (failed > 0) {
			await broadcast({ type: 'download-error', error: `${failed} files could not be downloaded.` });
		} else {
			await broadcast({ type: 'download-complete' });
		}
	} finally {
		downloading = false;
	}
}

async function getCacheStatus() {
	const cache = await caches.open(DATA);
	const keys = await cache.keys();
	const cached = keys.filter((r) => new URL(r.url).pathname.startsWith('/data/')).length;
	await broadcast({
		type: 'cache-status',
		cachedFiles: cached,
		totalFiles: DATA_FILES.length,
		isComplete: cached >= DATA_FILES.length
	});
}

async function broadcast(msg: unknown) {
	const clients = await self.clients.matchAll({ type: 'window' });
	clients.forEach((c) => c.postMessage(msg));
}

// ── Cache strategies ───────────────────────────────────────────

async function cacheFirst(cacheName: string, request: Request): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached) return cached;

	const response = await fetch(request);
	if (response.status === 200) {
		cache.put(request, response.clone());
	}
	return response;
}

async function networkFirst(cacheName: string, request: Request): Promise<Response> {
	const cache = await caches.open(cacheName);
	try {
		const response = await fetch(request);
		if (response.status === 200) {
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
	}
}
