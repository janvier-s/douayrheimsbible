import sys,difflib,json,re,collections
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
def norm(w): return re.sub(r'[^a-z]','',w.lower().replace('ſ','s').replace('vv','w'))
freq=collections.Counter(norm(w) for t in OT.values() for w in plain(t).split())
sfreq=collections.Counter(norm(w) for t in SO.values() for w in plain(t).split())
rows=[]
for k in sorted(OT):
    if k not in SO: continue
    Ow=plain(OT[k]).split(); Sw=plain(SO[k]).split()
    sm=difflib.SequenceMatcher(None,[norm(w) for w in Ow],[norm(w) for w in Sw],autojunk=False)
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='replace' and i2-i1==j2-j1 and i2-i1<=2:
            for a,b in zip(Ow[i1:i2],Sw[j1:j2]):
                na,nb=norm(a),norm(b)
                if na and nb and na!=nb and sk(a)!=sk(b) and freq[na]<=1 and sfreq[nb]>=3 and difflib.SequenceMatcher(None,na,nb).ratio()>=0.6:
                    rows.append((k,a,b,freq[na],sfreq[nb]))
print(len(rows),len({r[0] for r in rows}))
for r in rows[:70]: print(r[0][:3],r[1],'->',r[2],r[3],r[4])
json.dump(rows,open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/annO2.json','w'))
