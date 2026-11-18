"""Applies w/vv findings from ocrdiff.py to odr-original, word by word.

Each w of the data word is set from the Transkribus reading at the same letter
position: vv (read vv/vy/vu) or w (read w/W). A word where the two OCRs do not show
the same number of vv, or where the letters cannot be lined up, is skipped and
listed. Capitals follow the data (W -> VV).

Usage: python3 scripts/wikisource/apply_wvv.py <book> <findings.tsv> <class> [--write]
  class: w_for_vv or vv_for_w. Hold .git/odr-data.lock around --write.
"""
from pathlib import Path
import csv, json, re, sys

sys.path.insert(0, str(Path(__file__).parent))
from jsonfmt import write_like  # noqa: E402

ORIG = Path(__file__).resolve().parents[2] / 'static/data/odr-original'
VV = ('vv', 'vy', 'vu', 'uv', 'yv')


def respell(data, tk):
    """data word with each w/vv set as the OCR word tk shows it, or None."""
    d, t = data, tk.lower().replace('ſ', 's')
    t = re.sub(r'^[ft†*](?=[a-z])', '', t) if len(t) > len(d) + 1 else t
    out, j, i = '', 0, 0
    while i < len(d):
        c = d[i]
        if c in 'vV' and d[i:i + 2].lower() == 'vv' or c in 'wW':
            dlen = 2 if c in 'vV' else 1
            if t[j:j + 2] in VV:
                out += 'VV' if c.isupper() else 'vv'
                j += 2
            elif t[j:j + 1] == 'w':
                out += 'W' if c.isupper() else 'w'
                j += 1
            else:
                return None
            i += dlen
        else:
            out += c
            i += 1
            j += 1
    return out if j == len(t) or abs(j - len(t)) <= 1 else None


def nvv(w):
    return len(re.findall('|'.join(VV), w.lower()))


def find_text(book_json, anns, loc):
    """(container, key) holding the text at loc."""
    m = re.fullmatch(r'arg:(\d+|title)', loc)
    if m:
        it = book_json['intros'][0 if m.group(1) == 'title' else int(m.group(1))]
        return it, 'title' if m.group(1) == 'title' else 'text'
    m = re.fullmatch(r'(\d+):sum(?:/n(.+))?', loc)
    if m:
        ch = book_json['chapters'][int(m.group(1)) - 1]
        if m.group(2):
            return next(n for n in ch['summary_notes'] if str(n.get('marker')) == m.group(2)), 'text'
        return ch, 'summary'
    m = re.fullmatch(r'(\d+):(\d+)a(\d+)(:title|/mn(.+))?', loc)
    if m:
        a = anns[int(m.group(1))]['annotations'][int(m.group(3)) - 1]
        if m.group(4) == ':title':
            return a, 'title'
        if m.group(5):
            return next(n for n in a['notes'] if str(n.get('marker')) == m.group(5)), 'text'
        return a, 'text'
    m = re.fullmatch(r'(\d+):(\d+)(?:/note(.+)|/cr(\d+))?', loc)
    if m:
        v = book_json['chapters'][int(m.group(1)) - 1]['verses'][int(m.group(2)) - 1]
        assert v['verse'] == int(m.group(2))
        if m.group(3):
            return next(n for n in v['notes'] if str(n.get('label')) == m.group(3)), 'text'
        if m.group(4):
            return v['cross_refs'][int(m.group(4)) - 1], 'text'
        return v, 'text'
    raise ValueError(loc)


def replace_nth(text, word, occ, new):
    hits = [mt for mt in re.finditer(re.escape(word), text)
            if (mt.start() == 0 or re.match(r'[\s>(]', text[mt.start() - 1]))
            and (mt.end() == len(text) or re.match(r'[\s<]', text[mt.end()]))]
    if occ >= len(hits):
        return None
    mt = hits[occ]
    return text[:mt.start()] + new + text[mt.end():]


def main(book, tsv, cls, write):
    bj = json.loads((ORIG / f'{book}.json').read_text())
    anns = {}
    for f in sorted((ORIG / book / 'annotations').glob('*.json')):
        a = json.loads(f.read_text()); anns[a['chapter']] = a
    rows = [r for r in csv.DictReader(open(tsv), delimiter='\t', quoting=csv.QUOTE_NONE) if r['cls'] == cls]
    # Several rows can hit one text: apply occurrence-indexed edits from the back.
    done, skipped, touched = [], [], set()
    rows.sort(key=lambda r: (r['loc'], -int(r['occ'] or 0)))
    for r in rows:
        w = r['data']
        core = re.sub(r'^[(\[]+|[.,;:?!)\]]+$', '', w)
        new_core = respell(core, re.sub(r'[^\wſ]', '', r['tk']))
        if new_core is None or new_core == core or nvv(new_core) != nvv(re.sub(r'[^\wſ]', '', r['ts']).replace('f', 's')):
            skipped.append((r['loc'], w, r['tk'], r['ts'], new_core)); continue
        cont, k = find_text(bj, anns, r['loc'])
        out = replace_nth(cont[k], w, int(r['occ'] or 0), w.replace(core, new_core))
        if out is None:
            skipped.append((r['loc'], w, r['tk'], r['ts'], 'not found')); continue
        cont[k] = out
        done.append((r['loc'], w, w.replace(core, new_core)))
        touched.add(int(r['loc'].split(':')[0]) if r['loc'][0].isdigit() else 0)
    for d in done:
        print('  ', *d)
    print(f'{len(done)} applied, {len(skipped)} skipped')
    for s in skipped:
        print('   skip', *s)
    if write:
        write_like(ORIG / f'{book}.json', bj)
        for c in touched:
            if c in anns:
                write_like(ORIG / book / 'annotations' / f'{c:03d}.json', anns[c])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], '--write' in sys.argv)
