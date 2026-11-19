import json
import re
import sys

def main():
    with open('docs/audits/matthew_267_full.json', 'r', encoding='utf-8') as f:
        gaps = json.load(f)

    # Pre-defined Greek replacements (all 17)
    greek_map = {
        13: '<foreign xml:lang="grc">Μετανοεῖν</foreign>',
        14: '<foreign xml:lang="grc">Μετάνοια</foreign>',
        15: '<foreign xml:lang="grc">μετάνοιαν</foreign>',
        28: '<foreign xml:lang="grc">λατρεύσεις</foreign>',
        38: '<foreign xml:lang="grc">Μισθὸς</foreign>',
        49: '<foreign xml:lang="grc">τὸν ἐπιούσιον</foreign>',
        52: '<foreign xml:lang="grc">τὸν ἐπιούσιον</foreign>',
        80: '<foreign xml:lang="grc">μετάνοια</foreign>',
        81: '<foreign xml:lang="grc">οἱ ἐν μετανοίᾳ ὄντες</foreign>',
        82: '<foreign xml:lang="grc">τοὺς μετανοοῦντας</foreign>',
        130: '<foreign xml:lang="grc">χωροῦσι</foreign>',
        243: '<foreign xml:lang="grc">εὐλογεῖν</foreign>',
        244: '<foreign xml:lang="grc">εὐλόγησεν αὐτοὺς</foreign>',
        246: '<foreign xml:lang="grc">τὸν ἄρτον εὐχαριστηθέντα</foreign>',
        251: '<foreign xml:lang="grc">ἐκχυνόμενον</foreign>',
        252: '<foreign xml:lang="grc">κλώμενον</foreign>',
        253: '<foreign xml:lang="grc">διδόμενον</foreign>',
    }

    # Cache wiki pages
    wiki_cache = {}
    for p in range(31, 114):
        path = f'wikisource/1582-rhemes-nt/pages/{p}.wiki'
        try:
            with open(path, 'r', encoding='utf-8') as wf:
                wiki_cache[p] = wf.read()
        except Exception as e:
            wiki_cache[p] = ''

    proposals = {}

    for g in gaps:
        idx = g['idx']
        p = g['wiki_page']
        tag = g['tag']
        pre = g['pre']
        post = g['post']

        if idx in greek_map:
            proposals[idx] = {
                'idx': idx,
                'page': p,
                'type': 'greek',
                'rep': greek_map[idx],
                'note': 'Polytonic Greek'
            }
            continue

        wtext = wiki_cache.get(p, '')

        # Analyze context
        # Check if extent is specified
        ext_m = re.search(r'extent="([^"]+)"', tag)
        extent = ext_m.group(1) if ext_m else 'unknown'

        proposals[idx] = {
            'idx': idx,
            'page': p,
            'extent': extent,
            'tag': tag,
            'pre': pre,
            'post': post
        }

    with open('docs/audits/matthew_267_proposals.json', 'w', encoding='utf-8') as out:
        json.dump(proposals, out, indent=2)

    print(f"Generated proposals skeleton for {len(proposals)} gaps.")

if __name__ == '__main__':
    main()
