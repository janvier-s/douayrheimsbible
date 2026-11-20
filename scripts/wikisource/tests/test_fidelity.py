from fidelity import count, compare


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
