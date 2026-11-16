"""Contact sheet of scan crops for mark differences, for checking by eye.

python3 -I scripts/wikisource/cropsheet.py <markdiff.json> <out.jpg> <chapters a-b> [filter]

filter: 'star' (ours * / OCR none, the default), 'all'.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

IMG = Path.home() / 'facsimiles/sancta'
diffs = json.loads(Path(sys.argv[1]).read_text())
A, B = map(int, sys.argv[3].split('-'))
mode = sys.argv[4] if len(sys.argv) > 4 else 'star'
rows = []
for d in diffs:
    if not d['ch'] or not (A <= d['ch'] <= B) or not d.get('box'):
        continue
    if mode == 'star' and not (('*' in d['ours']) != ('*' in d['ocr'])):
        continue
    src, (l, t, w, h) = d['box']
    im = Image.open(IMG / (src.rsplit('/', 1)[0]) / 'hires' / (src.rsplit('/', 1)[1] + '.jpg'))
    c = im.crop((max(0, l - 420), max(0, t - 18), min(im.width, l + 520), t + h + 22)).convert('RGB')
    dr = ImageDraw.Draw(c)
    dr.rectangle((min(420, l), 18, min(420, l) + w, 18 + h), outline=(220, 0, 0), width=2)
    label = f"{d['page'] + 31}  {d['ch']}:{d['verse'] or 'ann' + str(d['ann'])}  ours={d['ours'] or '-'} ocr={d['ocr'] or '-'}  {d['token'][-30:]}"
    lab = Image.new('RGB', (c.width, 22), 'white')
    ImageDraw.Draw(lab).text((4, 4), label, fill=(0, 0, 160))
    rows += [lab, c]
W = max(r.width for r in rows); H = sum(r.height for r in rows)
sheet = Image.new('RGB', (W, H), 'white'); y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height
sheet.save(sys.argv[2], quality=85)
print(len(rows) // 2, 'crops', sheet.size)
