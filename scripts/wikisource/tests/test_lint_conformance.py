"""§4.7 Wikisource conformance codes in lint.py, on tiny fixture pages."""
from rhemes import lint

PAGE = '<noinclude><pagequality level="{lvl}" user="{user}" />{{{{rh|1|X|Y}}}}</noinclude>{body}<noinclude>{foot}</noinclude>\n'


def codes(tmp_path, *pages, foot='', lvl='1', user=''):
    for k, body in enumerate(pages, 1):
        f = foot if isinstance(foot, str) else foot[k - 1]
        (tmp_path / f'{k}.wiki').write_text(PAGE.format(body=body, foot=f, lvl=lvl, user=user))
    return {c for c, n, m in lint.lint(tmp_path)}


def test_w_catchword(tmp_path):
    assert 'W-catchword' in codes(tmp_path, 'text', foot='{{rh|||And}}')
    assert 'W-catchword' not in codes(tmp_path, 'text', foot='{{continues|And}}')


def test_w_signature(tmp_path):
    assert 'W-signature' in codes(tmp_path, 'text', foot='{{rh||K ij|}}')
    assert 'W-signature' not in codes(tmp_path, 'text', foot='{{continues|And}}')
    assert 'W-signature' in codes(tmp_path, 'text', foot='{{rh||Ccc ij|And}}')
    assert 'W-signature' in codes(tmp_path, 'text', foot='{{rh||Bbb|}}')
    assert 'W-signature' not in codes(tmp_path, 'text', foot='{{rh||God|}}')
    assert 'W-signature' in codes(tmp_path, 'text', foot='{{rh|Nn ij||}}')
    assert 'W-signature' not in codes(tmp_path, 'text', foot='{{rh|||A}}')


def test_e_hw_title(tmp_path):
    assert 'E-hw-title' in codes(tmp_path, 'a {{hws|de|deſert.}}')
    assert 'E-hw-title' in codes(tmp_path, 'a {{hws|de|de{{ls}}ert.|title=de{{ls}}ert.}}')
    assert 'E-hw-title' in codes(tmp_path, "a {{hws|de|desert.|title=''desert.''}}")
    assert 'E-hw-title' not in codes(tmp_path, 'a {{hws|de|de{{ls}}ert.|title=desert.}}')


def test_w_nop(tmp_path):
    assert 'W-nop' in codes(tmp_path, 'ends a paragraph.', '{{c|CHAP. II.}}\n\ntext')
    assert 'W-nop' not in codes(tmp_path, 'ends a paragraph.\n{{nop}}', '{{c|CHAP. II.}}\n\ntext')
    assert 'W-nop' not in codes(tmp_path, 'runs on', 'into the next page')
    assert 'W-nop' in codes(tmp_path, 'end.', '{{MarginNote|margin=left|margin-width=65|text=x}}{{dropinitial|T}}HE')


def test_e_tpl_italic(tmp_path):
    assert 'E-tpl-italic' in codes(tmp_path, "''open {{sc|''x''}} close''")
    assert 'E-tpl-italic' in codes(tmp_path, "''open {{MarginNote|margin=left|margin-width=65|text=x}} close''")
    assert 'E-tpl-italic' not in codes(tmp_path, "''open'' {{sc|''x''}} ''close''")
    assert 'E-tpl-italic' not in codes(tmp_path, "''open {{ls}} close''")


def test_e_foot_ital(tmp_path):
    assert 'E-foot-ital' in codes(tmp_path, 'text', foot="{{continues|''6. It}}")
    assert 'E-foot-ital' not in codes(tmp_path, 'text', foot="{{continues|''6. It''}}")


def test_w_linebreak(tmp_path):
    assert 'W-linebreak' in codes(tmp_path, 'a line\nnext line')
    assert 'W-linebreak' not in codes(tmp_path, '{{c|A}}\n{{c|B}}')
    assert 'W-linebreak' not in codes(tmp_path, 'para one\n\npara two\n{{nop}}')


def test_e_status(tmp_path):
    assert 'E-status' in codes(tmp_path, 'text', lvl='3')
    assert 'E-status' not in codes(tmp_path, 'text', lvl='3', user='Beardo')
    assert 'E-status' not in codes(tmp_path, 'text', lvl='1')


def test_w_header_footer_optional(tmp_path):
    assert 'W-header' not in codes(tmp_path, 'text', foot='')


def test_w_linebreak_exempts_verse_and_open_templates(tmp_path):
    assert 'W-linebreak' not in codes(tmp_path, ":''Hic nempe iam regnant duo''\n:''Apostolorum principes:''")
    assert 'W-linebreak' not in codes(tmp_path, '{{center|\nPsal. 118.\nThat is,\n}}')


def test_w_nop_exempts_table_end(tmp_path):
    assert 'W-nop' not in codes(tmp_path, "{|\n| cell\n|}", "\n{| style='x'\n| more\n|}")


def test_w_nop_not_before_a_new_book_or_argument(tmp_path):
    assert 'W-nop' not in codes(tmp_path, 'end of the gospel.', '{{c|{{x-larger|THE ARGVMENT OF}}}}\n\ntext')
    assert 'W-nop' not in codes(tmp_path, 'end of the argument.', '{{c|{{xx-larger|THE HOLY GOSPEL}}}}\n\ntext')


def test_w_nop_not_before_a_new_section_but_before_a_chapter(tmp_path):
    assert 'W-nop' not in codes(tmp_path, 'end of Iohn.', '{{c|{{larger|THE SVMME, AND THE ORDER}}}}\n\ntext')
    assert 'W-nop' in codes(tmp_path, 'end of chapter.', '{{c|{{larger|{{sc|Chap. II.}}}}}}\n\ntext')


def test_margin_note_with_only_greek_is_not_empty(tmp_path):
    assert 'E-margin' not in codes(tmp_path, 'a {{MarginNote|margin=left|margin-width=65|text={{lang|grc|Προσετίθει}}}}b')
    assert 'E-margin' in codes(tmp_path, 'a {{MarginNote|margin=left|margin-width=65|text={{nop}}}}b')


def test_w_nop_italic_continuation_is_not_an_annotation_head(tmp_path):
    assert 'W-nop' not in codes(tmp_path, "and ''in epiſto. 85 ad Euagrium''.", "''2'', Where he checketh")
    assert 'W-nop' in codes(tmp_path, 'the end.', "''12. Then.''] text")


def test_w_nop_not_before_a_small_caps_section_title(tmp_path):
    assert 'W-nop' not in codes(tmp_path, 'end.', '{{c|{{larger|{{sc|The Svmme of the Actes}}}}}}\n\ntext')


def test_e_lemma_split(tmp_path):
    # a lemma offset off by a letter puts the ‖ inside a word (Romans p421 'l{{sup|‖}} et vs')
    assert 'E-lemma-split' in codes(tmp_path, 'faith, l{{sup|‖}} et vs haue peace')
    assert 'E-lemma-split' in codes(tmp_path, 'as b{{sup|‖}} y one man')
    assert 'E-lemma-split' not in codes(tmp_path, 'faith, {{sup|‖}} let vs haue peace')
    assert 'E-lemma-split' not in codes(tmp_path, 'that{{sup|‖}} Abraham did finde')
    assert 'E-lemma-split' in codes(tmp_path, 'and vn{{sup|‖}} to them')
    assert 'E-lemma-split' not in codes(tmp_path, 'and that{{sup|‖}} he is come')  # a whole word: placed by hand


def test_w_rh_caps(tmp_path):
    page = '<noinclude><pagequality level="1" user="" />{head}</noinclude>text<noinclude></noinclude>\n'
    (tmp_path / '1.wiki').write_text(page.format(head='{{rh|82|THE GOSPEL|CHA. VI.}}'))
    assert 'W-rh-caps' in {c for c, n, m in lint.lint(tmp_path)}
    (tmp_path / '1.wiki').write_text(page.format(head='{{rh|82|{{sc|the gospel}}|{{sc|Cha. VI.}}}}'))
    assert 'W-rh-caps' not in {c for c, n, m in lint.lint(tmp_path)}


SIDE = '<noinclude><pagequality level="1" user="" />{{{{sidenotes begin}}}}{{{{rh|1|X|Y}}}}</noinclude>{body}<noinclude>{foot}</noinclude>\n'


def side_codes(tmp_path, body, foot='{{sidenotes end}}'):
    (tmp_path / '1.wiki').write_text(SIDE.format(body=body, foot=foot))
    return {c for c, n, m in lint.lint(tmp_path)}


def test_sidenotes_format(tmp_path):
    ok = '{{verseline|1|1}}{{di|T}}{{sc|He}} booke of the * {{outside L|x}} generation. {{verseline|1|2}}† And ∷ {{outside RL|∷ y}} so.'
    assert not {'E-margin', 'W-mark', 'E-verse'} & side_codes(tmp_path, ok)
    assert 'E-margin' in side_codes(tmp_path, ok, foot='{{continues|And}}')  # no {{sidenotes end}}
    assert 'E-margin' not in side_codes(tmp_path, ok, foot='{{continues|And}}\n{{sidenotes end}}')
    assert 'E-margin' in side_codes(tmp_path, 'a {{outside L|{{nop}}}} b')
    assert 'W-mark' in side_codes(tmp_path, '{{verseline|1|1}}{{di|T}}{{sc|He}} x {{verseline|1|2}} And')  # † left out
    assert 'E-verse' in side_codes(tmp_path, '{{verseline|1|1}}{{di|T}}HE {{verseline|1|3}}† x')
    v = '{{dropinitial|T|fl={{verse|chapter=1|verse=1}}}}{{sc|He}} x {{verse|chapter=1|verse=2}}'
    assert 'W-mark' not in side_codes(tmp_path, v + '† And')
    assert 'W-mark' in side_codes(tmp_path, v + ' And')
    assert 'E-tpl-italic' in side_codes(tmp_path, "''open * {{outside L|x}} close''")
