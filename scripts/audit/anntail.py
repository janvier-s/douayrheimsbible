import sys,re,json
APPLY='--apply' in sys.argv
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
def sks(ws): return [s for s in (sk(w) for w in ws) if s]
rows=[]
for k in sorted(MT):
    if k not in SM or k not in OT: continue
    mw=plain(MT[k]).split(); sw=plain(SM[k]).split(); ow=plain(OT[k]).split()
    ms,ss,os_=sks(mw),sks(sw),sks(ow)
    if len(ms)<6: continue
    tail=ms[-4:]
    def pos(L):
        for i in range(len(L)-4,-1,-1):
            if L[i:i+4]==tail: return i+4
        return -1
    ps,po=pos(ss),pos(os_)
    if ps>=0 and po>=0 and len(ss)-ps>=3 and len(os_)-po>=3 and abs((len(ss)-ps)-(len(os_)-po))<=max(3,0.3*(len(os_)-po)):
        # char offset in SM plain of remainder
        # find word index for token ps
        cnt=0;wi=0
        for i,w in enumerate(sw):
            if sk(w): 
                cnt+=1
                if cnt==ps: wi=i+1;break
        rows.append((k,len(ss)-ps,' '.join(mw[-5:]),' '.join(sw[wi:])))
print(len(rows))
for r in rows: print(r[0],r[1],'|',r[2],'+++',r[3][:150])
json.dump(rows,open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/tails.json','w'))
