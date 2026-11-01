#!/usr/bin/env python3
"""Insert explanatory comments into source files WITHOUT changing any code.

usage: annotate.py <spec.json>
spec = { "<file>": { "header": "<file header text>", "notes": [["<unique anchor text on a line>", "<comment>"], ...] } }
- The header is added at the top (after a shebang) unless the file already starts with it.
- Each note becomes a `//` (JS/TS) or `/* */` (CSS) comment on the line(s) above the FIRST line containing the anchor,
  with that line's indentation. Notes already present are not added twice.
"""
import json, sys, textwrap
spec = json.load(open(sys.argv[1]))
for path, cfg in spec.items():
    src = open(path, encoding='utf8').read()
    css = path.endswith('.css')
    lines = src.split('\n')
    for anchor, note in cfg.get('notes', []):
        idx = next((i for i, l in enumerate(lines) if anchor in l), None)
        if idx is None:
            print(f'!! {path}: anchor not found: {anchor[:60]}'); continue
        ind = lines[idx][:len(lines[idx]) - len(lines[idx].lstrip())]
        wrapped = textwrap.wrap(note, 112 - len(ind)) or ['']
        block = [f'{ind}/* {w} */' for w in wrapped] if css else [f'{ind}// {w}' for w in wrapped]
        if idx >= len(block) and lines[idx - len(block):idx] == block: continue
        lines[idx:idx] = block
    out = '\n'.join(lines)
    hdr = cfg.get('header')
    if hdr:
        h = '/**\n' + '\n'.join(' * ' + l if l else ' *' for l in hdr.strip('\n').split('\n')) + '\n */\n'
        if not out.startswith(h):
            out = h + out
    open(path, 'w', encoding='utf8').write(out)
    print('annotated', path)
