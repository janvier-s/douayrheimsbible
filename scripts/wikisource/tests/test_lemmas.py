from rhemes import lemmas


def test_shift_without_z_finds_the_edit():
    v = {'text': 'and vvhen he came', 'lemmas': [[10, 7, 1]]}  # 'he came'
    old, new = v['text'], 'and when he came'
    v['text'] = new
    lemmas.shift(v, 'text', old, new)
    a, n, _ = v['lemmas'][0]
    assert new[a:a + n] == 'he came'


def test_misplaced_flags_a_start_inside_a_word(tmp_path):
    (tmp_path / 'b.json').write_text('{"chapters":[{"chapter":1,"verses":[{"verse":1,"text":"haue it vvith thy ſelf",'
                                     '"lemmas":[[1,6,1],[0,7,1],[8,14,1]]}]}]}')
    out = lemmas.misplaced([tmp_path])
    assert len(out) == 1 and '[aue it]' in out[0]


def test_lemma_spans_start_on_words():
    """generate.py places ‖ from these spans and refuses one that starts inside a word;
    a text edit that doesn't shift them leaves them there (fix apply and adopt shift them)."""
    out = lemmas.misplaced()
    assert not out, 'lemma spans starting inside a word:\n' + '\n'.join(out)
