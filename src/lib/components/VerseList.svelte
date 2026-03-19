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
		return textVide(text, { fixationPoint: 4 });
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
				<sup class="text-subtle font-ui text-[10px] select-none mr-[3px] tabular-nums"
					>{v.verse}</sup
				>
			{/if}
			{#if $prefs.bionicReading}
				{@html applyBionic(v.text, true)}{' '}
			{:else}
				{v.text}{' '}
			{/if}
		{/each}
	</p>
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v (v.verse)}
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				class="flex gap-sm"
				class:bg-interactive={targetVerse === v.verse}
				class:bg-opacity-10={targetVerse === v.verse}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span
						class="text-subtle font-ui text-[13px] select-none w-6 shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em]"
					>
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
