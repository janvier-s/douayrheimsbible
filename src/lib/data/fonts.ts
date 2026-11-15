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
		stack: "'Libre Baskerville', 'Gentium Plus Marks', Georgia, serif"
	},
	{ id: 'sentinel', label: 'Sentinel', stack: "'Sentinel', 'Gentium Plus Marks', Georgia, serif" },
	{
		id: 'im-fell-dw-pica',
		label: 'IM Fell DW Pica',
		stack: "'IM Fell DW Pica', 'IM Fell DW Pica SC', 'Gentium Plus Marks', Georgia, serif"
	},
	{
		id: 'source-serif-4',
		label: 'Source Serif',
		stack: "'Source Serif 4', 'Gentium Plus Marks', Georgia, serif"
	},
	{
		id: 'montserrat',
		label: 'Montserrat',
		stack: "'Montserrat', 'Gentium Plus Marks', sans-serif",
		dividerBefore: true
	},
	{
		id: 'libre-franklin',
		label: 'Libre Franklin',
		stack: "'Libre Franklin', 'Gentium Plus Marks', sans-serif"
	},
	{
		id: 'noto-sans',
		label: 'Noto Sans',
		stack: "'Noto Sans', 'Gentium Plus Marks', sans-serif"
	}
];

export const SANS_FONT_IDS = ['montserrat', 'libre-franklin', 'noto-sans'];

export function getFontById(id: string): FontDef | undefined {
	return FONTS.find((f) => f.id === id);
}

export function isSansFont(id: string): boolean {
	return SANS_FONT_IDS.includes(id);
}
