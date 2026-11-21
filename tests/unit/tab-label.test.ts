import { describe, it, expect } from 'vitest';
import { tabLabel } from '$lib/components/studyPanelUtils';

describe('tabLabel', () => {
	it('shortens Arguments in either spelling', () => {
		expect(tabLabel('THE ARGUMENT OF THE ACTES OF THE APOSTLES.')).toBe('Argument');
		expect(tabLabel('THE ARGVMENT OF THE ACTES OF THE APOSTLES.')).toBe('Argument');
		expect(tabLabel('THE ARGVMENT OF THE EPISTLES IN GENERAL.')).toBe('General');
		expect(tabLabel('THE ARGUMENT OF THE EPISTLES IN GENERAL.')).toBe('General');
	});
});
