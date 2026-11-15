// scripts/export-spelling.ts
// Which spelling of the ODR the export bundle is built from. Set
// ODR_SPELLING=original to build from static/data/odr-original (the 1582/1609
// spelling, with long s and vv) instead of the modernised static/data/odr.
// The modern build keeps its historical file names; the original-spelling
// build adds "-original-spelling" to every file name so both can sit side by
// side in one release.

export const ORIGINAL_SPELLING = process.env.ODR_SPELLING === 'original';

/** Folder under static/data the books and annotations are read from. */
export const DATA_DIR_NAME = ORIGINAL_SPELLING ? 'odr-original' : 'odr';

/** Stem of every whole-Bible and release-asset file name. */
export const FILE_STEM = ORIGINAL_SPELLING
	? 'original-douay-rheims-original-spelling'
	: 'original-douay-rheims';

/** OSIS work id, distinct per spelling so Bible software can install both. */
export const OSIS_WORK_ID = ORIGINAL_SPELLING ? 'ODROrig' : 'ODR';

/** Appended to the edition line in file headers and e-book subtitles. */
export const SPELLING_SUFFIX = ORIGINAL_SPELLING ? ', original spelling' : '';
