"""Reads and writes data JSON in each file's own format.

The data files come in two formats: compact (separators=(',', ':')) and pretty-printed
with indent=2, either with or without a trailing newline. Rewriting a file in the other
format turns a one-line fix into a whole-file diff, so write_like() keeps what it finds.
Both formats round-trip byte for byte through json.loads + write_like (checked on all
odr / odr-original files).
"""
import json
from pathlib import Path


def detect(text):
    """(indent or None, trailing newline) of a JSON text."""
    indent = None
    if text.startswith(('{\n', '[\n')):
        second = text.split('\n', 2)[1]
        indent = len(second) - len(second.lstrip(' '))
    return indent, text.endswith('\n')


def dumps_like(obj, text):
    indent, nl = detect(text)
    if indent is None:
        out = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    else:
        out = json.dumps(obj, ensure_ascii=False, indent=indent)
    return out + ('\n' if nl else '')


def write_like(path, obj):
    """Writes obj to path in the format the file has on disk now (compact if new)."""
    path = Path(path)
    current = path.read_text() if path.exists() else ''
    path.write_text(dumps_like(obj, current))
