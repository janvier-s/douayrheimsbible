"""Lint generated Wikisource page files. Read-only: fix the generator or the data, regenerate.

usage: lint.py PAGES_DIR [--only CODE,CODE] [--skip CODE,CODE] [--quiet]
Exit status 1 if any error is found (warnings do not fail).

Checks (E = error, W = warning):
  E-ital      italics ('' ... '') unbalanced on a page (counted outside <noinclude>), or 4+ apostrophes in a row.
              Each page is parsed alone, so an italic running over a page break must be
              closed at the end of one page and reopened on the next.
  E-bold      odd number of '''
  E-brace     {{ }} unbalanced
  E-tag       <noinclude>/<pagequality> structure broken; stray <i> <b> <br> <na> <cr> <alt> tags
  E-sentinel  leftover generator sentinels (⟦ ⟧) or unreplaced {{MINNER| {{MOUTER|
  E-margin    {{MarginNote}} lacking margin=left|right, margin-width, or text, or empty
  E-hwe-title hyphen template (hwe/hws) with {{ls}} missing |title= (prevents invalid HTML)
  E-margin-italic MarginNote inside unclosed italics (breaks MediaWiki column layout)
  E-verse     verse numbers out of order, repeated or skipped (across pages, per chapter)
  E-darkmode  table style contains 'background' (triggers MediaWiki night-mode color:#202122) or '!' (th header borders/shading)
  E-nfc       text not in Unicode NFC (MediaWiki saves NFC, so live would never match: Greek oxia vs tonos)
  E-gap       page files missing from the numeric run
  W-header    no {{rh}} running head, or no {{rh}} footer
  W-space     double space, space before , . ; : ? ! ), space after (, trailing space
  W-mark      stray † after {{verse}}
  W-quote     straight or curly double quotes in the body (the print has none)
"""
import re
import sys
import unicodedata
from pathlib import Path

NOINC = re.compile(r'<noinclude>.*?</noinclude>', re.S)
ITAL = re.compile(r"(?<!')''(?!')")
BOLD = re.compile(r"(?<!')'''(?!')")
VERSE = re.compile(r'\{\{verse\|chapter=(\d+)\|verse=(\d+)\}\}')
TAGS = re.compile(r'</?(?:i|b|br|na|cr|alt|em|strong|span|div|p)\b[^>]*>', re.I)
SENT = re.compile(r'[⟦⟧]|\{\{MINNER\||\{\{MOUTER\|')
INNER = re.compile(r'\{\{[^{}]*\}\}')


def braces(t):
    """Problem string or ''. Counts {{ and }} left to right."""
    depth, line, first = 0, 1, 1
    i = 0
    while i < len(t):
        two = t[i:i + 2]
        if two == '{{':
            if depth == 0:
                first = line
            depth += 1
            i += 2
        elif two == '}}':
            depth -= 1
            if depth < 0:
                return f'line {line}: }}}} without a matching {{{{'
            i += 2
        else:
            if t[i] == '\n':
                line += 1
            i += 1
    return f'{depth} unclosed {{{{ (outermost opened on line {first})' if depth else ''


def margin_notes(t):
    """Yield the text of each {{MarginNote|...}}, nesting respected."""
    for m in re.finditer(r'\{\{MarginNote\|', t):
        depth, j = 1, m.end()
        while j < len(t) and depth:
            if t.startswith('{{', j):
                depth, j = depth + 1, j + 2
            elif t.startswith('}}', j):
                depth, j = depth - 1, j + 2
            else:
                j += 1
        yield t[m.start() + 2:j - 2]


def near(s, a, b, w=22):
    return repr(s[max(0, a - w):b + w])


def lint(d):
    """List of (code, page, message)."""
    out = []
    files = sorted(Path(d).glob('*.wiki'), key=lambda f: int(f.stem))
    nums = [int(f.stem) for f in files]
    for a, b in zip(nums, nums[1:]):
        if b != a + 1:
            out.append(('E-gap', a, f'pages {a + 1}-{b - 1} missing from the run'))
    last_ch = last_v = None
    for f in files:
        n = int(f.stem)
        t = f.read_text()
        body = NOINC.sub('', t)
        if unicodedata.normalize('NFC', t) != t:
            out.append(('E-nfc', n, 'text is not NFC-normalised'))

        # page structure
        if not t.startswith('<noinclude><pagequality '):
            out.append(('E-tag', n, 'does not start with <noinclude><pagequality …>'))
        if t.count('<noinclude>') != 2 or t.count('</noinclude>') != 2:
            out.append(('E-tag', n, f'expected 2 <noinclude> blocks, found {t.count("<noinclude>")} open / {t.count("</noinclude>")} close'))
        if not t.rstrip().endswith('</noinclude>'):
            out.append(('E-tag', n, 'does not end with </noinclude>'))
        for m in TAGS.finditer(body):
            out.append(('E-tag', n, f'stray tag {m.group(0)!r}'))
        heads = len(re.findall(r'\{\{(?:rh|continues)\|', t))
        if heads == 0:
            out.append(('W-header', n, 'no {{rh}} running head'))
        elif heads == 1:
            out.append(('W-header', n, 'no {{rh}} footer (signature / catchword)'))

        # italics and bold
        ni = len(ITAL.findall(body))
        if ni % 2:
            out.append(('E-ital', n, f'unbalanced italics ({ni} markers): close at the page end, reopen on the next'))
        for blk in re.findall(r'<noinclude>(.*?)</noinclude>', t, re.S):
            if len(ITAL.findall(blk)) % 2:
                out.append(('E-ital', n, f'unbalanced italics in running head/footer: {blk[-60:]!r}'))
        nb = len(BOLD.findall(body))
        if nb % 2:
            out.append(('E-bold', n, f"odd number of ''' ({nb})"))
        for m in re.finditer(r"'{4,}", body):
            out.append(('E-ital', n, f'{len(m.group(0))} apostrophes in a row near …{near(body, m.start(), m.end())}'))

        # templates
        p = braces(t)
        if p:
            out.append(('E-brace', n, p))
        for m in SENT.finditer(t):
            out.append(('E-sentinel', n, f'leftover {m.group(0)!r} near …{near(t, m.start(), m.end())}'))
        for tpl in margin_notes(body):
            if not (re.search(r'\|margin=(left|right)\b', tpl) and re.search(r'\|margin-width=\d+\b', tpl) and '|text=' in tpl):
                out.append(('E-margin', n, f'malformed margin note: {tpl[:70]!r}'))
            elif not INNER.sub('', tpl.split('|text=', 1)[1]).strip():
                out.append(('E-margin', n, 'empty margin note'))

        # hws/hwe title parameter check (required when param 2 has {{ls}} to avoid malformed HTML in Page: space)
        for m in re.finditer(r'\{\{(?:hwe|hws)\|', body):
            depth, j = 1, m.end()
            while j < len(body) and depth:
                if body.startswith('{{', j):
                    depth, j = depth + 1, j + 2
                elif body.startswith('}}', j):
                    depth, j = depth - 1, j + 2
                else:
                    j += 1
            tpl = body[m.start():j]
            if '{{ls}}' in tpl and '|title=' not in tpl:
                out.append(('E-hwe-title', n, f'hyphen template requires |title= to prevent invalid HTML: {tpl[:50]}'))

        # margin note inside unclosed italics check (MediaWiki parser issue: italics cannot extend over floated span)
        for para in body.split('\n\n'):
            pos = 0
            in_ital = False
            while pos < len(para):
                if para.startswith('{{', pos):
                    depth, j = 1, pos + 2
                    while j < len(para) and depth:
                        if para.startswith('{{', j):
                            depth, j = depth + 1, j + 2
                        elif para.startswith('}}', j):
                            depth, j = depth - 1, j + 2
                        else:
                            j += 1
                    tmpl = para[pos:j]
                    pos = j
                    if tmpl.startswith('{{MarginNote') and in_ital:
                        out.append(('E-margin-italic', n, f'MarginNote inside unclosed italics near …{near(para, pos - len(tmpl), pos)}'))
                elif para.startswith("'''''", pos):
                    in_ital = not in_ital
                    pos += 5
                elif para.startswith("'''", pos):
                    pos += 3
                elif para.startswith("''", pos):
                    in_ital = not in_ital
                    pos += 2
                else:
                    pos += 1

        # dark mode / table checks
        for tbl in re.finditer(r'\{[|].*?\|\}', body, re.S):
            tbl_text = tbl.group(0)
            for m in re.finditer(r'style=[\'"][^\'"]*\bbackground\b', tbl_text, re.I):
                out.append(('E-darkmode', n, "table style contains 'background' which triggers MediaWiki night-mode color:#202122; omit background entirely"))
            for m in re.finditer(r'^\s*!(?:[^\n]*\||[^\n]+)', tbl_text, re.M):
                out.append(('E-darkmode', n, "table header '!' (th) creates default browser/skin borders and shading; use standard '|' (td) with bold text instead"))

        # verse sequence and marks
        for m in VERSE.finditer(body):
            ch, v = int(m.group(1)), int(m.group(2))
            if ch != last_ch:
                if v != 1:
                    out.append(('E-verse', n, f'chapter {ch} starts at verse {v}'))
            elif v != last_v + 1:
                out.append(('E-verse', n, f'{ch}:{v} follows {ch}:{last_v}'))
            last_ch, last_v = ch, v
            after = body[m.end():m.end() + 3]
            if '†' in after:
                out.append(('W-mark', n, f'{ch}:{v} has stray † after the verse number'))

        # spacing and quotes
        for lineno, line in enumerate(body.split('\n'), 1):
            if line != line.rstrip():
                out.append(('W-space', n, f'trailing space on body line {lineno}'))
            plain = line
            while INNER.search(plain):
                plain = INNER.sub('X', plain)
            for m in re.finditer(r'\S  +\S|\s[,.;:?!)]|\(\s', plain):
                out.append(('W-space', n, f'{m.group(0)!r} near …{near(plain, m.start(), m.end())}'))
        for m in re.finditer(r'\s\{\{MarginNote\|(?:[^{}]|\{\{[^{}]*\}\})*\}\}[,.;:?!)]', body):
            out.append(('W-space', n, f'space before a margin note that precedes punctuation near …{near(body, m.start(), m.start() + 1)}'))
        flat = body
        while INNER.search(flat):
            flat = INNER.sub('', flat)
        for m in re.finditer(r'["“”]', flat):
            out.append(('W-quote', n, f'quote mark near …{near(flat, m.start(), m.end())}'))
    return out


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('-'):
        sys.exit(__doc__)
    opt = {a: args[i + 1] for i, a in enumerate(args) if a in ('--only', '--skip') and i + 1 < len(args)}
    only = set(opt.get('--only', '').split(',')) - {''}
    skip = set(opt.get('--skip', '').split(',')) - {''}
    res = [r for r in lint(args[0]) if (not only or r[0] in only) and r[0] not in skip]
    if '--quiet' not in args:
        for code, n, msg in res:
            print(f'{n}: {code} {msg}')
    errs = [r for r in res if r[0].startswith('E')]
    counts = {}
    for code, _, _ in res:
        counts[code] = counts.get(code, 0) + 1
    summary = ', '.join(f'{k} {v}' for k, v in sorted(counts.items()))
    print(f'{len(errs)} error(s), {len(res) - len(errs)} warning(s)' + (f' — {summary}' if summary else ''))
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
