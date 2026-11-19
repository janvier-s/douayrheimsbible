import re
import sys
import unicodedata
import xml.etree.ElementTree as ET

# Dictionary of replacements for all 111 content gaps in the Gospel of Luke
replacements = {
    1: 'al',                                               # Luke arg: companion of [al] his peregrination
    2: '7',                                                # Luke 1 arg: Prophecie. 5[7]
    3: 'n',                                                # Luke 1 arg: Circu[n]ciſion
    4: '<foreign xml:lang="grc">δικαιώματα</foreign>',     # Luke 1:6 note: Greek reading
    5: '8',                                                # Luke 1:28 annot: 2[8]. Haile ful of grace.]
    6: '<foreign xml:lang="grc">κεχαριτωμένη. ἐχαρίτωσε.</foreign>', # Luke 1:28 note: Greek reading
    7: 'is',                                               # Luke 1:28 annot: wel [is] ſhe only called
    8: '<foreign xml:lang="grc">ἡλκωμένος.</foreign>',     # Luke 1:28 note: Greek reading
    9: '6',                                                # Luke 1:28 annot: Luc. 1[6], 20
    10: '<foreign xml:lang="grc">ἀνατολὴ</foreign>',       # Luke 1:78 annot: Greek reading
    11: '',                                                # Luke 2:4 verse: Beth[lehem] (gap within word)
    12: ' ',                                               # Luke 2:14 verse: peace to [ ]men
    13: 'S',                                               # Luke 2:29 margin: NVNC DIMITTI[S]
    14: '<foreign xml:lang="grc">λατρέυουσα.</foreign>',   # Luke 2:37 margin: Greek reading
    15: 'i',                                               # Luke 2:42 margin: Epi-phan[i]e
    16: 'cian.',                                           # Luke 2:34 annot note: Aug. quaeſt. ad Simpli[cian.]
    17: '<foreign xml:lang="grc">λατρεύουσα</foreign>',    # Luke 2:37 annot text: Greek reading
    18: '<foreign xml:lang="grc">λατρεία</foreign>',       # Luke 2:37 annot text: Greek reading
    19: '.',                                               # Luke 3:23 annot note: Hier. ep. ad Marcal. [.]
    20: '<foreign xml:lang="grc">λατρεύσεις.</foreign>',   # Luke 4:8 margin: Greek reading
    21: '137',                                             # Luke 4:23 annot note: Aug. ep. [137].
    22: '33',                                              # Luke 5 arg: Phyſicion of ſoules, [33] and his not
    23: '0',                                               # Luke 5:27 margin: Septēb. 2[0].
    24: 'mens',                                            # Luke 5:10 annot title: fiſhing for [mens] ſoules
    25: '3',                                               # Luke 6:13 annot note: Calu. Inſt. li. 4 c. [3].
    26: '14, 4. 14',                                       # Luke 6:13 annot note: Act. [14, 4. 14].
    27: 's',                                               # Luke 7:11 margin: S. Auguſtin[s] mother
    28: '<foreign xml:lang="grc">ἐχαρίσατο.</foreign>',    # Luke 7:21 margin: Greek reading
    29: 'ru',                                              # Luke 8 arg: f[ru]ſtrate (incredulity haue his comming fruſtrate)
    30: '12',                                              # Luke 8:20 annot note: Hilar. in [12]. Mat.
    31: '2',                                               # Luke 8:2 annot lemma: [2]. That did miniſter.]
    32: '2',                                               # Luke 8:2 annot note: 1 Cor. 9, 5. 1[2].
    33: 'c',                                               # Luke 8:20 annot note: Ibidē [c]. 8.
    34: 'F',                                               # Luke 8:55 annot text: Heauen or to Hel. [F]or it can not
    35: '2',                                               # Luke 9 arg: folovv him therein. [2]7 Vvherevnto
    36: '3',                                               # Luke 9 arg: revvard of ſuffering. [3]7 The next day
    37: '<foreign xml:lang="grc">εὐλόγησεν αὐτοὺς:</foreign>', # Luke 9:16 margin: Greek reading
    38: '3',                                               # Luke 9:53 annot note: [3] Reg. 12, 27
    39: 'g',                                               # Luke 9:53 annot note: 3 Re[g]. 12, 27
    40: '12',                                              # Luke 9:53 annot note: 3 Reg. [12], 27
    41: '1',                                               # Luke 9:53 annot note: Tob. [1].
    42: 'o',                                               # Luke 10 arg: crying w[o] to the cities
    43: '5',                                               # Luke 10 arg: happy ſtate. 2[5]. To one of the Scribes
    44: '5',                                               # Luke 10:13 annot note: Aug. li. [5]. c. 5. cont. Iulian.
    45: 'me',                                              # Luke 10:35 annot note: cont. Par[me]n.
    46: '<foreign xml:lang="grc">προσδαπανήσῃς</foreign>', # Luke 10:35 margin: Greek reading
    47: '2',                                               # Luke 10:28 annot note: [2]. Par. 15, 15.
    48: '2',                                               # Luke 10:30 annot note: Conc. Arauſ. [2] cap. 25.
    49: ';',                                               # Luke 10:42 annot text: in Marie[;] repreſenting
    50: '5',                                               # Luke 11 arg: forme of prayer, [5] and exhorteth
    51: '22',                                              # Luke 11 arg: defendeth his doing: [22] foretelling
    52: 're',                                              # Luke 11 arg: authors of the ſaid [re]probation
    53: 'L',                                               # Luke 11:5 margin: Maioribus [L]itanies
    54: '<foreign xml:lang="grc">ὀῖκος ἐπὶ ὀῖκον</foreign>', # Luke 11:17 margin: Greek reading
    55: '<foreign xml:lang="grc">μετενόησαν</foreign>',    # Luke 11:32 margin: Greek reading
    56: '<foreign xml:lang="grc">τὰ ἐνόντα</foreign>',     # Luke 11:41 margin: Greek reading
    57: '<foreign xml:lang="grc">μὴ μετεωρίζεσθε.</foreign>', # Luke 12:29 margin: Greek reading
    58: '13',                                              # Luke 12:35 annot note: Gregor. ho. [13].
    59: 'f',                                               # Luke 12:51 margin: in in[f]idelity
    60: '8',                                               # Luke 12:8 annot lemma: [8]. Euery one that confeſſeth
    61: '<foreign xml:lang="grc">μετανοῆτε</foreign>',     # Luke 13:3 margin: Greek reading
    62: '<foreign xml:lang="grc">ὀυκ ἐνδέχεται</foreign>', # Luke 13:33 margin: Greek reading
    63: '2',                                               # Luke 14 arg: ambition, 1[2] and in their workes
    64: '25',                                              # Luke 14 arg: place, [25] Yea that ſo far
    65: '3',                                               # Luke 14:23 annot lemma: 2[3]. Compel them.)
    66: 'ulo poſt princip.',                               # Luke 14:23 annot note: ep. 50 pa[ulo poſt princip.]
    67: 'rable',                                           # Luke 15:11 margin: is a pa[rable]
    68: '<foreign xml:lang="grc">ὀικονόμον.</foreign>',    # Luke 16:1 margin: Greek reading
    69: '<foreign xml:lang="grc">ὀικονομίας.</foreign>',   # Luke 16:2 margin: Greek reading
    70: '<foreign xml:lang="grc">χάσμα</foreign>',         # Luke 16:26 margin: Greek reading
    71: 'may',                                             # Luke 16:9 annot lemma: 9. They [may] receiue.)
    72: '21',                                              # Luke 16:9 annot note: Gregor. moral. li. [21] c. 14.
    73: '3',                                               # Luke 16:9 annot note: Chryſ. ho. 3[3]
    74: '3',                                               # Luke 16:22 annot text: Iren. li. 4 c. [3]9.
    75: 'e',                                               # Luke 16:26 annot text: M[e]n muſt not
    76: '21',                                              # Luke 17:10 annot note: Mt. 25, [21].
    77: '.',                                               # Luke 18:8 annot note: Hier. con[.] Lucif. c. 6.
    78: '36',                                              # Luke 18:8 annot note: de verb. Do. Ser. [36].
    79: '5',                                               # Luke 19 arg: as their Chriſt. 4[5] He ſhevveth
    80: '12, 1',                                           # Luke 20:9 margin: annotati-ons Marc. [12, 1].
    81: '<foreign xml:lang="grc">οἱ καταξιωθέντες</foreign>', # Luke 20:35 margin: Greek reading
    82: '35',                                              # Luke 20:35 annot lemma: [35]. Shal be counted vvorthie
    83: '<foreign xml:lang="grc">καταξιωθῆναι. ἀξιωθῆναι.</foreign>', # Luke 20:35 annot note: Greek reading
    84: '3',                                               # Luke 20:36 annot lemma: [3]6. Equal to Angels.)
    85: '0',                                               # Luke 21:5 annot text: Salomō 1[0]30 yeres
    86: '†',                                               # Luke 21:25 verse: verse 25 * [†] And there shal be
    87: '<foreign xml:lang="grc">ἵνα καταξιωθῆτε</foreign>', # Luke 21:36 margin: Greek reading
    88: 'en',                                              # Luke 22:24 annot text: grea-ter prcemi[en]ence
    89: '<foreign xml:lang="grc">τὸ διδόμενον</foreign>',  # Luke 22:19 annot note: Greek reading
    90: '11',                                              # Luke 22:19 annot note: Cyril. Alex. ana-them. [11].
    91: '7',                                               # Luke 22:19 annot text: Leo ſer. [7] et 8
    92: '8',                                               # Luke 22:19 annot text: Leo ſer. 7 et [8]
    93: '1',                                               # Luke 22:19 annot text: Nazian. orat, [1] cont. Iulianū.
    94: '2',                                               # Luke 22:19 annot text: Nicen. [2] act. 6
    95: 'te',                                              # Luke 22:19 annot text: La[te]ran.
    96: '<foreign xml:lang="grc">τὸ ποτήριον τὸ ἐκχυνόμενον</foreign>', # Luke 22:20 annot note: Greek reading
    97: ',',                                               # Luke 22:20 annot text: neceſſarily[,] that it is
    98: 'no',                                              # Luke 22:20 annot note: Annot. [no]. Teſt. 1556.
    99: '3',                                               # Luke 23 arg: Hieruſalem. [3]2 vpon the croſſe
    100: '3',                                              # Luke 23 arg: tvvo theeues, [3]5 ſcorned of the Ievves
    101: '8',                                              # Luke 23 arg: Centurion. 4[8] yea and of the vvhole
    102: 'I',                                              # Luke 23:51 margin: [I]o. 19, 38
    103: 'b',                                              # Luke 23:34 annot text: praiers of [b]oth vvere heard
    104: 'r',                                              # Luke 23:43 annot text: good workes, no[r] to goe
    105: 'z',                                              # Luke 23:43 annot text: for his [z]elous confeſſion
    106: '5',                                              # Luke 23:53 annot lemma: [5]3. Wherein neuer.)
    107: '55',                                             # Luke 23:55 annot lemma: [55]. Saw the monument.)
    108: 'is',                                             # Luke 24 arg: being together, [is] felt of them
    109: '8.',                                             # Luke 24:30 annot text: ep. 59 ad Paulinum q. [8.]
    110: 'a',                                              # Luke 24:30 margin: The B. Sacr[a]-ment
    111: 'ik',                                             # Luke 24:46 margin: The Cathol[ik]e or vniuerſal
}


def backfill_and_tag(xml_path):
    print(f"Reading XML from {xml_path}...")
    with open(xml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate Luke section
    l_start = content.find('<head>THE ARGVMENT OF S. LVKES GOSPEL.</head>')
    l_end = content.find('<head>❀ THE ARGVMENT OF S. IOHNS GOSPEL.</head>')

    if l_start == -1 or l_end == -1:
        print("Error: Could not locate Luke boundaries in XML!")
        sys.exit(1)

    luke_part = content[l_start:l_end]

    # 1. Backfill all 111 content gaps in Luke
    gap_pattern = re.compile(r'<gap\b[^>]*>.*?</gap>|<gap\b[^>]*/?>', re.DOTALL)
    count = 0

    def repl_func(match):
        nonlocal count
        tag = match.group(0)
        if 'reason="duplicate"' in tag:
            return tag
        count += 1
        if count in replacements:
            return replacements[count]
        else:
            print(f"Warning: gap #{count} has no replacement!")
            return tag

    new_luke = gap_pattern.sub(repl_func, luke_part)
    print(f"Content gaps backfilled: {count} (expected 111)")

    # 2. Liturgical Rubrics & Canticles in Margins
    new_luke = new_luke.replace('<note place="margin">MAGNIFICAT at Euenſong.</note>', '<note place="margin"><hi rend="smallcaps">Magnificat</hi> at Euenſong.</note>')
    new_luke = new_luke.replace('<note place="margin">BENEDICTVS at Laudes.</note>', '<note place="margin"><hi rend="smallcaps">Benedictvs</hi> at Laudes.</note>')
    new_luke = new_luke.replace('<note place="margin">GLORIA IN EX<g ref="char:EOLhyphen"/>CELSIS at Maſſe.</note>', '<note place="margin"><hi rend="smallcaps">Gloria in ex<g ref="char:EOLhyphen"/>celſis</hi> at Maſſe.</note>')
    new_luke = new_luke.replace('<note place="margin">NVNC DIMITTIS at Complin.</note>', '<note place="margin"><hi rend="smallcaps">Nvnc dimittis</hi> at Complin.</note>')
    new_luke = new_luke.replace('<note place="margin">PALME SVN<g ref="char:EOLhyphen"/>DAY.</note>', '<note place="margin"><hi rend="smallcaps">Palme Svn<g ref="char:EOLhyphen"/>day</hi>.</note>')
    new_luke = new_luke.replace('<note place="margin">MVNDAY</note>', '<note place="margin"><hi rend="smallcaps">Mvnday</hi></note>')
    new_luke = new_luke.replace('<note place="margin">TVESDAY.</note>', '<note place="margin"><hi rend="smallcaps">Tveſday</hi>.</note>')
    new_luke = new_luke.replace('<note place="margin">TVES<g ref="char:EOLhyphen"/>DAY night.</note>', '<note place="margin"><hi rend="smallcaps">Tveſ<g ref="char:EOLhyphen"/>day</hi> night.</note>')
    new_luke = new_luke.replace(
        '<note place="margin">The PASSION according to S. Luke in theſe two chapters, is the Goſpel at Maſſe vpon Te<g ref="char:EOLhyphen"/>nebre weneſ<g ref="char:EOLhyphen"/>day.</note>',
        '<note place="margin"><hi rend="smallcaps">The Paſſion</hi> according to S. Luke in theſe two chapters, is the Goſpel at Maſſe vpon Te<g ref="char:EOLhyphen"/>nebre weneſ<g ref="char:EOLhyphen"/>day.</note>'
    )
    new_luke = new_luke.replace('<note place="margin">TENEBRE Weneſday.</note>', '<note place="margin"><hi rend="smallcaps">Tenebre</hi> Weneſday.</note>')
    new_luke = new_luke.replace('<note place="margin">MAVNDY Thurſday.</note>', '<note place="margin"><hi rend="smallcaps">Mavndy</hi> Thurſday.</note>')
    new_luke = new_luke.replace('<note place="margin">THVRSDAY night.</note>', '<note place="margin"><hi rend="smallcaps">Thvrſday</hi> night.</note>')
    new_luke = new_luke.replace('<note place="margin">GOOD FRI<g ref="char:EOLhyphen"/>DAY.</note>', '<note place="margin"><hi rend="smallcaps">Good Fri<g ref="char:EOLhyphen"/>day</hi>.</note>')
    new_luke = new_luke.replace('<note place="margin">EASTER DAY.</note>', '<note place="margin"><hi rend="smallcaps">Eaſter Day</hi>.</note>')
    new_luke = new_luke.replace('<note place="margin">ASCENSION DAY.</note>', '<note place="margin"><hi rend="smallcaps">Aſcenſion Day</hi>.</note>')

    # 3. Words of Institution & Titulus
    new_luke = new_luke.replace(
        '″ THIS IS MY BODY ″ VVHICH IS GIVEN FOR YOV.',
        '<hi rend="smallcaps">This is my body ″ vvhich is given for yov</hi>.'
    )
    new_luke = new_luke.replace(
        'THIS IS THE CHALICE ″ THE NEVV TES<g ref="char:EOLhyphen"/>TAMENT IN MY BLOVD, ″ VVHICH SHAL BE SHED FOR YOV.',
        '<hi rend="smallcaps">This is the chalice ″ the nevv tes<g ref="char:EOLhyphen"/>tament in my blovd, ″ vvhich shal be shed for yov</hi>.'
    )
    new_luke = new_luke.replace(
        'THIS\n<pb n="209" facs="tcp:2646:132"/> IS THE KING OF THE IEVVES.',
        '<hi rend="smallcaps">This</hi>\n<pb n="209" facs="tcp:2646:132"/> <hi rend="smallcaps">is the King of the Ievves</hi>.'
    )

    # 4. Sacred Names & Specific Names
    new_luke = new_luke.replace('borne to you a SA<g ref="char:EOLhyphen"/>VIOVR vvhich is Chriſt', 'borne to you a <hi rend="smallcaps">Sa<g ref="char:EOLhyphen"/>viovr</hi> vvhich is Chriſt')
    new_luke = new_luke.replace('MY SOVLE doth magnifie our Lord.', '<hi rend="smallcaps">My sovle</hi> doth magnifie our Lord.')

    # 5. Remaining IESVS in Luke (excluding the book title head)
    title_str = '<head>THE HOLY GOSPEL OF IESVS CHRIST ACCOR<g ref="char:EOLhyphen"/>DING TO LVKE.</head>'
    if title_str not in new_luke:
        print("Error: book title head not found in Luke XML!")
        sys.exit(1)
    head_idx = new_luke.find(title_str) + len(title_str)

    before_head = new_luke[:head_idx]
    after_head = new_luke[head_idx:]

    count_iesvs = len(re.findall(r'\bIESVS\b', after_head))
    print(f"IESVS occurrences to wrap in smallcaps: {count_iesvs}")
    after_head = re.sub(r'\bIESVS\b', '<hi rend="smallcaps">Iesvs</hi>', after_head)

    new_luke = before_head + after_head

    # Construct full updated XML
    full_new = content[:l_start] + new_luke + content[l_end:]

    # Update revisionDesc in teiHeader
    rev_change = """         <change>
            <date>2026-11</date>
            <label>Janvier</label>Audited Gospel of Luke (pp. 161-241); backfilled all 111 content gaps (25 polytonic Greek readings in &lt;foreign xml:lang="grc"&gt;, 86 illegible words, letters, citation keys, and print markers supplied); tagged small-caps typography (&lt;hi rend="smallcaps"&gt;) across sacred names, canticle rubrics, Words of Institution, Titulus Crucis, and Holy Week liturgical rubrics; normalized to Unicode NFC</change>
      </revisionDesc>"""
    if '</revisionDesc>' in full_new and 'Audited Gospel of Luke' not in full_new:
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

    print(f"Successfully backfilled and tagged Luke in {xml_path}")


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '/Users/Janvier/Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml'
    backfill_and_tag(target)
