"""wvv (was apply_wvv.py): w/vv findings from ocrdiff.py for odr-original, word by word.

Each w of the data word is set from the Transkribus reading at the same letter position:
vv (read vv/vy/vu) or w (read w/W). A word where the two OCRs do not show the same number
of vv, or where the letters cannot be lined up, is skipped. Capitals follow the data
(W -> VV). class: w_for_vv or vv_for_w.

A row whose ctx brackets the word ("… [word] …") is placed by that context (words compared
folded, so neighbours respelled since the audit still match); a row whose context no longer
shows the data word there is skipped, so a rerun on fixed data proposes nothing. occ (the
n-th occurrence in the audit-time text) only places rows without a bracketed context.

The XML votes on verse text: a respelling the XML verse contradicts (it has the data's form and
not the new one) is held back and printed for a scan check. Summaries and annotations are not in
the XML stream, so there the two OCRs decide alone.
"""
import csv
import re
import sys
from pathlib import Path

from . import load, snapshot, propose_from
from ..loc import find_text
from ..text import fold_word

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


def _hits(text, word):
    return [mt for mt in re.finditer(re.escape(word), text)
            if (mt.start() == 0 or re.match(r'[\s>(]', text[mt.start() - 1]))
            and (mt.end() == len(text) or re.match(r'[\s<]', text[mt.end()]))]


def replace_nth(text, word, occ, new):
    hits = _hits(text, word)
    if occ >= len(hits):
        return None
    mt = hits[occ]
    return text[:mt.start()] + new + text[mt.end():]


def _folded(s):
    return [f for f in (fold_word(w) for w in re.sub(r'<[^>]+>', ' ', s).split()) if f]


def replace_at(text, word, ctx, new):
    """Replaces the one occurrence of word whose neighbours match ctx ("… [word] …"), or None.
    Near a string's start or end only the neighbours present there are compared."""
    m = re.fullmatch(r'(.*)\[(.*?)\](.*)', ctx)
    fb, fa = _folded(m.group(1))[-2:], _folded(m.group(3))[:2]
    def near(have, want, before):
        # the context runs on across verse and section ends; at the string's edge, fewer words are there to match
        n = min(len(have), len(want))
        return (have[len(have) - n:] == want[len(want) - n:]) if before else have[:n] == want[:n]
    hits = [mt for mt in _hits(text, word)
            if near(_folded(text[:mt.start()]), fb, True) and near(_folded(text[mt.end():]), fa, False)]
    if len(hits) != 1:
        return None
    mt = hits[0]
    return text[:mt.start()] + new + text[mt.end():]


def xml_words(book):
    """xml(loc) -> the set of words in the XML verse at 'ch:v' (lowercase, ſ and w/vv kept), or None."""
    from .. import triage, xmldiff
    if book not in xmldiff.BOOKN:
        return lambda loc: None
    chapters, cache = xmldiff.xml_chapters(book), {}

    def xml(loc):
        m = re.fullmatch(r'(\d+):(\d+)', loc)
        if not m or int(m.group(1)) not in chapters:
            return None
        c, v = int(m.group(1)), int(m.group(2))
        if c not in cache:
            cache[c] = triage.xml_verses(chapters[c])
        got = cache[c].get(v)
        return set(got[0].replace(triage.MAC, '').split()) if got else None
    return xml


def xml_vote(words, old, new):
    """'agree' (XML has the new form), 'against' (it has only the old one) or '' (no say)."""
    if words is None:
        return ''
    k = lambda w: w.lower().replace('ſ', 's')
    have = {k(w) for w in words}
    if k(new) in have:
        return 'agree'
    return 'against' if k(old) in have else ''


def run(store, rows, xml=None):
    """Applies the rows to the store in memory; returns (done, skipped). Rows the XML verse
    contradicts are skipped with the reason 'xml <old form>'."""
    done, skipped = [], []
    # Several rows can hit one text: apply occurrence-indexed edits from the back.
    rows = sorted(rows, key=lambda r: (r['loc'], -int(r.get('occ') or 0)))
    for r in rows:
        w = r['data']
        core = re.sub(r'^[(\[]+|[.,;:?!)\]]+$', '', w)
        new_core = respell(core, re.sub(r'[^\wſ]', '', r['tk']))
        if new_core is None or new_core == core or nvv(new_core) != nvv(re.sub(r'[^\wſ]', '', r['ts']).replace('f', 's')):
            skipped.append((r['loc'], w, r['tk'], r['ts'], new_core))
            continue
        if xml and r.get('sec', 'verse') == 'verse' and xml_vote(xml(r['loc']), core, new_core) == 'against':
            skipped.append((r['loc'], w, r['tk'], r['ts'], f'xml {core}'))
            continue
        cont, k = find_text(store.bj, store.anns, r['loc'])
        ctx = r.get('ctx') or ''
        if re.search(r'\[.*?\]', ctx):
            out = replace_at(cont[k], w, ctx, w.replace(core, new_core))
        else:
            out = replace_nth(cont[k], w, int(r.get('occ') or 0), w.replace(core, new_core))
        if out is None:
            skipped.append((r['loc'], w, r['tk'], r['ts'], 'not found'))
            continue
        cont[k] = out
        done.append((r['loc'], w, w.replace(core, new_core)))
    return done, skipped


def propose(repo, book, tsv, cls):
    tsv = Path(tsv)
    with open(tsv) as f:
        rows = [r for r in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE) if r['cls'] == cls]
    stores = load(repo, book, ('odr-original',))
    before = snapshot(stores)
    done, skipped = run(stores['odr-original'], rows, xml_words(book))
    for sk in skipped:
        print('held back: ' + ' '.join(map(str, sk)), file=sys.stderr)
    return propose_from(book, before, stores, f'detect wvv {tsv.name}',
                        allow_note=f'w/vv set as the Transkribus reading shows it (ocrdiff {cls}); check on the scan')


def main(argv):
    """rh.py detect …, for the old script name's shim."""
    from . import main as detect
    return detect(argv)
