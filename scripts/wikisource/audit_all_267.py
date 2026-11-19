import json
import re

with open('docs/audits/matthew_267_full.json', 'r', encoding='utf-8') as f:
    gaps = json.load(f)

# The 17 Greek replacements
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

# Load wiki pages
wiki = {}
for p in range(31, 114):
    with open(f'wikisource/1582-rhemes-nt/pages/{p}.wiki', 'r', encoding='utf-8') as wf:
        wiki[p] = wf.read()

# Load odr-original text
with open('static/data/odr-original/matthew.json', 'r', encoding='utf-8') as mf:
    odr_mat = json.load(mf)

odr_annot = {}
for ch in range(1, 29):
    try:
        with open(f'static/data/odr-original/matthew/annotations/{ch:03d}.json', 'r', encoding='utf-8') as af:
            odr_annot[ch] = json.load(af)
    except Exception:
        pass

print("Loaded all reference corpora.")
