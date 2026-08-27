export interface FontDef {
	id: string;
	label: string;
	stack: string;
	dividerBefore?: boolean;
}

export const FONTS: FontDef[] = [
	{
		id: 'libre-baskerville',
		label: 'Libre Baskerville',
		stack: "'Libre Baskerville', Georgia, serif"
	},
	{ id: 'sentinel', label: 'Sentinel', stack: "'Sentinel', Georgia, serif" },
	{
		id: 'source-serif-4',
		label: 'Source Serif',
		stack: "'Source Serif 4', Georgia, serif"
	},
	{
		id: 'montserrat',
		label: 'Montserrat',
		stack: "'Montserrat', sans-serif",
		dividerBefore: true
	},
	{
		id: 'libre-franklin',
		label: 'Libre Franklin',
		stack: "'Libre Franklin', sans-serif"
	},
	{
		id: 'noto-sans',
		label: 'Noto Sans',
		stack: "'Noto Sans', sans-serif"
	}
];

export const SANS_FONT_IDS = ['montserrat', 'libre-franklin', 'noto-sans'];

export function getFontById(id: string): FontDef | undefined {
	return FONTS.find((f) => f.id === id);
}

export function isSansFont(id: string): boolean {
	return SANS_FONT_IDS.includes(id);
}

/**
 * Bionic bold weight: 900/700 by default (sans/serif reading font), or the
 * user's manual Heavy(700)/Lighter(600) override from bionicBoldWeight prefs.
 */
export function resolveBionicWeight(isSans: boolean, override: 'auto' | 600 | 700): number {
	return override === 'auto' ? (isSans ? 900 : 700) : override;
}
