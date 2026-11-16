export interface FontDef {
	id: string;
	label: string;
	stack: string;
	dividerBefore?: boolean;
	/** Size multiplier so the slider's 16px matches Montserrat 16px optically (x-height, rounded to whole px). */
	sizeScale?: number;
}

export const FONTS: FontDef[] = [
	{
		id: 'libre-baskerville',
		label: 'Libre Baskerville',
		stack: "'Libre Baskerville', 'Gentium Plus Marks', Georgia, serif"
	},
	{
		id: 'sentinel',
		label: 'Sentinel',
		stack: "'Sentinel', 'Gentium Plus Marks', Georgia, serif",
		sizeScale: 17 / 16
	},
	{
		id: 'im-fell-dw-pica',
		label: 'IM Fell DW Pica',
		stack: "'IM Fell DW Pica', 'IM Fell DW Pica SC', 'Gentium Plus Marks', Georgia, serif",
		sizeScale: 20 / 16
	},
	{
		id: 'source-serif-4',
		label: 'Source Serif',
		stack: "'Source Serif 4', 'Gentium Plus Marks', Georgia, serif",
		sizeScale: 17 / 16
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

/** Dyslexia font (Grace Dyslexic MD) measures 18px at Montserrat 16px. */
export const DYSLEXIA_SIZE_SCALE = 18 / 16;

/** Effective CSS px for the reader, given the slider value and active font. */
export function readerFontPx(size: number, fontId: string, dyslexia = false): number {
	const scale = dyslexia ? DYSLEXIA_SIZE_SCALE : (getFontById(fontId)?.sizeScale ?? 1);
	return Math.round(size * scale * 100) / 100;
}
