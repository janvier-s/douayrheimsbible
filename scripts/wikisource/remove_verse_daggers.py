"""Remove dagger (†) following {{verse|...}} across all wiki pages safely.

Converts:
  {{verse|chapter=X|verse=Y}}† <Text>
to:
  {{verse|chapter=X|verse=Y}} <Text>

Leaves all other text, long-s ({{ls}}), formatting, margin notes, pagequality,
and non-verse daggers (e.g. p. 25 explanation) completely intact.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2] / 'wikisource/1582-rhemes-nt'
PAGES_DIR = ROOT / 'pages'

def main():
    pages = sorted(PAGES_DIR.glob('*.wiki'), key=lambda p: int(p.stem))
    total_subs = 0
    pages_changed = 0

    for p in pages:
        orig = p.read_text(encoding='utf-8')
        new_text, count = re.subn(r'(\{\{verse\|[^{}]*\}\})\s*†\s*', r'\1 ', orig)
        if count > 0:
            p.write_text(new_text, encoding='utf-8')
            total_subs += count
            pages_changed += 1

    print(f"Successfully processed {len(pages)} pages.")
    print(f"Updated {pages_changed} pages; removed {total_subs} verse daggers.")

if __name__ == '__main__':
    main()
