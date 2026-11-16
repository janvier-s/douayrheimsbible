import sys,difflib,json,re,collections
sys.argv0=list(sys.argv)
APPLY='--apply' in sys.argv
ONLY=None
if '--only' in sys.argv:
    ONLY=set()
    for x in sys.argv[sys.argv.index('--only')+1].split(','):
        a,b,c=x.split(':'); ONLY.add((a,int(b),int(c)))
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
def pmap(raw):
    out=[];idx=[];i=0
    while i<len(raw):
        if raw[i]=='<':
            j=raw.find('>',i)
            if j!=-1 and re.match(r'</?[a-z]+[^>]*>',raw[i:j+1]): out.append(' ');idx.append(i);i=j+1;continue
        out.append(raw[i].replace('ſ','s'));idx.append(i);i+=1
    return ''.join(out),idx
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
MARK=re.compile(r'^[\[\]\d◦†,.:;()\s]*$')
def analyse(k):
    parts=[(kk,M[kk]) for kk in sorted(M) if kk[:3]==k]
    allt=[]
    for pi,(kk,a) in enumerate(parts):
        ps,idx=pmap(a['text'])
        for m in re.finditer(r'\S+',ps): allt.append((m.group(),pi,idx[m.start()],idx[m.end()-1]+1))
    Aw=[t[0] for t in allt]; Ow=plain(OT[k]).split(); Bw=plain(SM[k]).split()
    As,Ai=sktoks(Aw); Os,Oi=sktoks(Ow); Bs,Bi=sktoks(Bw)
    sm=difflib.SequenceMatcher(None,As,Os,autojunk=False)
    res=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal': continue
        mseg=As[i1:i2]; oseg=Os[j1:j2]
        # context in O (left up to 3, right up to 3)
        L=Os[max(0,j1-3):j1]; R=Os[j2:j2+3]
        if len(L)<2 and j1>0: continue
        p=find_seq(Bs,L) if L else 0
        if p<0: continue
        p+=len(L)
        if R:
            q=find_seq(Bs,R,p); 
            if q<0: continue
        else: q=len(Bs)
        bseg=Bs[p:q]
        if abs(len(bseg)-len(oseg))>max(2,len(oseg)*0.3): continue
        r=difflib.SequenceMatcher(None,bseg,oseg,autojunk=False).ratio() if (bseg or oseg) else 1
        if r<0.8: continue
        if bseg==mseg or ''.join(bseg)==''.join(mseg) or sk(' '.join(Bw[x] for x in Bi[p:q]).replace(' ',''))==sk(' '.join(Aw[Ai[x]] for x in range(i1,i2)).replace(' ','')): continue
        # M edit span in token space -> raw
        words=[Bw[x] for x in Bi[p:q]]
        mtoks=[allt[Ai[x]] for x in range(i1,i2)]
        if mtoks and len({t[1] for t in mtoks})>1: continue
        if mtoks and all(MARK.match(t[0]) for t in mtoks): continue
        if words and all(MARK.match(w) for w in words) : continue
        if i1==0 and not mtoks: continue
        mj=' '.join(t[0] for t in mtoks); bj=' '.join(words)
        if len(mtoks)<=1 and len(words)<=1 and mj and bj:
            if difflib.SequenceMatcher(None,mj.lower().strip('.,;:'),bj.lower().strip('.,;:')).ratio()>=0.75: continue
            if {mj.lower(),bj.lower()}<= {'et','&'}: continue
        if {mj.lower(),bj.lower()}=={'et','&'}: continue
        rawspan=(parts[mtoks[0][1]][1]['text'][mtoks[0][2]:mtoks[-1][3]] if mtoks else '')
        if re.search(r'<(mn|na|cr)>|\[\d+\]|◦',rawspan): 
            res.append(dict(tag='MANUAL-'+tag,ctx='',m=mj,b=bj,part=0,span=(0,0),key=k)); continue
        res.append(dict(tag=tag,ctx=' '.join(Aw[max(0,Ai[i1-1]-3 if i1 else 0):(Ai[i1-1]+1 if i1 else 0)]),m=' '.join(t[0] for t in mtoks),b=' '.join(words),
            part=(mtoks[0][1] if mtoks else allt[Ai[i1-1]][1]),
            span=((mtoks[0][2],mtoks[-1][3]) if mtoks else (allt[Ai[i1-1]][3],allt[Ai[i1-1]][3]))))
    return parts,res

def support(seg,Os):
    if not seg: return 1.0
    mm=difflib.SequenceMatcher(None,seg,Os,autojunk=False)
    return sum(b.size for b in mm.get_matching_blocks())/len(seg)
def analyse2(k):
    parts=[(kk,M[kk]) for kk in sorted(M) if kk[:3]==k]
    allt=[]
    for pi,(kk,a) in enumerate(parts):
        ps,idx=pmap(a['text'])
        for m in re.finditer(r'\S+',ps): allt.append((m.group(),pi,idx[m.start()],idx[m.end()-1]+1))
    Aw=[t[0] for t in allt]; Ow=plain(OT[k]).split(); Bw=plain(SM[k]).split()
    As,Ai=sktoks(Aw); Os,Oi=sktoks(Ow); Bs,Bi=sktoks(Bw)
    sm=difflib.SequenceMatcher(None,As,Bs,autojunk=False); res=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal' or tag=='delete': continue
        bseg=Bs[j1:j2]; mseg=As[i1:i2]
        if support(bseg,Os)<0.8 or support(mseg,Os)>=0.5 and mseg: continue
        if j1==0: continue
        words=[Bw[x] for x in Bi[j1:j2]]; mtoks=[allt[Ai[x]] for x in range(i1,i2)]
        if mtoks and len({t[1] for t in mtoks})>1: continue
        if mtoks and all(MARK.match(t[0]) for t in mtoks): continue
        if all(MARK.match(w) for w in words): continue
        mj=' '.join(t[0] for t in mtoks); bj=' '.join(words)
        if ''.join(bseg)==''.join(mseg): continue
        rawspan=(parts[mtoks[0][1]][1]['text'][mtoks[0][2]:mtoks[-1][3]] if mtoks else '')
        if re.search(r'<(mn|na|cr)>|\[\d+\]|◦',rawspan): res.append(dict(tag='MANUAL-'+tag,ctx='',m=mj,b=bj,part=0,span=(0,0))); continue
        res.append(dict(tag=tag,ctx=' '.join(Aw[max(0,Ai[i1-1]-3):Ai[i1-1]+1]) if i1 else '',m=mj,b=bj,part=(mtoks[0][1] if mtoks else allt[Ai[i1-1]][1]),span=((mtoks[0][2],mtoks[-1][3]) if mtoks else (allt[Ai[i1-1]][3],allt[Ai[i1-1]][3]))))
    return parts,res

if __name__=='__main__':
    allres={};raw={};files={}
    for k in sorted(MT):
        if k not in SM or k not in OT: continue
        if ONLY and k not in ONLY: continue
        parts,res=(analyse2(k) if '--mode2' in sys.argv0 else analyse(k))
        if res: allres[k]=(parts,res)
    n=sum(len(r) for _,r in allres.values())
    if APPLY:
        import os
        files={}
        for k,(parts,res) in allres.items():
            byp=collections.defaultdict(list)
            for h in res:
                if h['tag'].startswith('MANUAL'): continue
                byp[h['part']].append(h)
            for pi,hs in byp.items():
                kk,a=parts[pi]; t=a['text']; new=t
                for h in sorted(hs,key=lambda h:-h['span'][0]):
                    a0,b0=h['span']; ins=h['b']
                    if h['tag']=='insert': new=new[:a0]+(' '+ins if ins else '')+new[b0:]
                    elif h['tag']=='delete' or not ins: 
                        new=new[:a0].rstrip(' ')+(' ' if new[b0:b0+1] not in ('',' ',',','.',';',':') else '')+new[b0:].lstrip(' ') if new[b0:b0+1]==' ' else new[:a0]+new[b0:]
                    else: new=new[:a0]+ins+new[b0:]
                path=f'odr/{kk[0]}/annotations/{kk[1]:03d}.json'
                if path not in files: files[path]=open(path,encoding='utf-8').read()
                for ea in (False,True):
                    o=json.dumps(t,ensure_ascii=ea)[1:-1]; nn=json.dumps(new,ensure_ascii=ea)[1:-1]
                    if files[path].count('"'+o+'"')==1: files[path]=files[path].replace('"'+o+'"','"'+nn+'"'); break
                else: print('FAILED',kk)
        for pth,tx in files.items(): open(pth,'w',encoding='utf-8').write(tx)
        print('wrote',len(files),'files')
    print('annotations',len(allres),'hunks',n,collections.Counter(h['tag'] for _,r in allres.values() for h in r))
    json.dump({'|'.join(map(str,k)):[{x:y for x,y in h.items()} for h in r] for k,(p,r) in allres.items()},open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/annfix.json','w'),ensure_ascii=False)
