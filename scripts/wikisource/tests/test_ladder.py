"""Evidence ladder for letter-shape and spelling conflicts (spec §4.1)."""
import json
from collections import Counter

import fidelity
import ladder

XML = '''<TEI><text><body>
<div n="Matthew" type="gospel"><p>the Paſſion of our Lord in Matthew</p></div>
<div n="Mark" type="gospel">
<p>after our Lords Paſſion beheaded, laſt of al. He com<g ref="char:EOLhyphen"/>maunded them
<note place="margin">A note on the Paſsion here.</note> to goe.
twice said here and twice said here.</p>
</div>
<div n="Luke" type="gospel"><p>Paſsion in Luke</p></div>
</body></text></TEI>'''


def C(committed, generated, before=('our', 'Lords'), after=('beheaded,', 'laſt'), page=120):
    return ladder.Conflict(page, committed, generated, list(before), list(after))


def toks():
    return ladder.xml_tokens(XML, 'mark')


def test_xml_tokens_book_div_and_hyphen():
    main, notes = toks()
    assert 'commaunded' in main and 'Matthew' not in main and 'Luke' not in main
    assert 'note' in notes and 'note' not in main


def test_fold():
    assert ladder.fold('Paſſion') == ladder.fold('Passion') == ladder.fold('Paſsion')
    assert ladder.fold('vvith') == ladder.fold('with')
    assert ladder.fold('cōmaunded,') == 'comaunded'


def test_locate_xml_unique():
    assert ladder.locate_xml(C('Paſsion', 'Paſſion'), toks()) == ['Paſſion']


def test_ambiguous_context_unresolved():
    c = ladder.Conflict(120, 'ſaid', 'said', ['twice'], ['here'])
    assert ladder.locate_xml(c, toks()) == []


def test_ocr_reading():
    assert ladder.ocr_reading('Paffion', 'Paſsion', 'Paſſion') == 'Paſſion'
    assert ladder.ocr_reading('Pafsion', 'Paſsion', 'Paſſion') == 'Paſsion'
    assert ladder.ocr_reading('Passion', 'Paſsion', 'Paſſion') is None
    assert ladder.ocr_reading('therfore,', 'therfore', 'therefore') == 'therfore'


def test_rung1_xml_and_ocr_agree():
    d = ladder.decide(C('Paſſion', 'Paſsion'), ['Paſſion'], ['Paſſion'], [], Counter())
    assert (d.rung, d.winner) == (1, 'committed')


def test_rung2_xml_matches_committed():
    d = ladder.decide(C('Paſsion', 'Paſſion'), ['Paſsion'], [], [], Counter())
    assert (d.rung, d.winner) == (2, 'committed')


def test_rung3_book_majority():
    d = ladder.decide(C('Aſsyria', 'Aſſyria'), ['Aſſyria'], [], [], Counter({'Aſſyria': 6, 'Aſsyria': 1}))
    assert (d.rung, d.winner) == (3, 'generated')


def test_rung3_tesseract():
    d = ladder.decide(C('Paſſion', 'Paſsion'), [], [], ['Paſſion'], Counter())
    assert (d.rung, d.winner) == (3, 'committed')


def test_unresolved_is_rung4():
    d = ladder.decide(C('Paſsion', 'Paſſion'), [], [], [], Counter({'Paſſion': 2, 'Paſsion': 2}))
    assert (d.rung, d.winner) == (4, '')


def test_macron_conflict():
    d = ladder.decide(C('cōmaunding', 'commaunding'), ['cōmaunding'], [], [], Counter())
    assert d.winner == 'committed'


def test_conflicts_from_pages():
    head = '<noinclude><pagequality level="1" user="" />{{rh|1|X|Y}}</noinclude>'
    foot = '<noinclude>{{continues|x}}</noinclude>\n'
    got = ladder.conflicts(head + "our Lords Pa{{ls}}sion ''beheaded,'' la{{ls}}t of" + foot,
                           head + "our Lords Pa{{ls}}{{ls}}ion ''beheaded,'' la{{ls}}t of" + foot, 120)
    assert got == [ladder.Conflict(120, 'Paſsion', 'Paſſion', ['our', 'Lords'], ['beheaded,', 'laſt', 'of'])]


def book(tmp_path, verses):
    f = tmp_path / 'mark.json'
    f.write_text(json.dumps({'chapters': [{'chapter': 1, 'verses': [{'verse': i + 1, 'text': t} for i, t in enumerate(verses)]}]},
                            ensure_ascii=False, indent=2) + '\n')
    return f


def dec(c, winner='committed'):
    return ladder.Decision(c, 2, winner, 'xml')


NO = fidelity.parse_overrides([])


def test_adopt_refuses_non_unique(tmp_path):
    f = book(tmp_path, ['our Lords Paſſion beheaded', 'our Lords Paſſion beheaded'])
    before = f.read_bytes()
    applied, unlocated = ladder.adopt([f], [dec(C('Paſsion', 'Paſſion', after=('beheaded',)))],
                                      fidelity.parse_overrides(['--allow-shift', 'ls:*', '--reason', 't']), tmp_path / 'lock')
    assert applied == [] and len(unlocated) == 1 and f.read_bytes() == before


def test_adopt_guards_fidelity(tmp_path):
    f = book(tmp_path, ['after our Lords Paſſion beheaded, laſt of al'])
    c = C('Paſsion', 'Paſſion')
    applied, unlocated = ladder.adopt([f], [dec(c)], NO, tmp_path / 'lock')
    assert applied == [] and unlocated[0][1].startswith('fidelity')
    ov = fidelity.parse_overrides(['--allow-shift', 'ls:100-200', '--reason', 't'])
    applied, unlocated = ladder.adopt([f], [dec(c)], ov, tmp_path / 'lock')
    assert len(applied) == 1 and unlocated == []
    text = f.read_text()
    assert 'Lords Paſsion beheaded' in text and text.startswith('{\n  "chapters"') and text.endswith('\n')
    assert not (tmp_path / 'lock').exists()


def test_adopt_skips_generated_winners_and_is_idempotent(tmp_path):
    f = book(tmp_path, ['our Lords cōmaunding beheaded'])
    c = C('cōmaunding', 'commaunding', after=('beheaded',))
    applied, unlocated = ladder.adopt([f], [dec(c), dec(C('x', 'y'), 'generated')], NO, tmp_path / 'lock')
    assert applied == [] and unlocated == []  # already applied: committed form present, generated absent


def test_book_majority_excludes_this_occurrence():
    d = ladder.decide(C('Aſsyria', 'Aſſyria'), ['Aſſyria'], [], [], Counter({'Aſſyria': 1}))
    assert (d.rung, d.winner) == (4, '')
    d = ladder.decide(C('Aſsyria', 'Aſſyria'), ['Aſſyria'], [], [], Counter({'Aſſyria': 3, 'Aſsyria': 1}))
    assert (d.rung, d.winner) == (3, 'generated')  # 2:1 elsewhere


def test_small_caps_words_not_in_ladder():
    head = '<noinclude><pagequality level="1" user="" />{{rh|1|X|Y}}</noinclude>'
    foot = '<noinclude></noinclude>\n'
    assert ladder.conflicts(head + 'on {{sc|Ea{{ls}}ter day}} morning' + foot,
                            head + 'on {{sc|Easter day}} morning' + foot, 159) == []


def test_words_keep_inline_templates_joined():
    assert ladder.words("{{lang|grc|Μετάνοια}}. and") == ['Μετάνοια.', 'and']
    head = '<noinclude><pagequality level="1" user="" />{{rh|1|X|Y}}</noinclude>'
    foot = '<noinclude></noinclude>\n'
    un = []
    ladder.conflicts(head + 'x AND it' + foot, head + 'x {{dropinitial|A}}{{sc|Nd}} it' + foot, 5, un)
    assert un == []


def test_stem_rule_ss_settled_by_xml():
    # owner 2026-11-21: the committed ſs came from apply_longs_pages.py's stem list, not the print
    d = ladder.decide(C('neceſsitie', 'neceſſitie'), ['neceſſitie'], [], [], Counter())
    assert (d.rung, d.winner) == (3, 'generated') and 'stem rule' in d.evidence
    d = ladder.decide(C('neceſsitie', 'neceſſitie'), ['neceſſitie'], [], ['neceſsitie'], Counter())
    assert (d.rung, d.winner) == (3, 'committed')  # an OCR reading of the shape still decides first
    d = ladder.decide(C('Maſſ', 'Maſs'), ['Maſs'], [], [], Counter())  # not a stem-rule word
    assert d.rung == 4
    d = ladder.decide(C('neceſsitie', 'neceſſitie'), [], [], [], Counter())  # no XML reading: still open
    assert d.rung == 4


def test_scan_readings_override_rung4():
    c = C('Paſſ.', 'Paſs.', page=232)
    ds = [ladder.Decision(c, 4, '', 'xml -'), ladder.Decision(C('a', 'b', page=1), 2, 'committed', 'xml a')]
    rd = [{'page': 232, 'committed': 'Paſſ.', 'generated': 'Paſs.', 'reading': 'Paſ.', 'evidence': 'scan 2026-11-21'},
          {'page': 9, 'committed': 'x', 'generated': 'y', 'reading': 'y', 'evidence': 'scan'}]
    out = ladder.apply_readings(ds, rd)
    assert out[0] == ladder.Decision(c._replace(committed='Paſ.'), 4, 'committed', 'scan 2026-11-21: print Paſ.')
    assert out[1] == ds[1]
    rd[0]['reading'] = 'Paſs.'  # the print agrees with the data: the generated side wins
    assert ladder.apply_readings(ds, rd)[0] == ladder.Decision(c, 4, 'generated', 'scan 2026-11-21: print Paſs.')


def test_stem_rule_only_where_otherwise_unresolved():
    d = ladder.decide(C('neceſsitie', 'neceſſitie'), ['neceſſitie'], [], [], Counter({'neceſsitie': 4, 'neceſſitie': 1}))
    assert (d.rung, d.winner) == (3, 'committed') and 'majority' in d.evidence
