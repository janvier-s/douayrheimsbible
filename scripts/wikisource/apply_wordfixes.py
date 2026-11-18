"""One-off word fixes read on the scans (Luke, John: 2026-11-18). Each edit is
(book, loc, [(old, new), ...] for odr-original, [(old, new), ...] for odr or None);
every old string must occur exactly once in its text. Usage: apply_wordfixes.py [--write]"""
from pathlib import Path
import glob, json, sys

sys.path.insert(0, str(Path(__file__).parent))
from apply_wvv import find_text  # noqa: E402
from jsonfmt import write_like  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
ROOTS = {'orig': REPO / 'static/data/odr-original', 'mod': REPO / 'static/data/odr'}

EDITS = [
    # --- wording: odr-original and odr
    ('luke', '1:6a2', [('here is it euident', 'here it is euident')], [('here is it evident', 'here it is evident')]),
    ('john', 'arg:0', [('Domitian, for fourtene', 'Domitian, fourtene')], [('Domitian, for fourteen', 'Domitian, fourteen')]),
    ('john', 'arg:0', [('Eaſter of Paſche of his', 'Eaſter or Paſche of his')], [('Easter of Pasch of his', 'Easter or Pasch of his')]),
    ('john', 'arg:0', [('is, of this Actes', 'is, of his Actes')], [('is, of this Acts', 'is, of his Acts')]),
    ('john', '21:17a1', [('to him was the cure', 'to him the cure')], [('to him was the cure', 'to him the cure')]),
    ('john', '20:21a2', [('mention to his owne', 'mention of his owne')], [('mention to his own', 'mention of his own')]),
    ('john', '20:23a4', [('toucheth the very ſoule is ſelf', 'toucheth the very ſoule it ſelf'), ('vvhoſe ſinne they reteine', 'vvhoſe ſinnes they reteine'),
                         ('his ſinne vnto him for too receiue', 'his ſinnes vnto him for to receiue')],
     [('soul is self', 'soul it self'), ('whose sin they retain', 'whose sins they retain'), ('his sin unto him for too receive', 'his sins unto him for to receive')]),
    # --- spelling of the print: odr-original only
    ('john', '18:sum', [('to the hand of his enemies', 'to the band of his enemies')], None),
    ('luke', '1:sum', [('ſix months after', 'ſixe moneths after'), ('firſt of the Precurſour:', 'firſt of the Precurſor:')], None),
    ('luke', '4:12', [('Thou ſhal not tempt', 'Thou ſhalt not tempt')], None),
    ('luke', '3:20a1', [('or impriſonment', 'or empriſonment')], None),
    ('luke', '9:55a3', [('Not iuſtice nor all rigorous', 'Not iuſtice nor al rigorous')], None),
    ('luke', '10:30a3', [('Prieſt of the new Teſtament', 'Prieſt of the nevv Teſtament')], None),
    ('luke', '20:35a1', [('are not onely counted', 'are not only counted')], None),
    ('luke', '21:4a1', [('that proceedeth of', 'that procedeth of')], None),
    ('john', '2:4a3', [('euent ſhoweth the contrarie', 'euent ſhevveth the contrarie')], None),
    ('john', '19:17a1', [('body and blood of', 'body and bloud of'), ('is truly called', 'is truely called'), ('Holy Croſs', 'Holy Croſſe'),
                         ('litle piece thereof', 'litle peece thereof'), ('moſt need memorial', 'moſt neere memorial'),
                         ('of Chriſts Paſſion', 'of Chriſtes Paſſion'), ('feſtiual days and', 'feſtiual daies and')], None),
    ('john', '20:23a4', [('Phyſician or Surgeon', 'Phyſicion or Surgeon')], None),
    ('john', '21:17a1', [('he condemned Iohn', 'he condemneth Iohn'), ('not only giuen', 'not onely giuen'), ('and therefore it is', 'and therfore it is')], None),
    ('john', 'arg:0', [('their owne ſaluation', 'their ovvne ſaluation'), ('and eight yere', 'and eighteth yere'),
                       ('the Paſche of the Jews was at hand.</i> And', 'the Paſche of the Iewes was at hand.</i> And'),
                       ('feſtiual day of the Jews</i>', 'feſtiual day of the Iewes</i>'),
                       ('the feſtiual day of the Jews was at hand.</i><br>', 'the feſtiual day of the Iewes was at hand.</i><br>'),
                       ('the Paſche of the Jews was at hand</i> )', 'the Paſche of the Iewes was at hand</i> )'),
                       ('principal of the Jews,', 'principal of the Ievves,'), ('Hieruſalem & the Jews vvere', 'Hieruſalem & the Ievves vvere')], None),
]
# luke 24:47a2 is half-modernised: whole-word swaps, in order of appearance
L2447 = [('not only the things', 'not onely the things'), ('ſhould go, to wit', 'ſhould goe, to wit'), ('to all nations: that', 'to al nations: that'),
         ('to err neither', 'to erre neither'), ('againſt all Heretics and Schiſmatics', 'againſt al Heretikes and Schiſmatikes'),
         ('the foreſaid only true', 'the foreſaid onely true'), ('ouer all nations', 'ouer al nations')]
EDITS.append(('luke', '24:47a2', L2447, None))


def load(root, book):
    bj = json.loads((root / f'{book}.json').read_text())
    anns = {}
    for f in sorted(glob.glob(str(root / book / 'annotations' / '*.json'))):
        a = json.loads(Path(f).read_text()); anns[a['chapter']] = a
    return bj, anns


def main(write):
    data = {(r, b): load(ROOTS[r], b) for r in ROOTS for b in ('luke', 'john')}
    touched = {k: set() for k in data}
    bad = 0
    for book, loc, o_ed, m_ed in EDITS:
        for r, eds in (('orig', o_ed), ('mod', m_ed)):
            if not eds:
                continue
            bj, anns = data[(r, book)]
            cont, k = find_text(bj, anns, loc)
            for old, new in eds:
                n = cont[k].count(old)
                if n != 1:
                    print(f'  {r} {book} {loc}: {old!r} found {n}x'); bad += 1; continue
                cont[k] = cont[k].replace(old, new)
            if loc[0].isdigit():
                touched[(r, book)].add(int(loc.split(':')[0]))
    print('problems:', bad)
    if write and not bad:
        for (r, b), (bj, anns) in data.items():
            write_like(ROOTS[r] / f'{b}.json', bj)
            for c in touched[(r, b)]:
                if c in anns:
                    write_like(ROOTS[r] / b / 'annotations' / f'{c:03d}.json', anns[c])


if __name__ == '__main__':
    main('--write' in sys.argv)
