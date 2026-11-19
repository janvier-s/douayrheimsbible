import re
import sys
import unicodedata
import xml.etree.ElementTree as ET

# Dictionary of replacements for all 71 content gaps in the Gospel of Mark
replacements = {
    1: '<note n="`" place="margin">the prophets</note>`',  # Mark 1:2: `the prophets` variant note & quote anchor
    2: '″',                                               # Mark 1:5: annotation marker before 'confeſsing'
    3: '″',                                               # Mark 1:5: annotation marker before 'their ſinnes'
    4: '″',                                               # Mark 1:6: annotation marker before 'clothed'
    5: '″',                                               # Mark 1:8: annotation marker before 'vvith vvater'
    6: '″',                                               # Mark 1:10: annotation marker before 'the Spirit'
    7: '″',                                               # Mark 1:12: annotation marker before 'the deſert'
    8: 'u',                                               # Mark 1:6 annot: li[u]ed
    9: 'a',                                               # Mark 1:6 annot: M[a]t. c. 3.
    10: '15',                                             # Mark 2 argument: in earth, [15] and his eating
    11: 'o',                                              # Mark 2 argument: Phyſici[o]n
    12: '18',                                             # Mark 2 argument: bodies): [18] then alſo
    13: 'e',                                              # Mark 2 argument: [e]ares of corne
    14: '″',                                              # Mark 2:4: annotation marker before 'vncouered'
    15: '″',                                              # Mark 2:5: annotation marker before 'ſicke of the palſey'
    16: '″',                                              # Mark 2:5: annotation marker before 'thy ſinnes'
    17: '″',                                              # Mark 2:10: annotation marker before 'the Sonne of man'
    18: '″',                                              # Mark 2:10: annotation marker before 'in earth'
    19: '″',                                              # Mark 2:25: annotation marker before 'in neceſsitie'
    20: '2',                                              # Mark 2:25 note: Amb. li. [2] off. c. 28.
    21: '2',                                              # Mark 3 argument: [2]0 He ſo occupieth
    22: '3',                                              # Mark 3 argument: [3]1 That the Ievves
    23: 'ee',                                             # Mark 3:12 note: Hiero. in 7 Oſ[ee].
    24: '.',                                              # Mark 3:14 note: Act. 1[.].
    25: '6',                                              # Mark 3:17 note: Mt. 1[6].
    26: '9.',                                             # Mark 3:24 note: Greg. li. [9.] ep. 3.
    27: 'b',                                              # Mark 4 argument: [b]e as the litle
    28: '28',                                             # Mark 4:12 note: Act. [28].
    29: 'e',                                              # Mark 5:39 note: S[e]r. 44.
    30: '8',                                              # Mark 5:28 note lemma: 2[8]. If I ſhal touch.]
    31: '3',                                              # Mark 6:3 note lemma: [3]. The carpenter.)
    32: 'I',                                              # Mark 6:9 note: in [I]evvry
    33: '2',                                              # Mark 6:9 note: li. [2] c. 30 de conſenſu
    34: 'f',                                              # Mark 7 argument: de[f]i[l]e
    35: 'l',                                              # Mark 7 argument: defi[l]e
    36: 'm',                                              # Mark 7 argument: du[m]me
    37: '28',                                             # Mark 7:7 note: Act. 15, [28]. 41.
    38: '2',                                              # Mark 7:7 note: 2 Theſſal. [2], 15.
    39: '<foreign xml:lang="grc">εὐλογήσας αὐτὰ</foreign>', # Mark 8:7 note: Greek reading
    40: 'f',                                              # Mark 8:7 note: [f]eine it alwaies
    41: 't',                                              # Mark 9:2: [t]aketh Peter
    42: 'C',                                              # Mark 9:12 note: Theod. in [C]aten.
    43: '3',                                              # Mark 9:37 note: Theodoret. li. [3] c. 3
    44: '8',                                              # Mark 10 argument: perfect: 2[8] as alſo
    45: '2',                                              # Mark 10:35 note: Mt. 20, [2]0.
    46: 'e',                                              # Mark 11:17 note lemma: 17. D[e]nne of theeues.]
    47: 's',                                              # Mark 12 argument: Moyſes and the Prophet[s]
    48: 'r',                                              # Mark 12:25: no[r] be married
    49: 'then',                                           # Mark 12:17 note: and [then] the Prince.
    50: 'not',                                            # Mark 12:19 note: Thou ſhalt [not] marry
    51: 're',                                             # Mark 12:19 note: we[re] againſt nature
    52: 't',                                              # Mark 12:24 note: knoweth no[t] the Scriptures
    53: '2',                                              # Mark 12:26 note: Mat. 1[2]. 32.
    54: 't',                                              # Mark 13 argument: [t]o
    55: 'ech',                                            # Mark 13 argument: [ech] one particularly
    56: '″',                                              # Mark 13:4: annotation marker before 'vvhen ſhal theſe things'
    57: 'æ',                                              # Mark 13:32 note: Agnoït[æ]
    58: '5 c. 8',                                         # Mark 13:32 note: Ambr. de fide li. [5 c. 8].
    59: '1',                                              # Mark 14:21 note: Pſ. 40, [1]0.
    60: 'a',                                              # Mark 14:27 note: Z[a]ch. 13, 7.
    61: 's',                                              # Mark 14:66 note: Caipha[s]
    62: '22',                                             # Mark 14:24 note lemma: [22]. 24. My bodie, My bloud.]
    63: '6',                                              # Mark 15 argument: Gentil. [6] And (he ſeeking
    64: '2',                                              # Mark 15 argument: Gentils. [2]9 Vvhich the Ievves
    65: '2',                                              # Mark 15:28 note: Eſa. 53, 1[2].
    66: 'e',                                              # Mark 15:29 note: deſtroi[e]ſt
    67: '1',                                              # Mark 15:11 note: Hiſt. li. [1] c. 6.
    68: '3',                                              # Mark 16:16 note: Io. 16, 1[3].
    69: '15',                                             # Mark 15:15 note lemma: [15]. To ſatiſfie the people.]
    70: '4',                                              # Mark 15:46 note lemma: [4]6. Bying ſindon.]
    71: 'e',                                              # Mark 16 argument: Galile[e].
}

def backfill_and_tag(xml_path):
    print(f"Reading {xml_path}...")
    with open(xml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    m_start = content.find('<div n="Mark" type="gospel">')
    m_end = content.rfind('<div type="argument">', 0, content.find('<head>THE ARGVMENT OF S. LVKES GOSPEL.</head>'))

    if m_start == -1 or m_end == -1:
        print("Error: Mark div boundary not found!")
        sys.exit(1)

    mark_xml = content[m_start:m_end]

    # Find all gaps in Mark
    gap_regex = re.compile(r'<gap\b[^>]*>.*?</gap>', re.DOTALL)
    all_gaps = list(gap_regex.finditer(mark_xml))
    print(f"Total gaps in Mark: {len(all_gaps)}")

    if len(all_gaps) != 71:
        print(f"Error: expected 71 gaps in Mark, found {len(all_gaps)}")
        sys.exit(1)

    if len(replacements) != 71:
        print(f"Error: replacement dictionary has {len(replacements)} items, expected 71")
        sys.exit(1)

    new_mark = mark_xml
    # Replace in reverse order so character offsets remain valid
    for idx in range(len(all_gaps), 0, -1):
        g = all_gaps[idx - 1]
        start, end = g.span()
        repl = replacements[idx]
        new_mark = new_mark[:start] + repl + new_mark[end:]

    # Post-gap typo correction:
    # Gap 38: "2 Theſſal. 2, 61." -> "2 Theſſal. 2, 15." (EEBO-TCP misread 15 as 61)
    if '2 Theſſal. 2, 61.' in new_mark:
        new_mark = new_mark.replace('2 Theſſal. 2, 61.', '2 Theſſal. 2, 15.')
        print("Corrected EEBO-TCP misreading: 2 Theſſal. 2, 61. -> 2 Theſſal. 2, 15.")

    # Apply Small Caps Typography (<hi rend="smallcaps">)
    # 1. Drop initials across all 16 chapters
    new_mark = new_mark.replace('<seg rend="decorInit">T</seg>HE', '<seg rend="decorInit">T</seg><hi rend="smallcaps">He</hi>')
    new_mark = new_mark.replace('<seg rend="decorInit">I</seg>N', '<seg rend="decorInit">I</seg><hi rend="smallcaps">N</hi>')
    new_mark = new_mark.replace('<seg rend="decorInit">A</seg>ND', '<seg rend="decorInit">A</seg><hi rend="smallcaps">Nd</hi>')

    # 2. Division & Liturgical Rubrics
    new_mark = new_mark.replace(
        '<note place="margin">THE FIRST part of this Goſpel: of the prepara<g ref="char:EOLhyphen"/>tio<g ref="char:cmbAbbrStroke">̄</g> to Chriſts manifeſta<g ref="char:EOLhyphen"/>tion.</note>',
        '<note place="margin"><hi rend="smallcaps">The firſt</hi> part of this Goſpel: of the prepara<g ref="char:EOLhyphen"/>tio<g ref="char:cmbAbbrStroke">̄</g> to Chriſts manifeſta<g ref="char:EOLhyphen"/>tion.</note>'
    )
    new_mark = new_mark.replace(
        '<note place="margin">THE SE<g ref="char:EOLhyphen"/>COND part of this Goſ<g ref="char:EOLhyphen"/>pel: of Chriſts ma<g ref="char:EOLhyphen"/>nifeſtation.</note>',
        '<note place="margin"><hi rend="smallcaps">The ſe<g ref="char:EOLhyphen"/>cond</hi> part of this Goſ<g ref="char:EOLhyphen"/>pel: of Chriſts ma<g ref="char:EOLhyphen"/>nifeſtation.</note>'
    )
    new_mark = new_mark.replace(
        '<note place="margin">THE THIRD part of this Goſpel, Chri<g ref="char:EOLunhyphen"/>ſtes co<g ref="char:cmbAbbrStroke">̄</g>ming into Iewrie toward his Paſſion.</note>',
        '<note place="margin"><hi rend="smallcaps">The third</hi> part of this Goſpel, Chri<g ref="char:EOLunhyphen"/>ſtes co<g ref="char:cmbAbbrStroke">̄</g>ming into Iewrie toward his Paſſion.</note>'
    )
    new_mark = new_mark.replace(
        '<note place="margin">THE fourth part of this Goſpel, the Holy weeke of his Paſ<g ref="char:EOLhyphen"/>ſion in Hie<g ref="char:EOLhyphen"/>ruſalem.</note>',
        '<note place="margin"><hi rend="smallcaps">The fourth</hi> part of this Goſpel, the Holy weeke of his Paſ<g ref="char:EOLhyphen"/>ſion in Hie<g ref="char:EOLhyphen"/>ruſalem.</note>'
    )
    new_mark = new_mark.replace('<note place="margin">PALME-Sunday.</note>', '<note place="margin"><hi rend="smallcaps">Palme-Sunday</hi>.</note>')
    new_mark = new_mark.replace('<note place="margin">MVNDAY.</note>', '<note place="margin"><hi rend="smallcaps">Mvnday</hi>.</note>')
    new_mark = new_mark.replace('<note place="margin">TVESDAY.</note>', '<note place="margin"><hi rend="smallcaps">Tveſday</hi>.</note>')
    new_mark = new_mark.replace('<note place="margin">TVESDAY night.</note>', '<note place="margin"><hi rend="smallcaps">Tveſday</hi> night.</note>')
    new_mark = new_mark.replace(
        '<note place="margin">THE PASSION according to S. Marke in theſe tvvo chapters, is the Goſpel at Maſſe vpon Tueſday in the Holy weeke.</note>',
        '<note place="margin"><hi rend="smallcaps">The Paſſion</hi> according to S. Marke in theſe tvvo chapters, is the Goſpel at Maſſe vpon Tueſday in the Holy weeke.</note>'
    )
    new_mark = new_mark.replace('<note place="margin">TENEBRE Weneſday.</note>', '<note place="margin"><hi rend="smallcaps">Tenebre</hi> Weneſday.</note>')
    new_mark = new_mark.replace('<note place="margin">MAVNDY Thurſday.</note>', '<note place="margin"><hi rend="smallcaps">Mavndy</hi> Thurſday.</note>')
    new_mark = new_mark.replace('<note place="margin">THVRSDAY night.</note>', '<note place="margin"><hi rend="smallcaps">Thvrſday</hi> night.</note>')
    new_mark = new_mark.replace('<note place="margin">GOOD FRI<g ref="char:EOLhyphen"/>DAY.</note>', '<note place="margin"><hi rend="smallcaps">Good Fri<g ref="char:EOLhyphen"/>day</hi>.</note>')
    new_mark = new_mark.replace('<note place="margin">EASTER DAY.</note>', '<note place="margin"><hi rend="smallcaps">Eaſter Day</hi>.</note>')

    # 3. Words of Institution & Titulus
    new_mark = new_mark.replace(
        'Take, THIS IS ″ MY BODY.',
        'Take, <hi rend="smallcaps">This is ″ my body</hi>.'
    )
    new_mark = new_mark.replace(
        'THIS IS ″ MY BLOVD OF THE NEVV TESTAMENT, THAT SHAL BE SHED FOR MANY.',
        '<hi rend="smallcaps">This is ″ my blovd of the nevv teſtament, that ſhal be ſhed for many</hi>.'
    )
    new_mark = new_mark.replace(
        'ſuperſcribed, KING OF THE IEWES.',
        'ſuperſcribed, <hi rend="smallcaps">King of the Iewes</hi>.'
    )

    # 4. Sacred Names & Specific Names
    new_mark = new_mark.replace('Goſpel of IESVS CHRIST the ſonne of God', 'Goſpel of <hi rend="smallcaps">Iesvs Christ</hi> the ſonne of God')
    new_mark = new_mark.replace('the ſonne of MARIE', 'the ſonne of <hi rend="smallcaps">Marie</hi>')
    new_mark = new_mark.replace('His Sonne is CHRIST our Sauiour', 'His Sonne is <hi rend="smallcaps">Christ</hi> our Sauiour')
    new_mark = new_mark.replace('<note n="⸬" place="margin">CHRIST is become', '<note n="⸬" place="margin"><hi rend="smallcaps">Christ</hi> is become')
    new_mark = new_mark.replace('the name BOANERGES is giuen', 'the name <hi rend="smallcaps">Boanerges</hi> is giuen')

    # 5. Remaining IESVS in Mark (excluding the book title head)
    title_str = '<head>THE HOLY GOSPEL OF IESVS CHRIST ACCOR<g ref="char:EOLhyphen"/>DING TO MARKE.'
    if title_str not in new_mark:
        print("Error: book title head not found in Mark XML!")
        sys.exit(1)
    head_idx = new_mark.find(title_str) + len(title_str)

    before_head = new_mark[:head_idx]
    after_head = new_mark[head_idx:]

    count_iesvs = len(re.findall(r'\bIESVS\b', after_head))
    print(f"IESVS occurrences to wrap in smallcaps: {count_iesvs}")
    after_head = re.sub(r'\bIESVS\b', '<hi rend="smallcaps">Iesvs</hi>', after_head)

    new_mark = before_head + after_head

    # Construct full updated XML
    full_new = content[:m_start] + new_mark + content[m_end:]

    # Update revisionDesc in teiHeader
    rev_change = """         <change>
            <date>2026-11</date>
            <label>Janvier</label>Audited Gospel of Mark (pp. 114-160); backfilled all 71 content gaps (1 polytonic Greek reading in &lt;foreign xml:lang="grc"&gt;, 70 illegible words, letters, and print markers supplied); tagged small-caps typography (&lt;hi rend="smallcaps"&gt;) across sacred names, drop-cap continuations, Words of Institution, and liturgical rubrics; normalized to Unicode NFC</change>
      </revisionDesc>"""
    if '</revisionDesc>' in full_new and 'Audited Gospel of Mark' not in full_new:
        full_new = full_new.replace('      </revisionDesc>', rev_change)

    # Strict NFC Unicode Normalization
    full_new = unicodedata.normalize('NFC', full_new)

    # Validate well-formedness with ElementTree
    try:
        ET.fromstring(full_new.encode('utf-8'))
        print("XML successfully parsed by ElementTree! Well-formedness verified.")
    except Exception as e:
        print(f"XML parsing ERROR: {e}")
        sys.exit(1)

    with open(xml_path, 'w', encoding='utf-8') as f:
        f.write(full_new)

    print(f"Successfully backfilled and tagged Mark in {xml_path}")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '/Users/Janvier/Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml'
    backfill_and_tag(target)
