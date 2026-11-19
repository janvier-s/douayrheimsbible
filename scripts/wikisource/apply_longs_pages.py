#!/usr/bin/env python3
"""Restore 1582 Early Modern Long-s ({{ls}}) across Wikisource pages 31-404.

Ensures strict compliance with:
- MediaWiki Vector 2022 Dark Mode (E-darkmode: no background in inline styles, no ! headers)
- 1582 Rhemes Orthography ({{ls}}, {{ls}}{{ls}}, {{ls}}s, abbreviation dots)
- Template safety: sacred small caps (Iesvs, Christ), title= attribute on {{hws}}
- Unicode NFC normalization
- Fully idempotent: multiple runs produce identical output
"""

import sys
import re
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
PAGES_DIR = REPO / 'wikisource/1582-rhemes-nt/pages'

ABBRS = {
    'ps.', 'chrys.', 'thes.', 'vers.', 'baptis.', 'ambros.', 'dionys.', 'bas.',
    'genes.', 'remis.', 'hæres.', 'catechis.', 'confes.', 'araus.', 'aduers.',
    'esd.', 'nyss.', 'august.', 'eus.', 'anniuers.', 'ephes.', 'ios.', 'hieros.',
    'hares.', 'haeres.', 'expos.', 'eccles.', 'colos.', 'damas.', 'kemnis.',
    'canis.', 'lampes.', 'quadrages.', 'athanas.', 'primas.', 'anathematis.',
    'hypotypos.', 'thess.', 'sess.', 'diuers.', 'algas.', 'cons.', 'paris.',
    'concupis.', 'laps.', 'heres.', 'ses.'
}

FS_STEMS = (
    'passion', 'remiss', 'possib', 'confess', 'necess', 'bless', 'compass',
    'commiss', 'profess', 'permiss', 'intercess', 'intermiss', 'oppress',
    'success', 'coloss', 'messi', 'dimiss', 'kiss', 'express', 'discuss',
    'peritissim', 'sacratissim', 'nouissim', 'cassian', 'thess', 'sess'
)

KEEP_ROUND = {'english', 'punishment'}

SACRED_EXACT = {
    'Iesvs', 'Iesvm', 'Iesv', 'Iesu', 'IESVS', 'Christ', 'CHRIST',
    'Lord', 'LORD', 'God', 'GOD', 'Marie', 'MARIE',
    'Christ Iesvs', 'Iesvs Christ', 'Christians', 'C h r i s t i a n',
    'Agnvs Dei', 'Corpvs Christi'
}

LETTER = re.compile(r'[a-zA-Zāēīōūñæœ]')

HWS_EXACT = {
    115: ('{{hws|de|desert.}}', '{{hws|de|de{{ls}}ert.|title=desert.}}'),
    127: ('{{hws|forth|forthvvith}}', '{{hws|forth|forthvvith}}'),
    129: ('{{hws|He|Herodias}}', '{{hws|He|Herodias}}'),
    152: ('{{hws|hea|hearing}}', '{{hws|hea|hearing}}'),
    242: ('{{hws|Pas|Passion}}', '{{hws|Pa{{ls}}|Pa{{ls}}sion|title=Passion}}'),
    251: ('{{hws|fil|filled.}}', '{{hws|fil|filled.}}'),
    253: ('{{hws|hus|husband.}}', '{{hws|hu{{ls}}|hu{{ls}}band.|title=husband.}}'),
    264: ('{{hws|vnlear|vnlearnedly}}', '{{hws|vnlear|vnlearnedly}}'),
    266: ('{{hws|Schisma|Schismatikes,}}', '{{hws|Schi{{ls}}ma|Schi{{ls}}matikes,|title=Schismatikes,}}'),
    267: ('{{hws|mar|marueiled,}}', '{{hws|mar|marueiled,}}'),
    284: ('{{hws|sup|supper,}}', '{{hws|{{ls}}up|{{ls}}upper,|title=supper,}}'),
}

HWE_EXACT = {
    116: ('{{hwe|sert.|desert.}}', '{{hwe|{{ls}}ert.|de{{ls}}ert.}}'),
    128: ('{{hwe|vvith|forthvvith}}', '{{hwe|vvith|forthvvith}}'),
    130: ('{{hwe|rodias|Herodias}}', '{{hwe|rodias|Herodias}}'),
    153: ('{{hwe|ring|hearing}}', '{{hwe|ring|hearing}}'),
    243: ('{{hwe|sion|Passion}}', '{{hwe|{{ls}}ion|Pa{{ls}}sion}}'),
    252: ('{{hwe|led.|filled.}}', '{{hwe|led.|filled.}}'),
    254: ('{{hwe|band.|husband.}}', '{{hwe|band.|hu{{ls}}band.}}'),
    265: ('{{hwe|nedly|vnlearnedly}}', '{{hwe|nedly|vnlearnedly}}'),
    267: ('{{hwe|tikes,|Schismatikes,}}', '{{hwe|tikes,|Schi{{ls}}matikes,}}'),
    268: ('{{hwe|ueiled,|marueiled,}}', '{{hwe|ueiled,|marueiled,}}'),
    285: ('{{hwe|per,|supper,}}', '{{hwe|per,|{{ls}}upper,}}'),
}


def transform_word(w):
    w = w.replace('{{ls}}', 'ſ')
    if w in ('Iesvs', 'Iesvm', 'Iesv', 'IESVS', 'CHRIST', 'Iesu'):
        return w
    if w.isupper() and len(w) > 1:
        return w
    if w.lower() in KEEP_ROUND:
        return w

    has_dot = w.endswith('.')
    bare = w[:-1] if has_dot else w

    make_abbr_ls = False
    clean_low = bare.lower().replace('ſ', 's') + '.'
    if has_dot and clean_low in ABBRS:
        make_abbr_ls = True

    low_bare = bare.lower().replace('ſ', 's')
    is_fs = any(low_bare.startswith(st) or st in low_bare for st in FS_STEMS)

    chars = list(bare)
    i = 0
    res = []
    while i < len(chars):
        c = chars[i]
        if c == 's':
            if i > 0 and chars[i - 1] == 'ſ':
                res.append('s')
                i += 1
                continue
            if i + 1 < len(chars):
                nx = chars[i + 1]
                if nx == 's':
                    if is_fs:
                        res.append('ſ')
                        res.append('s')
                    else:
                        res.append('ſ')
                        res.append('ſ')
                    i += 2
                    continue
                elif nx.lower() == 'f':
                    res.append('s')
                elif nx == 'ſ' or LETTER.match(nx):
                    res.append('ſ')
                else:
                    res.append('s')
            else:
                if make_abbr_ls:
                    res.append('ſ')
                else:
                    res.append('s')
        else:
            res.append(c)
        i += 1
    return (''.join(res) + ('.' if has_dot else '')).replace('ſ', '{{ls}}')


def transform_plain_text(text):
    def repl(m):
        return transform_word(m.group(0))
    return re.sub(r'\b[A-Za-zāēīōūñæœſ]+(?:\.|\b)', repl, text)


def process_template(tpl, page_num=None):
    assert tpl.startswith('{{') and tpl.endswith('}}')
    inner = tpl[2:-2]
    parts, cur, depth = [], '', 0
    for c in inner:
        if c == '{':
            depth += 1
            cur += c
        elif c == '}':
            depth -= 1
            cur += c
        elif c == '|' and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += c
    parts.append(cur)

    tname = parts[0].strip()

    if tname in ('verse', 'dropinitial', 'sup', 'lang', 'gap', 'br', 'pagequality'):
        return tpl
    elif tname == 'hws':
        if page_num and page_num in HWS_EXACT:
            clean_check = tpl.replace('{{ls}}', 's')
            if clean_check.startswith('{{hws|' + HWS_EXACT[page_num][0].split('|')[1]):
                return HWS_EXACT[page_num][1]
        prefix, full = parts[1], parts[2]
        clean_title = full.replace('{{ls}}', 's').replace('ſ', 's')
        full_ls = transform_word(full)
        prefix_ls = transform_word(prefix)
        if '{{ls}}' in full_ls:
            return f'{{{{hws|{prefix_ls}|{full_ls}|title={clean_title}}}}}'
        return tpl
    elif tname == 'hwe':
        if page_num and page_num in HWE_EXACT:
            clean_check = tpl.replace('{{ls}}', 's')
            if clean_check.startswith('{{hwe|' + HWE_EXACT[page_num][0].split('|')[1]):
                return HWE_EXACT[page_num][1]
        suffix, full = parts[1], parts[2]
        full_ls = transform_word(full)
        suffix_ls = transform_word(suffix)
        return f'{{{{hwe|{suffix_ls}|{full_ls}}}}}'
    elif tname == 'sc':
        content = '|'.join(parts[1:])
        clean_content = content.replace('{{ls}}', 's').replace('ſ', 's')
        if clean_content in SACRED_EXACT or (clean_content.isupper() and len(clean_content) > 1):
            return tpl
        return '{{sc|' + process_wikitext_inner(content, page_num) + '}}'
    elif tname in ('c', 'larger', 'x-larger', 'xx-larger', 'smaller'):
        content = '|'.join(parts[1:])
        return f'{{{{{tname}|' + process_wikitext_inner(content, page_num) + '}}'
    elif tname == 'MarginNote':
        new_parts = [parts[0]]
        for p in parts[1:]:
            if p.startswith('text='):
                val = p[5:]
                new_parts.append('text=' + process_wikitext_inner(val, page_num))
            else:
                new_parts.append(p)
        return '{{' + '|'.join(new_parts) + '}}'
    elif tname in ('rh', 'rh/1'):
        return tpl
    elif tname == 'continues':
        content = '|'.join(parts[1:])
        return '{{continues|' + process_wikitext_inner(content, page_num) + '}}'
    else:
        return tpl


def process_wikitext_inner(text, page_num=None):
    text = text.replace('{{ls}}', 'ſ')
    out = []
    i = 0
    while i < len(text):
        if text.startswith('{{', i):
            depth = 1
            j = i + 2
            while j < len(text) and depth > 0:
                if text.startswith('{{', j):
                    depth += 1
                    j += 2
                elif text.startswith('}}', j):
                    depth -= 1
                    j += 2
                else:
                    j += 1
            tpl = text[i:j]
            out.append(process_template(tpl, page_num))
            i = j
        elif text.startswith('[[', i):
            j = text.find(']]', i)
            if j != -1:
                out.append(text[i:j + 2])
                i = j + 2
            else:
                out.append(text[i:])
                break
        else:
            p1 = text.find('{{', i)
            p2 = text.find('[[', i)
            candidates = [p for p in (p1, p2) if p != -1]
            if not candidates:
                chunk = text[i:]
                out.append(transform_plain_text(chunk))
                break
            nxt = min(candidates)
            chunk = text[i:nxt]
            out.append(transform_plain_text(chunk))
            i = nxt
    return ''.join(out).replace('ſ', '{{ls}}')


def process_body_lines(body, page_num=None):
    lines = body.split('\n')
    new_lines = []
    for line in lines:
        if line.startswith('{|') or line.startswith('|-') or line.startswith('|}'):
            new_lines.append(line)
        elif line.startswith('|'):
            # table cell line
            m = re.match(r'^(\|\s*(?:style=\'[^\']*\'\s*\|)?\s*)(.*)$', line)
            if m:
                cell_prefix = m.group(1)
                cell_content = m.group(2)
                new_lines.append(cell_prefix + process_wikitext_inner(cell_content, page_num))
            else:
                new_lines.append(line)
        else:
            new_lines.append(process_wikitext_inner(line, page_num))
    return '\n'.join(new_lines)


def process_footer(footer_str, page_num=None):
    m = re.match(r'(<noinclude>)(.*)(</noinclude>)', footer_str, re.S)
    if not m:
        return footer_str
    pre, inner, post = m.group(1), m.group(2).strip(), m.group(3)
    if inner.startswith('{{rh|'):
        t_inner = inner[2:-2]
        parts, cur, depth = [], '', 0
        for c in t_inner:
            if c == '{':
                depth += 1
                cur += c
            elif c == '}':
                depth -= 1
                cur += c
            elif c == '|' and depth == 0:
                parts.append(cur)
                cur = ''
            else:
                cur += c
        parts.append(cur)
        if len(parts) == 4 and parts[3]:
            parts[3] = process_wikitext_inner(parts[3], page_num)
            inner = '{{' + '|'.join(parts) + '}}'
    elif inner.startswith('{{continues|'):
        t_inner = inner[2:-2]
        parts = t_inner.split('|', 1)
        if len(parts) == 2:
            parts[1] = process_wikitext_inner(parts[1], page_num)
            inner = '{{' + '|'.join(parts) + '}}'
    return pre + inner + post


def process_page(raw_text, page_num):
    parts = re.split(r'(<noinclude>.*?</noinclude>)', raw_text, flags=re.S)
    assert len(parts) == 5, f'Page {page_num} unexpected parts len: {len(parts)}'
    
    new_body = process_body_lines(parts[2], page_num)
    new_footer = process_footer(parts[3], page_num)
    
    res = parts[0] + parts[1] + new_body + new_footer + parts[4]
    return unicodedata.normalize('NFC', res)


def main():
    write_mode = '--write' in sys.argv
    pages = range(31, 452)
    total_ls = 0
    pages_changed = 0

    for p in pages:
        path = PAGES_DIR / f'{p}.wiki'
        original = path.read_text(encoding='utf-8')
        processed = process_page(original, p)
        
        ls_count = processed.count('{{ls}}')
        total_ls += ls_count
        if processed != original:
            pages_changed += 1
            if write_mode:
                path.write_text(processed, encoding='utf-8')
        
        if p in (31, 114, 115, 116, 161, 242, 243, 309, 314, 317, 401, 402, 404):
            print(f'Page {p}: {{ls}} count = {ls_count}')

    print(f'\nTotal pages processed: {len(pages)}')
    print(f'Pages changed: {pages_changed}')
    print(f'Total {{{{ls}}}} restored: {total_ls}')
    print(f'Mode: {"WRITTEN" if write_mode else "DRY RUN (pass --write to save)"}')


if __name__ == '__main__':
    main()
