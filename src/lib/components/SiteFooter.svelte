<script lang="ts">
	const columns = [
		{
			heading: 'Scripture',
			links: [
				{ label: 'Old Testament', href: '/books/old-testament' },
				{ label: 'New Testament', href: '/books/new-testament' },
				{ label: 'Search', href: '/search' },
				{ label: 'Compare Translations', href: '/compare' },
				{ label: 'Reference Material', href: '/reference' }
			]
		},
		{
			heading: 'About',
			links: [
				{ label: 'About the Translation', href: '/history/about' },
				{ label: 'History of the DR Bible', href: '/history' },
				{ label: 'Articles', href: '/articles' },
				{ label: 'The Challoner Revision', href: '/history/challoner' },
				{ label: 'Download JSON', href: '/download' },
				{ label: 'API', href: '/api' }
			]
		},
		{
			heading: 'Info',
			links: [
				{ label: 'Contact', href: '/contact' },
				{ label: 'Sitemap', href: '/sitemap.xml' },
				{ label: 'Privacy', href: '/privacy' },
				{ label: 'Terms', href: '/terms' }
			]
		}
	];
</script>

<footer class="footer">
	<!-- Ornamental divider -->
	<div class="footer-rule" aria-hidden="true">
		<span class="footer-ornament">✠</span>
	</div>

	<!-- Link columns -->
	<nav aria-label="Footer navigation" class="footer-columns">
		{#each columns as col}
			<div class="footer-col">
				<p class="footer-col-heading">{col.heading}</p>
				<ul class="footer-col-list">
					{#each col.links as link}
						<li><a href={link.href} class="footer-col-link">{link.label}</a></li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<!-- Attribution -->
	<div class="footer-attribution">
		<p>The Original Douay-Rheims Bible, 1582–1610</p>
		<p>
			Faithfully translated from the Latin Vulgate by English Catholic exiles at Douai and Rheims
		</p>
	</div>
</footer>

<style>
	.footer {
		margin-top: 64px;
		padding-bottom: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 48px;
	}

	@media (max-width: 767px) {
		.footer {
			padding-bottom: calc(80px + 56px + env(safe-area-inset-bottom));
		}
	}

	/* ─── Ornamental divider ─── */
	.footer-rule {
		position: relative;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.footer-rule::before,
	.footer-rule::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to var(--dir, right),
			transparent,
			var(--color-border) 40%,
			var(--color-border) 60%,
			transparent
		);
		max-width: 200px;
	}

	.footer-rule::before {
		--dir: right;
	}

	.footer-rule::after {
		--dir: left;
	}

	.footer-ornament {
		font-size: 14px;
		color: var(--color-accent);
		opacity: 0.5;
		padding: 0 16px;
		flex-shrink: 0;
	}

	/* ─── Link columns ─── */
	.footer-columns {
		display: flex;
		gap: 48px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-col {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 120px;
	}

	.footer-col-heading {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-subtle);
		font-weight: 600;
	}

	.footer-col-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.footer-col-link {
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-subtle);
		text-decoration: none;
		transition: color 150ms ease;
		font-weight: 300;
	}

	.footer-col-link:hover {
		color: var(--color-text);
	}

	/* ─── Attribution ─── */
	.footer-attribution {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.footer-attribution p {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		font-weight: 300;
		text-align: center;
		line-height: 1.6;
	}
</style>
