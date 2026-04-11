import expansions from './query-expansions.json';

const expansionMap: Record<string, string[]> = expansions;

const STOP_WORDS = new Set([
	'the',
	'a',
	'an',
	'and',
	'or',
	'but',
	'in',
	'on',
	'at',
	'to',
	'for',
	'of',
	'with',
	'by',
	'from',
	'is',
	'it',
	'as',
	'be',
	'was',
	'are',
	'were',
	'been',
	'has',
	'had',
	'do',
	'did',
	'not',
	'no',
	'nor',
	'so',
	'if',
	'than',
	'that',
	'this',
	'then',
	'them',
	'they',
	'he',
	'she',
	'his',
	'her',
	'him',
	'i',
	'me',
	'my',
	'we',
	'us',
	'our',
	'you',
	'your',
	'who',
	'whom',
	'which',
	'what',
	'when',
	'where',
	'how',
	'all',
	'each',
	'every',
	'both',
	'few',
	'more',
	'most',
	'other',
	'some',
	'such',
	'up',
	'out',
	'about',
	'into',
	'over',
	'after',
	'before',
	'between',
	'under',
	'again',
	'there',
	'here',
	'once',
	'will',
	'shall',
	'may',
	'can',
	'could',
	'would',
	'should',
	'might',
	'must'
]);

/**
 * Expand query tokens with ODR spelling equivalents.
 * e.g. ["baptize", "peter"] → ["baptize", "baptise", "peter"]
 */
export function expandTokens(tokens: string[]): string[] {
	const result: string[] = [];
	const seen = new Set<string>();

	for (const token of tokens) {
		if (!seen.has(token)) {
			seen.add(token);
			result.push(token);
		}
		const alts = expansionMap[token];
		if (alts) {
			for (const alt of alts) {
				if (!seen.has(alt)) {
					seen.add(alt);
					result.push(alt);
				}
			}
		}
	}

	return result;
}

/**
 * Expand tokens into per-token groups, preserving which expansions belong to which original token.
 * e.g. ["baptize", "peter"] → [["baptize", "baptise"], ["peter"]]
 */
export function expandTokenGroups(tokens: string[]): string[][] {
	return tokens.map((token) => {
		const alts = expansionMap[token];
		return alts ? [token, ...alts] : [token];
	});
}

/** Returns true if every token is a stop word (or the array is empty). */
export function isAllStopWords(tokens: string[]): boolean {
	return tokens.every((t) => STOP_WORDS.has(t));
}
