<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseReference } from '$lib/search/reference';
	import { resolveReference } from '$lib/search/resolve';

	let value = '';

	async function handleSubmit() {
		const trimmed = value.trim();
		if (!trimmed) return;

		const parsed = parseReference(trimmed);
		if (parsed) {
			const resolved = resolveReference(parsed);
			if (resolved) {
				goto(resolved.url);
				return;
			}
		}

		goto(`/search?q=${encodeURIComponent(trimmed)}`);
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="w-full relative">
	<svg
		class="absolute left-[9px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-subtle pointer-events-none"
		viewBox="0 0 20 20"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
	>
		<circle cx="8.5" cy="8.5" r="5.5" />
		<line x1="13" y1="13" x2="18" y2="18" />
	</svg>
	<input
		bind:value
		type="search"
		aria-label="Search"
		placeholder="Go to chapter or verse (e.g. John 15)"
		class="w-full bg-panel border border-border rounded-sm pl-[32px] pr-sm py-xs text-sm font-ui
           text-foreground placeholder:text-subtle/50 placeholder:font-thin
           focus:placeholder:text-transparent focus:outline-none focus:border-interactive
           transition-colors duration-fast"
	/>
</form>
