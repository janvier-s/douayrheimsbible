// scripts/fix-odr-annotation-anchors.ts
// @ts-nocheck: build script run with tsx
//
// Re-anchors the Rheims annotations whose catchword quotes a verse other than
// the one they are attached to.
//
// The stated verse drives three things: which verse the study panel files the
// annotation under, which verse the reader underlines (has_annotation on the
// verse in the chapter file), and now which verse the catchword highlight
// looks in. Where it is wrong all three are wrong together, so the sidecar and
// the chapter file have to move in step.
//
// Two causes, both listed below and both fixed the same way. Most are a plain
// off-by-one from import. The rest are versification: the annotation's number
// was right for the edition it was set in and wrong for the text this site
// renders. John 6 diverges partway through the chapter, and the Psalms cases
// are the superscription that ODR counts as verse 1.
//
// Jeremie 35:1 was left alone for a while because its phrase appears in two
// neighbouring verses. Verse 1 carries no part of it at all, so the choice is
// between the two that do, and verse 2 is the one that introduces them.
//
// Every move is listed rather than derived, so a later edit to verse text can
// never cause this to move something new. Each is re-verified against the
// corpus before it is applied, and the script is a no-op once it has run.
//
//   npx tsx scripts/fix-odr-annotation-anchors.ts            report only
//   npx tsx scripts/fix-odr-annotation-anchors.ts --write    apply

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveLemma, resolvePartialLemma } from './odr-lemma-lib.js';
import { readJson, serialize } from './odr-corpus-json.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ODR_DIR = join(dirname(__dirname), 'static', 'data', 'odr');
const WRITE = process.argv.includes('--write');

const MOVES = [
	// Galatians 1: the annotation on "although we, or an Angel from heaven,
	// evangelize to you beside that which we have evangelized to you, be he
	// anathema" sits six verses early. Its catchword is verbatim in verse 8 and
	// nowhere else in the chapter, and all five blocks of it read verse 8: the
	// credit of any man or Angel, the word "Beside", "evangelizamus", and the
	// curse the Apostle pronounces. All three records travel together.
	{ slug: 'galatians', chapter: 1, from: 2, to: 8, title: 'Or an Angel.' },
	{ slug: 'galatians', chapter: 1, from: 2, to: 8, title: null, part: 2 },
	{ slug: 'galatians', chapter: 1, from: 2, to: 8, title: null, part: 3 },
	// Genesis, the same off-by-two as the rest, found once the gap limit widened
	// enough to see "Cain offered of the fruits of the earth gifts to our Lord".
	{ slug: 'genesis', chapter: 3, from: 22, to: 24, title: 'Placed Cherubins.' },
	{ slug: 'genesis', chapter: 4, from: 1, to: 3, title: 'Offered gifts.' },
	// Leviticus 18:23 is deliberately absent. That record is not an annotation:
	// it is Leviticus 21:5-6 with the chapter 23 heading run into it by a column
	// bleed, which is where its verse number came from. It needs the facsimile,
	// not a move.
	// Continuation blocks: no catchword of their own, and no annotation at the
	// verse they claim. Each is the running text of the annotation above it, so
	// it joins that annotation as a further part. Two of the verse numbers are
	// not verses at all (118, 605), which is the clearest sign of the same
	// import fault that produced 1 John 4:118.
	{ slug: 'exodus', chapter: 7, from: 6, to: 3, title: null },
	{ slug: 'galatians', chapter: 4, from: 118, to: 3, title: null },
	{ slug: 'galatians', chapter: 4, from: 5, to: 3, title: null },
	{ slug: '1-corinthians', chapter: 10, from: 605, to: 21, title: null },
	// Two continuation blocks whose verse number lost a digit boundary and
	// became 118. They carry no catchword of their own, so they are matched on
	// part rather than title and cannot be verified against the verse text; the
	// evidence is that both sit directly after the verse 18 annotation they
	// continue, and both discuss the fear that verse 18 is about.
	{ slug: '1-john', chapter: 4, from: 118, to: 18, title: null, part: 1 },
	{ slug: '1-john', chapter: 4, from: 118, to: 18, title: null, part: 2 },
	{ slug: '1-peter', chapter: 4, from: 9, to: 8, title: 'Charity covereth.' },
	{ slug: 'acts', chapter: 7, from: 58, to: 57, title: 'They stoned him.' },
	{ slug: 'acts', chapter: 8, from: 27, to: 26, title: 'This is desert.' },
	{ slug: 'acts', chapter: 15, from: 1, to: 2, title: 'Appointed.' },
	{ slug: 'acts', chapter: 19, from: 16, to: 15, title: 'Paul I know.' },
	{ slug: 'colossians', chapter: 3, from: 9, to: 10, title: 'Doing on the new.' },
	{ slug: 'genesis', chapter: 50, from: 25, to: 24, title: 'Carry my bones with you.' },
	{ slug: 'john', chapter: 6, from: 61, to: 62, title: 'If you shall see.' },
	{ slug: 'john', chapter: 6, from: 62, to: 63, title: 'The flesh profiteth nothing.' },
	{ slug: 'john', chapter: 6, from: 63, to: 64, title: 'That believe not.' },
	{ slug: 'john', chapter: 6, from: 65, to: 66, title: 'Went back.' },
	{ slug: 'john', chapter: 6, from: 67, to: 68, title: 'Peter answered.' },
	{ slug: 'john', chapter: 19, from: 15, to: 17, title: 'His own cross.' },
	{ slug: 'leviticus', chapter: 27, from: 25, to: 26, title: 'The first-born.' },
	{ slug: 'luke', chapter: 24, from: 46, to: 47, title: 'Penance to be preached.' },
	{ slug: 'mark', chapter: 6, from: 8, to: 9, title: 'Not two coats.' },
	{ slug: 'mark', chapter: 9, from: 4, to: 3, title: 'Elias with Moyses.' },
	{ slug: 'mark', chapter: 9, from: 13, to: 12, title: 'Elias also is come.' },
	{ slug: 'matthew', chapter: 4, from: 11, to: 10, title: 'Him only serve.' },
	{ slug: 'matthew', chapter: 9, from: 19, to: 20, title: 'Twelve years.' },
	{ slug: 'matthew', chapter: 11, from: 18, to: 19, title: 'Eating and drinking.' },
	{ slug: 'matthew', chapter: 17, from: 21, to: 20, title: 'Prayer and fasting.' },
	{ slug: 'matthew', chapter: 17, from: 26, to: 25, title: 'The Children free.' },
	{ slug: 'matthew', chapter: 19, from: 14, to: 12, title: 'He that can.' },
	{ slug: 'philippians', chapter: 4, from: 2, to: 3, title: 'Sincere companion.' },
	{ slug: 'psalms', chapter: 6, from: 1, to: 2, title: 'In thy fury, nor in thy wrath.' },
	{ slug: 'psalms', chapter: 31, from: 1, to: 2, title: 'Whose sins are covered. 2. not imputed.' },
	{ slug: 'psalms', chapter: 144, from: 14, to: 13, title: 'Our Lord is faithful.' },
	{ slug: 'romans', chapter: 1, from: 26, to: 24, title: 'Hath delivered them up.' },
	{ slug: 'romans', chapter: 10, from: 2, to: 3, title: 'The justice of God.' },
	{ slug: 'romans', chapter: 14, from: 6, to: 5, title: 'Every one in his own sense.' },
	// Four found by asking what the last unanchored catchwords quote. Each names
	// a phrase that is nowhere in the verse it was filed under and plain in the
	// one below.
	//
	// Acts 15: "fornication" is in verse 29 and in no other verse of the chapter.
	// Verse 24 keeps its own catchword, "Going forth from us.", which is verbatim
	// there.
	{ slug: 'acts', chapter: 15, from: 24, to: 29, title: 'Fornication.' },
	// John 5: verse 34 reads "But I receive not testimony of man", and the
	// annotation is about exactly that: "man's testimony is not necessary to him,
	// nor that the truth of his Divinity dependeth on worldly witnesses". Verse 41
	// carries the same three words for a different thing, the glory of men.
	{ slug: 'john', chapter: 5, from: 14, to: 34, title: 'I receive not.' },
	// Matthew 17: verse 18 is the disciples asking "Why could we not cast him
	// out?", which is what the annotation answers. Verse 19 is Christ's reply and
	// keeps its own catchword, "Faith as a mustard seed."
	{ slug: 'matthew', chapter: 17, from: 19, to: 18, title: 'Why could we not.' },
	// Jeremie 35: verse 2, "Go to the house of the Rechabites", is where the
	// chapter names them. Verse 3 repeats the phrase; verse 1 has none of it.
	{ slug: 'jeremie', chapter: 35, from: 1, to: 2, title: 'The house of Rechabites.' }
];

/** A title that quotes nothing.
 *
 *  Psalms 9 ends with a note on where the late Hebrew doctors divide the Psalm,
 *  which is a remark about the chapter and not a gloss on any phrase in it. The
 *  importer gave it a rule of dashes where a catchword would go. Clearing it
 *  leaves an untitled annotation, which the panel already renders, instead of a
 *  catchword that can never be found. */
const UNTITLE = [{ slug: 'psalms', chapter: 9, verse: 21, title: '---' }];

/** A catchword the scan lost a letter out of.
 *
 *  Acts 23:5 reads "I knew not, brethren, that he is the high Priest", and the
 *  annotation is Paul explaining that he did not know. "I new" occurs nowhere
 *  else in the corpus and is not a spelling of anything; "knew" occurs 293
 *  times. Left alone here because the evidence does not reach it: "Hung
 *  himself." at Matthew 27:5 against a verse reading "hanged himself", where
 *  either word could be what the annotator wrote. */
const TITLE_REPAIRS = [
	{ slug: 'acts', chapter: 23, verse: 5, from: 'I new not.', to: 'I knew not.' },
	// Matthew 17:18 asks "Why could we not cast him out?" and the catchword had
	// the last two words the wrong way about.
	{
		slug: 'matthew',
		chapter: 17,
		verse: 19,
		from: 'Why could not we.',
		to: 'Why could we not.',
		verifyAt: 18
	}
];

/** Verse text, which this script otherwise never touches.
 *
 *  A catchword that cannot be found is worth reading twice: sometimes the
 *  annotation is right and the verse under it is what the scan got wrong.
 *  Genesis 26:12 is "an hundred fold" in every edition and in the catchword
 *  above it, and "and hundred fold" is not English. */
const VERSE_REPAIRS = [
	{
		slug: 'genesis',
		chapter: 26,
		verse: 12,
		from: 'that same year and hundred fold',
		to: 'that same year an hundred fold'
	}
];

/** A whole annotation filed twice, under a chapter it does not belong to. The
 *  copy named here is the one to drop; the copy at `keptIn` is the one the app
 *  already shows, being the only one whose verse carries has_annotation.
 *
 *  The two transcriptions are not identical, so the readings that differ are
 *  worth checking against the facsimile before this is treated as settled. */
const DUPLICATES = [
	{
		slug: 'tobias',
		chapter: 6,
		verse: 1,
		title: 'Tarried long because of the Marriage.',
		keptIn: 10
	}
];

/** A marker left at the end of one block that opens the next.
 *
 *  Where the importer cut an annotation into blocks it sometimes took the cut
 *  one marker too late, stranding the opening <mn> of the following block on
 *  the end of the previous one. The note it refers to is stranded with it, so
 *  both move together. */
const MARKER_REPAIRS = [
	{ slug: 'galatians', chapter: 1, verse: 8, from: 1, to: 2, marker: '<mn>[1]</mn>', note: 1 },
	{ slug: '1-john', chapter: 4, verse: 18, from: 2, to: 3, marker: '<mn>[1]</mn>', note: 1 }
];

/** Records that are not annotations at all.
 *
 *  Leviticus 18:23 is Leviticus 21:5-6 with the chapter 23 heading run into it
 *  by a bleed from the neighbouring column, which is where its verse number
 *  came from: "for the burnt A nd our Lord spake to Moyses saying: Speak
 *  <sc>Chapter XXIII</sc>. to the children of Israel". The facsimile carries
 *  neither an annotation nor a note at that verse. */
const DELETIONS = [
	{ slug: 'leviticus', chapter: 18, verse: 23, startsWith: 'Neither shall they shave their head' }
];

/** One annotation cut in two, and the number that did the cutting.
 *
 *  The importer read numbers inside citations as verse numbers and broke the
 *  annotation at that point, so the tail became a record of its own filed under
 *  a verse that is often not a verse at all. Restoring the number closes the
 *  citation and the two halves become one record again. Each number here is the
 *  verse number its orphan was given, which is the number that went missing.
 *
 *  Marker numbering runs on across every one of these joins, which is the
 *  evidence that the halves were always one annotation. */
const REJOINS = [
	// "...ep. ad Nestor. pag. 605. the Sacrifice of sacrifices: Dionys. Ec. Hier."
	{
		slug: '1-corinthians',
		chapter: 10,
		verse: 21,
		into: 1,
		joins: [{ part: 2, restore: '605.', startsWith: '<i>the Sacrifice of sacrifices:</i>' }]
	},
	// "...And Psal. 118. Pierce my flesh with thy fear" (Ps. 118:120)
	{
		slug: '1-john',
		chapter: 4,
		verse: 18,
		into: 1,
		joins: [{ part: 2, restore: '118.', startsWith: '<i>Pierce my flesh with thy fear</i>' }]
	},
	// "...in the foresaid epistle 118." (Augustine, Ep. 118) and "...Io. 20. Ia. 5."
	{
		slug: 'galatians',
		chapter: 4,
		verse: 3,
		into: 2,
		joins: [
			{ part: 3, restore: '118.', startsWith: '<mn>[2]</mn> he insinuateth' },
			{ part: 4, restore: '5.', startsWith: '<i>Ephes. 5.</i>' }
		]
	},
	// "...And, 1. Reg 6. v. 6. Why do you harden your hearts"
	{
		slug: 'exodus',
		chapter: 7,
		verse: 3,
		into: 9,
		joins: [{ part: 10, restore: '6.', startsWith: '<i>Why do you harden your hearts' }]
	}
];

/** The same fault where it swallowed a number without splitting anything: the
 *  citation is simply left hanging. */
const CITATION_REPAIRS = [
	{ slug: 'philippians', chapter: 2, verse: 12, endsWith: 'Proverb. 28. v.', restore: '14.' }
];

/** Numbers a part where the corpus puts it, straight after the verse, rather
 *  than appending it after the notes. */
function setPart(annotation, part) {
	const rebuilt = { verse: annotation.verse, part };
	for (const [key, value] of Object.entries(annotation)) {
		if (!(key in rebuilt)) rebuilt[key] = value;
	}
	for (const key of Object.keys(annotation)) delete annotation[key];
	Object.assign(annotation, rebuilt);
}

/** Sets has_annotation where the corpus puts it, between text and cross_refs,
 *  rather than appending it after whatever else the verse carries. */
function setFlag(verse) {
	const rebuilt = { verse: verse.verse, text: verse.text, has_annotation: true };
	for (const [key, value] of Object.entries(verse)) {
		if (!(key in rebuilt)) rebuilt[key] = value;
	}
	for (const key of Object.keys(verse)) delete verse[key];
	Object.assign(verse, rebuilt);
}

const bySidecar = new Map();
for (const move of MOVES) {
	const key = `${move.slug}/${String(move.chapter).padStart(3, '0')}`;
	if (!bySidecar.has(key)) bySidecar.set(key, []);
	bySidecar.get(key).push(move);
}

let mended = 0;
for (const repair of VERSE_REPAIRS) {
	const path = join(ODR_DIR, `${repair.slug}.json`);
	const book = readJson(path);
	const verse = book.data.chapters
		.find((c) => c.chapter === repair.chapter)
		.verses.find((v) => v.verse === repair.verse);
	if (!verse.text.includes(repair.from)) continue; // already mended
	verse.text = verse.text.replace(repair.from, repair.to);
	mended++;
	console.log(`  ${repair.slug} ${repair.chapter}:${repair.verse}  verse text "${repair.to}"`);
	if (WRITE) writeFileSync(path, serialize(book.raw, book.data));
}

let retitled = 0;
for (const repair of TITLE_REPAIRS) {
	const path = join(
		ODR_DIR,
		repair.slug,
		'annotations',
		`${String(repair.chapter).padStart(3, '0')}.json`
	);
	const sidecar = readJson(path);
	const matches = sidecar.data.annotations.filter(
		(a) => a.verse === repair.verse && a.title === repair.from
	);
	if (matches.length === 0) continue; // already repaired
	if (matches.length > 1)
		throw new Error(`${repair.slug} ${repair.chapter}:${repair.verse} matched ${matches.length}`);
	const book = readJson(join(ODR_DIR, `${repair.slug}.json`));
	// A repaired catchword is checked against the verse it will be read against,
	// which is not always the one it is filed under yet: Matthew 17 is retitled
	// here and moved a verse up below.
	const at = repair.verifyAt ?? repair.verse;
	const verse = book.data.chapters
		.find((c) => c.chapter === repair.chapter)
		.verses.find((v) => v.verse === at);
	if (!resolveLemma(repair.to, verse.text))
		throw new Error(`${repair.slug} ${repair.chapter}:${at} does not carry "${repair.to}"`);
	matches[0].title = repair.to;
	retitled++;
	console.log(
		`  ${repair.slug} ${repair.chapter}:${repair.verse}  "${repair.from}" -> "${repair.to}"`
	);
	if (WRITE) writeFileSync(path, serialize(sidecar.raw, sidecar.data));
}

let moved = 0;
let renumbered = 0;
let flagged = 0;

for (const [key, moves] of bySidecar) {
	const [slug, chapterFile] = key.split('/');
	const sidecarPath = join(ODR_DIR, slug, 'annotations', `${chapterFile}.json`);
	const bookPath = join(ODR_DIR, `${slug}.json`);
	const sidecar = readJson(sidecarPath);
	const book = readJson(bookPath);
	const chapter = book.data.chapters.find((c) => c.chapter === moves[0].chapter);
	const verses = new Map(chapter.verses.map((v) => [v.verse, v]));

	// Resolve every move against the corpus before touching anything, and read
	// the destinations from the original numbering so a chapter that shifts a
	// run of annotations (John 6) does not walk one over another.
	const pending = [];
	for (const move of moves) {
		const matches = sidecar.data.annotations.filter(
			(a) =>
				a.verse === move.from &&
				(a.title ?? null) === (move.title ?? null) &&
				(move.part === undefined || a.part === move.part)
		);
		if (matches.length === 0) {
			// Already applied. A catchword proves it by turning up at the
			// destination; a continuation block, having none, proves it by the
			// verse it used to claim having gone from the file entirely.
			const settled = move.title
				? sidecar.data.annotations.some((a) => a.verse === move.to && a.title === move.title)
				: !sidecar.data.annotations.some((a) => a.verse === move.from);
			if (settled) {
				const what = move.title ?? 'continuation block';
				console.log(`  ${slug} ${move.chapter}:${move.to}  ${what} (already anchored)`);
				continue;
			}
		}
		if (matches.length !== 1) {
			throw new Error(
				`${slug} ${move.chapter}:${move.from} "${move.title}" matched ${matches.length} annotations`
			);
		}
		const destination = verses.get(move.to);
		if (!destination) throw new Error(`${slug} ${move.chapter}:${move.to} is not a verse`);
		if (
			move.title &&
			!(
				resolveLemma(move.title, destination.text) ??
				resolvePartialLemma(move.title, destination.text)
			)
		) {
			throw new Error(
				`${slug} ${move.chapter}:${move.to} no longer carries "${move.title}"; review before moving`
			);
		}
		pending.push({ annotation: matches[0], move });
	}

	for (const { annotation, move } of pending) {
		annotation.verse = move.to;
		moved++;
		console.log(
			`  ${slug} ${move.chapter}:${move.from} -> ${move.to}  ${move.title ?? 'continuation block'}`
		);
	}

	sidecar.data.annotations.sort((a, b) => a.verse - b.verse);

	// A verse holding more than one annotation needs each part numbered: the
	// panel's scroll target is panel-{verse}-annotation-{part}, and two absent
	// parts render the same id twice.
	const grouped = new Map();
	for (const a of sidecar.data.annotations) {
		if (!grouped.has(a.verse)) grouped.set(a.verse, []);
		grouped.get(a.verse).push(a);
	}
	for (const [, entries] of grouped) {
		// A move can leave a verse holding one annotation that still carries the
		// number it had beside its neighbour. A part 2 with no part 1 anywhere is
		// a number that describes nothing; the corpus writes a lone annotation
		// either without a part or as part 1, and 1 is the smaller change.
		if (entries.length < 2) {
			if (entries[0].part !== undefined && entries[0].part !== 1) {
				setPart(entries[0], 1);
				renumbered++;
			}
			continue;
		}
		entries.forEach((entry, i) => {
			if (entry.part !== i + 1) {
				setPart(entry, i + 1);
				renumbered++;
			}
		});
	}

	// The underline follows the annotation.
	for (const move of moves) {
		for (const verse of [move.from, move.to]) {
			const target = verses.get(verse);
			// A repaired number (1 John 4:118) points at no verse at all
			if (!target) continue;
			const has = grouped.has(verse);
			if (has && !target.has_annotation) {
				setFlag(target);
				flagged++;
			} else if (!has && target.has_annotation) {
				delete target.has_annotation;
				flagged++;
			}
		}
	}

	if (WRITE) {
		writeFileSync(sidecarPath, serialize(sidecar.raw, sidecar.data));
		writeFileSync(bookPath, serialize(book.raw, book.data));
	}
}

let dropped = 0;
for (const duplicate of DUPLICATES) {
	const path = join(
		ODR_DIR,
		duplicate.slug,
		'annotations',
		`${String(duplicate.chapter).padStart(3, '0')}.json`
	);
	if (!existsSync(path)) continue;
	const sidecar = readJson(path);

	const keptPath = join(
		ODR_DIR,
		duplicate.slug,
		'annotations',
		`${String(duplicate.keptIn).padStart(3, '0')}.json`
	);
	const kept = readJson(keptPath);
	if (!kept.data.annotations.some((a) => a.title === duplicate.title)) {
		throw new Error(`${duplicate.slug} ${duplicate.keptIn} does not carry "${duplicate.title}"`);
	}

	const remaining = sidecar.data.annotations.filter((a) => a.title !== duplicate.title);
	if (remaining.length === sidecar.data.annotations.length) continue;
	dropped += sidecar.data.annotations.length - remaining.length;
	console.log(
		`  ${duplicate.slug} ${duplicate.chapter}:${duplicate.verse}  ${duplicate.title} (duplicate of chapter ${duplicate.keptIn})`
	);

	if (!WRITE) continue;
	if (remaining.length > 0) {
		sidecar.data.annotations = remaining;
		writeFileSync(path, serialize(sidecar.raw, sidecar.data));
		continue;
	}
	unlinkSync(path);
	// The sidecar manifest is committed, and prepare-data.ts rebuilds it only on
	// a machine that has the ODR source, so it is kept in step here.
	const manifestPath = join(dirname(ODR_DIR), 'manifests', 'sidecars.json');
	const manifest = readJson(manifestPath);
	manifest.data.annotations[duplicate.slug] = manifest.data.annotations[duplicate.slug].filter(
		(c) => c !== duplicate.chapter
	);
	writeFileSync(manifestPath, serialize(manifest.raw, manifest.data));
}

let repaired = 0;
for (const repair of MARKER_REPAIRS) {
	const path = join(
		ODR_DIR,
		repair.slug,
		'annotations',
		`${String(repair.chapter).padStart(3, '0')}.json`
	);
	const sidecar = readJson(path);
	const parts = sidecar.data.annotations.filter((a) => a.verse === repair.verse);
	const from = parts.find((a) => a.part === repair.from);
	// A repair only applies once. After it has run, and after any rejoin below
	// has renumbered the parts under it, the marker is no longer where it was.
	if (!from || !from.text.trimEnd().endsWith(repair.marker)) continue;
	const to = parts.find((a) => a.part === repair.to);
	if (!to) {
		if (!WRITE) {
			console.log(
				`  ${repair.slug} ${repair.chapter}:${repair.verse}  marker repair pending the move above`
			);
			continue;
		}
		throw new Error(`${repair.slug} ${repair.chapter}:${repair.verse} has no part ${repair.to}`);
	}

	from.text = from.text.trimEnd().slice(0, -repair.marker.length).trimEnd();
	to.text = `${repair.marker} ${to.text}`;

	const stranded = from.notes.find((n) => n.marker === repair.note);
	if (stranded) {
		from.notes = from.notes.filter((n) => n !== stranded);
		to.notes = [stranded, ...to.notes].sort((a, b) =>
			typeof a.marker === 'number' && typeof b.marker === 'number' ? a.marker - b.marker : 0
		);
	}
	repaired++;
	console.log(
		`  ${repair.slug} ${repair.chapter}:${repair.verse}  ${repair.marker} moved from part ${repair.from} to part ${repair.to}`
	);
	if (WRITE) writeFileSync(path, serialize(sidecar.raw, sidecar.data));
}

let rejoined = 0;
for (const rejoin of REJOINS) {
	const path = join(
		ODR_DIR,
		rejoin.slug,
		'annotations',
		`${String(rejoin.chapter).padStart(3, '0')}.json`
	);
	const sidecar = readJson(path);
	const here = sidecar.data.annotations.filter((a) => a.verse === rejoin.verse);
	const outstanding = rejoin.joins.filter(({ startsWith }) =>
		here.some((a) => a.text.startsWith(startsWith))
	);
	if (outstanding.length === 0) continue; // every half already rejoined
	const target = here.find((a) => a.part === rejoin.into);
	if (!target)
		throw new Error(`${rejoin.slug} ${rejoin.chapter}:${rejoin.verse} has no part ${rejoin.into}`);

	let joined = 0;
	for (const { part, restore, startsWith } of outstanding) {
		// Matched on both the part and how the half opens: a part number alone
		// would point at a different record once an earlier join has renumbered
		// what sits below it.
		const tail = sidecar.data.annotations.find(
			(a) => a.verse === rejoin.verse && a.part === part && a.text.startsWith(startsWith)
		);
		if (!tail) continue;
		target.text = `${target.text.trimEnd()} ${restore} ${tail.text.trimStart()}`;
		target.notes = [...(target.notes ?? []), ...(tail.notes ?? [])];
		sidecar.data.annotations = sidecar.data.annotations.filter((a) => a !== tail);
		joined++;
		console.log(
			`  ${rejoin.slug} ${rejoin.chapter}:${rejoin.verse}  part ${part} rejoined, "${restore}" restored`
		);
	}
	if (joined === 0) continue;
	rejoined += joined;

	// The parts below the join have shifted up
	const siblings = sidecar.data.annotations.filter((a) => a.verse === rejoin.verse);
	if (siblings.length === 1) delete siblings[0].part;
	else siblings.forEach((a, i) => setPart(a, i + 1));
	if (WRITE) writeFileSync(path, serialize(sidecar.raw, sidecar.data));
}

let citations = 0;
for (const repair of CITATION_REPAIRS) {
	const path = join(
		ODR_DIR,
		repair.slug,
		'annotations',
		`${String(repair.chapter).padStart(3, '0')}.json`
	);
	const sidecar = readJson(path);
	for (const annotation of sidecar.data.annotations) {
		if (annotation.verse !== repair.verse) continue;
		if (!annotation.text.trimEnd().endsWith(repair.endsWith)) continue;
		annotation.text = `${annotation.text.trimEnd()} ${repair.restore}`;
		citations++;
		console.log(
			`  ${repair.slug} ${repair.chapter}:${repair.verse}  "${repair.endsWith} ${repair.restore}" closed`
		);
		if (WRITE) writeFileSync(path, serialize(sidecar.raw, sidecar.data));
	}
}

let untitled = 0;
for (const entry of UNTITLE) {
	const path = join(
		ODR_DIR,
		entry.slug,
		'annotations',
		`${String(entry.chapter).padStart(3, '0')}.json`
	);
	const sidecar = readJson(path);
	const matches = sidecar.data.annotations.filter(
		(a) => a.verse === entry.verse && a.title === entry.title
	);
	if (matches.length === 0) continue; // already cleared
	if (matches.length > 1)
		throw new Error(`${entry.slug} ${entry.chapter}:${entry.verse} matched ${matches.length}`);
	matches[0].title = null;
	untitled++;
	console.log(`  ${entry.slug} ${entry.chapter}:${entry.verse}  title cleared (quotes nothing)`);
	if (WRITE) writeFileSync(path, serialize(sidecar.raw, sidecar.data));
}

let deleted = 0;
for (const deletion of DELETIONS) {
	const path = join(
		ODR_DIR,
		deletion.slug,
		'annotations',
		`${String(deletion.chapter).padStart(3, '0')}.json`
	);
	const sidecar = readJson(path);
	const doomed = sidecar.data.annotations.filter(
		(a) => a.verse === deletion.verse && a.text.startsWith(deletion.startsWith)
	);
	if (doomed.length === 0) continue; // already deleted
	if (doomed.length > 1)
		throw new Error(
			`${deletion.slug} ${deletion.chapter}:${deletion.verse} matched ${doomed.length}`
		);
	sidecar.data.annotations = sidecar.data.annotations.filter((a) => a !== doomed[0]);
	deleted++;
	console.log(
		`  ${deletion.slug} ${deletion.chapter}:${deletion.verse}  removed (not an annotation)`
	);
	if (!WRITE) continue;
	writeFileSync(path, serialize(sidecar.raw, sidecar.data));

	// The verse never carried has_annotation, so only the book file's flag for a
	// verse that keeps annotations needs to stay as it is; nothing to clear here.
	const book = readJson(join(ODR_DIR, `${deletion.slug}.json`));
	const chapter = book.data.chapters.find((c) => c.chapter === deletion.chapter);
	const verse = chapter.verses.find((v) => v.verse === deletion.verse);
	if (verse?.has_annotation) {
		delete verse.has_annotation;
		writeFileSync(join(ODR_DIR, `${deletion.slug}.json`), serialize(book.raw, book.data));
	}
}

console.log(
	`\n${moved} annotations re-anchored, ${renumbered} parts renumbered, ${flagged} flags corrected, ${dropped} duplicates dropped, ${repaired} markers repaired, ${rejoined} halves rejoined, ${citations} citations closed, ${untitled} titles cleared, ${retitled} titles repaired, ${mended} verses mended, ${deleted} non-annotations removed`
);
console.log(WRITE ? 'Written.' : 'Report only. Pass --write to apply.');
