<script lang="ts">
	import { afterNavigate } from '$app/navigation';
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

	function applySmallCaps(text: string): string {
		// 1. JESUS CHRIST / CHRIST JESUS — only JESUS gets small-caps
		text = text.replace(/\bJESUS CHRIST\b/g, '<span class="sc">Jesus</span> Christ');
		text = text.replace(/\bCHRIST JESUS\b/g, 'Christ <span class="sc">Jesus</span>');
		// 2. Multi-word all-caps runs (2+ consecutive ALL-CAPS words) → sentence case + small-caps span
		text = text.replace(/\b[A-Z]{2,}(?:\s+[A-Z]{2,})+\b/g, (match) => {
			const sentenceCase = match.charAt(0) + match.slice(1).toLowerCase();
			return `<span class="sc">${sentenceCase}</span>`;
		});
		// 3. Remaining standalone names
		text = text.replace(/\bJESUS\b/g, '<span class="sc">Jesus</span>');
		text = text.replace(/\bMARY\b/g, '<span class="sc">Mary</span>');
		text = text.replace(/\bCHRIST\b/g, '<span class="sc">Christ</span>');
		return text;
	}

	function renderVerse(text: string): string {
		return applySmallCaps($prefs.bionicReading ? applyBionic(text, true) : text);
	}

	// afterNavigate fires after SvelteKit finishes its own scroll restoration,
	// so this reliably wins over the browser's scroll-to-top behaviour.
	afterNavigate(() => {
		if (targetVerse && verseEls[targetVerse]) {
			verseEls[targetVerse].scrollIntoView({ behavior: 'instant', block: 'center' });
		}
	});
</script>

{#if $prefs.paragraphView}
	<p
		class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
		class:text-justify={$prefs.justifiedText}
	>
		{#each verses as v, i (i)}
			{#if $prefs.showVerseNumbers}
				<sup class="text-subtle font-ui text-[10px] font-thin select-none mr-[3px] tabular-nums"
					>{v.verse}</sup
				>
			{/if}
			{@html renderVerse(v.text)}{' '}
		{/each}
	</p>
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v, i (i)}
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				class="flex gap-sm"
				class:verse-target={targetVerse === v.verse}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span
						class="text-subtle font-ui text-[13px] font-thin select-none w-6 shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em]"
					>
						{v.verse}
					</span>
				{/if}
				<p
					class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
					class:text-justify={$prefs.justifiedText}
				>
					{@html renderVerse(v.text)}
				</p>
			</li>
		{/each}
	</ol>
{/if}

<style>
	.verse-target {
		box-shadow: inset 3px 0 0 var(--color-interactive);
	}

	:global(.sc) {
		font-variant: small-caps;
	}
</style>
