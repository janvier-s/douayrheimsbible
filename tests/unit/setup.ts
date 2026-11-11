// Node 25+ ships an experimental Web Storage global that shadows jsdom's
// localStorage and is undefined without --localstorage-file. Under vitest,
// window is the Node global, so take the storage from the jsdom instance.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (jsdomWindow) {
	for (const key of ['localStorage', 'sessionStorage'] as const) {
		Object.defineProperty(globalThis, key, {
			value: jsdomWindow[key],
			configurable: true,
			writable: true
		});
	}
}
