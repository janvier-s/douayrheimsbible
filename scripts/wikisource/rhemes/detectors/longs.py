"""longs: long s in odr-original annotation margin notes (annotations/*.json, notes[].text).

The rule, outside HTML tags: a lowercase s followed by a letter becomes ſ, except
before f. A final s stays round; capitals, Greek and Hebrew are untouched.
- NT (1582): ſ also before h, k and b.
- OT (1609) margins: ſ before h too (the margin OCR reads fhould, punifhment,
  fheweth; the 1609 body text is mostly round there), round before k.
KEEP_ROUND lists the forms the scans print otherwise. Notes that already contain ſ
are skipped, so a rerun changes nothing; Matthew 1-20 was done by hand (c7a31e5d).
Abbreviations: the rule leaves an abbreviation's last s round (Chrys.), but the print
sets it long before the period, in both testaments: Pſ., Chryſ., Chriſ., Theſ.,
Epheſ., Ioſ., verſ., Baptiſ., Ambroſ., Dionyſ., Baſ., Geneſ., remiſ., hæreſ.,
Catechiſ., Confeſ., Arauſ., aduerſ. (about 60 read on the scans, none round; Nov 17 2026).
Seſs. and Theſs. are the print's ß ligature (ſs) and stay; Nyſſ. and the 1609
Theſſ. (Judges 9:8) print two long s. Applied by hand after the rule (see git log).
Applied in 0ffb97e0.
"""
import re
from pathlib import Path

from . import load, snapshot, propose_from

LETTER = re.compile(r'[^\W\d_]')

# Forms the scans print with a round s where the rule gives ſ (Tesseract reads ſ as f,
# so a round s in the margin OCR is evidence). Keyed (book, chapter, verse).
KEEP_ROUND = {('job', 1, 1): ['English'], ('psalms', 50, 2): ['punishment'],
              # NT ſs before i: ſſ is the print's majority (19 of 24 in the OCR)
              ('2-corinthians', 2, 6): ['remiſsion'], ('2-corinthians', 2, 10): ['remiſsion'],
              ('colossians', 1, 24): ['paſsions'], ('james', 5, 14): ['Remiſsion']}


def nt_books(repo):
    books = (Path(repo) / 'src/lib/data/books.ts').read_text()
    nt = {m.group(1) for m in re.finditer(r"slug: '([^']+)'[^}]*?testament: 'NT'", books)}
    assert len(nt) == 27, nt
    return nt


def longs(text, nt):
    keep = 'f' if nt else 'fk'
    out = []
    for part in re.split(r'(<[^>]*>)', text):
        if part.startswith('<'):
            out.append(part)
            continue
        chars = list(part)
        for k, c in enumerate(chars[:-1]):
            nx = chars[k + 1]
            if c == 's' and (nx == 'ſ' or (LETTER.match(nx) and nx.isascii()) or nx in 'āēīōūñæœ') \
                    and nx not in keep:
                chars[k] = 'ſ'
        out.append(''.join(chars))
    return ''.join(out)


def run(store, nt):
    """Applies the rule to the store's annotations in memory; returns the number of notes changed."""
    slug, n_changed = store.book, 0
    for ch, a in store.anns.items():
        for an in a['annotations']:
            for n in an.get('notes', []):
                t = n['text']
                if slug == 'matthew' and ch <= 20 or 'ſ' in t:
                    continue
                new = longs(t, nt)
                for w in KEEP_ROUND.get((slug, ch, an['verse']), []):
                    new = new.replace(longs(w.replace('ſ', 's'), nt), w)
                if new != t:
                    n['text'], n_changed = new, n_changed + 1
    return n_changed


def propose(repo, book):
    stores = load(repo, book, ('odr-original',))
    if not stores:
        return []
    before = snapshot(stores)
    run(stores['odr-original'], book in nt_books(repo))
    return propose_from(book, before, stores, 'detect longs')


def main(argv):
    """rh.py detect …, for the old script name's shim."""
    from . import main as detect
    return detect(argv)
