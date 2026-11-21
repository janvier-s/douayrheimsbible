"""rhemes.text: the folding and wiki-text helpers, pinned to what they did before the move.
The folding functions differ on purpose (each comparison needs its own key); they stay separate."""
import pytest

from rhemes import text

PQ = '<noinclude><pagequality level="3" user="Bob" />x</noinclude>\n'


@pytest.mark.parametrize('w, key', [('Vvhē', 'whe'), ('ſ', 's'), ('IESVS,', 'iesus'), ('vpō', 'upo'), ('“ſinne,”', 'sinne')])
def test_fold_word(w, key):
    assert text.fold_word(w) == key  # marks dropped, not expanded


@pytest.mark.parametrize('w, c', [('“ſinne,”', 'ſinne'), ('(Iohn)', 'Iohn'), ('...', '')])
def test_core(w, c):
    assert text.core(w) == c


@pytest.mark.parametrize('w, chars, key', [('æneas,', 'aeneas,', 'aeneas'), ('Æneas', 'Æneas', 'neas'),
                                           ('Vvhy?', 'Vvhy?', 'vhy'), ('ſœ', 'soe', 'soe')])
def test_fold_chars_and_key(w, chars, key):
    # current behaviour: capitals are not folded (Æ, Vv); pinned, not fixed here
    assert text.fold_chars(w) == chars
    assert text.fold_key(w) == key


@pytest.mark.parametrize('w, key', [('{{dropinitial|T}}HE', 'the'), ('{{sc|Iesvs}}', 'iesvs'), ('⟦v3⟧fuffer', 'svsser'),
                                    ('ſāint', 'saint'), ('Iudas{{ls}}', 'ivdas')])
def test_wiki_word_key(w, key):
    assert text.wiki_word_key(w) == key


@pytest.mark.parametrize('w, p', [('po{{ls}}sible <i>and</i> {{sc|Lord}}', 'poſsible  and   Lord '),
                                  ('{{rh|12|{{sc|the gospel}}|x}}', ' 12  the gospel  x '),
                                  ('[[File:a.png|20px]] b', '  b'),
                                  ('{{verse|chapter=1|verse=2}}text', ' 1 2 text')])
def test_wiki_to_plain(w, p):
    assert text.wiki_to_plain(w) == p


def test_long_s_round_trip():
    assert text.ls_to_wiki('poſſible') == 'po{{ls}}{{ls}}ible'
    assert text.wiki_to_ls('po{{ls}}sible') == 'poſsible'


def test_pagequality():
    assert text.pagequality_bare(PQ) == '<noinclude><pagequality />x</noinclude>'
    assert text.pagequality_blank_user(PQ) == '<noinclude><pagequality level="3" user="" />x</noinclude>'


def test_nfc():
    assert text.nfc('ō') == 'ō'


def test_old_names_alias():
    from rhemes import fidelity, generate, ladder, livecheck, triage, wikifetch, wikipost
    assert ladder.fold is text.fold_word and ladder.core is text.core
    assert triage.fold_char is text.fold_chars and triage.fold_key is text.fold_key
    assert generate.norm is text.wiki_word_key and generate.to_ls is text.ls_to_wiki
    assert generate.SENT is text.SENT and generate.DROPI is text.DROPI
    assert fidelity.plain is text.wiki_to_plain
    assert wikipost.norm is text.pagequality_bare
    assert wikifetch.norm is text.pagequality_blank_user and livecheck.norm_text is text.pagequality_blank_user
