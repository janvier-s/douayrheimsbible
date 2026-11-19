#!/usr/bin/env python3
"""Audit front matter pages 1-30 against EEBO-TCP A16049.xml.
"""
import re
import sys
import unicodedata
from pathlib import Path

def clean_wiki_body(text):
    text = re.sub(r'<noinclude>.*?</noinclude>', '', text, flags=re.S)
    text = text.replace('{{ls}}', 'ſ')
    text = text.replace("''", "")
    # iteratively remove templates except we already extracted notes
    while True:
        new_text = re.sub(r'\{\{[^{}]*\}\}', '', text)
        if new_text == text:
            break
        text = new_text
    return text

def extract_wiki_notes(text):
    notes = []
    for m in re.finditer(r'\{\{MarginNote\|([^}]+)\}\}', text):
        params = m.group(1)
        margin = 'left' if 'margin=left' in params else ('right' if 'margin=right' in params else 'unknown')
        text_match = re.search(r'text=(.*)', params, re.S)
        note_text = text_match.group(1).strip() if text_match else ''
        notes.append((margin, note_text))
    return notes

def norm(w):
    w = unicodedata.normalize('NFC', w)
    w = w.lower().replace('ſ', 's').replace('v', 'u').replace('j', 'i')
    w = re.sub(r'[^a-z0-9]', '', w)
    return w

def main():
    repo_root = Path('/Users/Janvier/Documents/Bible-n-stuff/Websites/douayrheimsbible')
    xml_path = repo_root / 'sources/eebo-tcp/A16049.xml'
    draft_dir = repo_root / 'wikisource/1582-rhemes-nt/front-draft'

    with open(xml_path, encoding='utf-8') as f:
        xml = f.read()

    front_idx = xml.find('<front>')
    body_idx = xml.find('<body>')
    
    # We also want the intro in <body> (Pages 29 & 30)
    # The first scripture text is Matthew (div type="book" or pbs for Matthew)
    matt_idx = xml.find('<head>THE HOLY GOSPEL OF IESVS CHRIST ACCORDING TO MATTHEVV.</head>')
    if matt_idx == -1:
        matt_idx = xml.find('MATTHEVV')
    
    full_front_xml = xml[front_idx:matt_idx]

    pbs = list(re.finditer(r'<pb\s+facs=\"([^\"]+)\"[^>]*/>', full_front_xml))
    print(f'Found {len(pbs)} pb tags in front + intro.')

    # The pb tags sequence:
    # 0: tcp:2646:1 (blank before title)
    # 1: tcp:2646:1 (Page 1: Title page)
    # 2: tcp:2646:2 (Page 2: Approbation)
    # 3: tcp:2646:2 (Page 3: Preface start)
    # ...
    # Let's map pb index to page number
    # pbs[i] -> Page i (for i >= 1)
    for page_num in range(1, 31):
        wiki_file = draft_dir / f'{page_num}.wiki'
        if not wiki_file.exists():
            print(f'Page {page_num}: WIKI FILE MISSING!')
            continue

        with open(wiki_file, encoding='utf-8') as f:
            wiki_content = f.read()

        wiki_notes = extract_wiki_notes(wiki_content)

        # XML slice
        pb_idx = page_num  # since pbs[0] is blank title lead-in
        if pb_idx < len(pbs):
            start = pbs[pb_idx].start()
            end = pbs[pb_idx+1].start() if pb_idx+1 < len(pbs) else len(full_front_xml)
            p_xml = full_front_xml[start:end]
            xml_notes_raw = re.findall(r'<note[^>]*>(.*?)</note>', p_xml, re.S)
            xml_notes = [re.sub(r'<[^>]+>', ' ', n).strip() for n in xml_notes_raw]
        else:
            xml_notes = []
            p_xml = ''

        is_even = (page_num % 2 == 0)
        outer = 'left' if is_even else 'right'
        inner = 'right' if is_even else 'left'

        even_str = "even (verso)" if is_even else "odd (recto)"
        print(f'=== Page {page_num} ({even_str}) ===')
        print(f'  XML notes: {len(xml_notes)}, Wiki notes: {len(wiki_notes)}')
        if len(xml_notes) != len(wiki_notes):
            print(f'  [MISMATCH] XML has {len(xml_notes)} notes, Wiki has {len(wiki_notes)} notes!')
            for i, xn in enumerate(xml_notes):
                print(f'    XML note {i+1}: {repr(xn[:60])}')
            for i, (m, wn) in enumerate(wiki_notes):
                print(f'    Wiki note {i+1} ({m}): {repr(wn[:60])}')
        else:
            # check margin orientations
            for m, wn in wiki_notes:
                # check if margin matches expected
                pass

if __name__ == '__main__':
    main()
