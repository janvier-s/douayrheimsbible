"""OT prep pipeline: Sancta Clara Press scans of the 1609/10 Douay OT -> Vision + Tesseract + Transkribus strips.

Usage (python3 -I scripts/ot/prep.py ...):
  list                  the sets that exist (front, back, and one per book)
  pages <set>           print the ordered page list (id, role, source image)
  run <set>             copy pages to ~/facsimiles/transkribus-ot/pages/<set>/, then Vision, then Tesseract, then strips
  ocr <set>             only the Vision + Tesseract steps (skips pages already read)
  pack <name> <set>...  OCR any unread set, then stack the sets back to back into shared strips
                        ~/facsimiles/transkribus-ot/<name>/<name>-NN.jpg (offsets.json keeps each page's book)
  stack <set>           only the strips: ~/facsimiles/transkribus-ot/<set>/<set>-NN.jpg + offsets.json

A book's pages come from ~/facsimiles/sancta/manifest.json: chapter N lists the pages it touches, and the last
page of chapter N is the first of chapter N+1, so pages are de-duplicated by file hash in chapter order.
front/back come from the Sancta 'doc' pages already fetched to ~/facsimiles/ot-front/.
Strips keep the scan's native pixels: 13 pages of 1603x2208 + gaps = 30000 px tall (Transkribus limit).
Roles: the book slug, or the doc slug for front/back. offsets.json: {strip: [[page id, role, y], ...]}.
"""
import hashlib, json, os, re, shutil, subprocess, sys
from pathlib import Path
from PIL import Image

HOME = Path.home() / 'facsimiles'
SANCTA, FRONT, OUT = HOME / 'sancta', HOME / 'ot-front', HOME / 'transkribus-ot'
RH = Path(__file__).resolve().parents[1] / 'wikisource' / 'rh.py'
H, PER, W, PH = 30000, 13, 1603, 2208
GAP = (H - PER * PH) // (PER - 1) - 1
FRONT_DOCS = ['doc/title-page', 'doc/approbation', 'doc/preface-to-reader', 'doc/ot-to-the-curteous-reader',
              'doc/marks-of-the-reader', 'doc/ot-censura', 'doc/ot-summe-of-the-old-testament',
              'doc/ot-moyses-author', 'arg/genesis']
BACK_DOCS = ['doc/ot-errata', 'doc/ot-table-epistles', 'doc/ot-historical-table', 'doc/ot-index']
NT = {'matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'galatians', 'ephesians', 'philippians', 'colossians',
      'titus', 'philemon', 'hebrews', 'james', 'jude', 'apocalypse', '1-corinthians', '2-corinthians',
      '1-thessalonians', '2-thessalonians', '1-timothy', '2-timothy', '1-peter', '2-peter', '1-john', '2-john',
      '3-john'}


def num(p):
    return [int(x) for x in re.findall(r'\d+', str(p))]


def doc_pages(docs):
    out = []
    for d in docs:
        for f in sorted(FRONT.glob(f'{d}/**/*.jpg'), key=lambda p: num(p.relative_to(FRONT / d))):
            out.append((f"{d.split('/')[-1]}-{'-'.join(map(str, num(f.relative_to(FRONT / d))))}", d.split('/')[-1], f))
    return out


def book_pages(book):
    ch = json.loads((SANCTA / 'manifest.json').read_text())['chapters']
    seen, out = set(), []
    for k in sorted((k for k in ch if k.split('/')[0] == book), key=lambda k: int(k.split('/')[1])):
        for p in ch[k]:
            if '/hires/' in p:
                continue
            f = SANCTA / p
            if not f.exists():                       # listed in the manifest but never scraped: a gap, not a crash
                print(f'WARNING gap: {p} is in the manifest but not on disk; skipped', file=sys.stderr)
                continue
            h = hashlib.md5(f.read_bytes()).hexdigest()
            if h not in seen:
                seen.add(h)
                out.append((f'{book}-{len(out) + 1:03d}', book, f))
    return out


def pages(s):
    if s == 'front':
        return doc_pages(FRONT_DOCS)
    if s == 'back':
        return doc_pages(BACK_DOCS)
    return book_pages(s)


def sets():
    ch = json.loads((SANCTA / 'manifest.json').read_text())['chapters']
    return ['front', 'back'] + sorted({k.split('/')[0] for k in ch} - NT)


def ocr(s):
    d = OUT / 'pages' / s
    d.mkdir(parents=True, exist_ok=True)
    for pid, role, f in pages(s):
        if not (d / f'{pid}.jpg').exists():
            shutil.copy(f, d / f'{pid}.jpg')
    subprocess.run([sys.executable, '-I', str(RH), 'ocr-vision', str(d)], check=True)   # Vision first
    n = 0
    for j in sorted(d.glob('*.jpg')):                                                    # then Tesseract
        t = j.with_name(j.stem + '.tess.tsv')
        if not t.exists():
            subprocess.run(['tesseract', str(j), str(j.with_suffix('')) + '.tess', '-l', 'eng', 'tsv'],
                           check=True, capture_output=True)
            n += 1
    print(f'tesseract: {n} pages read in {d}')


def stack(s):
    stack_pages(s, pages(s))


def pack(name, books):
    """Several sets stacked back to back into shared strips (no part-empty strip per book)."""
    stack_pages(name, [r for b in books for r in pages(b)])


def stack_pages(s, pl):
    d = OUT / s
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob(f'{s}-*.jpg'):                     # a re-stack must not leave strips from a longer earlier run
        old.unlink()
    man = {}
    for k in range(0, len(pl), PER):
        grp = pl[k:k + PER]
        c = Image.new('L', (W, len(grp) * PH + (len(grp) - 1) * GAP), 255)
        y, m = 0, []
        for pid, role, f in grp:
            im = Image.open(f).convert('L')
            if im.size != (W, PH):                       # off-size scans: fit inside, never crop
                r = min(W / im.width, PH / im.height)
                im = im.resize((round(im.width * r), round(im.height * r)))
            c.paste(im, ((W - im.width) // 2, y))
            m.append([pid, role, y])
            y += PH + GAP
        fn = f'{s}-{k // PER + 1:02d}.jpg'
        c.save(d / fn, quality=88)
        man[fn] = m
        print(fn, len(grp), 'pages', c.height, 'px', round((d / fn).stat().st_size / 1e6, 1), 'MB', flush=True)
    (d / 'offsets.json').write_text(json.dumps(man, indent=1))


def main(a):
    if not a:
        print(__doc__)
        return 2
    cmd = a[0]
    if cmd == 'list':
        print(' '.join(sets()))
    elif cmd == 'pages':
        for r in pages(a[1]):
            print(r[0], r[1], r[2])
    elif cmd == 'pack':                                  # pack <name> <set>... : strips shared across books
        for b in a[2:]:
            ocr(b)                                       # no-op for sets already read
        pack(a[1], a[2:])
    elif cmd in ('run', 'ocr', 'stack'):
        if cmd in ('run', 'ocr'):
            ocr(a[1])
        if cmd in ('run', 'stack'):
            stack(a[1])
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
