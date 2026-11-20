"""§4.7 Wikisource conformance codes in lint.py, on tiny fixture pages."""
import lint

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
