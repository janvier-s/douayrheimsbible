# Homepage Skip — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

## Overview

Returning visitors who have already seen the homepage hero can opt in to being redirected straight to `/odr/genesis/1` on future visits. A checkbox on the homepage (visible from the second visit onward) sets the preference. The preference can be reversed at any time via the Reading Preferences panel.

---

## State

Two new boolean fields added to `ReadingPrefs` in `src/lib/stores/prefs.ts`:

| Field | Default | Meaning |
|---|---|---|
| `hasVisitedHomepage` | `false` | Set to `true` on the first visit; never unset. Controls when the checkbox appears. |
| `skipHomepage` | `false` | When `true`, visiting `/` redirects to `/odr/genesis/1`. |

`PREFS_VERSION` bumps from 18 → 19. Migration: both fields default to `false` for existing users — no data change needed, just the version bump.

---

## Homepage behavior (`src/routes/+page.svelte`)

**In `onMount`:**

1. Read `$prefs.hasVisitedHomepage` and `$prefs.skipHomepage`.
2. If `skipHomepage` is `true` → call `goto('/odr/genesis/1')` and return early. Nothing else runs.
3. If `hasVisitedHomepage` is `false` → call `prefs.update` to set `hasVisitedHomepage: true`. Show the normal hero, no checkbox.
4. If `hasVisitedHomepage` is `true` and `skipHomepage` is `false` → show the normal hero with the checkbox visible.

**The checkbox:**

- Rendered below the CTA button (`hero-cta`) inside `hero-left`.
- Label: "Skip this intro on future visits"
- Styled to match the existing hero typography — small, subdued (`var(--color-subtle)`), not competing with the CTA.
- `checked` bound to `$prefs.skipHomepage`. On change: `prefs.update((p) => ({ ...p, skipHomepage: e.target.checked }))`.
- No separate confirm step — the change takes effect on the next visit.

---

## Reading Preferences panel (`src/lib/components/ReadingPrefs.svelte`)

Add one toggle row in the **Reading** tab, grouped with the other navigation/layout toggles (`showChapterNav`, `infiniteScroll`).

- Label: "Show intro page"
- Checked state: `!$prefs.skipHomepage` (inverse — "show" is the positive framing)
- On change: `prefs.update((p) => ({ ...p, skipHomepage: !e.target.checked }))`
- This is the only way to re-enable the homepage for a user who has already opted out and is being redirected away.

---

## Redirect mechanics

- Client-side only: `goto('/odr/genesis/1')` inside `onMount` in `+page.svelte`.
- SvelteKit's `goto` is imported from `$app/navigation`.
- No server-side redirect. localStorage is browser-only; the server has no knowledge of the preference.
- `onMount` fires after the first render, so a very brief flash of the hero is possible before `goto` redirects. This is acceptable — the path only affects return visitors who explicitly opted in, and it cannot be avoided without hiding the hero for all visitors (which would hurt LCP).

---

## What is NOT changing

- The URL `/` remains canonical for the homepage. No permanent redirect headers.
- The hero itself is unchanged. No new route is created.
- The ODR reader's top bar is unchanged.
- The checkbox is not shown on the first visit — the hero stays clean for new visitors.

---

## Edge cases

- **SSR**: `goto` is only called in `onMount`, so SSR renders the full homepage normally. Bots and crawlers see the hero as always.
- **User clears localStorage**: Both flags reset to `false`. Next visit is treated as a first visit — no checkbox, no redirect.
- **Direct navigation to `/odr/genesis/1`**: Unaffected. The redirect logic only runs on `/`.
