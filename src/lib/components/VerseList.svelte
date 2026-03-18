<script lang="ts">
	import { onMount } from 'svelte';
	import { textVide } from 'text-vide';
	import { prefs } from '$lib/stores/prefs';
	import type { Verse } from '$lib/data/types';

	export let verses: Verse[];
	export let targetVerse: number | undefined;
	export let bookSlug: string;
	export let chapterNum: number;

	let verseEls: Record<number, HTMLElement> = {};

	function applyBionic(text: string, enabled: boolean): string {
		if (!enabled) return text;
		return textVide(text, { fixationPoint: 5 });
	}

	onMount(() => {
		if (targetVerse && verseEls[targetVerse]) {
			verseEls[targetVerse].scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
</script>

{#if $prefs.paragraphView}
	<p class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]">
		{#each verses as v (v.verse)}
			{#if $prefs.showVerseNumbers}
				<sup class="text-muted font-ui text-xs select-none mr-0.5">{v.verse}</sup>
			{/if}
			{#if $prefs.bionicReading}
				{@html applyBionic(v.text, true)}{' '}
			{:else}
				{v.text}{' '}
			{/if}
		{/each}
	</p>
{:else}
	<ol class="list-none space-y-sm">
		{#each verses as v (v.verse)}
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				class="flex gap-xs"
				class:bg-interactive={targetVerse === v.verse}
				class:bg-opacity-10={targetVerse === v.verse}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span class="text-muted font-ui text-sm select-none w-8 shrink-0 pt-0.5">
						{v.verse}
					</span>
				{/if}
				<p
					class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
				>
					{#if $prefs.bionicReading}
						{@html applyBionic(v.text, true)}
					{:else}
						{v.text}
					{/if}
				</p>
			</li>
		{/each}
	</ol>
{/if}
