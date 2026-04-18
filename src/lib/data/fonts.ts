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
		id: 'noto-sans',
		label: 'Noto Sans',
		stack: "'Noto Sans', sans-serif",
		dividerBefore: true
	},
	{
		id: 'libre-franklin',
		label: 'Libre Franklin',
		stack: "'Libre Franklin', sans-serif"
	},
	{
		id: 'montserrat',
		label: 'Montserrat',
		stack: "'Montserrat', sans-serif"
	}
];

export const SANS_FONT_IDS = ['noto-sans', 'libre-franklin', 'montserrat'];

export function getFontById(id: string): FontDef | undefined {
	return FONTS.find((f) => f.id === id);
}

export function isSansFont(id: string): boolean {
	return SANS_FONT_IDS.includes(id);
}
