<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { prefs } from '$lib/stores/prefs';

	export let open = false;

	const FONTS = [
		{
			id: 'libre-baskerville',
			label: 'Libre Baskerville',
			stack: "'Libre Baskerville', Georgia, serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{ id: 'sentinel', label: 'Sentinel', stack: "'Sentinel', Georgia, serif" },
		{
			id: 'source-serif-4',
			label: 'Source Serif',
			stack: "'Source Serif 4', Georgia, serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{
			id: 'noto-sans',
			label: 'Noto Sans',
			stack: "'Noto Sans', sans-serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&display=swap',
			dividerBefore: true
		},
		{
			id: 'libre-franklin',
			label: 'Libre Franklin',
			stack: "'Libre Franklin', sans-serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{
			id: 'montserrat',
			label: 'Montserrat',
			stack: "'Montserrat', sans-serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap'
		}
	];

	const THEMES = [
		{ id: 'auto', label: 'Auto', bg: '#f8f5ef', fg: '#1c1710', lines: '#c8bfb0' },
		{ id: 'light', label: 'Light', bg: '#f8f5ef', fg: '#1c1710', lines: '#c8bfb0' },
		{ id: 'sepia', label: 'Sepia', bg: '#f2e8d8', fg: '#2c1e10', lines: '#c0a888' },
		{ id: 'dark', label: 'Dark', bg: '#111113', fg: '#e8ddd0', lines: '#2e2b32' },
		{ id: 'oled', label: 'OLED', bg: '#000000', fg: '#e0e0e0', lines: '#2a2a2a' }
	];

	let currentTheme = 'auto';
	let fontDropdownOpen = false;
	let panelEl: HTMLElement;

	$: activeFontId = $prefs.dyslexiaFont ? 'grace' : $prefs.fontFamily;
	$: activeFont = FONTS.find((f) => f.id === activeFontId);
	$: activeFontStack =
		activeFontId === 'grace' ? "'Grace Dyslexic MD', sans-serif" : (activeFont?.stack ?? 'inherit');

	onMount(() => {
		currentTheme = document.documentElement.getAttribute('data-theme') ?? 'auto';
	});

	function setTheme(id: string) {
		currentTheme = id;
		document.documentElement.setAttribute('data-theme', id);
		localStorage.setItem('theme', id);
	}

	function setFont(id: string) {
		const font = FONTS.find((f) => f.id === id);
		if (!font) return;
		prefs.update((p) => ({ ...p, fontFamily: id }));
		document.documentElement.style.setProperty('--font-reader', font.stack);
		if ('gfUrl' in font && font.gfUrl && !document.querySelector(`link[data-gf="${id}"]`)) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = font.gfUrl as string;
			link.dataset.gf = id;
			document.head.appendChild(link);
		}
	}

	function setDyslexia(on: boolean) {
		prefs.update((p) => ({ ...p, dyslexiaFont: on }));
		if (on) {
			document.documentElement.style.setProperty(
				'--font-reader',
				"'Grace Dyslexic MD', sans-serif"
			);
			document.documentElement.style.setProperty('--font-ui', "'Grace Dyslexic MD', sans-serif");
		} else {
			const font = FONTS.find((f) => f.id === $prefs.fontFamily);
			document.documentElement.style.setProperty('--font-reader', font?.stack ?? 'serif');
			document.documentElement.style.setProperty(
				'--font-ui',
				"'Gotham', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
			);
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	function onClickOutside(e: MouseEvent) {
		if (open && panelEl && !panelEl.contains(e.target as Node)) {
			open = false;
		}
	}

	onMount(() => {
		currentTheme = document.documentElement.getAttribute('data-theme') ?? 'auto';
		document.addEventListener('mousedown', onClickOutside);
		document.addEventListener('keydown', onKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', onClickOutside);
		document.removeEventListener('keydown', onKeydown);
	});
</script>

{#if open}
	<div class="prefs-panel" bind:this={panelEl}>
		<div class="prefs-section">
			<span class="prefs-label">Theme</span>
			<div class="theme-row">
				{#each THEMES as t}
					<button
						title={t.label}
						on:click={() => setTheme(t.id)}
						class="theme-card"
						class:active={currentTheme === t.id}
						style="background: {t.bg};"
					>
						<div class="theme-inner">
							<div class="theme-preview-row">
								<span class="theme-a" style="color: {t.fg};">A</span>
								<span class="theme-line" style="background: {t.fg};"></span>
							</div>
							<div class="theme-lines">
								<span class="theme-rule" style="background: {t.lines};"></span>
								<span class="theme-rule" style="background: {t.lines};"></span>
								<span class="theme-rule short" style="background: {t.lines};"></span>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<div class="prefs-section">
			<span class="prefs-label">Size: {$prefs.fontSize}px</span>
			<input
				type="range"
				min="12"
				max="20"
				step="1"
				value={$prefs.fontSize}
				on:input={(e) => {
					const v = parseInt((e.target as HTMLInputElement).value);
					prefs.update((p) => ({ ...p, fontSize: v }));
					document.documentElement.style.setProperty('--font-size-reader', `${v}px`);
				}}
				class="size-slider"
			/>
		</div>

		<div class="prefs-section">
			<span class="prefs-label">Spacing</span>
			<div class="btn-row">
				{#each [{ label: 'Tight', value: 1.5 }, { label: 'Default', value: 1.8 }, { label: 'Wide', value: 2.1 }] as opt}
					<button
						class="pill-btn"
						class:active={$prefs.lineHeight === opt.value}
						on:click={() => {
							prefs.update((p) => ({ ...p, lineHeight: opt.value }));
							document.documentElement.style.setProperty('--line-height-reader', String(opt.value));
						}}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="prefs-section">
			<span class="prefs-label">Font</span>
			<div class="font-dropdown-wrap">
				<button
					class="font-btn"
					style="font-family: {activeFontStack};"
					aria-expanded={fontDropdownOpen}
					aria-haspopup="listbox"
					on:click|stopPropagation={() => (fontDropdownOpen = !fontDropdownOpen)}
				>
					<span>{activeFontId === 'grace' ? 'Grace Dyslexic MD' : (activeFont?.label ?? '')}</span>
					<span class="chevron" aria-hidden="true">{fontDropdownOpen ? '▲' : '▼'}</span>
				</button>
				{#if fontDropdownOpen}
					<div class="font-list" role="listbox">
						{#each FONTS as f}
							{#if f.dividerBefore}
								<div class="font-divider"></div>
							{/if}
							<button
								class="font-option"
								class:selected={activeFontId === f.id}
								style="font-family: {f.stack};"
								on:click={() => {
									setDyslexia(false);
									setFont(f.id);
									fontDropdownOpen = false;
								}}
							>
								{f.label}
							</button>
						{/each}
						<div class="font-divider"></div>
						<button
							class="font-option"
							class:selected={activeFontId === 'grace'}
							style="font-family: 'Grace Dyslexic MD', sans-serif;"
							on:click={() => {
								setDyslexia(true);
								fontDropdownOpen = false;
							}}
						>
							Grace Dyslexic MD
						</button>
					</div>
				{/if}
			</div>
		</div>

		<div class="prefs-section toggles">
			<label class="toggle-row">
				<input
					type="checkbox"
					checked={$prefs.justifiedText}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							justifiedText: (e.target as HTMLInputElement).checked
						}))}
				/>
				<span>Justified text</span>
			</label>
		</div>
	</div>
{/if}

<style>
	.prefs-panel {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 240px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.12),
			0 1px 4px rgba(0, 0, 0, 0.08);
		padding: 16px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.prefs-label {
		display: block;
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
		font-weight: 600;
		margin-bottom: 8px;
	}

	.theme-row {
		display: flex;
		gap: 6px;
	}

	.theme-card {
		flex: 1;
		aspect-ratio: 3 / 4;
		border-radius: 4px;
		border: 2px solid transparent;
		overflow: hidden;
		transition: border-color 150ms ease;
		cursor: pointer;
	}

	.theme-card.active {
		border-color: var(--color-accent);
	}

	.theme-inner {
		height: 100%;
		padding: 6px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
	}

	.theme-preview-row {
		display: flex;
		align-items: baseline;
		gap: 3px;
		margin-bottom: 4px;
	}

	.theme-a {
		font-size: 14px;
		font-weight: 700;
		line-height: 1;
	}

	.theme-line {
		flex: 1;
		height: 1.5px;
		border-radius: 1px;
		opacity: 0.5;
	}

	.theme-lines {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.theme-rule {
		display: block;
		height: 1.5px;
		border-radius: 1px;
	}

	.theme-rule.short {
		width: 70%;
	}

	.size-slider {
		width: 100%;
		accent-color: var(--color-accent);
	}

	.btn-row {
		display: flex;
		gap: 6px;
	}

	.pill-btn {
		flex: 1;
		padding: 5px 0;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-foreground);
		background: transparent;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease,
			border-color 150ms ease;
	}

	.pill-btn.active {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	.font-dropdown-wrap {
		position: relative;
	}

	.font-btn {
		width: 100%;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 7px 10px;
		background: var(--color-bg);
		color: var(--color-foreground);
		font-size: 14px;
		font-weight: 500;
		text-align: left;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
	}

	.chevron {
		font-size: 10px;
		color: var(--color-muted);
		font-family: var(--font-ui);
	}

	.font-list {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 2px);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 10;
		overflow: hidden;
	}

	.font-option {
		width: 100%;
		text-align: left;
		padding: 9px 10px;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-foreground);
		background: transparent;
		border: none;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.font-option:hover {
		background: var(--color-accent);
		color: #fff;
	}

	.font-option.selected {
		color: var(--color-accent-text);
	}

	.font-divider {
		border-top: 1px solid var(--color-border);
		margin: 3px 0;
	}

	.toggles {
		gap: 8px;
		display: flex;
		flex-direction: column;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-foreground);
	}

	.toggle-row input {
		accent-color: var(--color-accent);
		cursor: pointer;
	}
</style>
