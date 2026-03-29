<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import type { Verse } from '$lib/data/types';
	import InlineAnnotationBlock from './InlineAnnotationBlock.svelte';

	export let verses: Verse[];
	export let targetVerse: number | undefined;
	export let bookSlug: string;
	export let chapterNum: number;

	let verseEls: Record<number, HTMLElement> = {};

	// Lazy-load text-vide only when bionic reading is first enabled
	let textVideFn: ((_text: string, _opts: object) => string) | null = null;
	let bionicReady = false;
	$: if ($prefs.bionicReading && !textVideFn) {
		import('text-vide').then((m) => {
			textVideFn = m.textVide;
			bionicReady = true;
		});
	} else if (!$prefs.bionicReading) {
		bionicReady = false;
	}

	function applyBionic(text: string): string {
		if (!textVideFn) return text;
		const fixation = $prefs.bionicFixation ?? 3;
		const saccade = $prefs.bionicSaccade ?? 0;
		const bionic = textVideFn(text, { fixationPoint: fixation });
		if (saccade === 0) return bionic;
		// text-vide has no saccade support — strip bold from non-interval words manually
		let n = 0;
		return bionic.replace(/<b>([^<]*)<\/b>/g, (_match, inner) => {
			n++;
			return n % (saccade + 1) === 1 ? `<b>${inner}</b>` : inner;
		});
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
		// 3. Any remaining standalone all-caps word (3+ chars) → title case + small-caps
		text = text.replace(/\b[A-Z]{3,}\b/g, (match) => {
			const titleCase = match.charAt(0) + match.slice(1).toLowerCase();
			return `<span class="sc">${titleCase}</span>`;
		});
		return text;
	}

	function renderVerse(text: string, bionic: boolean): string {
		// HTML is constructed by our own applySmallCaps/applyBionic from trusted build-time JSON
		return applySmallCaps(bionic ? applyBionic(text) : text);
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
		class:bionic-fade={$prefs.bionicReading && bionicReady}
	>
		{#each verses as v, i (i)}
			{#if $prefs.showVerseNumbers}
				<sup class="text-subtle font-ui text-[10px] font-thin select-none mr-[3px] tabular-nums"
					>{v.verse}</sup
				>
			{/if}
			{@html renderVerse(v.text, $prefs.bionicReading && bionicReady)}{' '}
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
					class:bionic-fade={$prefs.bionicReading && bionicReady}
				>
					{@html renderVerse(v.text, $prefs.bionicReading && bionicReady)}
				</p>
			</li>
			{#if $prefs.readingMode === 'study' && v.inlineAnnotations && v.inlineAnnotations.length > 0}
				<InlineAnnotationBlock annotations={v.inlineAnnotations} />
			{/if}
		{/each}
	</ol>
{/if}

<style>
	.verse-target {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	:global(.sc) {
		font-variant: small-caps;
	}

	:global(.bionic-fade) {
		color: color-mix(
			in srgb,
			var(--color-text) calc(var(--bionic-opacity, 0.4) * 100%),
			transparent
		);
	}

	:global(.bionic-fade b) {
		font-weight: var(--bionic-bold-weight, 700);
		color: var(--color-text);
	}
</style>
