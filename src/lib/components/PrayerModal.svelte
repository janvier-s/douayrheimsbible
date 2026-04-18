<script lang="ts">
	import { prayerOpen } from '$lib/stores/prayer';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

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
				<div class="prayer-eyebrow">
					<span class="prayer-cross" aria-hidden="true">✠</span>
					<span>Before Reading Sacred Scripture</span>
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
							fill the hearts of your faithful<br />
							and kindle in them the fire of your love.
						</p>
						<p class="prayer-versicles">
							<span class="vr">℣.</span> Send forth your Spirit and they shall be created.<br />
							<span class="vr">℟.</span> And you shall renew the face of the earth.
						</p>
						<p>
							<em>Let us pray.</em><br />
							O God, who by the light of the Holy Spirit did instruct the hearts of the faithful, grant
							us in the same Spirit to be truly wise and ever to rejoice in his consolation. Through Christ
							our Lord. Amen.
						</p>
					</div>
				</div>
			</div>

			<p class="prayer-source">From the Liturgy of the Hours · Traditional</p>
		</div>
	</div>
{/if}

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
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.prayer-eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-accent-text);
	}

	.prayer-cross {
		font-size: 13px;
		color: var(--color-accent);
	}

	.prayer-close {
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

	.prayer-versicles {
		color: var(--color-subtle);
		font-size: 0.92rem;
	}

	.vr {
		color: var(--color-accent-text);
		font-weight: 600;
		font-style: normal;
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
