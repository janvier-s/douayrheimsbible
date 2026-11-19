"""One-off (2026-11-19, pdf242-243; XML A16049.xml has them as <note n="a|b|c">): John's Argument letter keys
a, b, c printed in the text beside the margin notes (odr-original only, as the transcription keeps print
apparatus such as the "c" of 4:10). In 243 the "c" note stands beside "savv: c onely", not at "This Iohn".
Usage: fix_john_argument3.py [--write]"""
from pathlib import Path
import json, sys
sys.path.insert(0, str(Path(__file__).parent))
from jsonfmt import write_like  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
EDITS = {
    'odr-original': [
        ('<i>Iohn the Apoſtle, whom IESVS loued</i>', '<i>Iohn the Apoſtle, a whom IESVS loued</i>'),
        ('<i>very much, the ſonne of Zebedee, the brother of Iames the Apoſtle whom Herod', '<i>very much, the b ſonne of Zebedee, b the brother of Iames the Apoſtle c whom Herod'),
        ('therefore is more loued of our <mn>[1]</mn> Lord, and lieth', 'therefore is a more loued of our <mn>[1]</mn> Lord, and a lieth'),
        ('durſt not aſke, he deſireth', 'durſt not aſke, a he deſireth'),
        ('to the Sepulchre, but he came', 'to the Sepulchre, b but he came'),
        ('whom they ſavv: onely the virgin', 'whom they ſavv: <mn>[3]</mn> c onely the virgin'),
        ('This Iohn <mn>[3]</mn> vvas both', 'This Iohn vvas both'),
    ],
    'odr': [
        ('whom they saw: only the virgin', 'whom they saw: <mn>[3]</mn> only the virgin'),
        ('This John <mn>[3]</mn> was both', 'This John was both'),
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
        intro['text'] = t
        print(root, 'ok')
        if write:
            write_like(p, bj)


main('--write' in sys.argv)
