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
