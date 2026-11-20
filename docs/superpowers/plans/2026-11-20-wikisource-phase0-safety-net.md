# Wikisource Phase 0 — Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make losing 1582 print features (long-s, macrons, vv, ligatures, italics, small caps…) impossible by accident in `lint.py` and `wikipost.py`. Then record how the live pages differ from the committed ones, before any refactoring starts.

**Architecture:**
- A new stdlib-only module, `scripts/wikisource/fidelity.py`, counts print features in wiki text and compares two versions, reporting each drop as a *loss* or a *shift*.
- `lint.py` compares each page against its git `HEAD` version.
- `wikipost.py` compares against the live revision before every edit.
- Both refuse unless a scoped override comes with a reason.
- A pytest suite is added in `scripts/wikisource/tests/`.

**Tech Stack:** Python 3 (stdlib; scripts run with `python3 -I`), pytest 9, git.

**Spec:** `docs/superpowers/specs/2026-11-20-wikisource-pipeline-refactor-design.md` (§4.2, §4.6, §5 phase 0)

## Global Constraints

- The print wins: never modernise or normalise print forms (ſ→s, vv→w, macrons, ligatures, italics, small caps).
- Scripts run as `python3 -I`, so imports go through `sys.path.insert(0, str(Path(__file__).parent))` as in the existing scripts; `fidelity.py` is stdlib only.
- All text is compared after Unicode NFC (macrons are counted after NFD, so composed and decomposed forms count the same).
- Nothing is posted to Wikisource during the refactor. Live access in this phase is read-only (`wikifetch.py`, no login).
- Override syntax: `--allow-loss FEATURE:SCOPE[,…]` and `--allow-shift FEATURE:SCOPE[,…]`. SCOPE is `*`, a page `n` or a range `a-b`. Either flag requires `--reason TEXT`.
- Data JSON is untouched in this phase.
- Before each commit: `python3 -m pytest scripts/wikisource/tests -q` passes, and `python3 scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` reports `0 error(s)`.

## Review Focus

1. Template names and parameter keys (`margin-width=`, `text=`, `{{verse|`, `[[File:…]]`) and `<pagequality … user="…"/>` must not count as letters. A page whose only change is the `pagequality` user or level has no findings. → Task 1, `test_markup_not_counted`, `test_pagequality_ignored`.
2. Composed `ō` and decomposed `ō` count as the same macron. → Task 1, `test_macron_nfd_equivalence`.
3. A page that isn't in `HEAD` (new file), or a pages directory outside any git repository (pytest `tmp_path`), gets no fidelity check and no crash. → Task 3, `test_lint_no_baseline`.
4. `--allow-loss` or `--allow-shift` without `--reason` exits non-zero before linting or posting. → Task 2, `test_overrides_require_reason`.
5. `wikipost` compares the text it would actually post (after `preserve_pagequality`) against live, and a refused page is counted as skipped while the rest of the range continues. → Task 4, `test_post_refuses_loss_and_continues`.

---

## File structure

- Create `scripts/wikisource/fidelity.py`: feature table, `count`, `compare`, override parsing, `refusals`.
- Create `scripts/wikisource/tests/conftest.py`: adds `scripts/wikisource` to `sys.path`.
- Create `scripts/wikisource/tests/test_fidelity.py`, `test_lint_fidelity.py`, `test_wikipost_guard.py`.
- Modify `scripts/wikisource/lint.py`: `fidelity_vs_head()`, argument parsing for the override flags.
- Modify `scripts/wikisource/wikipost.py`: guard before `w.edit`, plus override flags.
- Modify `AGENTS.md` (dagger rule).
- Create `docs/audits/2026-11-20-live-vs-committed.md` (Task 5 output).

---

### Task 1: `fidelity.py` — feature counting and comparison

**Files:**
- Create: `scripts/wikisource/fidelity.py`
- Create: `scripts/wikisource/tests/conftest.py`
- Test: `scripts/wikisource/tests/test_fidelity.py`

**Interfaces:**
- Produces:
  - `FEATURES: dict[str, Feature]`
  - `Feature = NamedTuple(name: str, guard: str, sibling: str | None)`, where `guard` is `'decrease'`, `'increase'` or `'info'`
  - `plain(text: str) -> str`
  - `count(text: str) -> collections.Counter`
  - `Finding = NamedTuple(feature: str, kind: str, before: int, after: int)`, where `kind` is `'loss'` or `'shift'`
  - `compare(before: str, after: str) -> list[Finding]`

**Feature table (exact names; later tasks and docs refer to them):**

| name | counts (on `plain()` text unless noted) | guard | sibling |
|---|---|---|---|
| `ls` | `ſ` (after `{{ls}}`→`ſ`) | decrease | `s` |
| `s` | round `s`/`S` | info | — |
| `macron` | U+0304 + U+0303 in NFD | decrease | — |
| `ae` | `æ`, `Æ` | decrease | — |
| `oe` | `œ`, `Œ` | decrease | — |
| `etc` | `&c` | decrease | — |
| `vv` | `vv`, `VV`, `Vv` | decrease | `w` |
| `w` | `w`, `W` | increase | — |
| `v_initial` | word-initial `v`/`V` | decrease | `u_initial` |
| `u_initial` | word-initial `u`/`U` | info | — |
| `j` | `j`, `J` | increase | — |
| `dquote` | `"` `“` `”` in the body | increase | — |
| `italic` | `''` toggles (raw text, regex `(?<!')''(?!')`) + `<i>` | decrease | — |
| `sc` | `{{sc\|` (raw) | decrease | — |
| `sup_bar` | `{{sup\|‖}}` (raw) | decrease | — |
| `margin_note` | `{{MarginNote\|` (raw) | decrease | — |
| `verse` | `{{verse\|` (raw) | decrease | — |
| `dagger` | `†` | decrease | — |

`plain(text)` does the following:
1. Replaces `{{ls}}` with `ſ`.
2. Drops `<pagequality …/>`, other HTML tags, and `[[File:…]]` links.
3. Removes template names (`{{name|` → empty, `}}` → empty) and `key=` parameter prefixes, keeping parameter values. Values are print text: margin notes, running heads.

`compare` emits:
- For each `decrease` feature with `after < before`: kind `'shift'` if its sibling increased, else `'loss'`.
- For each `increase` feature with `after > before`: kind `'loss'`.
- `info` features never produce a finding.

- [ ] **Step 1: Write the failing tests** in `tests/test_fidelity.py` (conftest inserts `Path(__file__).parents[1]` into `sys.path`):

```python
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
```

Note: in `test_long_s_wipe_is_loss`, ſ→s raises the sibling `s`, so it is a *shift* (still guarded). The name records the case it pins.

- [ ] **Step 2: Run them to make sure they fail**
  Run `python3 -m pytest scripts/wikisource/tests/test_fidelity.py -q`. Expected: `ModuleNotFoundError: No module named 'fidelity'`.
- [ ] **Step 3: Implement `fidelity.py`** with the table above as `FEATURES` and the four functions listed under Interfaces. Count macrons with `unicodedata.normalize('NFD', plain_text)`. Use word boundaries `(?<![^\W\d_])` for `*_initial`, and treat `ſ` as a letter.
- [ ] **Step 4: Run the tests to make sure they pass** (same command, `9 passed`).
- [ ] **Step 5: Smoke-test on real pages.** Run `python3 -c "import sys; sys.path.insert(0,'scripts/wikisource'); import fidelity, pathlib; t=pathlib.Path('wikisource/1582-rhemes-nt/pages/115.wiki').read_text(); print(fidelity.compare(t,t), fidelity.count(t)['ls'] > 0)"`. Expected: `[] True`.
- [ ] **Step 6: Commit** `scripts/wikisource/fidelity.py` and `scripts/wikisource/tests/` with the message `feat(wikisource): fidelity feature counter and loss/shift comparison`.

### Task 2: Overrides and refusals

**Files:**
- Modify: `scripts/wikisource/fidelity.py`
- Test: `scripts/wikisource/tests/test_fidelity.py`

**Interfaces:**
- Consumes: `Finding`, `compare` (Task 1)
- Produces:
  - `Overrides = NamedTuple(loss: list[tuple[str, int, int]], shift: list[tuple[str, int, int]], reason: str)`. Each tuple is `(feature, first_page, last_page)`; `*` is `(feature, 0, 10**9)`.
  - `parse_overrides(argv: list[str]) -> Overrides`. It reads the repeatable flags `--allow-loss`, `--allow-shift` and `--reason`, with comma lists inside each flag, and raises `SystemExit` with a message when a flag is given without `--reason`.
  - `strip_override_args(argv: list[str]) -> list[str]`: argv without those flags and their values.
  - `refusals(page: int, before: str, after: str, ov: Overrides) -> list[str]`: one message per finding not covered by the override of the same kind. The format is `f'{feature} {kind} {before}→{after}'`.

- [ ] **Step 1: Write the failing tests.**

```python
import pytest
from fidelity import parse_overrides, strip_override_args, refusals

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
```

- [ ] **Step 2: Run them to make sure they fail** with `python3 -m pytest scripts/wikisource/tests/test_fidelity.py -q`. Expected: ImportError.
- [ ] **Step 3: Implement the three functions** in `fidelity.py`.
- [ ] **Step 4: Run them to make sure they pass.**
- [ ] **Step 5: Commit** with the message `feat(wikisource): scoped --allow-loss/--allow-shift overrides with required reason`.

### Task 3: Lint against git `HEAD`

**Files:**
- Modify: `scripts/wikisource/lint.py` (`lint()` at :81, `main()` at :220)
- Test: `scripts/wikisource/tests/test_lint_fidelity.py`

**Interfaces:**
- Consumes: `refusals`, `parse_overrides`, `strip_override_args` (Task 2)
- Produces:
  - `fidelity_vs_head(d: str | Path, ov: Overrides) -> list[tuple[str, int, str]]`, with codes `E-loss` and `E-shift`. The message is the refusal plus `' vs HEAD'`.
  - `lint(d, ov=None)` appends these findings when `ov` is given. `main()` always passes the parsed overrides, so the CLI checks fidelity by default.

Baseline: run `git -C <d> show HEAD:./<n>.wiki`. A non-zero exit (the file isn't in `HEAD`, or the directory isn't in a repository) means no baseline for that page. Reading all 451 pages one at a time is acceptable; `git cat-file --batch` is fine if it's simpler.

- [ ] **Step 1: Write the failing tests.** Use `tmp_path` and `subprocess` to run `git init`, write `1.wiki`, commit with `-c user.email=t@t -c user.name=t`, then rewrite the file:

```python
def test_lint_flags_long_s_loss(git_pages):      # HEAD 'Pa{{ls}}{{ls}}ion', worktree 'Passion'
    codes = {c for c, n, m in lint.lint(git_pages, fidelity.parse_overrides([]))}
    assert 'E-shift' in codes

def test_lint_override_clears(git_pages):
    ov = fidelity.parse_overrides(['--allow-shift', 'ls:1', '--reason', 'test'])
    assert not [r for r in lint.lint(git_pages, ov) if r[0] in ('E-loss', 'E-shift')]

def test_lint_no_baseline(tmp_path):              # plain dir, no git; and a new untracked page in a repo
    (tmp_path / '1.wiki').write_text('Passion')
    assert not [r for r in lint.lint(tmp_path, fidelity.parse_overrides([])) if r[0] in ('E-loss', 'E-shift')]

def test_cli_exit_codes(git_pages):               # subprocess: plain -> 1; with --allow-shift ls:* --reason r -> 0
    ...
```

  In `test_cli_exit_codes`, assert the return codes `1` and `0` by running `[sys.executable, '-I', LINT, str(git_pages), '--quiet']`.
- [ ] **Step 2: Run them to make sure they fail** with `python3 -m pytest scripts/wikisource/tests/test_lint_fidelity.py -q`.
- [ ] **Step 3: Implement.** Add `fidelity_vs_head`. In `main()`:
  - Call `ov = fidelity.parse_overrides(args)`, then `args = fidelity.strip_override_args(args)`, before the existing `--only`/`--skip` handling.
  - Pass `ov` to `lint()`.
  - Update the module docstring's usage line to show the override flags.
- [ ] **Step 4: Run them to make sure they pass.**
- [ ] **Step 5: Run the real tree.** `python3 scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` should still report `0 error(s)` (worktree == HEAD). Then try a temporary loss: `sed -i '' 's/{{ls}}/s/' wikisource/1582-rhemes-nt/pages/115.wiki`, run lint, and expect `E-shift`, exit 1. Restore with `git checkout wikisource/1582-rhemes-nt/pages/115.wiki`.
- [ ] **Step 6: Commit** with the message `feat(wikisource): lint refuses print-feature loss vs HEAD (E-loss/E-shift)`.

### Task 4: `wikipost` guard against the live revision

**Files:**
- Modify: `scripts/wikisource/wikipost.py` (`main()` at :118; edit branch at :201-215; create branch untouched, since there is no baseline)
- Test: `scripts/wikisource/tests/test_wikipost_guard.py`

**Interfaces:**
- Consumes: `parse_overrides`, `strip_override_args`, `refusals` (Task 2); the existing `preserve_pagequality(ours, live)` and `Wiki.live/edit/login`.
- Produces: no new API. Behaviour:
  - Parse the overrides first and strip them from `a`.
  - When the run uses overrides, pass the same flags to the lint subprocess.
  - In the update branch, compute `ours_post = preserve_pagequality(ours, live['text'])` **before** the guard and run `refusals(n, live['text'], ours_post, ov)`.
  - If that returns anything, print `f'{n}: REFUSED fidelity vs live rev {live["revid"]}: ' + '; '.join(msgs)`, increment `skipped`, and `continue`. This applies in dry-run too, so the problem shows up without posting.

- [ ] **Step 1: Write the failing test.**
  - Monkeypatch `wikipost.Wiki` with a fake: `login()` returns `'Bot@x'`; `live(n)` returns `{'text': 'Pa{{ls}}{{ls}}ion', 'revid': 7, 'user': 'Bot'}` for page 1 and `{'text': 'old', 'revid': 8, 'user': 'Bot'}` for page 2; `edit()` records `n` and returns `{'edit': {'newrevid': 9}}`.
  - Monkeypatch `wikipost.ROOT` to a `tmp_path` with `pages/1.wiki = 'Passion'`, `pages/2.wiki = 'new'` and `manifest.json = '{}'`.
  - Monkeypatch `wikipost.time.sleep` to a no-op.
  - Set `sys.argv = ['wikipost.py', '1-2', '--post', '--summary', 's']`.

```python
def test_post_refuses_loss_and_continues(fake_env, capsys):
    wikipost.main()
    out = capsys.readouterr().out
    assert '1: REFUSED fidelity' in out and fake_env.edited == [2]

def test_post_override_allows(fake_env):
    sys.argv += ['--allow-shift', 'ls:1', '--reason', 'per XML']
    wikipost.main()
    assert fake_env.edited == [1, 2]
```

- [ ] **Step 2: Run it to make sure it fails.** The command is `python3 -m pytest scripts/wikisource/tests/test_wikipost_guard.py -q`. Expected: page 1 gets edited.
- [ ] **Step 3: Implement** the behaviour described under Interfaces. Add the override flags to the usage docstring.
- [ ] **Step 4: Run the full suite** with `python3 -m pytest scripts/wikisource/tests -q` and make sure everything passes.
- [ ] **Step 5: Commit** with the message `feat(wikisource): wikipost refuses posts that lose print features vs live`.

### Task 5: Fix the AGENTS.md rule and record live-vs-committed drift (read-only)

**Files:**
- Modify: `AGENTS.md:63`
- Create: `docs/audits/2026-11-20-live-vs-committed.md`

- [ ] **Step 1: Fix the rule.** Replace `AGENTS.md:63`, "Use standard `†` marks following verse numbers (except verse 1).", with: "No `†` after `{{verse|…}}` markers: an editorial decision by the owner. Verse numbers can't sit in the margin because of reflow, so the print's verse-start † has no purpose there (removed in cff02c6f; lint `W-mark` enforces it). This is the only print mark removed; never remove any other." Add a line under §Orthography: "Before and after any change to pages or data, `lint.py` must report 0 errors; `E-loss`/`E-shift` mean a print feature was lost: fix the cause, do not override, unless the owner approved the change."
- [ ] **Step 2: Fetch live text read-only.** Run `python3 -I scripts/wikisource/wikifetch.py 1-451 <scratchpad>/live`. Expected: 451 `.wiki` files plus `revs.json`; its printed diff list.
- [ ] **Step 3: Compare with the committed pages.** For each page, compare the committed and live text after `wikipost.norm` (which ignores `pagequality`), and run `fidelity.compare(committed, live)` on the pages that differ. Write the report:
  - the number identical, and the pages that differ, each with its last live editor (`revs.json` user) and fidelity findings;
  - the pages whose live revid ≠ `manifest.json` revid.
  - Expected shape: a table of under 60 lines, plus a one-line verdict "committed == live except: …".
- [ ] **Step 4: Run the gates.** Full pytest passes; lint reports `0 error(s)`.
- [ ] **Step 5: Commit** `AGENTS.md` and the audit with the message `docs(wikisource): fix verse-dagger rule; record live vs committed drift`.

---

Phase 1 (reconcile) gets its own plan, written from the Task 5 report and the per-book drift classification.
