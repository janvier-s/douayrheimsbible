import sys,difflib,json,re,collections
APPLY='--apply' in sys.argv
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
NT={'matthew','mark','luke','john','acts','romans','1-corinthians','2-corinthians','galatians','ephesians','philippians','colossians','1-thessalonians','2-thessalonians','1-timothy','2-timothy','titus','philemon','hebrews','james','1-peter','2-peter','1-john','2-john','3-john','jude','apocalypse'}
def surf(w): return re.sub(r'^[^\w]+|[^\w]+$','',w.lower().replace('ſ','s').replace('vv','w').replace('’',"'"))
def conv(core,nt):
    out=[];n=len(core)
    for i,ch in enumerate(core):
        if ch!='s': out.append(ch);continue
        nxt=core[i+1] if i+1<n else ''
        if i==n-1: out.append('s')
        elif nxt=='s': out.append('ſ')
        elif i>0 and core[i-1]=='s' : out.append('ſ' if i<n-1 else 's')
        elif nxt=='f': out.append('s')
        elif nxt in 'hk' and not nt: out.append('s')
        elif nxt.isalpha(): out.append('ſ')
        else: out.append('s')
    return ''.join(out)
def pmap(raw):
    out=[];idx=[];i=0
    while i<len(raw):
        if raw[i]=='<':
            j=raw.find('>',i)
            if j!=-1 and re.match(r'</?[a-z]+[^>]*>',raw[i:j+1]): out.append(' ');idx.append(i);i=j+1;continue
        out.append(raw[i]);idx.append(i);i+=1
    return ''.join(out),idx
edits=collections.defaultdict(list);n=0;samples=[]
for k in sorted(OT):
    if k not in SO: continue
    parts=[(kk,O[kk]) for kk in sorted(O) if kk[:3]==k]
    allt=[]
    for pi,(kk,a) in enumerate(parts):
        ps,idx=pmap(a['text'])
        for m in re.finditer(r'\S+',ps): allt.append((m.group(),pi,idx[m.start()],idx[m.end()-1]+1))
    Ow=[t[0].replace('ſ','s') for t in allt]; Sw=plain(SO[k]).split()
    # restrict to annotations that are mostly modern: >=25 spelling hunks
    a=[surf(w) for w in Ow]; b=[surf(w) for w in Sw]
    sm=difflib.SequenceMatcher(None,a,b,autojunk=False); hunks=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='replace' and i2-i1==j2-j1 and i2-i1<=3:
            for off in range(i2-i1):
                x,y=a[i1+off],b[j1+off]
                if x!=y and difflib.SequenceMatcher(None,x,y).ratio()>=0.6: hunks.append((i1+off,j1+off))
    if len(hunks)<1: continue
    for ti,sj in hunks:
        w,pi,s0,e0=allt[ti]; sy=Sw[sj]
        lead=re.match(r'^[^\w]*',sy).group(); trail=re.search(r'[^\w]*$',sy).group()
        core=sy[len(lead):len(sy)-len(trail)] if trail else sy[len(lead):]
        ow_lead=re.match(r'^[^\w]*',w).group(); ow_trail=re.search(r'[^\w]*$',w).group()
        new=ow_lead+conv(core,k[0] in NT)+ow_trail
        edits[(k,pi)].append((s0,e0,w,new))
        n+=1
        if len(samples)<40: samples.append((k[0],w,new))
print('annotations',len({k for k,_ in edits}),'token edits',n)
for s in samples: print(s)
if APPLY:
    import os
    files={}
    for (k,pi),lst in edits.items():
        kk,a=[(kk,O[kk]) for kk in sorted(O) if kk[:3]==k][pi]
        t=a['text'];new=t
        for s0,e0,w,nw in sorted(lst,key=lambda x:-x[0]): new=new[:s0]+nw+new[e0:]
        path=f'odr-original/{kk[0]}/annotations/{kk[1]:03d}.json'
        if path not in files: files[path]=open(path,encoding='utf-8').read()
        for ea in (False,True):
            o=json.dumps(t,ensure_ascii=ea)[1:-1]; nn=json.dumps(new,ensure_ascii=ea)[1:-1]
            if files[path].count('"'+o+'"')==1: files[path]=files[path].replace('"'+o+'"','"'+nn+'"'); break
        else: print('FAILED',kk)
    for p,tx in files.items(): open(p,'w',encoding='utf-8').write(tx)
    print('wrote',len(files))
