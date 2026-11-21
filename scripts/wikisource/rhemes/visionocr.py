"""Apple Vision OCR beside each page image: <page>.vision.tsv in Tesseract's TSV layout.

ocrdiff uses it as the second OCR next to Transkribus (third_voter): on the agy answer key
it reads 89 of 238 words exactly against Tesseract's 74 (w/vv 83 against 72). Like
Tesseract it prints ſ as f. ocr-split runs it on the pages it cuts.

Usage: python3 -I scripts/wikisource/rh.py ocr-vision [--force] PATH...
PATH is a page image or a folder (searched recursively for *.jpg). Without --force,
pages that already have a .vision.tsv are skipped. macOS only (Vision, swiftc).
"""
import hashlib
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).with_name('vision_ocr.swift')
CACHE = Path.home() / '.cache/rhemes'
SUFFIX = '.vision.tsv'


def pending(paths, force=False):
    """The page images under paths that need a .vision.tsv, sorted."""
    imgs = []
    for p in map(Path, paths):
        imgs += [p] if p.is_file() else sorted(p.rglob('*.jpg'))
    return sorted(i for i in imgs if force or not i.with_suffix(SUFFIX).exists())


def binary():
    """The compiled vision_ocr, rebuilt when the Swift source changes."""
    exe = CACHE / f'vision_ocr-{hashlib.sha1(SRC.read_bytes()).hexdigest()[:12]}'
    if not exe.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        subprocess.run(['swiftc', '-O', '-o', str(exe), str(SRC)], check=True, capture_output=True)
    return exe


def run(imgs, batch=50):
    """OCR the images; returns how many .vision.tsv files were written."""
    exe, n = binary(), 0
    for i in range(0, len(imgs), batch):
        out = subprocess.run([str(exe), SUFFIX, *map(str, imgs[i:i + batch])],
                             check=True, capture_output=True, text=True).stdout
        n += len(out.splitlines())
    return n


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    force = '--force' in argv
    paths = [a for a in argv if a != '--force']
    if not paths:
        print(__doc__)
        return 2
    imgs = pending(paths, force)
    n = run(imgs) if imgs else 0
    print(f'{n} of {len(imgs)} pages read by Vision ({SUFFIX})')
    return 0 if n == len(imgs) else 1
