import { describe, it, expect, vi } from 'vitest';
import { debounce } from '$lib/utils/scroll';

describe('debounce', () => {
	it('fires only once within the delay window', async () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounce(fn, 200);
		debounced();
		debounced();
		debounced();
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});
});
