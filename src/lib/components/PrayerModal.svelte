<script lang="ts">
	import { prayerOpen } from '$lib/stores/prayer';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import VerseTooltip from '$lib/components/VerseTooltip.svelte';
	import type { OsisRange } from '$lib/search/reference';

	const refRanges: OsisRange[] = [
		{ book: '1Cor', startChapter: 13, startVerse: 8, endVerse: 8 },
		{ book: '1Cor', startChapter: 2, startVerse: 2, endVerse: 2 }
	];

	let refAnchorEl: HTMLElement | null = null;
	let refTooltipVisible = false;
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	function enterRef(e: MouseEvent) {
		if (hoverTimer) clearTimeout(hoverTimer);
		refAnchorEl = e.currentTarget as HTMLElement;
		refTooltipVisible = true;
	}

	function leaveRef() {
		hoverTimer = setTimeout(() => { refTooltipVisible = false; }, 120);
	}

	function enterTooltip() {
		if (hoverTimer) clearTimeout(hoverTimer);
	}

	let tab: 'indulgences' | 'before' | 'after' = 'before';

	function close() {
		prayerOpen.set(false);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}

	onMount(() => {
		if (browser) document.addEventListener('keydown', handleKey);
	});

	onDestroy(() => {
		if (browser) document.removeEventListener('keydown', handleKey);
	});

	$: if (browser && $prayerOpen) {
		document.body.style.overflow = 'hidden';
		tab = 'before';
	} else if (browser) {
		document.body.style.overflow = '';
	}
</script>

{#if $prayerOpen}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="prayer-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="prayer-title"
		tabindex="-1"
		on:click={handleBackdrop}
		on:keydown={handleKey}
	>
		<div class="prayer-panel">
			<div class="prayer-head">
				<div class="prayer-tabs">
					<button
						class="prayer-tab"
						class:active={tab === 'indulgences'}
						on:click={() => (tab = 'indulgences')}
					>Indulgences</button>
					<button
						class="prayer-tab"
						class:active={tab === 'before'}
						on:click={() => (tab = 'before')}
					>Before Reading</button>
					<button
						class="prayer-tab"
						class:active={tab === 'after'}
						on:click={() => (tab = 'after')}
					>After Reading</button>
				</div>
				<button class="prayer-close" on:click={close} aria-label="Close">
					<svg
						width="11"
						height="11"
						viewBox="0 0 11 11"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						aria-hidden="true"
					>
						<line x1="1" y1="1" x2="10" y2="10" />
						<line x1="10" y1="1" x2="1" y2="10" />
					</svg>
				</button>
			</div>

			{#if tab === 'before'}
				<h2 id="prayer-title" class="prayer-title">Veni Sancte Spiritus</h2>

				<div class="prayer-columns">
					<div class="prayer-col">
						<p class="prayer-lang">Latin</p>
						<div class="prayer-body">
							<p>
								Veni, Sancte Spiritus,<br />
								reple tuorum corda fidelium,<br />
								et tui amoris in eis ignem accende.
							</p>
							<p class="prayer-versicles">
								<span class="vr">℣.</span> Emitte Spiritum tuum et creabuntur.<br />
								<span class="vr">℟.</span> Et renovabis faciem terrae.
							</p>
							<p>
								<em>Oremus.</em><br />
								Deus, qui corda fidelium Sancti Spiritus illustratione docuisti, da nobis in eodem Spiritu
								recta sapere, et de eius semper consolatione gaudere. Per Christum Dominum nostrum. Amen.
							</p>
						</div>
					</div>

					<div class="prayer-divider" aria-hidden="true"></div>

					<div class="prayer-col">
						<p class="prayer-lang">English</p>
						<div class="prayer-body">
							<p>
								Come, Holy Spirit,<br />
								fill the hearts of Thy faithful<br />
								and enkindle in them the fire of Thy love.
							</p>
							<p class="prayer-versicles">
								<span class="vr">℣.</span> Send forth Thy Spirit and they shall be created.<br />
								<span class="vr">℟.</span> And Thou shalt renew the face of the earth.
							</p>
							<p>
								<em>Let us pray.</em><br />
								O God, Who didst instruct the hearts of the faithful by the light of the Holy Spirit,
								grant us by the same Spirit to have a right judgment in all things and ever to rejoice
								in His consolation. Through Christ our Lord. Amen.
							</p>
						</div>
					</div>
				</div>

				<p class="prayer-source">Veni Sancte Spiritus · Liturgy of the Hours</p>

			{:else if tab === 'after'}
				<h2 id="prayer-title" class="prayer-title">Prayer After Reading</h2>

				<div class="prayer-body prayer-body--single">
					<p>
						Let me not, O Lord, be puffed up with worldly wisdom, which passes away, but grant me
						that love which never abates, that I may not choose to know anything among men but Jesus,
						and Him crucified.<br /><span class="prayer-ref">(<a href="/odr/1-corinthians/13" on:click={close} on:mouseenter={enterRef} on:mouseleave={leaveRef} class="prayer-ref-link">1 Cor. 13:8; 2:2</a>)</span>
					</p>
					<p>
						I pray Thee, loving Jesus, that as Thou hast graciously given me to drink in with delight
						the words of Thy knowledge, so Thou wouldst mercifully grant me to attain one day to Thee,
						the Fountain of all Wisdom, and to appear forever before Thy face. Amen.
					</p>
				</div>

				<p class="prayer-source">Prayer of St. Bede the Venerable · c. 735</p>

			{:else}
				<h2 id="prayer-title" class="prayer-title">Indulgences for Reading Scripture</h2>

				<div class="prayer-body prayer-body--single">
					<p>
						An indulgence of three years is granted to the faithful who read the Books of the Bible
						for at least a quarter of an hour, with the reverence due to the Divine Word and as
						spiritual reading.
					</p>
					<p>
						To the faithful who piously read at least some verses of the Gospel and in addition,
						while kissing the Gospel Book, devoutly recite one of the following invocations:
						<em>"May our sins be blotted out through the words of the Gospel"</em> —
						<em>"May the reading of the Gospel be our salvation and protection"</em> —
						<em>"May Christ, the Son of God, teach us the words of the Holy Gospel"</em>:
					</p>
					<ul class="prayer-grants">
						<li>an indulgence of 500 days is granted;</li>
						<li>
							a plenary indulgence under the usual conditions is granted to those who for a whole
							month daily act in the way indicated above;
						</li>
						<li>
							a plenary indulgence is granted at the hour of death to those who often during life
							have performed this pious exercise, provided they have confessed and received
							Communion, or at least having sorrow for their sins, they invoke the most holy name
							of Jesus with their lips, if possible, or at least in their hearts, and humbly
							accept death from the hand of God as the price of sin.
						</li>
					</ul>
				</div>

				<p class="prayer-source">Enchiridion Indulgentiarum, 694</p>
			{/if}
		</div>
	</div>
{/if}

<VerseTooltip
	osisRanges={refRanges}
	anchorEl={refAnchorEl}
	visible={refTooltipVisible}
	on:mouseenter={enterTooltip}
	on:mouseleave={leaveRef}
/>

<style>
	.prayer-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		animation: backdrop-in 180ms ease both;
	}

	@keyframes backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.prayer-panel {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow:
			0 8px 24px -4px rgba(0, 0, 0, 0.2),
			0 2px 8px -2px rgba(0, 0, 0, 0.12);
		width: 100%;
		max-width: 580px;
		padding: 32px 36px 28px;
		animation: panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.prayer-head {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20px;
	}

	.prayer-tabs {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.prayer-tab {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-subtle);
		background: none;
		border: none;
		border-bottom: 1.5px solid transparent;
		padding: 2px 0 3px;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}

	.prayer-tab:hover {
		color: var(--color-text);
	}

	.prayer-tab.active {
		color: var(--color-text);
		border-bottom-color: var(--color-accent);
	}

	.prayer-close {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 3px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-subtle);
		transition: color 150ms ease;
		padding: 0;
	}

	.prayer-close:hover {
		color: var(--color-text);
	}

	.prayer-title {
		font-family: var(--font-reader);
		font-size: 1.55rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--color-heading, var(--color-text));
		margin: 0 0 24px;
		line-height: 1.2;
	}

	.prayer-columns {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		gap: 0 24px;
	}

	.prayer-divider {
		background: var(--color-border);
		align-self: stretch;
	}

	.prayer-col {
		min-width: 0;
	}

	.prayer-lang {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-accent-text);
		margin: 0 0 12px;
		opacity: 0.8;
	}

	.prayer-body {
		font-family: var(--font-reader);
		font-size: 0.97rem;
		line-height: 1.75;
		color: var(--color-text);
	}

	.prayer-body p {
		margin: 0 0 16px;
	}

	.prayer-body p:last-child {
		margin-bottom: 0;
	}

	.prayer-body--single {
		max-width: 420px;
	}

	.prayer-versicles {
		color: var(--color-subtle);
		font-size: 0.92rem;
	}

	.vr {
		color: var(--color-accent-text);
		font-weight: 600;
		font-style: normal;
	}

	.prayer-ref {
		font-size: 0.88rem;
		color: var(--color-subtle);
	}

	.prayer-ref-link {
		color: var(--color-subtle);
		text-decoration: underline;
		text-decoration-color: var(--color-border);
		text-underline-offset: 2px;
		transition: color 150ms ease;
	}

	.prayer-ref-link:hover {
		color: var(--color-accent-text);
	}

	.prayer-grants {
		list-style: none;
		padding: 0;
		margin: 0 0 16px;
		border-left: 2px solid var(--color-border);
		padding-left: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.prayer-grants li {
		font-family: var(--font-reader);
		font-size: 0.97rem;
		line-height: 1.75;
		color: var(--color-text);
	}

	.prayer-source {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		margin: 24px 0 0;
		text-align: center;
		letter-spacing: 0.04em;
		border-top: 1px solid var(--color-border);
		padding-top: 16px;
	}

	@media (max-width: 560px) {
		.prayer-panel {
			padding: 24px 20px 20px;
		}

		.prayer-columns {
			grid-template-columns: 1fr;
		}

		.prayer-divider {
			display: none;
		}

		.prayer-col:not(:first-child) {
			margin-top: 28px;
			padding-top: 24px;
			border-top: 1px solid var(--color-border);
		}
	}
</style>
