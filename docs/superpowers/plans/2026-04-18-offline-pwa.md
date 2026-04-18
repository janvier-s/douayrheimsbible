# Offline PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire Douay-Rheims Bible available offline via a service worker with a single "Download for offline" button (~8 MB transfer).

**Architecture:** SvelteKit's built-in `src/service-worker.ts` with the `$service-worker` module for asset lists. Two-cache strategy: a versioned shell cache (`shell-${version}`) for app JS/CSS cleaned on deploy, and a persistent data cache (`data-v1`) for Bible JSON that survives across versions. The service worker uses cache-first for build assets (immutable hashed filenames) and network-first-with-cache-fallback for everything else. A "Download for offline" button triggers the service worker to pre-fetch all ~2,650 data files via postMessage, with batch progress reported back to the UI.

**Tech Stack:** SvelteKit `$service-worker` module, Cache API, postMessage, Svelte writable stores, Svelte 4 syntax

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/service-worker.ts` | Service worker: install/activate/fetch handlers, download message handler |
| Create | `src/lib/stores/offline.ts` | Writable store: download state, service worker communication |
| Create | `src/lib/components/OfflineDownload.svelte` | UI: download button, progress bar, completion state |
| Modify | `src/routes/download/+page.svelte` | Add OfflineDownload component to the page |

---

### Task 1: Service Worker

**Files:**
- Create: `src/service-worker.ts`

**Context:** SvelteKit auto-discovers `src/service-worker.ts`, bundles it with Vite, and registers it in the browser. The `$service-worker` module provides `build` (hashed JS/CSS files), `files` (everything in `static/`), and `version` (deployment identifier). The `files` array includes all ~2,650 data JSON files under `static/data/`, all font files under `static/fonts/`, and miscellaneous static assets.

- [ ] **Step 1: Create the service worker with install/activate/fetch**

```ts
// src/service-worker.ts

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
	}
	if (event.data?.type === 'get-cache-status') {
		event.waitUntil(getCacheStatus());
	}
});

async function downloadAll() {
	const cache = await caches.open(DATA);
	const total = DATA_FILES.length;
	let done = 0;
	const BATCH = 20;

	await broadcast({ type: 'download-progress', current: 0, total });

	for (let i = 0; i < total; i += BATCH) {
		const batch = DATA_FILES.slice(i, i + BATCH);
		await Promise.allSettled(
			batch.map(async (file) => {
				try {
					const res = await fetch(file);
					if (res.ok) {
						await cache.put(file, res);
					}
				} catch {
					/* skip failed files */
				}
				done++;
			})
		);
		await broadcast({ type: 'download-progress', current: done, total });
	}

	await broadcast({ type: 'download-complete' });
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
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: 0 errors. If `svelte-check` reports type errors in `service-worker.ts` (the triple-slash directives may conflict with the project tsconfig), rename the file to `src/service-worker.js` and remove the TypeScript type annotations — SvelteKit supports both `.ts` and `.js`.

- [ ] **Step 3: Verify service worker registration in dev**

Run: `npm run dev`
Open Chrome → DevTools → Application → Service Workers.
Expected: a service worker registered at the site's scope. Note: `build` and `prerendered` arrays are empty during development, so the install cache will be minimal. Full testing requires a production build.

- [ ] **Step 4: Commit**

```bash
git add src/service-worker.ts
git commit -m "feat: add service worker for offline caching

Shell cache (versioned) for app build files, persistent data cache
for Bible JSON. Network-first for data, cache-first for immutable
build assets. Download handler for bulk pre-caching via postMessage."
```

---

### Task 2: Offline Store

**Files:**
- Create: `src/lib/stores/offline.ts`

**Context:** The store manages the download lifecycle state and communicates with the service worker via `postMessage` / `message` events. It follows the same writable store pattern used by `src/lib/stores/prefs.ts` and other existing stores. Uses Svelte 4 store conventions (`writable`, `$store` syntax).

- [ ] **Step 1: Create the offline store**

```ts
// src/lib/stores/offline.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type OfflineStatus = 'checking' | 'unavailable' | 'not-downloaded' | 'downloading' | 'complete' | 'error';

interface OfflineState {
	status: OfflineStatus;
	progress: number;
	current: number;
	total: number;
	error: string;
}

const initial: OfflineState = {
	status: 'checking',
	progress: 0,
	current: 0,
	total: 0,
	error: ''
};

function createOfflineStore() {
	const { subscribe, set, update } = writable<OfflineState>(initial);

	let listening = false;

	function handleMessage(event: MessageEvent) {
		const d = event.data;
		if (!d || !d.type) return;

		if (d.type === 'cache-status') {
			set({
				status: d.isComplete ? 'complete' : 'not-downloaded',
				progress: d.totalFiles > 0 ? Math.round((d.cachedFiles / d.totalFiles) * 100) : 0,
				current: d.cachedFiles,
				total: d.totalFiles,
				error: ''
			});
		} else if (d.type === 'download-progress') {
			update((s) => ({
				...s,
				status: 'downloading',
				current: d.current,
				total: d.total,
				progress: d.total > 0 ? Math.round((d.current / d.total) * 100) : 0
			}));
		} else if (d.type === 'download-complete') {
			set({ status: 'complete', progress: 100, current: 0, total: 0, error: '' });
		} else if (d.type === 'download-error') {
			update((s) => ({
				...s,
				status: 'error',
				error: d.error || 'Download failed. Please try again.'
			}));
		}
	}

	function init() {
		if (!browser) return;
		if (!('serviceWorker' in navigator)) {
			set({ ...initial, status: 'unavailable' });
			return;
		}
		if (listening) return;
		listening = true;

		navigator.serviceWorker.addEventListener('message', handleMessage);
		navigator.serviceWorker.ready.then((reg) => {
			reg.active?.postMessage({ type: 'get-cache-status' });
		});
	}

	function startDownload() {
		if (!browser || !('serviceWorker' in navigator)) return;
		update((s) => ({ ...s, status: 'downloading', progress: 0, current: 0, error: '' }));
		navigator.serviceWorker.ready.then((reg) => {
			reg.active?.postMessage({ type: 'download-all' });
		});
	}

	return { subscribe, init, startDownload };
}

export const offline = createOfflineStore();
```

- [ ] **Step 2: Verify types**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/offline.ts
git commit -m "feat: add offline store for service worker communication

Manages download lifecycle (checking/downloading/complete/error).
Communicates with service worker via postMessage for download
triggers and progress updates."
```

---

### Task 3: OfflineDownload Component

**Files:**
- Create: `src/lib/components/OfflineDownload.svelte`

**Context:** Svelte 4 syntax per project convention. Uses `$offline` store for reactive state. Styled to match the existing download page (ProseLayout context, same CSS variables). The component is self-contained — `onMount` calls `offline.init()`, the button calls `offline.startDownload()`.

- [ ] **Step 1: Create the OfflineDownload component**

```svelte
<!-- src/lib/components/OfflineDownload.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { offline } from '$lib/stores/offline';

	onMount(() => {
		offline.init();
	});
</script>

{#if $offline.status === 'checking'}
	<div class="offline-card">
		<p class="offline-note">Checking offline status&hellip;</p>
	</div>
{:else if $offline.status === 'unavailable'}
	<!-- Browser doesn't support service workers — hide silently -->
{:else if $offline.status === 'not-downloaded'}
	<div class="offline-card">
		<p class="offline-heading">Read offline</p>
		<p class="offline-desc">
			Download the complete site for offline reading, including all translations, annotations, and
			study notes. Approximately 8&nbsp;MB.
		</p>
		<button class="offline-btn" on:click={offline.startDownload}>Download for offline use</button>
	</div>
{:else if $offline.status === 'downloading'}
	<div class="offline-card">
		<p class="offline-heading">Downloading&hellip;</p>
		<div class="progress-track">
			<div class="progress-fill" style="width: {$offline.progress}%"></div>
		</div>
		<p class="offline-note">
			{$offline.progress}%
			{#if $offline.total > 0}
				&middot; {$offline.current.toLocaleString()} / {$offline.total.toLocaleString()} files
			{/if}
		</p>
	</div>
{:else if $offline.status === 'complete'}
	<div class="offline-card offline-complete">
		<p class="offline-heading">
			<span class="offline-check" aria-hidden="true">&#10003;</span> Available offline
		</p>
		<p class="offline-note">
			All content has been downloaded. You can read without an internet connection.
		</p>
	</div>
{:else if $offline.status === 'error'}
	<div class="offline-card">
		<p class="offline-error">{$offline.error}</p>
		<button class="offline-btn" on:click={offline.startDownload}>Retry download</button>
	</div>
{/if}

<style>
	.offline-card {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 20px 24px;
		background: var(--color-panel);
	}

	.offline-complete {
		border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
	}

	.offline-heading {
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 8px;
	}

	.offline-desc {
		font-family: var(--font-ui);
		font-size: 14px;
		color: var(--color-muted);
		line-height: 1.55;
		margin: 0 0 16px;
	}

	.offline-note {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
		margin: 0;
	}

	.offline-error {
		font-family: var(--font-ui);
		font-size: 13px;
		color: #c0392b;
		margin: 0 0 12px;
	}

	.offline-check {
		color: var(--color-accent);
		margin-right: 4px;
	}

	.offline-btn {
		display: inline-flex;
		align-items: center;
		padding: 8px 18px;
		border: 1px solid var(--color-subtle);
		border-radius: 3px;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-text);
		cursor: pointer;
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}

	.offline-btn:hover {
		border-color: var(--color-muted);
		background: color-mix(in srgb, var(--color-subtle) 15%, transparent);
	}

	.progress-track {
		width: 100%;
		height: 4px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
		margin: 12px 0 8px;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		border-radius: 2px;
		transition: width 300ms ease;
	}
</style>
```

- [ ] **Step 2: Verify types**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/OfflineDownload.svelte
git commit -m "feat: add OfflineDownload component

Shows download button (8 MB), progress bar during download,
and 'Available offline' confirmation. Self-contained — reads
from offline store, triggers download via service worker."
```

---

### Task 4: Download Page Integration

**Files:**
- Modify: `src/routes/download/+page.svelte`

**Context:** The download page (`/download`) currently shows links to the GitHub repo for JSON/USFM/PDF downloads. We add the `OfflineDownload` component as a new section at the top of the page, before the existing "Structured Data" heading.

- [ ] **Step 1: Read the current download page**

Read: `src/routes/download/+page.svelte` — understand the current structure.

The page uses `<ProseLayout>` with a title and subtitle. Content starts with an `<h2>Structured Data</h2>`. We add the offline section above it.

- [ ] **Step 2: Add the OfflineDownload component**

Add the import in the `<script>` tag:

```ts
import OfflineDownload from '$lib/components/OfflineDownload.svelte';
```

Add the component just inside `<ProseLayout>`, before the first `<h2>`:

```svelte
<OfflineDownload />

<h2>Structured Data</h2>
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Navigate to `/download`. Verify:
1. The OfflineDownload card appears above "Structured Data"
2. It shows "Read offline" with a download button (or "Checking..." briefly, then the button)
3. Clicking "Download for offline use" starts the download with a progress bar
4. After completion, it shows "Available offline" with a checkmark

Note: During development, the `files` array from `$service-worker` is populated but `build` is empty. The download should still work (it will pre-fetch all `/data/` files).

- [ ] **Step 4: Run checks**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/routes/download/+page.svelte
git commit -m "feat: add offline download to the downloads page

Users can now download the entire site (~8 MB) for offline reading
directly from the downloads page."
```

---

### Task 5: Production Verification

**Context:** The service worker's `build` array is empty during development. A production build is needed to fully verify the install cache, fetch interception, and offline behavior.

- [ ] **Step 1: Build and preview**

```bash
npm run build
npm run preview
```

Open Chrome → DevTools → Application tab.

- [ ] **Step 2: Verify service worker registration**

In Application → Service Workers:
- Status should show "activated and is running"
- Source should be `service-worker.js`

- [ ] **Step 3: Verify shell caching**

In Application → Cache Storage:
- `shell-{hash}` cache should contain all `/_app/immutable/...` build files

- [ ] **Step 4: Verify data caching on navigation**

Navigate to `/odr/genesis/1`. Then check Application → Cache Storage → `data-v1`:
- Should contain `/data/odr/genesis.json`

Navigate to `/odr/matthew/1`:
- `data-v1` should now also contain `/data/odr/matthew.json`

- [ ] **Step 5: Verify "Download for offline"**

Navigate to `/download`. Click "Download for offline use":
- Progress bar should advance
- After completion, "Available offline" should appear
- `data-v1` cache should contain all `/data/` files

- [ ] **Step 6: Verify offline reading**

In DevTools → Network → check "Offline" checkbox.
Navigate between chapters (e.g., `/odr/genesis/2`, `/odr/matthew/5`):
- Pages should load from cache
- Reading experience should work normally

Navigate to `/search` and search for something:
- Should show "Search is not available offline." message

- [ ] **Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: service worker adjustments from production testing"
```
