"""One-off (2026-11-19, pdf242 re-read): John's Argument stars and margin notes as printed.
The print stars all four "the Iewes" (chap. 2, 13; 5, 1; 6, 4; 11, 55). The note "This speach very
common..." stands in the OUTER margin beside the first (2, 13); "Iren. li. 2. c. 39." in the INNER
margin beside chap. 5, 1; "Io. 20, 31." is roman; "Mat. 4, 21." has a comma.
Usage: fix_john_argument2.py [--write]"""
from pathlib import Path
import json, sys
sys.path.insert(0, str(Path(__file__).parent))
from jsonfmt import write_like  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
V = {'odr-original': dict(Pasche='Paſche', Iewes='Iewes', festiual='feſtiual', ), 'odr': dict(Pasche='Pasch', Iewes='Jews', festiual='festival')}


def main(write):
    for root, v in V.items():
        p = REPO / 'static/data' / root / 'john.json'
        bj = json.loads(p.read_text())
        intro = bj['intros'][0]
        t = intro['text']
        P, J, F = v['Pasche'], v['Iewes'], v['festiual']
        edits = [
            (f'<i>And the {P} of the {J} was at hand.</i> And that', f'<i>And the {P} of</i> <mn>[1]</mn> <i>the {J} was at hand.</i> And that'),
            (f'day of the {J}</i>, is thought of good <mn>[1]</mn> Authors', f'day of * the {J}</i>, <mn>[2]</mn> is thought of good Authors'),
            (f'day of</i> <mn>[2]</mn> <i>the {J} was at hand.</i>', f'day of *the {J} was at hand.</i>'),
        ]
        for old, new in edits:
            assert t.count(old) == 1, (root, old, t.count(old))
            t = t.replace(old, new)
        intro['text'] = t
        n = intro['notes']
        assert n[0]['text'] == 'Iren. li. 2. c. 39.' and n[1]['text'].startswith('* This'), n[:2]
        iren, speach = n[0], n[1]
        speach['marker'], iren['marker'] = 1, 2
        n[0], n[1] = speach, iren
        assert n[2]['text'] == '<i>Io. 20, 31.</i>'
        n[2]['text'] = 'Io. 20, 31.'
        assert 'b Mat. 4. 21.' in n[3]['text']
        n[3]['text'] = n[3]['text'].replace('b Mat. 4. 21.', 'b Mat. 4, 21.')
        print(root, 'ok')
        if write:
            write_like(p, bj)


main('--write' in sys.argv)
