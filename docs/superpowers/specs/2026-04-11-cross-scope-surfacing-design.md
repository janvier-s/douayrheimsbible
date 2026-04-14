# Cross-Scope Surfacing Design

## Goal

When a user is viewing results in one tab (Verses or Annotations), show a one-line teaser if the same query also produces relevant results in the other tab — so users discover content they wouldn't otherwise see.

## Architecture

- Entirely client-side: no new endpoints, no server changes, no AI cost
- Both search scopes (`searchVerses` and `searchNotes`) already run in parallel on every query
- A reactive `computeCrossScope()` function reads the existing results and produces a teaser object
- The teaser renders above results as a single clickable line that switches the active tab

## Quality Gate

| Query type | Gate |
|---|---|
| All stop words ("of the") | Never show teaser |
| 1 non-stop word ("transubstantiation") | Show teaser if other scope has any results |
| ≥2 non-stop words ("full of grace") | Show teaser only if phrase proximity ≤ `nonStopWords.length + 3` in at least one result |

The proximity gate prevents noisy teasers for broad multi-word queries where the other scope matches happen to contain the words far apart.

## Implementation

**File:** `src/routes/search/+page.svelte`

Add `isStopWord` import from `$lib/search/expand-query`.

Add reactive teaser computation:

```typescript
$: crossScopeTeaser = computeCrossScope(queryTokens, textResults, noteResults, activeTab);

function computeCrossScope(tokens, verses, notes, tab) {
  const nonStop = tokens.filter(t => !isStopWord(t));
  if (nonStop.length === 0) return null;

  const multiWord = nonStop.length >= 2;

  if (tab === 'verses') {
    const count = notes.length;
    if (count === 0) return null;
    if (multiWord && !hasProximityMatch(notes, nonStop)) return null;
    return { label: 'annotations', count, tab: 'notes' };
  } else {
    const count = verses.reduce((n, g) => n + g.verses.length, 0);
    if (count === 0) return null;
    if (multiWord && !hasProximityMatch(verses, nonStop)) return null;
    return { label: 'verses', count, tab: 'verses' };
  }
}
```

`hasProximityMatch` checks if any result passes `phraseProximity <= nonStop.length + 3`. Import or inline `phraseProximity` (already exists in `text-search.ts` but is not exported — needs export).

**Teaser UI** — rendered above results when `crossScopeTeaser` is non-null and results exist:

```svelte
{#if crossScopeTeaser && (textResults.length > 0 || noteResults.length > 0)}
  <button class="cross-scope-teaser" on:click={() => activeTab = crossScopeTeaser.tab}>
    "{query}" is also found in {crossScopeTeaser.count} matching {crossScopeTeaser.label} →
  </button>
{/if}
```

Style: subtle, single line, uses `--color-subtle` text, `font-ui`, no background. Arrow indicates interactivity.

## Edge Cases

- Both scopes empty: no teaser shown
- Both scopes have results: teaser always points to the non-active tab, never redundant
- Query changes: reactive recomputation, no stale state
- Hero "Try a reference" block: already fixed to hide when results are present
