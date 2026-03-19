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

<form on:submit|preventDefault={handleSubmit} class="w-full">
	<input
		bind:value
		type="search"
		aria-label="Search"
		placeholder="Go to chapter or verse (e.g. John 15)"
		class="w-full bg-panel border border-border rounded-sm px-sm py-xs text-sm font-ui
           text-foreground placeholder:text-muted focus:outline-none focus:border-interactive
           transition-colors duration-fast"
	/>
</form>
