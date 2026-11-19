"""One-off: John's Argument notes as printed (pdf242-243, read on the scans 2026-11-19).
Print: margin note "Iren. li. 2. c. 39." beside part two; the note "This speach very common..." beside
part three, keyed by a * before "the Iewes" (also starred in part four); "Io. 20, 31." (data had 32).
Notes are listed in the order their markers appear in the text. Usage: fix_john_argument.py [--write]"""
from pathlib import Path
import json, sys
sys.path.insert(0, str(Path(__file__).parent))
from jsonfmt import write_like  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
EDITS = {
    'odr-original': [
        (' in this <mn>[1]</mn> ſecond part', ' in this ſecond part'),
        ('\n\nIren. li. 2. c. 39.\n\n', '\n\n'),
        ('<i>and Paſche the feſtiual day of the Iewes was at hand.</i>', '<i>and Paſche the feſtiual day of</i> <mn>[2]</mn> <i>the Iewes was at hand.</i>'),
        ('<i>And the Paſche of the Iewes was at hand</i> )', '<i>And the Paſche of *the Iewes was at hand</i> )'),
    ],
    'odr': [
        (' in this <mn>[1]</mn> second part', ' in this second part'),
        ('\n\nIren. li. 2. c. 39.\n\n', '\n\n'),
        ('<i>and Pasch the festival day of the Jews was at hand.</i>', '<i>and Pasch the festival day of</i> <mn>[2]</mn> <i>the Jews was at hand.</i>'),
        ('<i>And the Pasch of the Jews was at hand</i> )', '<i>And the Pasch of *the Jews was at hand</i> )'),
    ],
}


def main(write):
    for root, edits in EDITS.items():
        p = REPO / 'static/data' / root / 'john.json'
        bj = json.loads(p.read_text())
        intro = bj['intros'][0]
        t = intro['text']
        for old, new in edits:
            assert t.count(old) == 1, (root, old, t.count(old))
            t = t.replace(old, new)
        # marker [1] (Iren.) now sits at "good [2] Authors": renumber so markers follow the text order
        t = t.replace('is thought of good <mn>[2]</mn>', 'is thought of good <mn>[1]</mn>')
        intro['text'] = t
        n = intro['notes']
        assert [x['marker'] for x in n[:2]] == [1, 2] and n[1]['text'] == '', n[:2]
        speach = n[0]
        iren = {'marker': 1, 'text': 'Iren. li. 2. c. 39.'}
        speach['marker'] = 2
        assert n[2]['text'] == '<i>Io. 20, 32.</i>'
        n[2]['text'] = '<i>Io. 20, 31.</i>'
        intro['notes'] = [iren, speach] + n[2:]
        print(root, 'ok', [x['marker'] for x in intro['notes']])
        if write:
            write_like(p, bj)


main('--write' in sys.argv)
