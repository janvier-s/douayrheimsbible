# Homepage Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let returning visitors opt in to skipping the homepage hero and going straight to `/odr/genesis/1`.

**Architecture:** Two boolean prefs (`hasVisitedHomepage`, `skipHomepage`) stored in the existing versioned localStorage prefs store. The homepage marks `hasVisitedHomepage` on first visit, shows a checkbox on return visits, and redirects via SvelteKit `goto` when `skipHomepage` is true. An inverse toggle in the Reading Preferences panel lets users undo the redirect when they're already being sent away from `/`.

**Tech Stack:** SvelteKit 2, Svelte 4 syntax, TypeScript, localStorage via `src/lib/stores/prefs.ts`

---

## Files

| Action | File | What changes |
|---|---|---|
| Modify | `src/lib/stores/prefs.ts` | Add two fields to interface + defaults + v19 migration |
| Modify | `src/routes/+page.svelte` | Add redirect logic in `onMount` + checkbox below CTA |
| Modify | `src/lib/components/ReadingPrefs.svelte` | Add "Show intro page" toggle in Reading tab |

---

### Task 1: Add `hasVisitedHomepage` and `skipHomepage` to prefs store

**Files:**
- Modify: `src/lib/stores/prefs.ts`

- [ ] **Step 1: Add the two fields to the `ReadingPrefs` interface**

In `src/lib/stores/prefs.ts`, after the `// v17` comment block (around line 47), add:

```ts
	// v19
	hasVisitedHomepage: boolean;
	skipHomepage: boolean;
```

- [ ] **Step 2: Add defaults**

In the `DEFAULTS` object (around line 51), after `hangingVerseNumbers: true`, add:

```ts
	hasVisitedHomepage: false,
	skipHomepage: false,
```

- [ ] **Step 3: Bump version and add migration**

Change `PREFS_VERSION` from `18` to `19`.

After the existing v18 migration block:

```ts
		// v19 migration: add homepage skip preferences
		if (!parsed._v || parsed._v < 19) {
			parsed.hasVisitedHomepage = false;
			parsed.skipHomepage = false;
		}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run check
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/prefs.ts
git commit -m "feat: add hasVisitedHomepage and skipHomepage to prefs"
```

---

### Task 2: Add redirect logic and checkbox to the homepage

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add `goto` import**

In the `<script lang="ts">` block at the top of `src/routes/+page.svelte`, add to the existing imports:

```ts
import { goto } from '$app/navigation';
```

- [ ] **Step 2: Add a reactive variable to control checkbox visibility**

After the existing `let reducedMotion = false;` declaration, add:

```ts
let showSkipCheckbox = false;
```

- [ ] **Step 3: Extend `onMount` with redirect and visit-tracking logic**

The existing `onMount` sets up `reducedMotion` and `readerObs`. Add the homepage skip logic at the **top** of `onMount`, before the `reducedMotion` setup:

```ts
onMount(() => {
	if ($prefs.skipHomepage) {
		goto('/odr/genesis/1');
		return;
	}
	if (!$prefs.hasVisitedHomepage) {
		prefs.update((p) => ({ ...p, hasVisitedHomepage: true }));
	} else {
		showSkipCheckbox = true;
	}

	// existing code below — do not remove
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	// ...rest of existing onMount unchanged
```

The full `onMount` after the edit should look like:

```ts
onMount(() => {
	if ($prefs.skipHomepage) {
		goto('/odr/genesis/1');
		return;
	}
	if (!$prefs.hasVisitedHomepage) {
		prefs.update((p) => ({ ...p, hasVisitedHomepage: true }));
	} else {
		showSkipCheckbox = true;
	}

	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	reducedMotion = mq.matches;
	mq.addEventListener('change', (e) => (reducedMotion = e.matches));

	readerObs = new IntersectionObserver(
		([entry]) => {
			readerVisible = entry.isIntersecting;
		},
		{ threshold: 0 }
	);
	if (readerEl) readerObs.observe(readerEl);
});
```

- [ ] **Step 4: Add the checkbox below the CTA button in the hero template**

In the `hero-left` div, after the `<button class="hero-cta" ...>` closing tag (around line 201), insert:

```svelte
{#if showSkipCheckbox}
	<label class="hero-skip-label">
		<input
			type="checkbox"
			checked={$prefs.skipHomepage}
			on:change={(e) =>
				prefs.update((p) => ({
					...p,
					skipHomepage: (e.target as HTMLInputElement).checked
				}))}
			class="hero-skip-checkbox"
		/>
		<span>Skip this intro on future visits</span>
	</label>
{/if}
```

- [ ] **Step 5: Add styles for the checkbox**

At the bottom of the `<style>` block, before the closing `</style>`, add:

```css
.hero-skip-label {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin-top: 16px;
	cursor: pointer;
	font-family: var(--font-ui);
	font-size: 11px;
	color: var(--color-subtle);
	letter-spacing: 0.05em;
}

.hero-skip-checkbox {
	accent-color: var(--color-accent);
	width: 13px;
	height: 13px;
	cursor: pointer;
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 7: Manual browser test — first visit**

```bash
npm run dev
```

1. Open browser devtools → Application → Local Storage → clear `reading-prefs`.
2. Navigate to `http://localhost:5173/`.
3. Expected: hero loads normally, no checkbox visible.
4. Check localStorage: `reading-prefs` should now contain `"hasVisitedHomepage":true`.

- [ ] **Step 8: Manual browser test — second visit shows checkbox**

Without clearing localStorage, reload `http://localhost:5173/`.

Expected: checkbox "Skip this intro on future visits" appears below the "Read the Scriptures" button.

- [ ] **Step 9: Manual browser test — checking the box redirects on next visit**

1. Check the checkbox.
2. Check localStorage: `skipHomepage` should now be `true`.
3. Reload `http://localhost:5173/`.
4. Expected: page briefly flashes the hero then redirects to `/odr/genesis/1`.

- [ ] **Step 10: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: redirect returning visitors who opt in to skip homepage"
```

---

### Task 3: Add "Show intro page" toggle to Reading Preferences panel

**Files:**
- Modify: `src/lib/components/ReadingPrefs.svelte`

- [ ] **Step 1: Add the toggle to the Reading tab**

In `src/lib/components/ReadingPrefs.svelte`, in the Reading tab section (starts around line 226), find the `<label>` block for "Chapter navigation" (`showChapterNav`). Add the new toggle **after** it:

```svelte
<label class="flex items-center gap-sm cursor-pointer">
	<input
		type="checkbox"
		checked={!$prefs.skipHomepage}
		on:change={(e) =>
			prefs.update((p) => ({
				...p,
				skipHomepage: !(e.target as HTMLInputElement).checked
			}))}
		class="accent-accent"
	/>
	<span>Show intro page</span>
</label>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Manual browser test — toggle restores homepage**

1. In devtools, set `skipHomepage: true` in `reading-prefs` localStorage (or use the homepage checkbox from Task 2).
2. Navigate to any ODR page, open Reading Preferences, go to the Reading tab.
3. Expected: "Show intro page" toggle is unchecked.
4. Check the "Show intro page" toggle.
5. Check localStorage: `skipHomepage` should now be `false`.
6. Navigate to `http://localhost:5173/`.
7. Expected: homepage loads normally (no redirect), checkbox is visible since `hasVisitedHomepage` is `true`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ReadingPrefs.svelte
git commit -m "feat: add Show intro page toggle to reading preferences"
```
