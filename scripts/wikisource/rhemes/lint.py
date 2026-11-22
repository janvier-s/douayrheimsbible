"""Lint generated Wikisource page files. Read-only: fix the generator or the data, regenerate.

usage: rh.py lint PAGES_DIR [--only CODE,CODE] [--skip CODE,CODE] [--quiet]
               [--allow-loss FEATURE:SCOPE[,...]] [--allow-shift FEATURE:SCOPE[,...]] --reason TEXT
SCOPE is *, a page n or a range a-b; features are listed in fidelity.py.
Exit status 1 if any error is found (warnings do not fail).

Checks (E = error, W = warning):
  E-ital      italics ('' ... '') unbalanced on a page (counted outside <noinclude>), or 4+ apostrophes in a row.
              Each page is parsed alone, so an italic running over a page break must be
              closed at the end of one page and reopened on the next.
  E-bold      odd number of '''
  E-brace     {{ }} unbalanced
  E-tag       <noinclude>/<pagequality> structure broken; stray <i> <b> <br> <na> <cr> <alt> tags
  E-sentinel  leftover generator sentinels (⟦ ⟧) or unreplaced {{MINNER| {{MOUTER|
  E-margin    {{MarginNote}} lacking margin=left|right, margin-width, or text, or empty;
              {{outside L}}/{{outside R}}/{{outside RL}} empty, or a sidenotes page without {{sidenotes begin}}/{{sidenotes end}}
  E-hw-title  every {{hws}}/{{hwe}} needs a plain-text |title= (no {{…}}, '' or ſ) (Template:Hyphenated word start)
  E-tpl-italic italics open across a {{MarginNote}} or any template with '' inside (breaks the layout)
  E-foot-ital italics unbalanced in the running head or the footer
  E-status    <pagequality> level 3 or more without a named proofreader
  E-verse     verse numbers out of order, repeated or skipped (across pages, per chapter)
  E-darkmode  table style contains 'background' (triggers MediaWiki night-mode color:#202122) or '!' (th header borders/shading)
  E-lemma-split  the annotation mark ‖ splits a word (a lemma offset off by some letters)
  E-nfc       text not in Unicode NFC (MediaWiki saves NFC, so live would never match: Greek oxia vs tonos)
  E-gap       page files missing from the numeric run
  E-loss      a print feature (long s, macron, vv, italics, small caps...) dropped against git HEAD,
              or a modern form (w, j, double quote) appeared; fix the cause, or --allow-loss with --reason
  E-shift     a print feature turned into its modern sibling vs HEAD (ſ→s, vv→w); --allow-shift with --reason
  W-header    no {{rh}} running head
  W-rh-caps   capital words in {{rh}} or {{rh/1}} outside {{sc}} (owner: title in lowercase small caps, side words capitalized)
  W-catchword catchword in a footer {{rh}} cell: it belongs in {{continues|…}}
  W-signature printer's signature mark in the footer (owner: signatures are left out)
  W-nop       the next page opens a paragraph but this page does not end with {{nop}} on its own line
  W-linebreak single line break inside a paragraph
  W-space     double space, space before , . ; : ? ! ), space after (, trailing space
  W-mark      on a sidenotes page, a verse marker without the print's † (a chapter's drop initial has none)
  W-quote     straight or curly double quotes in the body (the print has none)
"""
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

from . import fidelity

NOINC = re.compile(r'<noinclude>.*?</noinclude>', re.S)
ITAL = re.compile(r"(?<!')''(?!')")
BOLD = re.compile(r"(?<!')'''(?!')")
VERSE = re.compile(r'\{\{verse\|chapter=(\d+)\|verse=(\d+)(?:\|align=float)?\}\}|\{\{verseline\|(\d+)\|(\d+)\}\}')
TAGS = re.compile(r'</?(?:i|b|br|na|cr|alt|em|strong|span|div|p)\b[^>]*>', re.I)
SENT = re.compile(r'[⟦⟧]|\{\{MINNER\||\{\{MOUTER\|')
INNER = re.compile(r'\{\{[^{}]*\}\}')


SIGNATURE = re.compile(r'^([A-Z])(?:(?i:\1){1,2})?(?: ij| iij)?$')  # A, Aa, Aaa (+ ij, iij): the gathering letter
BLOCKLINE = re.compile(r'^(?:\{\{c\||\{\||\||\{\{nop\}\}|==|:)')  # centred, table, nop, heading, indented verse
OPENS_PARA = re.compile(r"^(?:\{\{c\||\{\{dropinitial|\{\{verseline\|\d+\|1\}\}\{\{di\||\{\||CHAP\.|''\d+\. )")  # ''12. Word.''] heads an annotation
LEAD_NOTES = re.compile(r'^(?:\s|\{\{(?:MarginNote|outside (?:R?L|R))\|(?:[^{}]|\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\})*\}\})*')


def rh_cells(block):
    """The cells of each {{rh|…}} in a block, split at top-level pipes."""
    out = []
    for m in re.finditer(r'\{\{rh\|', block):
        depth, j, cells, cur = 1, m.end(), [], ''
        while j < len(block) and depth:
            if block.startswith('{{', j):
                depth, cur, j = depth + 1, cur + '{{', j + 2
            elif block.startswith('}}', j):
                depth, j = depth - 1, j + 2
                if depth:
                    cur += '}}'
            elif block[j] == '|' and depth == 1:
                cells.append(cur)
                cur, j = '', j + 1
            else:
                cur, j = cur + block[j], j + 1
        out.append(cells + [cur])
    return out


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
    """Yield the text of each {{MarginNote|...}}, {{outside L|...}}, {{outside R|...}} and {{outside RL|...}}, nesting respected."""
    for m in re.finditer(r'\{\{(?:MarginNote|outside (?:R?L|R))\|', t):
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


def head_texts(d, nums):
    """{n: page text in git HEAD}; pages not in HEAD, or a directory outside git, are left out."""
    pre = subprocess.run(['git', '-C', str(d), 'rev-parse', '--show-prefix'], capture_output=True, text=True)
    if pre.returncode:
        return {}
    req = ''.join(f'HEAD:{pre.stdout.strip()}{n}.wiki\n' for n in nums).encode()
    raw = subprocess.run(['git', '-C', str(d), 'cat-file', '--batch'], input=req, capture_output=True).stdout
    out, i = {}, 0
    for n in nums:
        j = raw.index(b'\n', i)
        head = raw[i:j].split()
        if len(head) == 3 and head[1] == b'blob':
            size = int(head[2])
            out[n] = raw[j + 1:j + 1 + size].decode()
            i = j + 1 + size + 1
        else:
            i = j + 1
    return out


def fidelity_vs_head(d, ov):
    """E-loss / E-shift for each page whose print features dropped against git HEAD."""
    files = {int(f.stem): f for f in Path(d).glob('*.wiki')}
    base = head_texts(d, sorted(files))
    out = []
    for n in sorted(base):
        for msg in fidelity.refusals(n, base[n], files[n].read_text(), ov, with_where=True):
            out.append(('E-shift' if ' shift ' in msg else 'E-loss', n, msg + ' vs HEAD'))
    return out


def lint(d, ov=None):
    """List of (code, page, message). With overrides `ov`, also the fidelity check against git HEAD."""
    out = fidelity_vs_head(d, ov) if ov is not None else []
    files = sorted(Path(d).glob('*.wiki'), key=lambda f: int(f.stem))
    nums = [int(f.stem) for f in files]
    for a, b in zip(nums, nums[1:]):
        if b != a + 1:
            out.append(('E-gap', a, f'pages {a + 1}-{b - 1} missing from the run'))
    last_ch = last_v = None
    bodies = {}
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
        if '{{outside' in body or '{{sidenotes' in t:
            blocks_ = re.findall(r'<noinclude>(.*?)</noinclude>', t, re.S)
            if len(blocks_) != 2 or '{{sidenotes begin}}' not in blocks_[0] or not blocks_[1].rstrip().endswith('{{sidenotes end}}'):
                out.append(('E-margin', n, '{{outside …}} notes need {{sidenotes begin}} in the header and {{sidenotes end}} at the end of the footer'))
        blocks = re.findall(r'<noinclude>(.*?)</noinclude>', t, re.S)
        if not blocks or '{{rh|' not in blocks[0]:
            out.append(('W-header', n, 'no {{rh}} running head'))
        for m in re.finditer(r'\{\{rh\|((?:[^{}]|\{\{[^{}]*\}\})*)\}\}', blocks[0] if blocks else ''):
            bare = re.sub(r'\{\{sc\|[^{}]*\}\}', '', m.group(1))
            if re.search(r'\b[A-Z]{2,}', re.sub(r'\b[IVXLC]+\.', '', bare)):
                out.append(('W-rh-caps', n, f'capitals in the running head: use small caps ({m.group(0)[:50]})'))
        for m in re.finditer(r'\{\{rh/1\|(.*)\}\}', blocks[0] if blocks else ''):  # centred head (front matter)
            bare = re.sub(r'\{\{sc\|[^{}]*\}\}', '', m.group(1))
            if re.search(r'\b[A-Z]{2,}', bare):
                out.append(('W-rh-caps', n, f'capitals in the centred running head: use small caps ({m.group(0)[:50]})'))
        m = re.search(r'<pagequality level="(\d)" user="([^"]*)"', t)
        if m and int(m.group(1)) >= 3 and not m.group(2).strip():
            out.append(('E-status', n, f'pagequality level {m.group(1)} without a named proofreader: use level 1'))
        foot = blocks[-1] if len(blocks) > 1 else ''
        for cells in rh_cells(foot):
            if len(cells) > 2 and cells[2].strip():
                out.append(('W-catchword', n, f'catchword {cells[2]!r} in a footer {{{{rh}}}}: use {{{{continues|…}}}}'))
            sig = [c for k, c in enumerate(cells) if SIGNATURE.match(c.strip()) and (k == 1 or ' ' in c.strip())]
            if sig:  # a bare letter only in the centre cell, where the print sets it; with ij/iij anywhere
                out.append(('W-signature', n, f'signature mark in the footer: {foot[:60]!r}'))

        # italics and bold
        ni = len(ITAL.findall(body))
        if ni % 2:
            out.append(('E-ital', n, f'unbalanced italics ({ni} markers): close at the page end, reopen on the next'))
        for blk in blocks:
            if len(ITAL.findall(blk)) % 2:
                out.append(('E-foot-ital', n, f'unbalanced italics in running head/footer: {blk[-60:]!r}'))
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
            if tpl.startswith('outside'):
                note = re.sub(r'^outside (?:R?L|R)\|(?:1=)?', '', tpl)
                if not INNER.sub('', re.sub(r'\{\{(?:lang\|[^|{}]*|sc)\|([^{}]*)\}\}', r'\1', note)).strip():
                    out.append(('E-margin', n, 'empty margin note'))
                continue
            if not (re.search(r'\|margin=(left|right)\b', tpl) and re.search(r'\|margin-width=\d+\b', tpl) and '|text=' in tpl):
                out.append(('E-margin', n, f'malformed margin note: {tpl[:70]!r}'))
            elif not INNER.sub('', re.sub(r'\{\{(?:lang\|[^|{}]*|sc)\|([^{}]*)\}\}', r'\1', tpl.split('|text=', 1)[1])).strip():
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
            title = re.search(r'\|title=((?:[^{}|]|\{\{[^{}]*\}\})*)', tpl)
            if not title:
                out.append(('E-hw-title', n, f'hyphen template without |title=: {tpl[:50]}'))
            elif re.search(r"\{\{|''|ſ", title.group(1)):
                out.append(('E-hw-title', n, f'hyphen template title must be plain text: {tpl[:60]}'))

        for m in re.finditer(r"(?:^|[\s(])[^\W\d_]{1,2}\{\{sup\|‖\}\} [a-zſ]", body):  # 'l{{sup|‖}} et': the mark inside 'let'
            out.append(('E-lemma-split', n, f'‖ splits a word: {body[max(0, m.start() - 15):m.end() + 10]}'))
        depth = 0  # template depth at the start of each line: breaks inside {{center|…}} blocks are layout
        for a_line, b_line in zip(body.split('\n'), body.split('\n')[1:]):
            depth += a_line.count('{{') - a_line.count('}}')
            if depth == 0 and a_line.strip() and b_line.strip() and not (
                    BLOCKLINE.match(a_line) or BLOCKLINE.match(b_line) or a_line.rstrip().endswith('}}')):
                out.append(('W-linebreak', n, f'single line break inside a paragraph near …{a_line[-30:]!r}'))
        bodies[n] = body

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
                    if in_ital and (tmpl.startswith(('{{MarginNote', '{{outside')) or "''" in tmpl):
                        out.append(('E-tpl-italic', n, f'template inside unclosed italics near …{near(para, pos - len(tmpl), pos)}'))
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
            ch, v = int(m.group(1) or m.group(3)), int(m.group(2) or m.group(4))
            if ch != last_ch:
                if v != 1:
                    out.append(('E-verse', n, f'chapter {ch} starts at verse {v}'))
            elif v != last_v + 1:
                out.append(('E-verse', n, f'{ch}:{v} follows {ch}:{last_v}'))
            last_ch, last_v = ch, v
            # the print sets † at every verse start but a chapter's first, under its drop initial (§2.1)
            in_drop = body.startswith('}}', m.end())  # {{dropinitial|T|fl={{verse|…}}}}: no † under the initial
            if (m.group(3) or '{{sidenotes begin}}' in t) and not in_drop and not body.startswith(('†', '{{di|'), m.end()):
                out.append(('W-mark', n, f'{ch}:{v} lacks the print\'s † after the verse number'))

        # spacing and quotes
        for lineno, line in enumerate(body.split('\n'), 1):
            if line != line.rstrip():
                out.append(('W-space', n, f'trailing space on body line {lineno}'))
            plain = line
            while INNER.search(plain):
                plain = INNER.sub('X', plain)
            for m in re.finditer(r'\S  +\S|\s[,.;:?!)]|\(\s', plain):
                out.append(('W-space', n, f'{m.group(0)!r} near …{near(plain, m.start(), m.end())}'))
        for m in re.finditer(r'\s\{\{(?:MarginNote|outside (?:R?L|R))\|(?:[^{}]|\{\{[^{}]*\}\})*\}\}[,.;:?!)]', body):
            out.append(('W-space', n, f'space before a margin note that precedes punctuation near …{near(body, m.start(), m.start() + 1)}'))
        flat = body
        while INNER.search(flat):
            flat = INNER.sub('', flat)
        for m in re.finditer(r'["“”]', flat):
            out.append(('W-quote', n, f'quote mark near …{near(flat, m.start(), m.end())}'))
    for n, body in bodies.items():
        nxt = bodies.get(n + 1)
        ends = body.rstrip()
        lead = LEAD_NOTES.sub('', nxt or '')
        # a book, Argument or section title (THE SVMME…): its own transclusion; chapter headings are not
        new_work = lead.startswith(('{{c|{{x-larger|', '{{c|{{xx-larger|')) or (
            lead.startswith('{{c|{{larger|') and not re.match(r'\{\{c\|\{\{larger\|(?:\{\{sc\|Chap|A N N O T)', lead))
        if nxt is not None and OPENS_PARA.match(lead) and not new_work and not ends.endswith(('\n{{nop}}', '|}')):
            out.append(('W-nop', n, f'page {n + 1} opens a paragraph: end this page with {{{{nop}}}} on its own line'))
    return out


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    ov = fidelity.parse_overrides(argv)
    args = fidelity.strip_override_args(argv)
    if not args or args[0].startswith('-'):
        sys.exit(__doc__)
    opt = {a: args[i + 1] for i, a in enumerate(args) if a in ('--only', '--skip') and i + 1 < len(args)}
    only = set(opt.get('--only', '').split(',')) - {''}
    skip = set(opt.get('--skip', '').split(',')) - {''}
    res = [r for r in lint(args[0], ov) if (not only or r[0] in only) and r[0] not in skip]
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

