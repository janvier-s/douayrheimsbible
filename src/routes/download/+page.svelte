<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import OfflineDownload from '$lib/components/OfflineDownload.svelte';
</script>

<svelte:head>
	<title>Downloads | The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Download the Original Douay-Rheims Bible as structured JSON, USFM, or PDF. All files are public domain under CC0 1.0."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/download" />
</svelte:head>

<ProseLayout
	title="Downloads"
	subtitle="The complete Original Douay-Rheims Bible in open formats. All files are public domain under CC0 1.0."
>
	<h2>PDF Transcription</h2>

	<p>
		The source PDFs assembled by
		<a href="https://codeberg.org/olprint" target="_blank" rel="noopener noreferrer"
			>Patrick Madueke</a
		>, whose work this site is built on. Both are placed in the public domain.
	</p>

	<table class="dl-table">
		<thead>
			<tr>
				<th>File</th>
				<th>Description</th>
				<th>Size</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>Original-Douay-Rheims-Bible-Merged.pdf</code></td>
				<td>Complete Bible with annotations and notes</td>
				<td class="dl-size">27 MB</td>
				<td>
					<a
						href="https://github.com/janvier-s/original-douay-rheims/releases/download/v1.0/Original-Douay-Rheims-Bible-Merged.pdf"
						class="dl-link">Download</a
					>
				</td>
			</tr>
			<tr>
				<td><code>Original-Douay-Rheims-Bible.pdf</code></td>
				<td>New Testament, text only (no notes)</td>
				<td class="dl-size">4.8 MB</td>
				<td>
					<a
						href="https://github.com/janvier-s/original-douay-rheims/releases/download/v1.0/Original-Douay-Rheims-Bible.pdf"
						class="dl-link">Download</a
					>
				</td>
			</tr>
		</tbody>
	</table>

	<h2>Structured Data</h2>

	<p>
		The complete text, annotations, cross-references, and reference material as JSON and USFM files,
		available in the
		<a
			href="https://github.com/janvier-s/original-douay-rheims"
			target="_blank"
			rel="noopener noreferrer">GitHub repository</a
		>. Includes:
	</p>

	<ul>
		<li>
			<strong><code>bible/tagged/</code></strong> — verse text with all original markup preserved (<code
				>&lt;sc&gt;</code
			>, <code>&lt;i&gt;</code>, footnote anchors, marginal note markers, cross-reference markers),
			plus <code>cross_refs</code> arrays and inline footnotes.
		</li>
		<li>
			<strong><code>bible/raw/</code></strong> — plain prose text with all markup stripped. Footnotes
			and cross-references preserved as structured data.
		</li>
		<li>
			<strong><code>usfm/</code></strong> — USFM 3 files with inline footnotes (<code>\f</code>) and
			cross-references (<code>\x</code>).
		</li>
		<li>
			<strong><code>annotations/</code></strong> — the 1,707 annotations with their sub-notes, one file
			per chapter.
		</li>
		<li>
			<strong><code>reference/</code></strong> — 26 JSON files for the original prefatory material: prefaces,
			tables, glossaries, and historical tables from the 1582 and 1609–1610 editions.
		</li>
	</ul>

	<a
		href="https://github.com/janvier-s/original-douay-rheims"
		target="_blank"
		rel="noopener noreferrer"
		class="repo-card"
	>
		<svg
			class="repo-icon"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
			/>
			<path d="M9 18c-4.51 2-5-2-7-2" />
		</svg>
		<span class="repo-text">
			<span class="repo-label">GitHub</span>
			<span class="repo-name">janvier-s / original-douay-rheims</span>
		</span>
		<span class="repo-arrow" aria-hidden="true">→</span>
	</a>

	<h2>API</h2>

	<p>
		A read API is available for programmatic access to the text. See the
		<a href="/api">API documentation</a> for endpoints, parameters, and examples.
	</p>

	<OfflineDownload />

	<div class="license-block">
		<p class="license-title">
			<span class="license-cross" aria-hidden="true">✠</span> Public Domain · CC0 1.0
		</p>
		<p class="license-body">
			All files are released under CC0 1.0. You are free to copy, share, adapt, and redistribute
			them for any purpose, with no restrictions and no attribution required.
		</p>
		<a
			href="https://creativecommons.org/publicdomain/zero/1.0/"
			target="_blank"
			rel="noopener noreferrer"
			class="license-link">CC0 1.0 Universal →</a
		>
	</div>
</ProseLayout>

<style>
	.repo-card {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 20px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-panel);
		text-decoration: none;
		color: var(--color-text);
		margin: 24px 0 32px;
		transition:
			border-color 200ms ease,
			background 200ms ease;
	}

	.repo-card:hover {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 4%, var(--color-panel));
		text-decoration: none;
	}

	.repo-icon {
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.repo-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.repo-label {
		font-family: var(--font-ui);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-accent-text);
	}

	.repo-name {
		font-family: var(--font-ui);
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.repo-arrow {
		font-size: 16px;
		color: var(--color-accent);
		flex-shrink: 0;
		transition: transform 200ms ease;
	}

	.repo-card:hover .repo-arrow {
		transform: translateX(4px);
	}

	/* Download table */
	.dl-table {
		width: 100%;
		border-collapse: collapse;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin: 20px 0 32px;
		font-size: 0.9rem;
	}

	.dl-table thead tr {
		background: var(--color-panel);
		border-bottom: 1px solid var(--color-border);
	}

	.dl-table th {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-subtle);
		padding: 10px 14px;
		text-align: left;
	}

	.dl-table td {
		padding: 12px 14px;
		border-top: 1px solid var(--color-border);
		vertical-align: middle;
		color: var(--color-text);
	}

	.dl-table tbody tr:first-child td {
		border-top: none;
	}

	.dl-table code {
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.dl-size {
		font-family: var(--font-ui);
		font-size: 0.82rem;
		color: var(--color-subtle);
		white-space: nowrap;
	}

	.dl-link {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--color-accent);
		text-decoration: none;
		white-space: nowrap;
	}

	.dl-link:hover {
		text-decoration: underline;
	}

	/* License block */
	.license-block {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 20px 24px;
		background: var(--color-panel);
		margin: 0 0 1rem;
	}

	.license-title {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-accent-text);
		margin: 0 0 8px;
	}

	.license-cross {
		margin-right: 6px;
	}

	.license-body {
		font-size: 0.9rem;
		color: var(--color-muted);
		margin: 0 0 12px;
		line-height: 1.6;
	}

	.license-link {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--color-accent);
		text-decoration: none;
	}

	.license-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 600px) {
		.dl-table {
			font-size: 0.82rem;
		}

		.dl-table td:first-child code {
			word-break: break-all;
		}
	}
</style>
