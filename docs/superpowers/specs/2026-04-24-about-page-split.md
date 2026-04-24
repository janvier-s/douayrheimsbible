# About Page Split — Design Spec

## Goal

Split the single 1,797-line `/about` page into four focused pages with shared sidebar navigation and prev/next links between them.

## Pages

| Route | Title | Sections moved from `/about` |
|---|---|---|
| `/about` | About This Website | The Translation and the Gap, Notes on This Edition, A Simple Idea |
| `/about/features` | Features | The Reader, Study, Compare, Church Fathers, Reading Options, Prayer before Reading, Mobile, Search, History and Articles, Reference |
| `/about/translations` | The Translations | The Translations |
| `/about/stats` | In Numbers | The Original Douay-Rheims in Numbers, Built with AI |

The main `/about` page keeps the core editorial essay (the "why") and the closing mission statement. The features page holds all the how-to-use content. Translations and stats are self-contained enough to stand alone.

## Navigation

`ProseLayout.svelte` already implements a sidebar nav for the history article series: a fixed list of all articles in the series, the current one expanded to show its h2 TOC, with prev/next `<hr>` + `<p>` links at the bottom of each page body. The about pages use the same mechanism.

**ProseLayout change:** Add an optional `navItems` prop (`Array<{ path: string; label: string }> | undefined`). When provided, it is used instead of the hardcoded `NAV_ARTICLES` history array. The existing `isInNav` / sidebar nav / TOC expansion logic is unchanged — it just operates on `navItems` instead of `NAV_ARTICLES` when `navItems` is present.

Each about page passes the same four-item nav array:

```typescript
const ABOUT_NAV = [
  { path: '/about', label: 'About' },
  { path: '/about/features', label: 'Features' },
  { path: '/about/translations', label: 'The Translations' },
  { path: '/about/stats', label: 'In Numbers' }
];
```

**PATH_LABELS additions** (for breadcrumbs in ProseLayout):

```typescript
features: 'Features',
translations: 'The Translations',
stats: 'In Numbers'
```

**Prev/next links** at the bottom of each page body, using the existing `<hr>` + `<p>` + `<a>` pattern already styled in ProseLayout:

- `/about` → next: Features
- `/about/features` → prev: About, next: The Translations
- `/about/translations` → prev: Features, next: In Numbers
- `/about/stats` → prev: The Translations

## Files

**Modified:**
- `src/lib/components/ProseLayout.svelte` — add `navItems` prop; update `PATH_LABELS`; update `isInNav` and sidebar nav template to use `navItems ?? NAV_ARTICLES` with appropriate fallback logic
- `src/routes/about/+page.svelte` — strip out all sections except Translation and the Gap, Notes on This Edition, A Simple Idea; pass `ABOUT_NAV` to ProseLayout; add next link to features

**Created:**
- `src/routes/about/features/+page.svelte` — Reader through Reference sections; prev/next links; ABOUT_NAV passed to ProseLayout; `<svelte:head>` with title, description, canonical
- `src/routes/about/features/+page.ts` — `prerender = true`, `showLayoutTopBar: true`, `topBarMinimal: true`
- `src/routes/about/translations/+page.svelte` — The Translations section; prev/next links; ABOUT_NAV
- `src/routes/about/translations/+page.ts` — same as features
- `src/routes/about/stats/+page.svelte` — Numbers + Built with AI sections; prev link; ABOUT_NAV
- `src/routes/about/stats/+page.ts` — same as features

## ProseLayout navItems prop detail

```typescript
export let navItems: Array<{ path: string; label: string }> | undefined = undefined;

$: activeNav = navItems ?? NAV_ARTICLES;
$: isInNav = activeNav.some((a) => a.path === $page.url.pathname);
```

In the template, replace all references to `NAV_ARTICLES` with `activeNav`. No other changes to the nav or TOC logic.

## Content ownership

The `blessingOpen` modal logic (Prayer before Reading section) currently lives in `/about/+page.svelte`. It moves to `/about/features/+page.svelte` along with that section.

## SEO

Each new page gets its own `<svelte:head>` with unique title, meta description, and canonical URL. The existing `/about` canonical stays unchanged.

## No redirect needed

The sections being moved have no individual URLs (they are anchors within `/about`). No redirects required.
