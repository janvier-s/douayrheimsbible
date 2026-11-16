# Douay-Rheims Scan Check Audit: Ground-Truth Verification of Additions & Modern Wording

**Date**: 2026-11-16  
**Witness Scans Evaluated**: Original Douay Old Testament (1609/1610) & Rheims New Testament (1582) page scans (`~/facsimiles/sancta/`)  
**Corpus Tested**: `static/data/odr` (modern spelling) & `static/data/odr-original` (1609/1582 original spelling)  

---

## 1. TASK A: Challoner-Style Additions & Removals Check

All deletions made in commits `00721721` (annotations) and `8059c59c` / `66acfe83` (margin notes) were audited against original 1582/1609 page scans to decide whether the print has the deleted segment (**PRINT HAS IT**) or lacks it (**PRINT LACKS IT**).

| Book & Ref | Segment Audited | Scan Page Witness | Decision | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| **Leviticus 20:14 (note a)** | *"Which sheweth greater obligation, and greater sin, concerning the right line, than the collateral; also in the first degree of consanguinity than in the second; and more in consanguinity than in affinity."* | `leviticus/20/4.jpg` (p. 303, top right margin) | **PRINT HAS IT** | **Restored** to `static/data/odr/leviticus.json` (modern spelling) and `static/data/odr-original/leviticus.json` (1609 print spelling: *"VVhich ſheweth greatter obligation, & greatter ſinne, cõcerning the right line, then the collateral; alſo in the firſt degree of conſanguinitie then in the ſecond; and more in conſanguinitie then in affinitie."*) |
| **Romans 13:1 (annotation)** | *"and not being the cause of their evil doings, turned and ordered the same to good effects"* + citations | `romans/13/2.jpg` (p. 415, left col) | **PRINT LACKS IT** | **Removal confirmed**. 1582 print ends: `"...but thcy yvere out of the compaſſe of his cauſing and ordinance."` |
| **Matthew 27:46 (annotation)** | *"(remaining as yet in his body)"*, *"(parting forth of the body)..."*, *"Which strange doctrine we find also avouched in an English Catechism..."* | `matthew/27/4.jpg` (p. 91, left col) | **PRINT LACKS IT** | **Removal confirmed**. 1582 print contains only the shorter original annotation. |
| **Leviticus 21:17 (note c)** | *"much more in the Church of Christ."* | `leviticus/21/2.jpg` (p. 304, bottom left) | **PRINT LACKS IT** | **Removal confirmed**. Note in 1609 print ends at page bottom: `":: If ſuch deformities and defectes made men irregular, and vnmete to exerciſe prieſtlie function in the old teſtament, how"`. The continuation was a later editorial completion. |
| **Ecclesiasticus 23:15 (note d)** | *"Both are mortal sins."* | `ecclesiasticus/23/2.jpg` (p. 406, left margin) | **PRINT LACKS IT** (in note d) | **Removal confirmed**. In the 1609 print, `"Both are mortal ſinnes."` is a separate marginal gloss marked `::` on the following verse, which already exists independently as note `1` in both `odr` and `odr-original`. |
| **Mark 8:22 (note)** | *"and by imposition of his hands:"* | `mark/8/hires/2.jpg` (p. 107, right margin) | **PRINT LACKS IT** | **Removal confirmed**. 1582 print reads: `":: Our Sauiour vſed to worke much by touching: that we may learne not to cótemne the corporal and external application of holy things..."` without any mention of imposition of hands. |
| **2 Paralipomenon 36:22 (note b)** | *"THE CONTINUANCE OF THE CHURCH AND RELIGION, IN THE FIFTH From the foundation of the Temple..."* | `2-paralipomenon/36/2.jpg` | **PRINT LACKS IT** | **Removal confirmed**. Accidental bleed/splice from the Fifth Age historical header in early data preparation. |
| **Ezechiel 25:4 (note b)** | *"were Pastors of cattle here mentioned) subdued the Ammonites."* | `ezechiel/25/1.jpg` & `2.jpg` (pp. 720–721) | **PRINT LACKS IT** | **Removal confirmed**. 1609 note ends cleanly with `"...eaſtward, and"`. The additional words were editorial completion. |
| **Matthew 16:24 (margin)** | *"And upon S. Laurence Eve."* | `matthew/16/3.jpg` (p. 45, right margin) | **PRINT LACKS IT** | **Removal confirmed**. 1582 print reads: `"THE GOSPEL for a Martyr that is a biſhop."` |
| **Philippians 3:7 (margin)** | *"for S. Paul the Eremite: and"* | `philippians/3/hires/2.jpg` (p. 531, right margin) | **PRINT LACKS IT** | **Removal confirmed**. 1582 print reads: `"The Epiſtle for a Confeſſor that is not a Biſhop."` |
| **Psalms 25:6 (note e)** | Verse 5 text spliced into note | `psalms/25/2.jpg` | **PRINT LACKS IT** | **Removal confirmed**. Spliced verse text correctly removed; note faithfully matches 1609 print. |

---

## 2. TASK B: Modern Wording Left in `odr-original` Rewritten from Print

A comprehensive audit was performed across `static/data/odr-original` for remaining modern spellings (`upon`, `Saints`, `have`, `every`, `shall`, and modern spelling runs).

### Long-S and Orthography Rules Applied
- Non-final lowercase `s` rendered as long s (`ſ`, `U+017F`), except before `f`.
- Medial `ss` rendered as `ſſ`.
- Before `h` and `k`, round `s` in OT, long `ſ` in NT.
- Exact `vv` preserved matching scans.
- No modern possessive apostrophes (`Gods`, `Chriſts`, `Churches`).

### Rewritten Sections & Token Corrections

1. **Hebrews 7 Annotations 18, 19, 21, 23, 27 (`static/data/odr-original/hebrews/annotations/007.json`)**:
   - Rewritten verbatim against scan `hebrews/8/1.jpg` (page 618):
     - **v. 18**: `"The vvhole law of Moyſes conteining all their old Prieſthod, ſacrifice, ſacraments, and ceremonies, is called the Old commaundement: and the new Teſtament conteining the ſacrifice of Chriſtes body and bloud, and al the ſacraments and graces giuen by the ſame, is named the Nevv mandatum: for vvhich our forefathers called the Thurſday in the holy vveeke, Maundy thurſday..."`
     - **v. 19**: `"Euer obſerue, that the abrogation of the old law, is not an aboliſhing of al Prieſthod, but an introductiõ of a new, conteining the hope of eternal things, vvhere the old had but temporal."`
     - **v. 21**: Title restored to `"With an othe."` Text: `"This othe ſignifieth the infallible and abſolute promis of the eternitie of the new Prieſthod and ſtate of the Church: Chriſt by his death, and bloud ſhed in the ſacrifice of the Croſſe... vpon the Croſſe..."`
     - **v. 23**: `"The Proteſtants not vnderſtanding this place, feine very foliſhly... You ſhal be called... Prieſts of God... ſhal it be ſaid to you... al viſible Prieſthod... The Apoſtle then meaneth firſt, that the abſolute ſacrifice of cõſummation, perfection, and vniuerſal redemption, vvas but one... ſucceding one an other, euery of their offices... neuer yeldeth it vp... perfited by Chriſtes ſacrifice on the Croſſe..."`
     - **v. 27**: `"This is the ſpecial preeminence of Chriſt, that he offereth for other mens ſinnes onely, hauing none of his ovvne to offer for, as al other Prieſts both of the old and new law haue. And this againe is the ſpecial dignitie of his owne perſon, not communicable to any other of vvhat order of Prieſthod ſo euer..."`

2. **John 20:19 Annotation (`static/data/odr-original/john/annotations/020.json`)**:
   - Rewritten verbatim against scan `john/20/3.jpg` (page 276):
     - Restored 1582 forms: `doore`, `al`, `euery body ſhould haue`, `incredulitie`, `vnfaithfulnes`, `euery place`, `vvindow`, `al the houſe being cloſe ſhut`, `courſe od Gods ordinance`, `camell paſſe through a nedles eie`, `faſt buckled fel dovvne`.

3. **Exodus Annotations**:
   - **Exodus 7:3 (`static/data/odr-original/exodus/annotations/007.json`)**:
     - Corrected `have` -> `haue` (twice): `<i>q. 36. I haue hardned Pharaoes hart</i>` and `"It ought to haue auailed Pharao"`.
   - **Exodus 16:15 (`static/data/odr-original/exodus/annotations/016.json`)**:
     - Corrected `shall be` -> `ſhalbe`: `"wherby the bodie ſhalbe raiſed againe from death"`.

4. **Leviticus 18 Annotation Note 16 (`static/data/odr-original/leviticus/annotations/018.json`)**:
   - Rewritten against scan `leviticus/19/2.jpg` (p. 299):
     - `"The Church of Chriſt ordaineth lawes, altereth, & vpon iuſt occaſions diſpenceth, in al degrees of conſanguinitie and affinitie, not forbid by the law of nature"`

5. **Margin Notes Across the Corpus**:
   - **Leviticus 26:1 (note a)**: Verified against scan `leviticus/26/3.jpg` (p. 315) -> `have` -> `haue`, `wil nedes`, `holie Scriptures`, `falſly tranſlate`, `in dede`, `purtrature`.
   - **Leviticus 27:2 (note a)**: Verified against scan `leviticus/27/2.jpg` (p. 317) -> `have` -> `haue`, `fteed therof geue a price: & haue the reward of their good wil`.
   - **Leviticus 26:29 (note b)**: Verified against scan `leviticus/26/4.jpg` -> `upon` -> `vpon` (twice), `Hieruſalem`, `fel vpon`.
   - **Daniel 8:26 (note m)**: Verified against scan `daniel/8/2.jpg` -> `shall` -> `ſhal`, `perteyned`, `aboue 300. yeares`, `tovvardes`, `end of this vvorld`.
   - **Daniel 11:38 (note n)**: Verified against scan `daniel/11/4.jpg` -> `shall` -> `ſhal`, `The God of povvre or ſtrength, either Iupiter... ovvne ſtreingth, vvherin Antiochus, and Antichriſt ſhal truſt`.
   - **1 John 4:21 (note 1)**: Verified against scan `1-john/4/hires/3.jpg` (p. 684) -> `every` -> `euerie`: `"The Church onely, not euerie priuate man, hath to proue and diſcerne ſpirites."`
   - **Hebrews 4:12 (note 1)**: Verified against scan `hebrews/4/hires/2.jpg` -> `every` -> `euery`, `shall` -> `ſhal`: `"Whatſoeuer God threateneth by his vvord concerning the puniſhment of ſinne and incredulitie, ſhal be executed, be the offenſe neuer ſo ſecrete, deepe, or hidden in our harts. becauſe Gods ſpeach paſſeth eaſily and ſearcheth throughly euery part, povver, and facultie of mans ſoul."`
   - **Mark 10:16 (note 1)**: Verified against scan `mark/10/hires/1.jpg` -> `upon` -> `vpon`: `"Our Sauiour gaue the children his bleſſing, impoſing his hands vpon them."`
   - **NT Lectionary & Summary Notes**: 34 lectionary notes and 2 summary notes across Matthew, Mark, Luke, John, Acts, 1 Cor, 2 Cor, Eph, 1 Tim, 2 Tim, Heb, 1 Pet, Jude updated from `upon` to `vpon` (e.g. Matthew 5 summary note: `"Tнe Sermon of Chriſt vpon the Mount..."`, Mark 14: `"THE PASSION according to S. Marke in theſe tvvo chapters, is the Goſpel at Maſſe vpon Tueſday in the Holy Vveeke."`).
   - **Old Testament Summary Notes**:
     - **Psalm 77 summary note**: Verified against scan `psalms/77/1.jpg` (p. 142) -> `"Gods great Benefites beſtovved vpon the Ievves, and their ingratitude.\nThe 4 key."`
     - **Isaie 1 summary note**: Verified against scan `isaias/1/1.jpg` (p. 453) -> `"The firſt part. The kingdom of Iuda shal be captiue in Babylon, for their ingratitude towards God, and other ſinnes."`
     - **Isaie 49 summary note**: Verified against scan `isaias/49/1.jpg` (p. 521) -> `"The 8. part. Al nations ſhal be conuerted to Chriſt: ſome Iewes in the primitiue Church, and many nere the end of the world."`
     - **Jeremie 29 summary note**: Verified against scan `jeremias/29/1.jpg` (p. 598) -> `"The 4. part. Conſolations and threates as the people ſhal deſerue, with the deſtruction of Ieruſalem, captiuitie of the king & people and their releaſe after 70. yeares."`
   - **Annotation Sidecar Notes**:
     - **1 Thessalonians 5:21**: Verified against scan `1-thessalonians/5/hires/2.jpg` (p. 552) -> `"Not raſhly to credite euery ſpirit."`
     - **Romans 14:5**: Verified against scan `romans/14/hires/3.jpg` (p. 418) -> `"The text explicated concerning euery mans cõſcience in Iudaical meates and drinkes."`
     - **Apocalypse 6:9**: Verified against scan `apocalypse/6/hires/3.jpg` -> `"Hovv S. Hierõ ſaith, Chriſt & his Saincts are euery vvhere."`

6. **The `Saints` vs `Saincts` Finding**:
   - Examination of page scans confirmed that both the 1582 Rheims NT and 1609 Douay OT prints printed `Saints` and `Saincts` interchangeably (e.g., scan `matthew/2/3.jpg` p. 7 literally prints `"Canonizing Saints , and celebrating..."`; `genesis/17/3.jpg` p. 64 literally prints `"aſſociation of Saints in heauen"`). These occurrences in `static/data/odr-original` faithfully reflect the actual 1609/1582 print.

---

## 3. Test Suite Verification

- Ran `npx vitest run`: **47/47 test files passed**, **537/537 tests passed**.
- No verse texts were modified, ensuring lemma indexes remain synchronized.
