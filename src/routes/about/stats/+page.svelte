<script lang="ts">
	import { run } from 'svelte/legacy';

	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { ABOUT_NAV } from '../nav';

	let blessingOpen = $state(false);

	function closeBlessing() {
		blessingOpen = false;
	}

	function handleBlessingKey(e: KeyboardEvent) {
		if (e.key === 'Escape') closeBlessing();
	}

	function handleBlessingBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) closeBlessing();
	}

	onMount(() => {
		if (browser) document.addEventListener('keydown', handleBlessingKey);
	});

	onDestroy(() => {
		if (browser) {
			document.removeEventListener('keydown', handleBlessingKey);
			document.body.style.overflow = '';
		}
	});

	run(() => {
		if (browser && blessingOpen) {
			document.body.style.overflow = 'hidden';
		} else if (browser) {
			document.body.style.overflow = '';
		}
	});
</script>

<svelte:head>
	<title>In Numbers · The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="The Original Douay-Rheims Bible in numbers: 1,707 annotations, 3,709 cross-references, and the story of how this site was built."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/about/stats" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="In Numbers" />
	<meta
		property="og:description"
		content="The Original Douay-Rheims Bible in numbers: 1,707 annotations, 3,709 cross-references, and the story of how this site was built."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/about/stats" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="In Numbers"
	subtitle="The Original Douay-Rheims Bible by the numbers, and the story of how this site was built."
	navItems={ABOUT_NAV}
>
	<h2>The Original Douay-Rheims in Numbers</h2>

	<div class="stats-grid">
		<div class="stat-card">
			<span class="stat-number">76</span>
			<span class="stat-label">Books</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,362</span>
			<span class="stat-label">Chapters</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">37,196</span>
			<span class="stat-label">Verses</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,707</span>
			<span class="stat-label">Annotations</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">3,709</span>
			<span class="stat-label">Marginal notes</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,989</span>
			<span class="stat-label">Cross-references</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,236</span>
			<span class="stat-label">Chapter summaries</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">84</span>
			<span class="stat-label">Book arguments</span>
		</div>
	</div>

	<p class="stats-note">
		The 76 books include 73 of the Catholic canon and three further texts present in the Vulgate
		appendix: 3 Esdras, 4 Esdras, and the Prayer of Manasses. The 84 book arguments exceed 76
		because several books carry more than one prefatory section, a general introduction and separate
		arguments for distinct parts.
	</p>

	<h2>Built with AI</h2>

	<p>
		Extracting structured data from those PDFs, book by book, chapter by chapter, verse by verse,
		annotation by annotation, and then building the site around it, was possible only with the
		assistance of Claude, the AI model developed by Anthropic. The model served as instrument
		throughout: parsing raw text, identifying structure, formatting data, and writing code. What
		began as a straightforward extraction task grew, with its help, into something considerably more
		ambitious.
	</p>

	<p>
		This site does not store or transmit any user data to any third party. All fonts are
		self-hosted; no external requests are made when you read or browse. There are no cookies,
		tracking scripts, or advertising. The only analytics in use are Cloudflare's basic traffic
		counters, which are privacy-preserving and require no consent banner. What you read here stays
		between you and the page.
	</p>

	<p class="kofi-intro">
		This site is free and will remain so. If it has been useful to you, a small contribution helps
		keep it running.
	</p>

	<div class="kofi-row">
		<a
			href="https://ko-fi.com/N4N11OVVXB"
			target="_blank"
			rel="noopener noreferrer"
			class="kofi-btn"
		>
			<img src="/images/kofi-logo.png" alt="" aria-hidden="true" width="20" height="20" />
			Support this website on Ko-fi
		</a>
	</div>

	<p class="blessing-invite">
		Prayers for this work are also welcome.
		<button
			class="blessing-trigger"
			onclick={() => (blessingOpen = true)}
			aria-label="Open a prayer for this work"
		>
			<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
				<path
					d="M235.32,180l-36.24-36.25L162.62,23.46A21.76,21.76,0,0,0,128,12.93,21.76,21.76,0,0,0,93.38,23.46L56.92,143.76,20.68,180a16,16,0,0,0,0,22.62l32.69,32.69a16,16,0,0,0,22.63,0L124.28,187a40.68,40.68,0,0,0,3.72-4.29,40.68,40.68,0,0,0,3.72,4.29L180,235.32a16,16,0,0,0,22.63,0l32.69-32.69A16,16,0,0,0,235.32,180ZM64.68,224,32,191.32l12.69-12.69,32.69,32.69ZM120,158.75a23.85,23.85,0,0,1-7,17L88.68,200,56,167.32l13.65-13.66a8,8,0,0,0,2-3.34l37-122.22A5.78,5.78,0,0,1,120,29.78Zm23,17a23.85,23.85,0,0,1-7-17v-129a5.78,5.78,0,0,1,11.31-1.68l37,122.22a8,8,0,0,0,2,3.34l14.49,14.49-33.4,32ZM191.32,224l-12.56-12.57,33.39-32L224,191.32Z"
				/>
			</svg>
		</button>
	</p>

	<hr />
	<p>
		<a href="/about/translations">← The Translations</a>
	</p>
</ProseLayout>

{#if blessingOpen}
	<div
		class="blessing-backdrop"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="blessing-title"
		onclick={handleBlessingBackdrop}
		onkeydown={handleBlessingKey}
	>
		<div class="blessing-panel">
			<div class="blessing-head">
				<div class="blessing-eyebrow">
					<span class="blessing-cross" aria-hidden="true">✠</span>
					<span>A Prayer for This Work</span>
				</div>
				<button class="blessing-close" onclick={closeBlessing} aria-label="Close">
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

			<h2 id="blessing-title" class="blessing-title">Benedictio</h2>

			<div class="blessing-body">
				<p>
					O God, who hast spoken to thy people through the Sacred Scriptures and dost speak still:
					look with favour upon all who come to this place in search of thy holy Word.
				</p>
				<p>
					Bless thy servant who has built and maintains this website. Bless the memory of Gregory
					Martin and all those at Douai and Rheims who labored in exile to give the English Church
					her Scripture; bless Patrick Madueke, whose diligence preserved that text and made this
					edition possible; bless all those whose skill and labor sustain the means by which thy
					Word is now made available across the world.
				</p>
				<p>
					Grant to all who desire to draw near to thee through thy written Word the grace to do so;
					and in thy mercy look with compassion upon those who do not yet have access to Sacred
					Scripture.
				</p>
				<p>Through Jesus Christ our Lord. <em>Amen.</em></p>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background-color: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin: 2rem 0 1rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 28px 16px;
		background-color: var(--color-panel);
		text-align: center;
	}

	.stat-number {
		font-family: 'Gotham', var(--font-ui);
		font-size: 2.6rem;
		font-weight: 600;
		line-height: 1;
		color: var(--color-accent);
		letter-spacing: -0.02em;
	}

	.stat-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-variant: small-caps;
		font-weight: 500;
		letter-spacing: 0.08em;
		color: var(--color-subtle);
		text-transform: lowercase;
	}

	.stats-note {
		font-size: 0.85em;
		color: var(--color-subtle);
		font-style: italic;
		margin-top: 0.75rem;
	}

	/* Ko-fi */
	.kofi-row {
		display: flex;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.kofi-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: color-mix(in srgb, var(--color-subtle) 15%, transparent);
		border: 1px solid transparent;
		border-radius: 4px;
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text) !important;
		text-decoration: none;
		transition:
			border-color 150ms ease,
			color 150ms ease;
	}

	.kofi-btn img {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.kofi-btn:hover {
		border-color: var(--color-subtle);
		color: var(--color-text) !important;
	}

	.kofi-intro {
		font-size: 0.9rem;
		color: var(--color-subtle);
		text-align: center;
		margin-top: 1.5rem;
		margin-bottom: 0;
	}

	/* Prayer invite */
	.blessing-invite {
		font-size: 0.9rem;
		color: var(--color-subtle);
		text-align: center;
		margin-top: 1rem;
		margin-bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.blessing-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 3px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-subtle);
		transition: color 150ms ease;
		padding: 0;
		flex-shrink: 0;
	}

	.blessing-trigger:hover {
		color: var(--color-accent);
	}

	/* Blessing modal */
	.blessing-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		animation: blessing-backdrop-in 180ms ease both;
	}

	@keyframes blessing-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.blessing-panel {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow:
			0 8px 24px -4px rgba(0, 0, 0, 0.2),
			0 2px 8px -2px rgba(0, 0, 0, 0.12);
		width: 100%;
		max-width: 480px;
		padding: 32px 36px 28px;
		animation: blessing-panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes blessing-panel-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.blessing-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.blessing-eyebrow {
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

	.blessing-cross {
		font-size: 13px;
		color: var(--color-accent);
	}

	.blessing-close {
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

	.blessing-close:hover {
		color: var(--color-text);
	}

	.blessing-title {
		font-family: var(--font-reader);
		font-size: 1.45rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--color-heading, var(--color-text));
		margin: 0 0 20px;
		line-height: 1.2;
	}

	.blessing-body {
		font-family: var(--font-reader);
		font-size: 0.97rem;
		line-height: 1.8;
		color: var(--color-text);
	}

	.blessing-body p {
		margin: 0 0 14px;
	}

	.blessing-body p:last-child {
		margin-bottom: 0;
		color: var(--color-accent-text);
		font-size: 0.93rem;
	}

	@media (max-width: 560px) {
		.blessing-panel {
			padding: 24px 20px 20px;
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-number {
			font-size: 2rem;
		}
	}
</style>
