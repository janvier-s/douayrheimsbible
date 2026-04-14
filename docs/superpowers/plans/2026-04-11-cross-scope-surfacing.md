# Cross-Scope Surfacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user views search results in one tab (Verses or Annotations), show a one-line teaser if the same query produces relevant results in the other tab.

**Architecture:** Both searches run in parallel on every text query. Cross-scope results are stored in separate state variables. A reactive function gates the teaser on stop-word filtering and phrase proximity for multi-word queries.

**Tech Stack:** SvelteKit 5 (Svelte 4 syntax), MiniSearch, TypeScript, Tailwind CSS

---

## File Map

- **Modify:** `src/lib/search/text-search.ts` — export `phraseProximity`
- **Modify:** `src/routes/search/+page.svelte` — parallel search, cross-scope state, teaser UI

---

### Task 1: Export `phraseProximity` from text-search.ts

**Files:**
- Modify: `src/lib/search/text-search.ts:250`

- [ ] **Step 1: Add `export` to `phraseProximity`**

In `src/lib/search/text-search.ts`, line 250, change:

```typescript
function phraseProximity(text: string, queryTokens: string[]): number {
```

to:

```typescript
export function phraseProximity(text: string, queryTokens: string[]): number {
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/search/text-search.ts
git commit -m "feat: export phraseProximity from text-search"
```

---

### Task 2: Run both scopes in parallel and store cross-scope results

**Files:**
- Modify: `src/routes/search/+page.svelte` (script section)

Currently `searchText` runs only one scope depending on `scope`. This task rewrites it to always run both, storing the off-scope results for the teaser.

- [ ] **Step 1: Add cross-scope state variables and `queryTokens` to component state**

In the `<script>` block, after the existing state variables (around line 44), add:

```typescript
let crossScopeVerseResults: TextResultGroup[] = [];
let crossScopeNoteResults: NoteResult[] = [];
let queryTokens: string[] = [];
```

- [ ] **Step 2: Add `phraseProximity` to the import from text-search**

Change line 16:

```typescript
import {
	searchVerses,
	searchNotes,
	buildTextResultGroups,
	hydrateResultGroups,
	hydrateNoteResults,
	type TextResultGroup,
	type NoteResult
} from '$lib/search/text-search';
```

to:

```typescript
import {
	searchVerses,
	searchNotes,
	buildTextResultGroups,
	hydrateResultGroups,
	hydrateNoteResults,
	phraseProximity,
	type TextResultGroup,
	type NoteResult
} from '$lib/search/text-search';
```

- [ ] **Step 3: Rewrite `searchText` to run both scopes in parallel**

Replace the entire `searchText` function (lines 210–248) with:

```typescript
async function searchText(trimmed: string) {
	const tokens = tokenize(trimmed);
	if (isAllStopWords(tokens)) {
		stopWordWarning = true;
		textResults = [];
		noteResults = [];
		crossScopeVerseResults = [];
		crossScopeNoteResults = [];
		queryTokens = [];
		searched = true;
		loading = false;
		return;
	}
	stopWordWarning = false;
	const gen = ++searchGeneration;
	loading = true;
	try {
		const [verseSearch, noteSearch] = await Promise.all([
			searchVerses(trimmed, fetch, scope === 'verses' ? textLimit : 20),
			searchNotes(trimmed, fetch, scope === 'notes' ? textLimit : 20)
		]);
		if (gen !== searchGeneration) return;

		const { results: verseRaw, total: verseTotal, queryTokens: qt } = verseSearch;
		const { results: noteRaw, total: noteTotal } = noteSearch;
		queryTokens = qt;

		if (scope === 'verses') {
			const groups = buildTextResultGroups(verseRaw);
			textResults = await hydrateResultGroups(groups, qt, fetch);
			noteResults = [];
			textTotal = verseTotal;
			crossScopeNoteResults = await hydrateNoteResults(noteRaw, qt, fetch);
			crossScopeVerseResults = [];
		} else {
			noteResults = await hydrateNoteResults(noteRaw, qt, fetch);
			textResults = [];
			textTotal = noteTotal;
			const vsGroups = buildTextResultGroups(verseRaw);
			crossScopeVerseResults = await hydrateResultGroups(vsGroups, qt, fetch);
			crossScopeNoteResults = [];
		}

		if (gen !== searchGeneration) return;
		results = [];
		searched = true;
	} catch {
		if (gen !== searchGeneration) return;
		textResults = [];
		noteResults = [];
		crossScopeVerseResults = [];
		crossScopeNoteResults = [];
		queryTokens = [];
		searched = true;
	}
	loading = false;
}
```

- [ ] **Step 4: Reset cross-scope state in `setScope`**

In the `setScope` function (around line 262), add the cross-scope resets:

```typescript
function setScope(newScope: SearchScope) {
	if (newScope === scope) return;
	scope = newScope;
	textResults = [];
	noteResults = [];
	crossScopeVerseResults = [];
	crossScopeNoteResults = [];
	queryTokens = [];
	searched = false;
	stopWordWarning = false;
	updateUrl(query);
	if (query.trim()) search(query);
}
```

- [ ] **Step 5: Reset cross-scope state in `onInput` clear branch**

In `onInput` (around line 122), the `else` branch that clears on empty query:

```typescript
} else {
	results = [];
	textResults = [];
	noteResults = [];
	crossScopeVerseResults = [];
	crossScopeNoteResults = [];
	queryTokens = [];
	searched = false;
	stopWordWarning = false;
}
```

- [ ] **Step 6: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/routes/search/+page.svelte
git commit -m "feat: run both search scopes in parallel for cross-scope data"
```

---

### Task 3: Add teaser computation and UI

**Files:**
- Modify: `src/routes/search/+page.svelte` (script + template)

- [ ] **Step 1: Add `computeCrossScope` function to the script block**

Add this function after the `highlightSearchVerse` function (around line 414):

```typescript
function computeCrossScope(
	tokens: string[],
	curScope: SearchScope,
	verseGroups: TextResultGroup[],
	noteList: NoteResult[]
): { label: string; count: number; targetScope: SearchScope } | null {
	const nonStop = tokens.filter((t) => !isStopWord(t));
	if (nonStop.length === 0) return null;
	const multiWord = nonStop.length >= 2;
	const threshold = nonStop.length + 3;

	if (curScope === 'verses') {
		const count = noteList.length;
		if (count === 0) return null;
		if (multiWord) {
			const hasMatch = noteList.some((n) => {
				const text = [n.title ?? '', n.noteText, ...(n.subNotes?.map((s) => s.text) ?? [])].join(
					' '
				);
				return phraseProximity(text, nonStop) <= threshold;
			});
			if (!hasMatch) return null;
		}
		return { label: 'annotations', count, targetScope: 'notes' };
	} else {
		const count = verseGroups.reduce((n, g) => n + g.verses.length, 0);
		if (count === 0) return null;
		if (multiWord) {
			const hasMatch = verseGroups.some((g) =>
				g.verses.some((v) => phraseProximity(v.text, nonStop) <= threshold)
			);
			if (!hasMatch) return null;
		}
		return { label: 'verses', count, targetScope: 'verses' };
	}
}
```

- [ ] **Step 2: Add the reactive teaser declaration**

Add this reactive statement after the `$: isHero = ...` block (around line 77):

```typescript
$: crossScopeTeaser =
	searched && !loading && mode === 'text'
		? computeCrossScope(queryTokens, scope, crossScopeVerseResults, crossScopeNoteResults)
		: null;
```

- [ ] **Step 3: Add the teaser element to the template**

Inside the `<div aria-live="polite">` block, immediately after the opening tag and the loading paragraph (around line 565), add the teaser before the "No results (verse mode)" block:

```svelte
<!-- Cross-scope teaser -->
{#if crossScopeTeaser && (textResults.length > 0 || noteResults.length > 0)}
	<button
		class="block w-full text-left mb-[16px] font-ui text-[13px] text-subtle hover:text-foreground transition-colors duration-fast"
		on:click={() => setScope(crossScopeTeaser.targetScope)}
	>
		<span class="border-b border-dashed border-current">
			"{query}" is also found in {crossScopeTeaser.count} matching {crossScopeTeaser.label}
		</span>
		<span class="ml-[4px]">→</span>
	</button>
{/if}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Manual smoke test via dev server**

Run: `npm run dev`

Test these queries:
1. Search "thou art Peter" in **Verses** scope → should see teaser "…also found in N matching annotations →". Clicking it switches to Annotations tab and shows results.
2. Search "transubstantiation" in **Annotations** scope → should see teaser "…also found in N matching verses →" (single non-stop word, no proximity gate).
3. Search "the" in Verses → no teaser (all stop words).
4. Search "full of grace" in **Annotations** → teaser only appears if verses with those words close together exist.
5. Switch scope manually while teaser is visible → teaser disappears (now viewing that scope).

- [ ] **Step 6: Run prettier**

```bash
npx prettier --write src/routes/search/+page.svelte src/lib/search/text-search.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/search/+page.svelte
git commit -m "feat: cross-scope surfacing teaser on search results"
```

---

## Self-Review Checklist

- [x] Spec coverage: quality gate (all stop words → never; 1 non-stop → always; ≥2 non-stop → proximity gate) ✓
- [x] Architecture: both scopes parallel, teaser above results, click switches tab ✓
- [x] No placeholders — all code is complete
- [x] Type consistency: `TextResultGroup`, `NoteResult`, `SearchScope` used consistently across tasks
- [x] `phraseProximity` exported in Task 1 before imported in Task 3
- [x] `crossScopeTeaser.targetScope` is `SearchScope` type — matches `setScope` parameter
