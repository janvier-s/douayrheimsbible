# Mobile Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 mobile UX regressions from the initial mobile redesign — reading options panel direction, height, scroll lock, back-button dismiss, readingMode persistence, chapter nav font, verse padding, and study panel width.

**Architecture:** Four independent tasks across three files. Tasks 1–2 are the most substantive; Tasks 3–4 are single-line changes. No new files. No desktop layout changed.

**Tech Stack:** SvelteKit, Svelte 4, TypeScript, Tailwind CSS, `history.pushState` / `popstate` for back-button dismiss.

---

## File Map

| File | Role |
|------|------|
| `src/lib/components/BibleReader.svelte` | Reset readingMode on mount; reduce verse padding on mobile; fix study panel full-width |
| `src/lib/components/TopBar.svelte` | Reading options: direction, height, scroll lock, back-button; chapter nav font |
| `src/lib/components/FloatingNav.svelte` | Cap max-height on mobile to avoid tab bar overlap |

---

### Task 1: BibleReader — readingMode reset, verse padding, study panel width

**Files:**
- Modify: `src/lib/components/BibleReader.svelte`

**Context:** Three independent fixes:
1. `readingMode` is persisted in localStorage. On next page load it may be `'study'`, hiding the reading column. Always reset to `'reading'` on mount — study mode is a per-session choice.
2. `<main>` has `px-md` which is too wide on narrow phones. Reduce to `px-[12px]` on mobile with `max-md:px-[12px]`.
3. The study panel outer container (`shrink-0 sticky flex [overflow:clip]`) has no explicit `width` — it won't expand past its content when `<main>` is `hidden`. Add a `panelWidth` reactive that sets `width: 100%` on mobile in study mode.

The file already imports `isMobile` from `$lib/stores/mobile`, `prefs` from `$lib/stores/prefs`, and has `onMount` imported from `svelte`.

---

- [ ] **Step 1: Add readingMode reset at the top of onMount**

Find the `onMount` block (around line 260). Add `prefs.update` as the very first line:

```typescript
onMount(async () => {
	prefs.update((p) => ({ ...p, readingMode: 'reading' }));
	readingPosition.set({
		bookSlug: initialBookMeta.slug,
		chapter: initialChapter.chapter,
		routeBase
	});
	// ... rest of onMount unchanged
```

- [ ] **Step 2: Reduce verse padding on mobile**

Currently (around line 303):
```svelte
class="flex-1 min-w-0 px-md pt-[20px] pb-xl max-md:pb-[80px]"
```

Replace with:
```svelte
class="flex-1 min-w-0 px-md max-md:px-[12px] pt-[20px] pb-xl max-md:pb-[80px]"
```

- [ ] **Step 3: Add `panelWidth` reactive**

After the existing `panelMaxWidth` reactive (line 65):
```typescript
$: panelMaxWidth = $prefs.readingMode === 'study' ? ($isMobile ? '100%' : liveWidth) : '0';
```

Add immediately after:
```typescript
$: panelWidth = $isMobile && $prefs.readingMode === 'study' ? '100%' : '';
```

- [ ] **Step 4: Apply `panelWidth` to the panel container style**

Find the sticky panel container div (around line 329). Currently:
```svelte
<div
	class="shrink-0 sticky flex [overflow:clip]"
	style="top: var(--header-height); height: {$isMobile
		? 'calc(100vh - var(--header-height) - 56px - env(safe-area-inset-bottom, 0px))'
		: 'calc(100vh - var(--header-height))'}; max-width: {panelMaxWidth}; opacity: {$prefs.readingMode ===
	'study'
		? '1'
		: '0'}; transition: {panelTransition};"
>
```

Replace with:
```svelte
<div
	class="shrink-0 sticky flex [overflow:clip]"
	style="top: var(--header-height); height: {$isMobile
		? 'calc(100vh - var(--header-height) - 56px - env(safe-area-inset-bottom, 0px))'
		: 'calc(100vh - var(--header-height))'}; max-width: {panelMaxWidth}; width: {panelWidth}; opacity: {$prefs.readingMode ===
	'study'
		? '1'
		: '0'}; transition: {panelTransition};"
>
```

- [ ] **Step 5: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/BibleReader.svelte"
git add src/lib/components/BibleReader.svelte
git commit -m "fix: reset readingMode on load; reduce verse padding on mobile; study panel full width"
```

---

### Task 2: TopBar — reading options panel redesign

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

**Context:** The mobile reading options panel currently slides up from the bottom. Replace with a panel that slides down from just below the header so the Bible text remains visible below it. Four related changes:
1. **Direction**: `transition:fly={{ y: -30 }}`, position at `top-[var(--header-height)]`, `border-radius: 0 0 12px 12px`.
2. **Fixed height**: `320px` inner container with `overflow-y: auto` so tab switches (Text / Reading / Verse) don't resize the panel.
3. **Body scroll lock**: reactive that sets `document.body.style.overflow = 'hidden'` when the panel is open on mobile.
4. **Back-button dismiss**: `history.pushState` on open; `popstate` listener closes the panel instead of navigating away.

TopBar.svelte currently imports `{ slide, fly }` from `svelte/transition` and `{ cubicOut }` from `svelte/easing` — both available. It does NOT yet import `onMount`, `onDestroy`, `browser`, or `isMobile`.

---

- [ ] **Step 1: Add missing imports**

Currently (lines 1–10):
```typescript
import { getBookBySlug } from '$lib/data/books';
import { slide, fly } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import { goto } from '$app/navigation';
import { prefs } from '$lib/stores/prefs';
import FloatingNav from './FloatingNav.svelte';
import SpotlightSearch from './SpotlightSearch.svelte';
import ReadingPrefs from './ReadingPrefs.svelte';
import ModeToggle from './ModeToggle.svelte';
```

Replace with:
```typescript
import { onMount, onDestroy } from 'svelte';
import { getBookBySlug } from '$lib/data/books';
import { slide, fly } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { prefs } from '$lib/stores/prefs';
import { isMobile } from '$lib/stores/mobile';
import FloatingNav from './FloatingNav.svelte';
import SpotlightSearch from './SpotlightSearch.svelte';
import ReadingPrefs from './ReadingPrefs.svelte';
import ModeToggle from './ModeToggle.svelte';
```

- [ ] **Step 2: Add `togglePrefs`, `onPopState`, `onMount`, `onDestroy`**

After the closing brace of `handleModeSelect` (around line 79), before `</script>`, add:

```typescript
function togglePrefs() {
	prefsOpen = !prefsOpen;
	translationOpen = false;
	navOpen = false;
	if ($isMobile && prefsOpen) {
		history.pushState({ prefsOpen: true }, '');
	}
}

function onPopState() {
	if (prefsOpen) prefsOpen = false;
}

onMount(() => {
	if (browser) window.addEventListener('popstate', onPopState);
});

onDestroy(() => {
	if (browser) {
		window.removeEventListener('popstate', onPopState);
		document.body.style.overflow = '';
	}
});
```

- [ ] **Step 3: Add body scroll lock reactive**

Immediately after the block from Step 2 (still inside `<script>`), add:

```typescript
$: if (browser) {
	document.body.style.overflow = $isMobile && prefsOpen ? 'hidden' : '';
}
```

- [ ] **Step 4: Update sliders button to call `togglePrefs`**

Find the sliders button `on:click` handler (around line 158):
```svelte
on:click={() => {
	prefsOpen = !prefsOpen;
	translationOpen = false;
	navOpen = false;
}}
```

Replace with:
```svelte
on:click={togglePrefs}
```

- [ ] **Step 5: Replace the mobile bottom sheet with a top-down panel**

Find the `{#if prefsOpen}` block (around line 377). Currently:
```svelte
{#if prefsOpen}
	<!-- Desktop panel (unchanged) -->
	<div
		transition:slide={{ duration: 180 }}
		class="hidden md:block fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
		role="dialog"
		aria-label="Reading options"
	>
		<ReadingPrefs />
	</div>

	<!-- Mobile bottom sheet -->
	<div
		transition:fly={{ y: 400, duration: 260, easing: cubicOut }}
		class="md:hidden fixed inset-x-0 bottom-0 bg-panel border-t border-border rounded-t-xl z-[60] font-ui overflow-y-auto overscroll-y-contain"
		style="max-height: 85vh; padding-bottom: env(safe-area-inset-bottom);"
		role="dialog"
		aria-label="Reading options"
	>
		<!-- Drag handle -->
		<div
			class="flex justify-center pt-[10px] pb-[6px] sticky top-0 bg-panel border-b border-border z-10"
		>
			<div class="w-[32px] h-[4px] bg-border rounded-full"></div>
		</div>
		<div class="p-md">
			<ReadingPrefs />
		</div>
	</div>
{/if}
```

Replace with:
```svelte
{#if prefsOpen}
	<!-- Desktop panel (unchanged) -->
	<div
		transition:slide={{ duration: 180 }}
		class="hidden md:block fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
		role="dialog"
		aria-label="Reading options"
	>
		<ReadingPrefs />
	</div>

	<!-- Mobile top panel — slides down from header -->
	<div
		transition:fly={{ y: -30, duration: 200, easing: cubicOut }}
		class="md:hidden fixed inset-x-0 top-[var(--header-height)] bg-panel border-b border-border z-[60] font-ui"
		style="border-radius: 0 0 12px 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);"
		role="dialog"
		aria-label="Reading options"
	>
		<div style="height: 320px; overflow-y: auto; overscroll-behavior: contain;">
			<ReadingPrefs />
		</div>
	</div>
{/if}
```

- [ ] **Step 6: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/TopBar.svelte"
git add src/lib/components/TopBar.svelte
git commit -m "feat: reading options slides down from header on mobile; scroll lock; back-button dismiss"
```

---

### Task 3: TopBar — chapter nav font size and line height

**Files:**
- Modify: `src/lib/components/TopBar.svelte` (line ~250)

**Context:** The chapter nav button label is `text-[16px]` which overflows on narrow phones with long book names (e.g. "Ecclesiasticus 45"). Reduce to `text-[13px]` on mobile, keep `text-[16px]` on desktop. Add `leading-tight` to tighten vertical rhythm on both sizes.

---

- [ ] **Step 1: Update nav label span**

Currently (around line 250):
```svelte
<span class="text-[16px] font-medium">{navLabel}</span>
```

Replace with:
```svelte
<span class="text-[13px] md:text-[16px] leading-tight font-medium">{navLabel}</span>
```

- [ ] **Step 2: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/TopBar.svelte"
git add src/lib/components/TopBar.svelte
git commit -m "fix: reduce chapter nav font size and tighten line height on mobile"
```

---

### Task 4: FloatingNav — mobile max-height

**Files:**
- Modify: `src/lib/components/FloatingNav.svelte` (line 95)

**Context:** FloatingNav uses `max-h-[72vh]` unconditionally. On mobile the fixed bottom tab bar is 56px tall, so the nav panel can extend behind it and the last items become inaccessible. On mobile, cap the height at `calc(100vh - var(--header-height) - 56px)` — the exact space between header bottom and tab bar top. `--header-height` is `110px` (50px Row 1 + 60px Row 2).

---

- [ ] **Step 1: Add mobile max-height to FloatingNav container**

Currently (line 95):
```svelte
class="fixed top-[var(--header-height)] left-1/2 -translate-x-1/2 z-[65] bg-panel border border-border rounded-sm shadow-xl w-80 max-h-[72vh] flex flex-col font-ui"
```

Replace with:
```svelte
class="fixed top-[var(--header-height)] left-1/2 -translate-x-1/2 z-[65] bg-panel border border-border rounded-sm shadow-xl w-80 max-h-[72vh] max-md:max-h-[calc(100vh-var(--header-height)-56px)] flex flex-col font-ui"
```

- [ ] **Step 2: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/FloatingNav.svelte"
git add src/lib/components/FloatingNav.svelte
git commit -m "fix: cap FloatingNav height on mobile to avoid tab bar overlap"
```
