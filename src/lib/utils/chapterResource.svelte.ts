/**
 * A keyed, race-guarded async resource for the study panel's sidecar data.
 *
 * StudyPanel had eight copies of the same twenty-line block: derive a key from
 * the current translation/book/chapter, bail if it has not changed, set a
 * loading flag, fetch, then apply the result only if the key is still current.
 * The copies had drifted: the Haydock loader compared live values rather than
 * the ones captured before the await (so a failed fetch during navigation could
 * leave `loading` stuck true), and the two Confraternity loaders had no error
 * path at all. This applies one correct version to all of them.
 *
 * `key()` returning null means "not applicable for this translation": the
 * resource clears and no fetch is made.
 */
export function createChapterResource<T>(options: {
	/** Reactive key. Return null to disable and clear. */
	key: () => string | null;
	/** Fetch for the given key. */
	load: (key: string) => Promise<T | null>;
	/** Runs after a successful load that is still current. */
	onLoaded?: (data: T | null) => void;
}) {
	let data: T | null = $state(null);
	let loading = $state(false);
	let lastKey: string | null = null;

	$effect(() => {
		const key = options.key();

		if (key === null) {
			// Only clear if we were holding something for a previous key, so this
			// does not fight with a resource that was never enabled.
			if (lastKey !== null) {
				lastKey = null;
				data = null;
				loading = false;
			}
			return;
		}

		if (key === lastKey) return;
		lastKey = key;
		loading = true;
		data = null;

		options.load(key).then(
			(result) => {
				if (lastKey !== key) return;
				data = result;
				loading = false;
				options.onLoaded?.(result);
			},
			() => {
				if (lastKey !== key) return;
				loading = false;
			}
		);
	});

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		}
	};
}
