import sys,difflib,json
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
T=[('1-corinthians',1,5),('1-timothy',1,20),('2-corinthians',2,17),('acts',8,38),('apocalypse',1,1),('apocalypse',1,6),('apocalypse',12,15),('apocalypse',22,20),('genesis',28,11),('leviticus',8,7),('mark',10,4),('john',21,17),('psalms',13,1),('genesis',7,23),('genesis',11,12),('2-machabees',15,39)]
def show(k):
    A,B=plain(MT[k]).split(),plain(SM[k]).split()
    sm=difflib.SequenceMatcher(None,[sk(w) for w in A],[sk(w) for w in B],autojunk=False)
    print('##',k)
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal' or (tag=='replace' and i2-i1<=1 and j2-j1<=1): continue
        if abs((i2-i1)-(j2-j1))<2 and max(i2-i1,j2-j1)<4: continue
        print('  ',tag,'M-ctx:',' '.join(A[max(0,i1-4):i1]),'[[',' '.join(A[i1:i2])[:100],']]','| SM:',' '.join(B[j1:j2])[:400])
for k in T:
    if k in SM: show(k)
    else: print('##',k,'NOT IN SCRAPE')
