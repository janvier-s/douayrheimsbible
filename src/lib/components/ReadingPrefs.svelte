<script lang="ts">
	import { prefs } from '$lib/stores/prefs';

	const FONTS = [
		{ id: 'fs-brabo-pro', label: 'FS Brabo Pro', stack: "'FS Brabo Pro', Georgia, serif" },
		{
			id: 'libre-baskerville',
			label: 'Libre Baskerville',
			stack: "'Libre Baskerville', Georgia, serif"
		},
		{ id: 'gelasio', label: 'Gelasio', stack: "'Gelasio', Georgia, serif" },
		{ id: 'inter', label: 'Inter', stack: "'Inter', sans-serif" },
		{ id: 'lexend', label: 'Lexend', stack: "'Lexend', sans-serif" }
	];

	function setFont(id: string) {
		const font = FONTS.find((f) => f.id === id);
		if (!font) return;
		prefs.update((p) => ({ ...p, fontFamily: id }));
		document.documentElement.style.setProperty('--font-reader', font.stack);
		if (id !== 'fs-brabo-pro') {
			const name = font.label.replace(' ', '+');
			if (!document.querySelector(`link[data-gf="${id}"]`)) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = `https://fonts.googleapis.com/css2?family=${name}&display=swap`;
				link.dataset.gf = id;
				document.head.appendChild(link);
			}
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
			document.documentElement.style.setProperty('--font-ui', "'Graphik LCG', sans-serif");
		}
	}
</script>

<div class="space-y-md text-sm font-ui">
	<label class="block">
		<span class="text-muted block mb-xs">Font size: {$prefs.fontSize}px</span>
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
			class="w-full accent-interactive"
		/>
	</label>

	<div>
		<span class="text-muted block mb-xs">Line spacing</span>
		<div class="flex gap-xs">
			{#each [{ label: 'Tight', value: 1.5 }, { label: 'Default', value: 1.8 }, { label: 'Wide', value: 2.0 }] as opt}
				<button
					class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
                 {$prefs.lineHeight === opt.value
						? 'bg-interactive text-white border-interactive'
						: 'border-border text-muted hover:text-foreground'}"
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

	<div>
		<span class="text-muted block mb-xs">Font</span>
		<select
			class="w-full border border-border rounded-sm p-xs bg-background text-foreground"
			value={$prefs.dyslexiaFont ? 'grace' : $prefs.fontFamily}
			on:change={(e) => {
				const v = (e.target as HTMLSelectElement).value;
				if (v === 'grace') {
					setDyslexia(true);
				} else {
					setDyslexia(false);
					setFont(v);
				}
			}}
		>
			{#each FONTS as f}
				<option value={f.id}>{f.label}</option>
			{/each}
			<option value="grace">Grace Dyslexic MD (dyslexia-friendly)</option>
		</select>
	</div>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.showVerseNumbers}
			on:change={(e) =>
				prefs.update((p) => ({
					...p,
					showVerseNumbers: (e.target as HTMLInputElement).checked
				}))}
			class="accent-interactive"
		/>
		<span>Show verse numbers</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.paragraphView}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, paragraphView: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span>Paragraph view</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.infiniteScroll}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, infiniteScroll: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span>Infinite scroll</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.bionicReading}
			disabled={$prefs.dyslexiaFont}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, bionicReading: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span class:opacity-40={$prefs.dyslexiaFont}>Bionic Reading</span>
	</label>
</div>
