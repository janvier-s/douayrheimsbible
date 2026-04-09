export interface FontDef {
	id: string;
	label: string;
	stack: string;
	gfUrl?: string;
	dividerBefore?: boolean;
}

export const FONTS: FontDef[] = [
	{
		id: 'libre-baskerville',
		label: 'Libre Baskerville',
		stack: "'Libre Baskerville', Georgia, serif",
		gfUrl:
			'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap'
	},
	{ id: 'sentinel', label: 'Sentinel', stack: "'Sentinel', Georgia, serif" },
	{
		id: 'source-serif-4',
		label: 'Source Serif',
		stack: "'Source Serif 4', Georgia, serif",
		gfUrl:
			'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap'
	},
	{
		id: 'noto-sans',
		label: 'Noto Sans',
		stack: "'Noto Sans', sans-serif",
		gfUrl:
			'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&display=swap',
		dividerBefore: true
	},
	{
		id: 'libre-franklin',
		label: 'Libre Franklin',
		stack: "'Libre Franklin', sans-serif",
		gfUrl:
			'https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400;0,700;1,400&display=swap'
	},
	{
		id: 'montserrat',
		label: 'Montserrat',
		stack: "'Montserrat', sans-serif",
		gfUrl:
			'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap'
	}
];

export const SANS_FONT_IDS = ['noto-sans', 'libre-franklin', 'montserrat'];

export function getFontById(id: string): FontDef | undefined {
	return FONTS.find((f) => f.id === id);
}

export function isSansFont(id: string): boolean {
	return SANS_FONT_IDS.includes(id);
}
