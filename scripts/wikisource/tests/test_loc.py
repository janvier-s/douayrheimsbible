import pytest

from rhemes import loc, paths


def test_iter_locs_round_trip():
    store = loc.load_store(paths.DATA, 'john')
    seen = 0
    for rest, cont, key in loc.iter_locs(store):
        c2, k2 = loc.resolve(store, rest)
        assert c2 is cont and k2 == key, rest
        seen += 1
    assert seen > 1000


def test_chapters_by_number_not_position():
    # Tobias starts with a chapter 0 (the preface), so chapter N is not chapters[N - 1]
    store = loc.load_store(paths.DATA, 'tobias')
    assert store.bj['chapters'][0]['chapter'] == 0
    for rest, cont, key in loc.iter_locs(store):
        c2, k2 = loc.resolve(store, rest)
        assert c2 is cont and k2 == key, rest


def test_resolve_hash_key():
    store = loc.load_store(paths.DATA, 'john')
    cont, key = loc.resolve(store, '1:1a1#star')
    assert cont is store.anns[1]['annotations'][0] and key == 'star'


def test_resolve_rejects_unknown():
    store = loc.load_store(paths.DATA, 'john')
    with pytest.raises(ValueError):
        loc.resolve(store, 'nonsense')


def test_find_text_moved():
    import apply_wvv
    assert apply_wvv.find_text is loc.find_text
