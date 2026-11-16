import sys,difflib,json,re,collections
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
def sktoks(words):
    L=[];ix=[]
    for i,w in enumerate(words):
        s=sk(w)
        if s: L.append(s);ix.append(i)
    return L,ix
def find_seq(B,seq,start=0):
    n=len(seq)
    for p in range(start,len(B)-n+1):
        if B[p:p+n]==seq: return p
    return -1
rows=[]
for k in sorted(OT):
    if k not in SO or k not in MT: continue
    Ow=plain(OT[k]).split(); Sw=plain(SO[k]).split(); Mw=plain(MT[k]).split()
    Os,Oi=sktoks(Ow); Ss,Si=sktoks(Sw); Ms,Mi=sktoks(Mw)
    sm=difflib.SequenceMatcher(None,Os,Ss,autojunk=False)
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal': continue
        L=Ss[max(0,j1-3):j1]; R=Ss[j2:j2+3]
        if len(L)<2 and j1>0: continue
        p=find_seq(Ms,L) if L else 0
        if p<0: continue
        p+=len(L)
        q=find_seq(Ms,R,p) if R else len(Ms)
        if q<0: continue
        mseg=Ms[p:q]; sseg=Ss[j1:j2]; oseg=Os[i1:i2]
        if abs(len(mseg)-len(sseg))>max(2,len(sseg)*0.3): continue
        if difflib.SequenceMatcher(None,mseg,sseg,autojunk=False).ratio()<0.8: continue
        if ''.join(oseg)==''.join(sseg): continue
        rows.append((k,tag,' '.join(Ow[max(0,Oi[i1-1]-2):Oi[i1-1]+1]) if i1 else '',' '.join(Ow[x] for x in Oi[i1:i2]),' '.join(Sw[x] for x in Si[j1:j2])))
print(len(rows),collections.Counter(r[1] for r in rows),len({r[0] for r in rows}))
json.dump(rows,open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/annO.json','w'),ensure_ascii=False)
import random; random.seed(2)
for r in random.sample(rows,min(50,len(rows))): print(r[0][:3],r[1],'|',r[2][-24:],'[[',r[3][:44],']] ->',r[4][:55])
