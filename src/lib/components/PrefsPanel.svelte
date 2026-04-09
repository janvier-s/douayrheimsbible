<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import ReadingPrefs from './ReadingPrefs.svelte';

	export let compareMode = false;
</script>

<!-- Desktop panel -->
<div
	transition:slide={{ duration: 180 }}
	class="hidden md:block fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
	role="dialog"
	aria-label="Reading options"
>
	<ReadingPrefs {compareMode} />
</div>

<!-- Mobile top panel — slides down from header -->
<div
	transition:fly={{ y: -30, duration: 200, easing: cubicOut }}
	class="md:hidden fixed inset-x-0 top-[var(--header-height)] bg-panel border-b border-border z-[60] font-ui"
	style="border-radius: 0 0 12px 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);"
	role="dialog"
	aria-label="Reading options"
>
	<div style="height: 320px; overflow-y: auto; overscroll-behavior: contain;">
		<ReadingPrefs {compareMode} />
	</div>
</div>
