import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { restyle, checkDocx, PAGE_BREAK } from './docx-lib';

const styles = `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" /><w:sz w:val="24" /></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Heading1"><w:pPr><w:keepNext /></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" /><w:color w:val="0F4761" /><w:sz w:val="40" /></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="AbstractTitle"><w:rPr><w:b /></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="BodyText"><w:pPr><w:spacing w:before="180" /></w:pPr></w:style>`;

describe('restyle', () => {
	const out = restyle(styles);
	it('uses a serif font and centered black headings', () => {
		expect(out).toContain('Times New Roman');
		expect(out).not.toContain('0F4761');
		expect(out).toMatch(/Heading1[\s\S]*<w:jc w:val="center" \/>/);
	});
	it('justifies body text and hides the abstract heading', () => {
		expect(out).toMatch(/BodyText[\s\S]*<w:jc w:val="both" \/>/);
		expect(out).toMatch(/AbstractTitle[\s\S]*<w:vanish \/>/);
	});
});

describe('checkDocx', () => {
	it('rejects a file that is not a zip', () => {
		const p = join(mkdtempSync(join(tmpdir(), 'docx-')), 'bad.docx');
		writeFileSync(p, 'not a zip');
		expect(checkDocx(p).length).toBeGreaterThan(0);
	});
	it('has a page break block pandoc keeps as raw openxml', () => {
		expect(PAGE_BREAK).toContain('{=openxml}');
	});
});
