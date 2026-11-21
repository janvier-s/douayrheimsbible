"""wvv (was apply_wvv.py): w/vv findings from ocrdiff.py for odr-original, word by word.

Each w of the data word is set from the Transkribus reading at the same letter position:
vv (read vv/vy/vu) or w (read w/W). A word where the two OCRs do not show the same number
of vv, or where the letters cannot be lined up, is skipped. Capitals follow the data
(W -> VV). class: w_for_vv or vv_for_w.
"""
import csv
import re
from pathlib import Path

from . import load, snapshot, propose_from
from ..loc import find_text

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


def replace_nth(text, word, occ, new):
    hits = [mt for mt in re.finditer(re.escape(word), text)
            if (mt.start() == 0 or re.match(r'[\s>(]', text[mt.start() - 1]))
            and (mt.end() == len(text) or re.match(r'[\s<]', text[mt.end()]))]
    if occ >= len(hits):
        return None
    mt = hits[occ]
    return text[:mt.start()] + new + text[mt.end():]


def run(store, rows):
    """Applies the rows to the store in memory; returns (done, skipped)."""
    done, skipped = [], []
    # Several rows can hit one text: apply occurrence-indexed edits from the back.
    rows = sorted(rows, key=lambda r: (r['loc'], -int(r['occ'] or 0)))
    for r in rows:
        w = r['data']
        core = re.sub(r'^[(\[]+|[.,;:?!)\]]+$', '', w)
        new_core = respell(core, re.sub(r'[^\wſ]', '', r['tk']))
        if new_core is None or new_core == core or nvv(new_core) != nvv(re.sub(r'[^\wſ]', '', r['ts']).replace('f', 's')):
            skipped.append((r['loc'], w, r['tk'], r['ts'], new_core))
            continue
        cont, k = find_text(store.bj, store.anns, r['loc'])
        out = replace_nth(cont[k], w, int(r['occ'] or 0), w.replace(core, new_core))
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
    run(stores['odr-original'], rows)
    return propose_from(book, before, stores, f'detect wvv {tsv.name}',
                        allow_note=f'w/vv set as the Transkribus reading shows it (ocrdiff {cls}); check on the scan')


def main(argv):
    """rh.py detect …, for the old script name's shim."""
    from . import main as detect
    return detect(argv)
