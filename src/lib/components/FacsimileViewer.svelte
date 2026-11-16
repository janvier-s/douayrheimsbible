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

	const MAX_ZOOM = 8;
	let scale = $state(1);
	let tx = $state(0);
	let ty = $state(0);
	let dragging = $state(false);
	let stageEl = $state<HTMLDivElement>();
	const pointers = new Map<number, { x: number; y: number }>();
	let pinchDist = 0;
	let swipeStartX = 0;
	let moved = false;

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
		resetZoom();
	}

	function resetZoom() {
		scale = 1;
		tx = 0;
		ty = 0;
	}

	// Keep the zoomed page from being dragged out of view.
	function clamp() {
		if (!stageEl) return;
		const maxX = (stageEl.clientWidth * (scale - 1)) / 2;
		const maxY = (stageEl.clientHeight * (scale - 1)) / 2;
		tx = Math.min(maxX, Math.max(-maxX, tx));
		ty = Math.min(maxY, Math.max(-maxY, ty));
	}

	// Zoom to `next`, keeping the point (px, py), in client coords, fixed on screen.
	function zoomAt(next: number, px: number, py: number) {
		if (!stageEl) return;
		next = Math.min(MAX_ZOOM, Math.max(1, next));
		const r = stageEl.getBoundingClientRect();
		const dx = px - (r.left + r.width / 2);
		const dy = py - (r.top + r.height / 2);
		const k = next / scale;
		tx = dx - k * (dx - tx);
		ty = dy - k * (dy - ty);
		scale = next;
		if (scale === 1) resetZoom();
		else clamp();
	}

	function zoomBy(factor: number) {
		if (!stageEl) return;
		const r = stageEl.getBoundingClientRect();
		zoomAt(scale * factor, r.left + r.width / 2, r.top + r.height / 2);
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		// Trackpad pinch arrives as ctrl+wheel with small deltas.
		zoomAt(scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
	}

	// Svelte registers wheel handlers as passive, so attach by hand to allow preventDefault.
	function wheelAction(node: HTMLElement) {
		node.addEventListener('wheel', onWheel, { passive: false });
		return { destroy: () => node.removeEventListener('wheel', onWheel) };
	}

	function onPointerDown(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		moved = false;
		if (pointers.size === 1) swipeStartX = e.clientX;
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
		}
		dragging = true;
	}

	function onPointerMove(e: PointerEvent) {
		const prev = pointers.get(e.pointerId);
		if (!prev) return;
		const cur = { x: e.clientX, y: e.clientY };
		if (Math.abs(cur.x - swipeStartX) > 4) moved = true;
		pointers.set(e.pointerId, cur);
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinchDist > 0) zoomAt(scale * (dist / pinchDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
			pinchDist = dist;
		} else if (pointers.size === 1 && scale > 1) {
			tx += cur.x - prev.x;
			ty += cur.y - prev.y;
			clamp();
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (!pointers.delete(e.pointerId)) return;
		pinchDist = 0;
		if (pointers.size === 0) {
			dragging = false;
			// Swipe to turn the page, only on touch and only when not zoomed in.
			const dx = e.clientX - swipeStartX;
			if (e.pointerType === 'touch' && scale === 1 && moved && Math.abs(dx) > 50) {
				go(dx < 0 ? 1 : -1);
			}
		}
	}

	function onDoubleClick(e: MouseEvent) {
		if (scale > 1) resetZoom();
		else zoomAt(2.5, e.clientX, e.clientY);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') go(1);
		else if (e.key === 'ArrowLeft') go(-1);
		else if (e.key === '+' || e.key === '=') zoomBy(1.5);
		else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.5);
		else if (e.key === '0') resetZoom();
	}

	function onDialogClick(e: MouseEvent) {
		// Clicks on the backdrop land on the dialog element itself.
		if (e.target === dialogEl) dialogEl?.close();
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
		class:zoomed={scale > 1}
		class:dragging
		role="presentation"
		bind:this={stageEl}
		use:wheelAction
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		ondblclick={onDoubleClick}
	>
		{#if failed}
			<p class="fac-error">This page could not be loaded.</p>
		{:else if current > 0}
			{#key current}
				<img
					class="fac-full"
					src={facsimileImageUrl(bookSlug, chapter, current)}
					alt="1609 printing, {bookName} {chapter}, page {position} of {pages.length}"
					style:transform="translate({tx}px, {ty}px) scale({scale})"
					draggable="false"
					onerror={() => (failed = true)}
				/>
			{/key}
		{/if}
	</div>
	<button
		type="button"
		class="fac-nav fac-prev"
		onclick={() => go(-1)}
		disabled={position === 1}
		aria-label="Previous page">‹</button
	>
	<button
		type="button"
		class="fac-nav fac-next"
		onclick={() => go(1)}
		disabled={position === pages.length}
		aria-label="Next page">›</button
	>
	<button
		type="button"
		class="fac-nav fac-close"
		onclick={() => dialogEl?.close()}
		aria-label="Close">×</button
	>
	<div class="fac-bar">
		<span class="fac-zoom">
			<button
				type="button"
				onclick={() => zoomBy(1 / 1.5)}
				disabled={scale <= 1}
				aria-label="Zoom out">−</button
			>
			<button
				type="button"
				onclick={resetZoom}
				disabled={scale === 1}
				aria-label="Fit page to screen">Fit</button
			>
			<button
				type="button"
				onclick={() => zoomBy(1.5)}
				disabled={scale >= MAX_ZOOM}
				aria-label="Zoom in">+</button
			>
		</span>
		<span aria-live="polite">Page {position} of {pages.length}</span>
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
		position: relative;
		display: flex;
		flex-direction: column;
	}
	.fac-dialog::backdrop {
		background: #0b0b0b;
	}
	.fac-stage {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow: hidden;
		touch-action: none;
		user-select: none;
	}
	.fac-stage.zoomed {
		cursor: grab;
	}
	.fac-stage.zoomed.dragging {
		cursor: grabbing;
	}
	/* Fill the stage and letterbox, so the whole page fits with no scrolling. */
	.fac-full {
		position: absolute;
		inset: 0.75rem;
		width: calc(100% - 1.5rem);
		height: calc(100% - 1.5rem);
		object-fit: contain;
		transform-origin: center;
		will-change: transform;
		pointer-events: none;
	}
	.fac-error {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
	}
	.fac-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
		font-size: 0.9rem;
	}
	.fac-zoom {
		display: inline-flex;
		gap: 0.25rem;
	}
	.fac-zoom button {
		min-width: 2.75rem;
		min-height: 2.75rem;
		font-size: 1.1rem;
		color: inherit;
		background: rgba(255, 255, 255, 0.12);
		border: none;
		border-radius: 999px;
		cursor: pointer;
	}
	.fac-zoom button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.25);
	}
	.fac-zoom button:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.fac-nav {
		position: absolute;
		z-index: 1;
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
	.fac-nav:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.25);
	}
	.fac-nav:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.fac-prev,
	.fac-next {
		top: 50%;
		transform: translateY(-50%);
	}
	.fac-prev {
		left: max(0.5rem, env(safe-area-inset-left));
	}
	.fac-next {
		right: max(0.5rem, env(safe-area-inset-right));
	}
	.fac-close {
		top: max(0.5rem, env(safe-area-inset-top));
		right: max(0.5rem, env(safe-area-inset-right));
	}
</style>
