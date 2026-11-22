from rhemes.fidelity import count, compare


def test_counts_print_features():
    c = count("{{ls}}aid vpō the vvord æ &c. ''Iesus''")
    assert (c['ls'], c['macron'], c['vv'], c['ae'], c['etc'], c['italic']) == (1, 1, 1, 1, 1, 2)


def test_markup_not_counted():
    t = "{{MarginNote|margin=left|margin-width=65|text=vvord}}{{verse|chapter=1|verse=2}}[[File:Wide swash.png|width=600px]]"
    c = count(t)
    assert (c['vv'], c['w'], c['s']) == (1, 0, 0) and c['verse'] == 1 and c['margin_note'] == 1


def test_pagequality_ignored():
    a = '<noinclude><pagequality level="1" user="" />{{rh|CHA. I.||87}}</noinclude>text'
    b = '<noinclude><pagequality level="3" user="Swsws" />{{rh|CHA. I.||87}}</noinclude>text'
    assert compare(a, b) == []


def test_macron_nfd_equivalence():
    assert count('vpō')['macron'] == count('vpō')['macron'] == 1
    assert compare('vpō', 'vpō') == []


def test_long_s_wipe_is_loss():
    # ſ→s raises the sibling s, so it is reported as a shift (still guarded)
    f = compare('Pa{{ls}}{{ls}}ion', 'Passion')
    assert [(x.feature, x.kind, x.before, x.after) for x in f] == [('ls', 'shift', 2, 0)]


def test_ss_shift_reported():
    assert [(x.feature, x.kind) for x in compare('Pa{{ls}}{{ls}}ion', 'Pa{{ls}}sion')] == [('ls', 'shift')]


def test_vv_to_w_is_shift_and_w_increase_is_loss():
    kinds = {(x.feature, x.kind) for x in compare('the vvord', 'the word')}
    assert kinds == {('vv', 'shift'), ('w', 'loss')}


def test_macron_loss_and_quote_added():
    kinds = {(x.feature, x.kind) for x in compare('vpō', '"vpon"')}
    assert kinds == {('macron', 'loss'), ('dquote', 'loss')}


def test_identical_and_gain_are_clean():
    assert compare('vpon', 'vpō') == []


import pytest
from rhemes.fidelity import parse_overrides, strip_override_args, refusals


def test_overrides_require_reason():
    with pytest.raises(SystemExit):
        parse_overrides(['--allow-shift', 'ls:114-160'])


def test_override_scopes():
    ov = parse_overrides(['--allow-shift', 'ls:114-160,vv:*', '--reason', 'ſs per XML'])
    assert refusals(120, 'Pa{{ls}}{{ls}}ion', 'Pa{{ls}}sion', ov) == []
    assert refusals(200, 'Pa{{ls}}{{ls}}ion', 'Pa{{ls}}sion', ov) == ['ls shift 2→1']


def test_shift_override_does_not_cover_loss():
    ov = parse_overrides(['--allow-shift', 'macron:*', '--reason', 'x'])
    assert refusals(1, 'vpō', 'vpo', ov) == ['macron loss 1→0']


def test_strip_override_args():
    assert strip_override_args(['pages', '--allow-loss', 'ls:3', '--reason', 'r', '--quiet']) == ['pages', '--quiet']


def test_unknown_feature_rejected():
    with pytest.raises(SystemExit):
        parse_overrides(['--allow-loss', 'longs:*', '--reason', 'typo'])


def test_override_args_keeps_only_override_flags():
    from rhemes.fidelity import override_args
    argv = ['1-2', '--post', '--allow-shift', 'ls:1', '--summary', 's', '--reason', 'per XML']
    assert override_args(argv) == ['--allow-shift', 'ls:1', '--reason', 'per XML']


def test_override_args_value_equal_to_other_arg():
    from rhemes.fidelity import override_args
    assert override_args(['s', '--summary', 's', '--reason', 's']) == ['--reason', 's']


def test_frequent_print_marks_guarded():
    kinds = {(x.feature, x.kind) for x in compare('∷ the * ⊣ ‖ word', 'the word')}
    assert kinds == {('quad', 'loss'), ('star', 'loss'), ('tack', 'loss'), ('bar', 'loss')}
    assert [x.feature for x in compare('{{dropinitial|A}}nd {{larger|THE}}', 'And THE')] == ['dropinitial', 'size']


def test_where_locates_the_changed_words():
    from rhemes.fidelity import where
    before = 'a Pa{{ls}}{{ls}}ion b {{ls}}aid c'
    after = 'a Pa{{ls}}sion b {{ls}}aid c'
    assert where(before, after, 'ls') == ['Pa{{ls}}{{ls}}ion → Pa{{ls}}sion']


def test_where_splits_words_from_markup():
    from rhemes.fidelity import where
    assert where("x</noinclude>Pa{{ls}}{{ls}}ion<noinclude>", "x</noinclude>Passion<noinclude>", 'ls') == ['Pa{{ls}}{{ls}}ion → Passion']
    assert where("{{sc|The}} word", "The word", 'sc') == ['{{sc| → ∅']


def test_sidenotes_markup_counted_like_the_old():
    old = count("{{MarginNote|margin=left|margin-width=65|text=x}}{{dropinitial|T|fl={{verse|chapter=1|verse=1}}}}HE {{verse|chapter=1|verse=2}} a")
    new = count("{{outside L|x}}{{verseline|1|1}}{{di|T}}HE {{verseline|1|2}}† a")
    for f in ('margin_note', 'verse', 'dropinitial'):
        assert old[f] == new[f] == (2 if f == 'verse' else 1), f
    assert new['dagger'] == old['dagger'] + 1
