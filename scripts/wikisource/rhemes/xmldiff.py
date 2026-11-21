"""Text-only audit: A16049.xml (reference) vs static/data/odr-original/<book>.json. No scans needed.

Per verse: word diff of the text; the margin notes in order (text + the two words before the anchor).
Per chapter: summary text and the annotation text. Writes a TSV and prints a summary.

Usage: xml_json_diff.py <book> [out.tsv]      (book: matthew mark luke john)
"""
from pathlib import Path
import difflib, functools, json, re, sys, unicodedata
import xml.etree.ElementTree as ET

from . import paths, sources

REPO = paths.REPO
BOOKN = {
    'matthew': ('gospel', 'Matthew'),
    'mark': ('gospel', 'Mark'),
    'luke': ('gospel', 'Luke'),
    'john': ('gospel', 'John'),
    'acts': ('book', 'Acts of the Apostles'),
    'romans': ('epistle', 'Romans'),
    '1-corinthians': ('epistle', '1 Corinthians'),
    '2-corinthians': ('epistle', '2 Corinthians'),
    'galatians': ('epistle', 'Galatians'),
    'ephesians': ('epistle', 'Ephesians'),
    'philippians': ('epistle', 'Philippians'),
    'colossians': ('epistle', 'Colossians'),
    '1-thessalonians': ('epistle', '1 Thessalonians'),
    '2-thessalonians': ('epistle', '2 Thessalonians'),
    '1-timothy': ('epistle', '1 Timothy'),
    '2-timothy': ('epistle', '2 Timothy'),
    'titus': ('epistle', 'Titus'),
    'hebrews': ('epistle', 'Hebrews'),
    'james': ('epistle', 'James'),
    '1-peter': ('epistle', '1 Peter'),
    '2-peter': ('epistle', '2 Peter'),
    '1-john': ('epistle', '1 John'),
    '2-john': ('epistle', '2 John'),
    '3-john': ('epistle', '3 John'),
    'jude': ('epistle', 'Jude'),
    'apocalypse': ('book', 'Apocalypse'),
}


def ln(e):
    return e.tag.split('}')[-1]


def clean(s):
    s = unicodedata.normalize('NFD', unicodedata.normalize('NFC', s).lower().replace('ſ', 's'))
    return ''.join(c for c in s if not unicodedata.combining(c))


def words(s):
    return re.findall(r"[a-z0-9æœ]+", clean(re.sub(r'<[^>]+>', ' ', s)))


class Stream:
    """Flattened XML: list of ('w', word, abbr) | ('note', n, [words]) | ('verse', n)."""

    def __init__(self):
        self.ev = []

    def text(self, s, abbr=False):
        for w in words(s):
            self.ev.append(('w', w, abbr))


def flat(e, skip_notes=True):
    """Plain words of an element, notes dropped (or kept), EOL hyphens joined."""
    out = []

    def rec(x):
        if ln(x) == 'note' and skip_notes:
            return
        if ln(x) == 'g':
            ref = x.get('ref', '')
            if ref.endswith('EOLhyphen') or ref.endswith('EOLunhyphen'):
                pass
            elif ref.endswith('cmbAbbrStroke'):
                out.append('\x00')  # the stroke carrier: dropped, flags the word
            else:
                out.append(x.text or '')
        elif ln(x) == 'gap':
            out.append(' ')
        else:
            out.append(x.text or '')
            for c in x:
                rec(c)
        if x is not e or True:
            out.append(x.tail or '') if x is not e else None

    rec(e)
    return ''.join(out)


def walk(e, st, notes_out):
    """Emit events in document order for the verse text of a chapter (annotations excluded)."""
    t = ln(e)
    if t in ('annotations',) or e.get('type') == 'annotations':
        return
    if t == 'div' and e.get('type') == 'annotations':
        return
    if t == 'argument':
        return
    if t == 'note':
        txt = flat(e, skip_notes=False)
        st.ev.append(('note', e.get('n') or '', words(txt)))
        return
    if t == 'label' and e.get('type') == 'milestone':
        num = ''.join(e.itertext()).replace('verse', '').strip()
        st.ev.append(('verse', num))
        return
    if t == 'g':
        ref = e.get('ref', '')
        if ref.endswith('cmbAbbrStroke'):
            st.ev.append(('stroke',))
        elif not ref.endswith('EOLhyphen'):
            pass
    else:
        if e.text:
            _add_text(st, e.text)
    for c in e:
        walk(c, st, notes_out)
        if c.tail:
            _add_text(st, c.tail)


def _add_text(st, s):
    # keep join across stroke / hyphen markers: words split on whitespace only
    st.ev.append(('raw', s))


@functools.lru_cache(maxsize=1)
def xml_root():
    return ET.parse(sources.xml_path()).getroot()


def xml_chapters(book):
    root = xml_root()
    btype, bname = BOOKN[book]
    gos = None
    for d in root.iter():
        if ln(d) == 'div' and d.get('type') == btype and d.get('n') == bname:
            gos = d
            break
    if gos is None:
        raise ValueError(f"Book {book} not found")
    chs = {}
    for ch in gos:
        if ln(ch) == 'div' and ch.get('type') == 'chapter':
            chs[int(ch.get('n'))] = ch
    if not chs:  # one-chapter epistles (2 John, 3 John, Jude): verses sit directly in the book div
        chs[1] = gos
    return chs


def chapter_verses(ch):
    """-> {verse: (words[], flags[], notes[(anchor2, words)])}, text by verse."""
    st = Stream()
    walk(ch, st, None)
    cur = 0
    verses = {}
    buf = ''
    pending_stroke = False

    def flush_words(v, raw):
        return raw

    cur_raw = {}
    cur_notes = {}
    raw_acc = []
    for ev in st.ev:
        if ev[0] == 'verse':
            cur = int(re.sub(r'\D', '', ev[1]) or 0) or cur
            cur_raw.setdefault(cur, [])
            cur_notes.setdefault(cur, [])
        elif ev[0] == 'raw':
            cur_raw.setdefault(cur, []).append(ev[1])
        elif ev[0] == 'stroke':
            cur_raw.setdefault(cur, []).append('\x00')
        elif ev[0] == 'note':
            before = ''.join(cur_raw.get(cur, []))
            anchor = words(before.replace('\x00', ''))[-2:]
            cur_notes.setdefault(cur, []).append((anchor, ev[2], ev[1]))
    for v, parts in cur_raw.items():
        raw = ''.join(parts)
        toks = []
        for tok in re.split(r'\s+', raw):
            if not tok:
                continue
            flag = '\x00' in tok
            for w in words(tok.replace('\x00', '')) if not flag else [''.join(words(tok.replace('\x00', '')))]:
                if w:
                    toks.append((w, flag))
        verses[v] = (toks, cur_notes.get(v, []))
    return verses


def json_verse(v):
    text = v['text']
    toks = []
    notes = []
    crs = v.get('cross_refs', [])
    nts = {str(n['label']): n for n in v.get('notes', [])}
    # words and markers in order
    pos = 0
    plain = []
    for m in re.finditer(r'<(cr|na)>\[(\d+)\]</\1>', text):
        before = words(text[pos:m.start()])
        plain.extend(before)
        if m.group(1) == 'cr':
            i = int(m.group(2)) - 1
            if i < len(crs):
                notes.append((plain[-2:], words(crs[i]['text']), '*'))
        else:
            n = nts.get(m.group(2))
            if n:
                notes.append((plain[-2:], words(n['text']), m.group(2)))
        pos = m.end()
    plain.extend(words(text[pos:]))
    # unmarked notes (variant readings) have no marker in the text
    unmarked = [words(n['text']) for n in v.get('notes', []) if n.get('unmarked')]
    return plain, notes, unmarked


def lev1(a, b):
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) <= 1
    s, l = (a, b) if len(a) < len(b) else (b, a)
    return any(l[:i] + l[i + 1:] == s for i in range(len(l)))


def diff_words(xw, jw):
    """Return list of (kind, xml_words, json_words, context) for real differences."""
    xs = [w for w, _ in xw]
    sm = difflib.SequenceMatcher(None, xs, jw, autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        xp, jp = xw[i1:i2], jw[j1:j2]
        if tag == 'replace' and len(xp) == len(jp) and all((f and lev1(a, b)) or a == b for (a, f), b in zip(xp, jp)):
            continue  # nasal-stroke expansion (co<ē>ming = comming)
        if tag == 'replace' and len(xp) == 1 and len(jp) == 2 and xp[0][1] and xp[0][0] == jp[0] + jp[1]:
            continue
        ctx = ' '.join(xs[max(0, i1 - 3):i1]) + ' | ' + ' '.join(xs[i2:i2 + 2])
        out.append((tag, ' '.join(w for w, _ in xp), ' '.join(jp), ctx))
    return out


def run(book, outp):
    jb = json.loads((REPO / 'static/data/odr-original' / f'{book}.json').read_text())
    xch = xml_chapters(book)
    rows = []
    stats = dict(verses=0, text=0, notes_n=0, notes_text=0, notes_anchor=0)
    for jc in jb['chapters']:
        c = jc['chapter']
        xv = chapter_verses(xch[c])
        for v in jc['verses']:
            n = v['verse']
            stats['verses'] += 1
            if n not in xv:
                rows.append((c, n, 'verse-missing-in-xml', '', '', ''))
                continue
            xtoks, xnotes = xv[n]
            jw, jnotes, junm = json_verse(v)
            for kind, a, b, ctx in diff_words(xtoks, jw):
                rows.append((c, n, 'text-' + kind, a, b, ctx))
                stats['text'] += 1
            xn = [(an, w, k) for an, w, k in xnotes]
            if len(xn) != len(jnotes) + len(junm) and len(xn) != len(jnotes):
                rows.append((c, n, 'notes-count', f'xml {len(xn)}', f'json {len(jnotes)}+{len(junm)} unmarked',
                             ' / '.join(' '.join(w)[:30] for _, w, _ in xn)))
                stats['notes_n'] += 1
                continue
            jm = list(jnotes)
            for (an, w, k) in xn:
                # match by text
                cand = [x for x in jm if x[1] == w or (w and x[1][:4] == w[:4])]
                if not cand:
                    if any(u == w for u in junm):
                        continue
                    rows.append((c, n, 'note-text', ' '.join(w)[:60], ' | '.join(' '.join(x[1])[:40] for x in jm), ''))
                    stats['notes_text'] += 1
                    continue
                x = cand[0]
                jm.remove(x)
                if x[1] != w:
                    rows.append((c, n, 'note-text-diff', ' '.join(w)[:80], ' '.join(x[1])[:80], ''))
                    stats['notes_text'] += 1
                if an != x[0]:
                    rows.append((c, n, 'note-anchor', ' '.join(an), ' '.join(x[0]), ' '.join(w)[:30]))
                    stats['notes_anchor'] += 1
    with open(outp, 'w') as f:
        f.write('chapter\tverse\tkind\txml\tjson\tcontext\n')
        for r in rows:
            f.write('\t'.join(str(x) for x in r) + '\n')
    kinds = {}
    for r in rows:
        kinds[r[2]] = kinds.get(r[2], 0) + 1
    print(book, stats, kinds, '->', outp)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    run(argv[0], argv[1] if len(argv) > 1 else f'/tmp/{argv[0]}_xml_json.tsv')
