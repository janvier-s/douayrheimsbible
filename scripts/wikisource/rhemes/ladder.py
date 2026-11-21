"""Evidence ladder for letter-shape and spelling conflicts between the committed pages and
the generator (spec §4.1), and `adopt`, which writes the committed readings into odr-original.

Rungs, cheapest first; the first that settles a conflict wins:
  1. A16049.xml (literal ſ) equals one side and an OCR reading shows the same shape
     (Transkribus prints ſ as f now and then: Paffion / Pafsion).
  2. The XML alone, when it equals the committed page.
  3. Tesseract or Transkribus readings that agree with one side, else the book's majority
     form in the XML (at least 2:1).
  4. Unresolved: a scan crop, only after the owner has seen the count.
"""
import json
import os
import re
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import NamedTuple
import sys

from . import fidelity, text
from .jsonfmt import write_like

XML = Path(os.environ.get('RHEMES_XML', Path.home() / 'Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml'))
BOOK_DIV = {'matthew': 'Matthew', 'mark': 'Mark', 'luke': 'Luke', 'john': 'John',
            'acts': 'Acts of the Apostles', 'romans': 'Romans'}
LADDER_CLASSES = {'ls:ss', 'ls:other', 'macron', 'text'}


class Conflict(NamedTuple):
    page: int
    committed: str  # data form: ſ, no wiki markup
    generated: str
    before: list
    after: list


class Decision(NamedTuple):
    conflict: Conflict
    rung: int  # 1-3 settled, 4 unresolved
    winner: str  # 'committed', 'generated' or ''
    evidence: str


fold = text.fold_word


core = text.core


# ---- page side -----------------------------------------------------------------------

_TEMPLATE = re.compile(r'\{\{([^{}]*)\}\}')
SC_MARK = '\x01'


def _untemplate(m):
    name, _, rest = m.group(1).partition('|')
    if name == 'ls':
        return 'ſ'
    if name == 'sc':  # marked: small caps hold no long-s (owner 2026-11-21), so they are not ladder conflicts
        return ' '.join(SC_MARK + w for w in rest.split(' '))  # inline: no padding, so 'A' + 'Nd' stay one word
    if name == 'lang':
        return rest.split('|')[-1]
    if name in ('larger', 'x-larger', 'xx-larger', 'smaller', 'c', 'continues'):
        return ' ' + rest.split('|')[-1] + ' '
    if name == 'dropinitial':
        return rest.split('|')[0]
    if name == 'hws':
        return ' ' + rest.split('|')[1] + ' '  # the whole word stands at the page end
    if name == 'MarginNote':
        return ' ' + rest.split('text=', 1)[-1] + ' '
    return ' '  # verse, nop, sup, hwe (the whole word was given on the page before), rh


def words(body):
    """The words of a page body in data form (ſ, no templates, no '' or [ ])."""
    s = body
    while _TEMPLATE.search(s):
        s = _TEMPLATE.sub(_untemplate, s)
    s = re.sub(r"'{2,}|\[\[[^\]]*\]\]", ' ', s)
    return s.split()


_PARTS = re.compile(r'^<noinclude>.*?</noinclude>(.*)<noinclude>.*?</noinclude>\n?$', re.S)


def _body(t):
    m = _PARTS.match(t)
    return m.group(1) if m else t


def _cls(c, g):
    from .reconcile import classify
    return classify(text.ls_to_wiki(c), text.ls_to_wiki(g))


def conflicts(committed, generated, page, unaligned=None):
    """One Conflict per differing word pair in the two bodies (classes ls:*, macron, text).
    Differences that are not word-for-word go to `unaligned` as (page, committed, generated)."""
    import difflib
    A, B = words(_body(committed)), words(_body(generated))
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if op == 'equal':
            continue
        if i2 - i1 != j2 - j1:
            if unaligned is not None:
                unaligned.append((page, ' '.join(A[i1:i2]), ' '.join(B[j1:j2])))
            continue
        for k in range(i2 - i1):
            c, g = A[i1 + k], B[j1 + k]
            if SC_MARK in c + g or c == g or c.lower() == g.lower() or _cls(c, g) not in LADDER_CLASSES:
                continue
            ctx = [w.replace(SC_MARK, '') for w in A]
            wordy = lambda ws: [w for w in ws if re.search(r'[\wſ]', w)]  # a bare '.' or ']' locates nothing
            out.append(Conflict(page, c, g, wordy(ctx[max(0, i1 + k - 6):i1 + k])[-3:], wordy(ctx[i1 + k + 1:i1 + k + 7])[:3]))
    return out


# ---- XML side ------------------------------------------------------------------------

def _local(tag):
    return tag.rsplit('}', 1)[-1] if isinstance(tag, str) else ''


def _walk(el, main, notes):
    """Text of el into main, margin-note text into notes; EOL hyphens join the word halves."""
    def add(buf, text):
        if text:
            if buf and buf[-1] == '\x00':  # after an EOL hyphen: no break
                buf[-1] = ''
                text = text.lstrip()
            buf.append(text)
    tag = _local(el.tag)
    if tag == 'note':
        notes.append(' ' + ''.join(el.itertext()) + ' ')
        main.append(' ')
    elif tag == 'g' and 'EOLhyphen' in (el.get('ref') or ''):
        main.append('\x00')
    else:
        add(main, el.text)
        for ch in el:
            _walk(ch, main, notes)
    add(main, el.tail)


def xml_tokens(xml_text, book):
    """(main-text tokens, margin-note tokens) of the book's division in A16049.xml, together
    with the Argument divisions printed right before it."""
    root = ET.fromstring(xml_text)
    name = BOOK_DIV[book]
    parent_of = {c: p for p in root.iter() for c in p}
    div = next(d for d in root.iter() if _local(d.tag) == 'div' and d.get('n') == name)
    sibs = list(parent_of[div])
    i = sibs.index(div)
    j = i
    while j > 0 and _local(sibs[j - 1].tag) == 'div' and sibs[j - 1].get('type') == 'argument':
        j -= 1
    main, notes = [], []
    for el in sibs[j:i + 1]:
        tail, el.tail = el.tail, None
        _walk(el, main, notes)
        el.tail = tail
    nfc = lambda s: unicodedata.normalize('NFC', s)  # EEBO strokes are combining marks; the pages are NFC
    return nfc(''.join(main).replace('\x00', '')).split(), nfc(''.join(notes)).split()


_COMBOS = [(3, 3), (2, 2), (3, 0), (0, 3), (2, 1), (1, 2), (2, 0), (0, 2), (1, 1)]


def _match(stream, before, after):
    fs = [fold(t) for t in stream]
    fb, fa = [fold(w) for w in before], [fold(w) for w in after]
    hits = []
    for i in range(len(before), len(fs) - len(after)):
        if fs[i - len(before):i] == fb and fs[i + 1:i + 1 + len(after)] == fa:
            hits.append(stream[i])
    return hits


def locate_xml(c, tokens):
    """The XML token at the conflict's place, found by folded context: [] when the context
    occurs nowhere or more than once (never guessed)."""
    for kb, ka in _COMBOS:
        before = c.before[-kb:] if kb else []
        after = c.after[:ka]
        if len(before) < kb or len(after) < ka:
            continue
        hits = [h for stream in tokens for h in _match(stream, before, after)]
        if len(hits) == 1:
            return hits
        if len(hits) > 1:
            return []
    return []


# ---- OCR -----------------------------------------------------------------------------

def _same_letter(a, b):
    return fold(a) == fold(b) or a == b


def ocr_reading(tok, c, g, round_s=True):
    """Which side (c or g) an OCR token supports, or None. For a letter-shape conflict the OCR
    must show the shape: f (or ſ) where a side has ſ. Tesseract reads ſ as f, so its s is a
    round s (round_s=True); Transkribus mostly prints plain s for ſ (spec §4.1), so there an
    s shows nothing (round_s=False)."""
    t = core(tok).lower()
    if fold(c) != fold(g):
        hits = [x for x in (c, g) if fold(t) == fold(x)]
        return hits[0] if len(hits) == 1 else None

    def consistent(x):
        xl = core(x).lower()
        if len(xl) != len(t):
            return False
        for a, b in zip(xl, t):
            if a == 'ſ':
                ok = b in ('fſ' if round_s else 'fſs')
            elif a == 's':
                ok = b == 's'
            else:
                ok = _same_letter(a, b)
            if not ok:
                return False
        return True
    hits = [x for x in (c, g) if consistent(x)]
    return hits[0] if len(hits) == 1 else None


def readings(text, c, g, before=(), after=(), round_s=True):
    """The side the OCR text of the conflict's page supports, as a one-item list, or [].
    With context, the OCR token taken is the one that could be this word (its first letters
    fold alike, so a garbled 'kingd6' counts) and whose neighbours best match the context;
    a tie, or fewer than two context hits, gives no reading."""
    toks = [w for w in re.split(r'[\s,;:|]+', text or '') if w]
    if not (before or after):
        got = {r for tok in toks for r in [ocr_reading(tok, c, g, round_s)] if r}
        return sorted(got) if len(got) == 1 else []
    stem = min(fold(c), fold(g), key=len)[:5]
    fb = [fold(w) for w in before if len(fold(w)) >= 2]
    fa = [fold(w) for w in after if len(fold(w)) >= 2]
    ft = [fold(t.replace('f', 's')) for t in toks]
    scored = []
    for i, t in enumerate(toks):
        if len(stem) < 4 or not (fold(t).startswith(stem) or ft[i].startswith(stem)):
            continue
        near_b = {fold(x) for x in toks[max(0, i - 4):i]} | set(ft[max(0, i - 4):i])
        near_a = {fold(x) for x in toks[i + 1:i + 5]} | set(ft[i + 1:i + 5])
        scored.append((sum(w in near_b for w in fb) + sum(w in near_a for w in fa), t))
    scored.sort(reverse=True)
    if not scored or scored[0][0] < 2 or (len(scored) > 1 and scored[1][0] == scored[0][0]):
        return []
    r = ocr_reading(scored[0][1], c, g, round_s)
    return [r] if r else []


# ---- decision ------------------------------------------------------------------------

# apply_longs_pages.py (Gemini, 2026-11-19) wrote ſs into every word holding one of these stems,
# without reading the print. Where the XML reads ſſ at that place, the XML settles it (owner 2026-11-21).
FS_STEMS = ('passion', 'remiss', 'possib', 'confess', 'necess', 'bless', 'compass', 'commiss', 'profess',
            'permiss', 'intercess', 'intermiss', 'oppress', 'success', 'coloss', 'messi', 'dimiss', 'kiss',
            'express', 'discuss', 'peritissim', 'sacratissim', 'nouissim', 'cassian', 'thess', 'sess')


def _stem_rule(c):
    k, g = core(c.committed), core(c.generated)
    return ('ſs' in k and 'ſſ' in g and k.replace('ſ', 's') == g.replace('ſ', 's')
            and any(st in fold(k) for st in FS_STEMS))


def _has_macron(w):
    return any(ch in '\u0304\u0303' for ch in unicodedata.normalize('NFD', w))


def decide(c, xml_forms, ocr_forms, tess_forms, same_book):
    side = {core(c.committed): 'committed', core(c.generated): 'generated'}
    xml = core(xml_forms[0]) if len(xml_forms) == 1 else None
    if xml and fold(c.committed) == fold(c.generated) and fold(xml) != fold(c.generated):
        xml = None  # the context matched but the word there is another one: a mislocation
    if _has_macron(c.committed) != _has_macron(c.generated):
        # EEBO expands contractions: an XML form without the macron is no evidence against it,
        # so a macron conflict is settled by OCR or the scans only
        if xml and not _has_macron(xml):
            xml = None
        same_book = Counter({k: v for k, v in same_book.items() if _has_macron(k)})
    # the print never sets sſ (round s, then long s): an OCR reading with it is a misread and never votes
    ocr = {core(f) for f in ocr_forms if 'sſ' not in f}
    tess_forms = [f for f in tess_forms if 'sſ' not in f]
    if xml in side and xml in ocr:
        return Decision(c, 1, side[xml], f'xml {xml} + transkribus')
    if xml in side and side[xml] == 'committed':
        return Decision(c, 2, 'committed', f'xml {xml}')
    votes = {side[f] for f in {core(x) for x in tess_forms} | ocr if f in side}
    if len(votes) == 1:
        w = votes.pop()
        return Decision(c, 3, w, f'ocr {core(getattr(c, w))}' + (f'; xml {xml}' if xml else ''))
    # the form elsewhere in the book: the XML occurrence at this place does not vote again
    a = same_book.get(core(c.committed), 0) - (xml == core(c.committed))
    b = same_book.get(core(c.generated), 0) - (xml == core(c.generated))
    lone = max(a, b) < 2 and xml in side and side[xml] != ('committed' if a > b else 'generated')
    if max(a, b) and max(a, b) >= 2 * min(a, b) and not lone:  # one occurrence elsewhere never overrules the XML here
        w = 'committed' if a > b else 'generated'
        return Decision(c, 3, w, f'book majority {a}:{b}' + (f'; xml {xml}' if xml else ''))
    if _has_macron(c.committed) != _has_macron(c.generated):  # nothing against the print's contraction
        w = 'committed' if _has_macron(c.committed) else 'generated'
        return Decision(c, 3, w, 'macron kept: an expanded form is no evidence against it')
    if xml == core(c.generated) and _stem_rule(c):  # only where nothing else settles it
        return Decision(c, 3, 'generated', f'xml {xml}; committed ſs from the stem rule (owner 2026-11-21)')
    return Decision(c, 4, '', f'xml {xml or "-"}; book {a}:{b}')


# ---- adopt ---------------------------------------------------------------------------

_SEP = r'(?:\s|<[^>]+>|⟦[^⟧]*⟧|\[\d+\]|[.,;:?!()\]&⊢⊣])+'  # spaces, tags, sentinels, [1] marks, punctuation
_ADOPT_COMBOS = [(3, 3), (3, 2), (2, 3), (2, 2), (3, 0), (0, 3), (1, 1), (2, 0), (0, 2), (1, 0), (0, 1), (0, 0)]


def _leaves(obj, out, path=()):
    """String leaves as (container, key, path), in document order."""
    items = obj.items() if isinstance(obj, dict) else enumerate(obj) if isinstance(obj, list) else ()
    for k, v in items:
        if isinstance(v, str):
            out.append((obj, k, path + (k,)))
        else:
            _leaves(v, out, path + (k,))
    return out


def _verse(path):
    """The path of the verse (or annotation) a leaf belongs to."""
    k = next((j for j, x in enumerate(path) if x in ('verses', 'annotations', 'intros')), None)
    return path[:k + 2] if k is not None else path


def _same_ref(a, b):
    """The same citation: equal, or one is a segment of the other's ' · '-joined list."""
    return a == b or a in b.split(' · ') or b in a.split(' · ')


def _orphan(leaves, path, text):
    """A cross_refs/xrefs copy whose own verse has no partner copy of the same string."""
    k = next((j for j, x in enumerate(path) if x in ('cross_refs', 'xrefs')), None)
    if k is None:
        return False
    other = 'xrefs' if path[k] == 'cross_refs' else 'cross_refs'
    return not any(p2[:k] == path[:k] and len(p2) > k and p2[k] == other and _same_ref(o[key], text) for o, key, p2 in leaves)


def _mirrors(p, q, same_string=False):
    """Two leaves hold the same fact: a verse's cross_refs[i].text and xrefs[i]; with the same
    string also when the xrefs copy sits one verse off (a known shift in the data) and both
    copies are orphans (the caller checks that)."""
    i = 0
    while i < min(len(p), len(q)) and p[i] == q[i]:
        i += 1
    if i >= min(len(p), len(q)):
        return False
    if {p[i], q[i]} == {'cross_refs', 'xrefs'}:
        return True
    return (same_string and isinstance(p[i], int) and isinstance(q[i], int) and abs(p[i] - q[i]) == 1
            and i + 1 < min(len(p), len(q)) and {p[i + 1], q[i + 1]} == {'cross_refs', 'xrefs'})


def _pattern(before, word, after):
    """Words are matched by their cores (the page tidies 'Coloſsians :' to 'Coloſsians:')."""
    ctx = lambda ws: [re.sub('[sſ]', '[sſ]', re.escape(core(w))) for w in ws if core(w)]  # the page may hold ſ the data lacks yet
    parts = ctx(before) + ['(' + re.escape(core(word)) + ')'] + ctx(after)
    return re.compile(r'(?<![\wſ])' + _SEP.join(parts) + r'(?![\wſ])')


def _pair(leaves, a, b):
    """Same string and both orphans: allowed to mirror across one verse."""
    ta, tb = a[0][a[1]], b[0][b[1]]
    return _same_ref(ta, tb) and _orphan(leaves, a[2], ta) and _orphan(leaves, b[2], tb)


def _find(leaves, before, word, after):
    """Matches in the file's strings joined in document order (a verse and its notes read on),
    as (leaf, start, end) of the word itself, which must lie inside one string."""
    pat = _pattern(before, word, after)
    starts, pos = [], 0
    for obj, key, _ in leaves:
        starts.append(pos)
        pos += len(obj[key]) + 1
    joined = '\n'.join(obj[key] for obj, key, _ in leaves)
    out = []
    for m in pat.finditer(joined):
        a, z = m.span(1)
        i = max(k for k, st in enumerate(starts) if st <= a)
        if z <= starts[i] + len(leaves[i][0][leaves[i][1]]) and not any(
                h[0] is leaves[i] or _mirrors(h[0][2], leaves[i][2], _pair(leaves, h[0], leaves[i]))
                for h in out):  # a mirrored copy is the same place
            out.append((leaves[i], a - starts[i], z - starts[i]))
    return out


def _shift_lemmas(obj, key, old, new, z):
    """A verse's lemmas are [start, length, n] offsets into its text: keep them on their words
    when an edit ending at old[z] changes the text's length."""
    delta = len(new) - len(old)
    if key != 'text' or not delta or not isinstance(obj, dict):
        return
    for lm in obj.get('lemmas', []):
        if lm[0] >= z:
            lm[0] += delta
        elif lm[0] + lm[1] >= z:
            lm[1] += delta


def adopt(files, decisions, ov, lock):
    """Writes each committed-wins reading into the data files. The generated form must occur
    exactly once in its context; an edit that loses a print feature needs an override.
    Returns (applied, unlocated): lists of (decision, file) and (decision, reason)."""
    lock = Path(lock)
    lock.mkdir()  # raises if another writer holds it
    try:
        data = {Path(f): json.loads(Path(f).read_text()) for f in files}
        leaves = {f: _leaves(o, []) for f, o in data.items()}
        for f in leaves:  # NFC, as all text must be (the page is); a written file is NFC throughout
            for o, k, _ in leaves[f]:
                s = o[k]
                o[k] = unicodedata.normalize('NFC', s)
                if k == 'text' and len(o[k]) != len(s) and isinstance(o, dict):  # lemmas follow their words
                    for lm in o.get('lemmas', []):
                        e = len(unicodedata.normalize('NFC', s[:lm[0] + lm[1]]))
                        lm[0] = len(unicodedata.normalize('NFC', s[:lm[0]]))
                        lm[1] = e - lm[0]
        applied, unlocated, dirty = [], [], set()
        for d in decisions:
            if d.winner != 'committed':
                continue
            c = d.conflict
            found = None
            for kb, ka in _ADOPT_COMBOS:
                before, after = c.before[-kb:] if kb else [], c.after[:ka]
                if len(before) < kb or len(after) < ka:
                    continue
                done = [1 for f in data for _ in _find(leaves[f], before, c.committed, after)]
                hits = [(f, h) for f in data for h in _find(leaves[f], before, c.generated, after)]
                full = (kb, ka) == (min(3, len(c.before)), min(3, len(c.after)))
                if done and not hits and not full and (kb == 0) != (ka == 0):
                    # one-sided context can run into a neighbouring string; the other side decides
                    ob, oa = (c.before[-ka:], []) if kb == 0 else ([], c.after[:kb])
                    if len(ob) + len(oa) == kb + ka:
                        odone = [1 for f in data for _ in _find(leaves[f], ob, c.committed, oa)]
                        ohits = [(f, h) for f in data for h in _find(leaves[f], ob, c.generated, oa)]
                        if not odone and len(ohits) == 1:
                            found = ohits
                            break
                if done and (not hits or full):
                    found = 'done'  # already applied (with the full context, a generated form is another place)
                    break
                if not done and len(hits) > 1 and len({f for f, _ in hits}) == 1 and len({_verse(h[0][2]) for _, h in hits}) == 1:
                    found = hits  # one verse shows the citation twice (cross_refs and a gloss): both are this place
                    break
                if done or len(hits) > 1:
                    found = 'ambiguous'
                    break
                if len(hits) == 1:
                    found = hits
                    break
            if found == 'done':
                continue
            if found in (None, 'ambiguous'):
                unlocated.append((d, f'{found or "not found"}: {c.generated!r} near {" ".join(c.before)} | {" ".join(c.after)}'))
                continue
            refused = []
            for f, ((obj, key, path), a, z) in found:
                old = obj[key]
                new = unicodedata.normalize('NFC', old[:a] + core(c.committed) + old[z:])
                refused += fidelity.refusals(c.page, old, new, ov)
            if refused:
                unlocated.append((d, 'fidelity: ' + '; '.join(refused)))
                continue
            tail = _pattern([], c.generated, c.after[:2])
            for f, ((obj, key, path), a, z) in sorted(found, key=lambda h: -h[1][1]):  # right to left within a string
                old = obj[key]
                new = unicodedata.normalize('NFC', old[:a] + core(c.committed) + old[z:])
                obj[key] = new
                _shift_lemmas(obj, key, old, new, z)
                for o2, k2, p2 in leaves[f]:  # mirrored copies (cross_refs / xrefs) change with it
                    if p2 != path and _mirrors(p2, path, _same_ref(o2[k2], old) and _orphan(leaves[f], p2, o2[k2])
                                                        and _orphan(leaves[f], path, old)):
                        ms = list(tail.finditer(o2[k2]))
                        if len(ms) == 1:
                            o2[k2] = unicodedata.normalize('NFC', o2[k2][:ms[0].start(1)] + core(c.committed) + o2[k2][ms[0].end(1):])
            dirty.update(fh for fh, _ in found)
            applied.append((d, found[0][0]))
        for f in dirty:
            write_like(f, data[f])
        return applied, unlocated
    finally:
        lock.rmdir()


def book_files(repo, book):
    base = Path(repo) / 'static/data/odr-original'
    return [base / f'{book}.json', *sorted((base / book / 'annotations').glob('*.json'))]


def same_book_counts(tokens):
    return Counter(core(t) for stream in tokens for t in stream)


def apply_readings(decisions, readings):
    """Rung 4 settled from the scans: readings are {page, committed, generated, reading, evidence}.
    The print reading wins; when it is neither side, it replaces the committed form (adopt writes it)."""
    rd = {(r['page'], r['committed'], r['generated']): r for r in readings}
    out = []
    for d in decisions:
        c = d.conflict
        r = rd.get((c.page, c.committed, c.generated))
        if not r:  # the print, read on the scan, settles it whatever the other rungs said
            out.append(d)
            continue
        ev = f"{r['evidence']}: print {r['reading']}"
        if r['reading'] == c.generated:
            out.append(Decision(c, 4, 'generated', ev))
        elif r['reading'] != c.committed and not r.get('replace'):
            out.append(Decision(c, 4, '', f'{ev} (neither side: check the reading, then mark it replace)'))
        else:
            out.append(Decision(c._replace(committed=r['reading']), 4, 'committed', ev))
    return out
