# About Page Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 1,797-line `/about` page into four focused pages (`/about`, `/about/features`, `/about/translations`, `/about/stats`) linked by a shared sidebar nav and prev/next links.

**Architecture:** Add an optional `navItems` prop to `ProseLayout.svelte` so about-section pages can register their own sidebar nav, using the same sidebar+TOC mechanism the history articles already use. Each new page copies the required styles and the `ABOUT_NAV` constant locally (no shared module needed for 4 pages).

**Tech Stack:** SvelteKit 2, Svelte 4 syntax (`export let`, `$:`, `on:click`), TypeScript, ProseLayout component

---

## Source file reference

All content comes from `src/routes/about/+page.svelte` (1,797 lines). Line ranges by section:

| Section | Lines | Goes to |
|---|---|---|
| script + svelte:head + ProseLayout open | 1–55 | `/about` (trimmed) |
| The Translation and the Gap | 56–341 | `/about` (keep) |
| Notes on This Edition | 342–384 | `/about` (keep) |
| The Reader | 385–423 | `/about/features` |
| Study | 424–516 | `/about/features` |
| Compare | 517–560 | `/about/features` |
| Church Fathers | 561–594 | `/about/features` |
| The Translations | 595–669 | `/about/translations` |
| Reading Options | 670–829 | `/about/features` |
| Prayer before Reading | 830–839 | `/about/features` |
| Mobile | 840–887 | `/about/features` |
| Search | 888–943 | `/about/features` |
| History and Articles | 944–966 | `/about/features` |
| Reference | 967–1018 | `/about/features` |
| The Original Douay-Rheims in Numbers | 1019–1062 | `/about/stats` |
| Built with AI | 1063–1113 | `/about/stats` |
| A Simple Idea | 1114–1142 | `/about` (keep) |
| blessingOpen modal (`{#if blessingOpen}`) | 1144–1201 | `/about/stats` |
| `<style>` block | 1203–1797 | distribute (see per-task) |

## Style class distribution

**Stay on `/about`** (used in Translation section and A Simple Idea):
`.screenshot-row`, `.screenshot-fig`, `.screenshot-link`, `.screenshot-link:hover img`, `.screenshot-row .screenshot-fig`, `.screenshot-fig-sm`, `.gen-subtitle`, `.gen-sublabel`, `.compare-intro`, `.gen-compare`, `.gen-entry`, `.gen-entry--odr`, `.gen-label`, `.gen-label span`, `.gen-entry p`, `.gv`, `.mark-odr`, `.mark-drc`, `.mark-kjv`, `.gen-hebrew`, `.gen-translit`, `.gen-lit-heb`, `.intercession`, `.laus-deo`, `.cta-row`, `.cta-btn`

**Copy to `/about/features`** (screenshot styles also used on about, so copy not move):
`.screenshot-row`, `.screenshot-fig`, `.screenshot-link`, `.screenshot-link:hover img`, `.screenshot-row .screenshot-fig`, `.screenshot-fig-sm`, `.options-row`, `.options-text`, `.options-panel-fig`, `.mobile-mockup-row`, `.screenshot-fig--mobile`, `.mobile-mockup-row .screenshot-fig--mobile`, `.mobile-mockup-row .screenshot-fig--mobile img`, and the `@media (max-width: 560px)` mobile mockup rule

**Move to `/about/stats`** (only used in stats sections):
`.stats-grid`, `.stat-card`, `.stat-number`, `.stat-label`, `.stats-note`, `.facsimile-card`, `.facsimile-cross`, `.facsimile-text`, `.facsimile-label`, `.facsimile-title`, `.facsimile-sub`, `.facsimile-arrow`, `.facsimile-card:hover`, `.facsimile-card:hover .facsimile-arrow`, `.kofi-row`, `.kofi-btn`, `.kofi-btn img`, `.kofi-btn:hover`, `.kofi-intro`, `.blessing-invite`, `.blessing-trigger`, `.blessing-trigger:hover`, `.blessing-backdrop`, `@keyframes blessing-backdrop-in`, `.blessing-panel`, `@keyframes blessing-panel-in`, `.blessing-head`, `.blessing-eyebrow`, `.blessing-cross`, `.blessing-close`, `.blessing-close:hover`, `.blessing-title`, `.blessing-body`, `.blessing-body p`, `.blessing-body p:last-child`, `@media (max-width: 560px) .blessing-panel`, and `@media (max-width: 640px) { .stats-grid, .stat-number, .facsimile-card }`

**`/about/translations`** has no custom styles — standard prose only.

---

## Task 1: Add navItems prop to ProseLayout

**Files:**
- Modify: `src/lib/components/ProseLayout.svelte`

No tests to write (UI component change). Verify with `npm run check`.

- [ ] **Step 1: Add `navItems` prop and update PATH_LABELS**

In `src/lib/components/ProseLayout.svelte`, in the `<script>` block, make these changes:

Add after `export let faqItems`:
```typescript
export let navItems: Array<{ path: string; label: string }> | undefined = undefined;
```

Update `PATH_LABELS` to add three entries (add after the `about` entry):
```typescript
const PATH_LABELS: Record<string, string> = {
    about: 'About',
    features: 'Features',
    translations: 'The Translations',
    stats: 'In Numbers',
    'the-douay-rheims': 'The Douay-Rheims Bible',
    // ... rest unchanged
};
```

Replace the two reactive statements that reference `NAV_ARTICLES`:
```typescript
// Replace:
$: isInNav = NAV_ARTICLES.some((a) => a.path === $page.url.pathname);

// With:
$: activeNav = navItems ?? NAV_ARTICLES;
$: isInNav = activeNav.some((a) => a.path === $page.url.pathname);
```

- [ ] **Step 2: Update template to use `activeNav`**

In the template `<aside class="prose-toc">` section, replace both occurrences of `NAV_ARTICLES` with `activeNav`:

```svelte
<!-- Replace: {#each NAV_ARTICLES as article} -->
{#each activeNav as article}
```

(There is one occurrence in the `{#each}` loop inside `{#if isInNav}`.)

- [ ] **Step 3: Verify**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run check
```

Expected: no errors. The existing history nav still works since `navItems` defaults to `undefined` → `activeNav` falls back to `NAV_ARTICLES`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add src/lib/components/ProseLayout.svelte
git commit -m "feat: add navItems prop to ProseLayout for about-section nav"
```

---

## Task 2: Create /about/features page

**Files:**
- Create: `src/routes/about/features/+page.ts`
- Create: `src/routes/about/features/+page.svelte`

Content to copy from `src/routes/about/+page.svelte`: lines 385–1018 (Reader through Reference).

- [ ] **Step 1: Create +page.ts**

Create `src/routes/about/features/+page.ts`:
```typescript
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
    return { showLayoutTopBar: true, topBarMinimal: true };
};
```

- [ ] **Step 2: Create +page.svelte scaffold**

Create `src/routes/about/features/+page.svelte` with this structure. The `[CONTENT]` block is filled in step 3.

```svelte
<script lang="ts">
    import ProseLayout from '$lib/components/ProseLayout.svelte';

    const ABOUT_NAV = [
        { path: '/about', label: 'About' },
        { path: '/about/features', label: 'Features' },
        { path: '/about/translations', label: 'The Translations' },
        { path: '/about/stats', label: 'In Numbers' }
    ];
</script>

<svelte:head>
    <title>Features | The Original Douay-Rheims Bible</title>
    <meta
        name="description"
        content="How to use this site: the reader, study panel, Church Fathers commentary, compare mode, search, and reading options for the Original Douay-Rheims Bible."
    />
    <link rel="canonical" href="https://thedouayrheims.com/about/features" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Features" />
    <meta
        property="og:description"
        content="How to use this site: the reader, study panel, Church Fathers commentary, compare mode, search, and reading options."
    />
    <meta property="og:url" content="https://thedouayrheims.com/about/features" />
    <meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
    title="Features"
    subtitle="The reader, study panel, Church Fathers commentary, compare mode, and search."
    navItems={ABOUT_NAV}
>
    [CONTENT]

    <hr />
    <p>
        <a href="/about">← About</a>
        <a href="/about/translations">The Translations →</a>
    </p>
</ProseLayout>

<style>
    /* Screenshots */
    .screenshot-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 28px 0 8px;
    }

    .screenshot-fig {
        margin: 28px 0 8px;
    }

    .screenshot-fig img {
        width: 100%;
        height: auto;
        display: block;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        transition: opacity 150ms ease;
    }

    .screenshot-link {
        display: block;
    }

    .screenshot-link:hover img {
        opacity: 0.88;
    }

    .screenshot-fig-sm {
        max-width: 520px;
    }

    .screenshot-fig figcaption {
        font-family: var(--font-ui);
        font-size: 11px;
        color: var(--color-subtle);
        margin-top: 8px;
        line-height: 1.5;
    }

    .screenshot-row .screenshot-fig {
        margin: 0;
    }

    /* Reading options layout */
    .options-row {
        display: flex;
        align-items: flex-start;
        gap: 32px;
        margin: 0 0 8px;
    }

    .options-text {
        flex: 1;
        min-width: 0;
    }

    .options-panel-fig {
        flex-shrink: 0;
        width: 220px;
        margin: 32px 0 0;
    }

    /* Mobile mockups */
    .screenshot-fig--mobile {
        flex-shrink: 0;
        width: 200px;
        margin: 0;
    }

    .mobile-mockup-row {
        display: flex;
        justify-content: center;
        gap: 32px;
        margin: 28px 0 8px;
    }

    .mobile-mockup-row .screenshot-fig--mobile {
        width: 220px;
        flex-shrink: 0;
    }

    .mobile-mockup-row .screenshot-fig--mobile img {
        border: none;
        border-radius: 0;
    }

    @media (max-width: 560px) {
        .mobile-mockup-row {
            gap: 16px;
        }

        .mobile-mockup-row .screenshot-fig--mobile {
            width: calc(50% - 8px);
        }
    }

    @media (max-width: 640px) {
        .screenshot-row {
            grid-template-columns: 1fr;
        }
    }
</style>
```

- [ ] **Step 3: Copy content into [CONTENT] slot**

Open `src/routes/about/+page.svelte`. Copy lines 385–1018 (from `<h2>The Reader</h2>` through the closing `</div>` of the Reference section) and paste in place of `[CONTENT]` in the features page, just before the `<hr />` prev/next block.

Verify the copy includes all these h2 sections in order: The Reader, Study, Compare, Church Fathers, Reading Options, Prayer before Reading, Mobile, Search, History and Articles, Reference.

Note: The Translations section (lines 595–669) is intentionally skipped — it goes to `/about/translations`.

- [ ] **Step 4: Verify**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add src/routes/about/features/
git commit -m "feat: add /about/features page with Reader through Reference sections"
```

---

## Task 3: Create /about/translations page

**Files:**
- Create: `src/routes/about/translations/+page.ts`
- Create: `src/routes/about/translations/+page.svelte`

Content to copy from `src/routes/about/+page.svelte`: lines 595–669 (The Translations section). No custom styles needed — standard prose only.

- [ ] **Step 1: Create +page.ts**

Create `src/routes/about/translations/+page.ts`:
```typescript
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
    return { showLayoutTopBar: true, topBarMinimal: true };
};
```

- [ ] **Step 2: Create +page.svelte**

Create `src/routes/about/translations/+page.svelte`. The `[CONTENT]` block is filled in step 3.

```svelte
<script lang="ts">
    import ProseLayout from '$lib/components/ProseLayout.svelte';

    const ABOUT_NAV = [
        { path: '/about', label: 'About' },
        { path: '/about/features', label: 'Features' },
        { path: '/about/translations', label: 'The Translations' },
        { path: '/about/stats', label: 'In Numbers' }
    ];
</script>

<svelte:head>
    <title>The Translations | The Original Douay-Rheims Bible</title>
    <meta
        name="description"
        content="Every translation available on this site: Sixto-Clementine Vulgate, Original Douay-Rheims, Challoner, Haydock, Confraternity, Knox, CPDV, and KJV."
    />
    <link rel="canonical" href="https://thedouayrheims.com/about/translations" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="The Translations" />
    <meta
        property="og:description"
        content="Every translation available on this site: Sixto-Clementine Vulgate, Original Douay-Rheims, Challoner, Haydock, Confraternity, Knox, CPDV, and KJV."
    />
    <meta property="og:url" content="https://thedouayrheims.com/about/translations" />
    <meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
    title="The Translations"
    subtitle="Every translation on this site was made from the Latin Vulgate, or is included for the light it throws on how that text was translated and revised into English."
    navItems={ABOUT_NAV}
>
    [CONTENT]

    <hr />
    <p>
        <a href="/about/features">← Features</a>
        <a href="/about/stats">In Numbers →</a>
    </p>
</ProseLayout>
```

- [ ] **Step 3: Copy content into [CONTENT] slot**

Open `src/routes/about/+page.svelte`. Copy lines 595–669 (from `<h2>The Translations</h2>` through the closing `</ul>` before the next h2) and paste in place of `[CONTENT]`.

- [ ] **Step 4: Verify**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add src/routes/about/translations/
git commit -m "feat: add /about/translations page"
```

---

## Task 4: Create /about/stats page

**Files:**
- Create: `src/routes/about/stats/+page.ts`
- Create: `src/routes/about/stats/+page.svelte`

Content to copy: lines 1019–1112 (In Numbers + Built with AI sections including the `blessingOpen` trigger button). The `{#if blessingOpen}` modal block from lines 1144–1201 also moves here.

The `blessingOpen` modal state and its handlers currently live in the about page script block. They move in full to the stats page script.

- [ ] **Step 1: Create +page.ts**

Create `src/routes/about/stats/+page.ts`:
```typescript
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
    return { showLayoutTopBar: true, topBarMinimal: true };
};
```

- [ ] **Step 2: Create +page.svelte scaffold**

Create `src/routes/about/stats/+page.svelte`. The `[CONTENT]` block is filled in step 3.

```svelte
<script lang="ts">
    import ProseLayout from '$lib/components/ProseLayout.svelte';
    import { browser } from '$app/environment';
    import { onMount, onDestroy } from 'svelte';

    const ABOUT_NAV = [
        { path: '/about', label: 'About' },
        { path: '/about/features', label: 'Features' },
        { path: '/about/translations', label: 'The Translations' },
        { path: '/about/stats', label: 'In Numbers' }
    ];

    let blessingOpen = false;

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
        if (browser) document.removeEventListener('keydown', handleBlessingKey);
    });

    $: if (browser && blessingOpen) {
        document.body.style.overflow = 'hidden';
    } else if (browser) {
        document.body.style.overflow = '';
    }
</script>

<svelte:head>
    <title>In Numbers | The Original Douay-Rheims Bible</title>
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
    [CONTENT]

    <hr />
    <p>
        <a href="/about/translations">← The Translations</a>
    </p>
</ProseLayout>

{#if blessingOpen}
    [BLESSING_MODAL]
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

    /* Facsimile card */
    .facsimile-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 24px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-panel);
        text-decoration: none;
        color: var(--color-text);
        margin: 28px 0 8px;
        transition:
            border-color 200ms ease,
            background 200ms ease;
    }

    .facsimile-card:hover {
        border-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 4%, var(--color-panel));
        text-decoration: none;
    }

    .facsimile-cross {
        font-size: 20px;
        color: var(--color-accent);
        flex-shrink: 0;
    }

    .facsimile-text {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
    }

    .facsimile-label {
        font-family: var(--font-ui);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-weight: 600;
        color: var(--color-accent-text);
    }

    .facsimile-title {
        font-family: var(--font-reader);
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
        line-height: 1.3;
    }

    .facsimile-sub {
        font-family: var(--font-ui);
        font-size: 12px;
        color: var(--color-subtle);
    }

    .facsimile-arrow {
        font-size: 18px;
        color: var(--color-accent);
        flex-shrink: 0;
        transition: transform 200ms ease;
    }

    .facsimile-card:hover .facsimile-arrow {
        transform: translateX(4px);
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
        from { opacity: 0; }
        to { opacity: 1; }
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

        .facsimile-card {
            padding: 16px;
            gap: 12px;
        }
    }
</style>
```

- [ ] **Step 3: Copy content blocks**

**Content block [CONTENT]:** Open `src/routes/about/+page.svelte`. Copy lines 1019–1112 (from `<h2>The Original Douay-Rheims in Numbers</h2>` through the closing `</button>` and `</p>` of the blessing invite) and paste in place of `[CONTENT]`.

**Blessing modal block [BLESSING_MODAL]:** Copy lines 1145–1200 from `src/routes/about/+page.svelte` (the `<div class="blessing-backdrop"...>` through its closing `</div>`) and paste in place of `[BLESSING_MODAL]`. The `{#if blessingOpen}` and `{/if}` wrapper is already in the scaffold.

- [ ] **Step 4: Verify**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add src/routes/about/stats/
git commit -m "feat: add /about/stats page with numbers and built-with-AI sections"
```

---

## Task 5: Trim /about page

**Files:**
- Modify: `src/routes/about/+page.svelte`

Remove all sections that have moved to other pages. Add `navItems`. Add next link to features. Trim styles to only what's used on this page.

- [ ] **Step 1: Replace the script block**

Replace the entire `<script>` block (lines 1–33) with:

```svelte
<script lang="ts">
    import ProseLayout from '$lib/components/ProseLayout.svelte';

    const ABOUT_NAV = [
        { path: '/about', label: 'About' },
        { path: '/about/features', label: 'Features' },
        { path: '/about/translations', label: 'The Translations' },
        { path: '/about/stats', label: 'In Numbers' }
    ];
</script>
```

- [ ] **Step 2: Update ProseLayout open tag**

Replace line 52–55:
```svelte
<ProseLayout
    title="About This Website"
    subtitle="The first freely searchable digital edition of the Original Douay-Rheims Bible of 1582–1610, with all annotations, notes, and study tools."
    navItems={ABOUT_NAV}
>
```

- [ ] **Step 3: Remove moved content and add prev/next**

Delete lines 385–1113 from the file — this covers The Reader through the end of Built with AI (including The Translations, Reading Options, all feature sections, stats sections, and the blessing invite paragraph). All of this content now lives on other pages.

The file should now contain, in order:
1. `<script>` block (already updated in Steps 1–2)
2. `<svelte:head>` block (unchanged)
3. `<ProseLayout ...>` open tag (already updated in Step 2)
4. The Translation and the Gap (original lines 56–341)
5. Notes on This Edition (original lines 342–384)
6. A Simple Idea (original lines 1114–1141 — `<h2>A Simple Idea</h2>` through the CTA div)
7. The prev/next link, then `</ProseLayout>` close:

```svelte
    <hr />
    <p>
        <a href="/about/features">Features →</a>
    </p>
</ProseLayout>
```

- [ ] **Step 4: Remove blessing modal block**

Delete lines 1144–1201 (the `{#if blessingOpen}` modal block — now on /about/stats).

- [ ] **Step 5: Replace the style block**

Replace the entire `<style>` block (lines 1203–1797) with only the styles used on this page:

```svelte
<style>
    /* Genesis comparison */
    .gen-subtitle {
        font-family: var(--font-ui);
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--color-subtle);
        margin: 24px 0 0;
    }

    .gen-sublabel {
        margin-top: 14px !important;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);
    }

    .compare-intro {
        font-size: 0.95em;
        color: var(--color-muted);
        margin-top: 0;
    }

    .gen-compare {
        display: flex;
        flex-direction: column;
        gap: 1px;
        background: var(--color-border);
        border: 1px solid var(--color-border);
        border-radius: 4px;
        overflow: hidden;
        margin: 24px 0 8px;
        font-size: 0.93em;
    }

    .gen-entry {
        background: var(--color-panel);
        padding: 14px 18px;
    }

    .gen-entry--odr {
        background: color-mix(in srgb, var(--color-accent) 5%, var(--color-panel));
    }

    .gen-label {
        font-family: var(--font-ui);
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--color-accent-text);
        margin-bottom: 6px;
    }

    .gen-label span {
        font-weight: 400;
        color: var(--color-subtle);
        margin-left: 6px;
        letter-spacing: 0.08em;
    }

    .gen-entry p {
        font-family: var(--font-reader);
        line-height: 1.65;
        color: var(--color-text);
        margin: 0;
    }

    .gv {
        font-family: var(--font-ui);
        font-size: 0.72em;
        font-weight: 600;
        color: var(--color-subtle);
        vertical-align: super;
        margin-right: 2px;
    }

    .mark-odr {
        background: color-mix(in srgb, var(--color-accent) 18%, transparent);
        color: var(--color-accent-text);
        font-weight: 600;
        padding: 0 2px;
        border-radius: 2px;
    }

    .mark-drc {
        background: color-mix(in srgb, var(--color-muted) 28%, transparent);
        color: var(--color-text);
        padding: 0 2px;
        border-radius: 2px;
    }

    .mark-kjv {
        background: color-mix(in srgb, var(--color-muted) 28%, transparent);
        color: var(--color-text);
        padding: 0 2px;
        border-radius: 2px;
    }

    .gen-hebrew {
        font-size: 1.05em;
        line-height: 1.9;
        letter-spacing: 0.02em;
    }

    .gen-translit {
        font-size: 0.88em;
        color: var(--color-muted);
        margin-top: 6px !important;
    }

    .gen-lit-heb {
        font-size: 0.9em;
        color: var(--color-muted);
        margin-top: 6px !important;
    }

    /* Screenshots (used in Translation section) */
    .screenshot-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 28px 0 8px;
    }

    .screenshot-fig {
        margin: 28px 0 8px;
    }

    .screenshot-fig img {
        width: 100%;
        height: auto;
        display: block;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        transition: opacity 150ms ease;
    }

    .screenshot-link {
        display: block;
    }

    .screenshot-link:hover img {
        opacity: 0.88;
    }

    .screenshot-fig-sm {
        max-width: 520px;
    }

    .screenshot-fig figcaption {
        font-family: var(--font-ui);
        font-size: 11px;
        color: var(--color-subtle);
        margin-top: 8px;
        line-height: 1.5;
    }

    .screenshot-row .screenshot-fig {
        margin: 0;
    }

    /* Closing (A Simple Idea) */
    .intercession {
        margin-top: 2rem;
        text-align: center;
        color: var(--color-subtle);
        font-size: 0.9rem;
        font-style: italic;
        letter-spacing: 0.03em;
    }

    .laus-deo {
        margin-top: 2.5rem;
        text-align: center;
        color: var(--color-accent-text);
        font-size: 1.5rem;
        letter-spacing: 0.06em;
    }

    .cta-row {
        display: flex;
        justify-content: center;
        margin-top: 2.5rem;
    }

    .cta-btn {
        display: inline-block;
        padding: 10px 24px;
        border: 1px solid var(--color-accent);
        border-radius: 4px;
        font-family: var(--font-ui);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: var(--color-accent);
        text-decoration: none;
        transition:
            background 150ms ease,
            color 150ms ease;
    }

    .cta-btn:hover {
        background: var(--color-accent);
        color: var(--color-bg);
    }

    @media (max-width: 640px) {
        .screenshot-row {
            grid-template-columns: 1fr;
        }
    }
</style>
```

- [ ] **Step 6: Verify and build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run check && npm run build
```

Expected: no type errors, build succeeds, four prerendered pages generated: `/about`, `/about/features`, `/about/translations`, `/about/stats`.

- [ ] **Step 7: Spot-check in browser**

Start dev server:
```bash
npm run dev
```

Check:
- `/about` — sidebar shows 4-item nav, current item = About; section TOC visible; "Features →" link at bottom works
- `/about/features` — sidebar shows nav, current = Features; prev "← About" and next "The Translations →" links work; screenshots render; Prayer before Reading section present
- `/about/translations` — sidebar shows nav, current = The Translations; prev/next links work; translation list renders correctly
- `/about/stats` — sidebar shows nav, current = In Numbers; stats grid renders; praying-hands button opens blessing modal; modal closes with Escape and clicking backdrop

- [ ] **Step 8: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add src/routes/about/+page.svelte
git commit -m "refactor: trim /about to editorial sections, move features/translations/stats to sub-pages"
```
