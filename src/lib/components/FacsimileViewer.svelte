<script lang="ts">
	import { facsimileImageUrl } from '$lib/data/facsimile';

	let {
		bookSlug,
		chapter,
		first,
		count,
		bookName
	}: { bookSlug: string; chapter: number; first: number; count: number; bookName: string } =
		$props();

	let dialogEl = $state<HTMLDialogElement>();
	let current = $state(0);
	let failed = $state(false);
	let isOpen = $state(false);
	// A few scans are missing at the source; their thumbnails are dropped.
	let broken = $state<number[]>([]);
	let touchStartX = 0;

	const pages = $derived(
		Array.from({ length: count }, (_, i) => first + i).filter((p) => !broken.includes(p))
	);
	const position = $derived(Math.max(0, pages.indexOf(current)) + 1);

	function open(page: number) {
		current = page;
		failed = false;
		isOpen = true;
		dialogEl?.showModal();
	}

	function go(delta: number) {
		const i = pages.indexOf(current) + delta;
		if (i < 0 || i >= pages.length) return;
		current = pages[i];
		failed = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') go(1);
		else if (e.key === 'ArrowLeft') go(-1);
	}

	function onDialogClick(e: MouseEvent) {
		// Clicks on the backdrop land on the dialog element itself.
		if (e.target === dialogEl) dialogEl?.close();
	}

	function onTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
	}

	// Warm the next page so arrow-through feels instant.
	$effect(() => {
		const next = pages[pages.indexOf(current) + 1];
		if (isOpen && next) new Image().src = facsimileImageUrl(bookSlug, chapter, next);
	});
</script>

<ul class="fac-grid" aria-label="Facsimile pages">
	{#each pages as page, i (page)}
		<li>
			<button
				type="button"
				class="fac-thumb"
				onclick={() => open(page)}
				aria-label="Open page {i + 1} of {pages.length}"
			>
				<span class="fac-frame">
					<img
						src={facsimileImageUrl(bookSlug, chapter, page, true)}
						alt="1609 printing, {bookName} {chapter}, page {i + 1}"
						loading="lazy"
						decoding="async"
						onerror={() => (broken = [...broken, page])}
					/>
				</span>
				<span class="fac-num">Page {i + 1}</span>
			</button>
		</li>
	{/each}
</ul>

<dialog
	bind:this={dialogEl}
	class="fac-dialog"
	aria-label="Facsimile, {bookName} {chapter}"
	onclick={onDialogClick}
	onkeydown={onKey}
	onclose={() => (isOpen = false)}
>
	<div
		class="fac-stage"
		role="presentation"
		ontouchstart={(e) => (touchStartX = e.touches[0].clientX)}
		ontouchend={onTouchEnd}
	>
		{#if failed}
			<p class="fac-error">This page could not be loaded.</p>
		{:else}
			{#key current}
				<img
					class="fac-full"
					src={facsimileImageUrl(bookSlug, chapter, current)}
					alt="1609 printing, {bookName} {chapter}, page {position} of {pages.length}"
					onerror={() => (failed = true)}
				/>
			{/key}
		{/if}
	</div>
	<div class="fac-bar">
		<button
			type="button"
			onclick={() => go(-1)}
			disabled={position === 1}
			aria-label="Previous page">‹</button
		>
		<span aria-live="polite">Page {position} of {pages.length}</span>
		<button
			type="button"
			onclick={() => go(1)}
			disabled={position === pages.length}
			aria-label="Next page">›</button
		>
		<button type="button" class="fac-close" onclick={() => dialogEl?.close()} aria-label="Close"
			>×</button
		>
	</div>
</dialog>

<style>
	.fac-grid {
		list-style: none;
		margin: 1rem 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
		gap: 0.75rem;
	}
	.fac-thumb {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		cursor: pointer;
		text-align: center;
	}
	.fac-frame {
		display: block;
		overflow: hidden;
		border: 1px solid var(--color-border, rgba(128, 128, 128, 0.35));
		border-radius: 3px;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.fac-thumb:hover .fac-frame,
	.fac-thumb:focus-visible .fac-frame {
		border-color: var(--color-accent);
		transform: translateY(-1px);
	}
	.fac-thumb:focus-visible {
		outline: none;
	}
	.fac-frame img {
		display: block;
		width: 100%;
		aspect-ratio: 1603 / 2208;
		object-fit: cover;
		background: rgba(128, 128, 128, 0.12);
	}
	.fac-num {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-muted, var(--color-subtle));
	}
	.fac-dialog {
		width: 100vw;
		max-width: 100vw;
		height: 100dvh;
		max-height: 100dvh;
		margin: 0;
		padding: 0;
		border: none;
		background: #0b0b0b;
		color: #fff;
	}
	.fac-dialog[open] {
		display: flex;
		flex-direction: column;
	}
	.fac-dialog::backdrop {
		background: #0b0b0b;
	}
	.fac-stage {
		flex: 1;
		min-height: 0;
		overflow: auto;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: 0.75rem;
	}
	.fac-full {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		margin: auto;
	}
	.fac-error {
		margin: auto;
	}
	.fac-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
		font-size: 0.9rem;
	}
	.fac-bar button {
		min-width: 2.75rem;
		min-height: 2.75rem;
		font-size: 1.6rem;
		line-height: 1;
		color: inherit;
		background: rgba(255, 255, 255, 0.12);
		border: none;
		border-radius: 999px;
		cursor: pointer;
	}
	.fac-bar button:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.fac-close {
		margin-left: auto;
	}
</style>
