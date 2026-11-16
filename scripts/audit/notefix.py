import sys
APPLY='--apply' in sys.argv
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/noteO.py').read())
def sk2(w):
    s=sk(w.replace('&','and')); return s
def sktoks(ws):
    L=[];ix=[]
    for i,w in enumerate(ws):
        s=sk2(w)
        if s: L.append(s);ix.append(i)
    return L,ix
def find_seq(B,seq,start=0):
    n=len(seq)
    for p in range(start,len(B)-n+1):
        if B[p:p+n]==seq: return p
    return -1
def pmap(raw):
    out=[];idx=[];i=0
    while i<len(raw):
        if raw[i]=='<':
            j=raw.find('>',i)
            if j!=-1 and re.match(r'</?[a-z]+[^>]*>',raw[i:j+1]): out.append(' ');idx.append(i);i=j+1;continue
        out.append(raw[i]);idx.append(i);i+=1
    return ''.join(out),idx
NONLAT=re.compile(r'[^\x00-ɏ -⁯]')
def bad(m,s):
    if re.search(r'\d',m+s): return True
    if re.search(r'[ÆæŒœ\[\]]',m+s) or re.search(r'Ae|ae',m) and not re.search(r'Ae|ae',s): return True
    if NONLAT.search(m+s): return True
    j=lambda x:re.sub(r"[^a-z]",'',x.lower().replace('&','and'))
    if j(m)==j(s): return True
    if re.search(r"\b(Aug|Hier|Chrys|Greg|Bern|Ber|Ambr|Cypr|Epiph|Orig|Tert|Theod|Theoph|Hom|lib|li|cap|chap|c|v|vers|pag|tom|Apoc|Reg|Par|Esd|Gen|Exo|Prov|Psal|Mt|Mr|Lu|Ioan|Act)\b\.?",m+' '+s): return True
    return False
edits=collections.defaultdict(list);show=[]
for f in sorted(glob.glob('odr/*.json')):
    b=os.path.basename(f)[:-5]; o=f.replace('odr/','odr-original/')
    if not os.path.exists(o): continue
    d=json.load(open(f)); r=json.load(open(o))
    for ch in d.get('chapters',[]):
        rc=next((c for c in r['chapters'] if c['chapter']==ch['chapter']),None)
        if not rc: continue
        rv={v['verse']:v for v in rc['verses']}; sn=None
        for v in ch['verses']:
            w=rv.get(v['verse'],{}); on={x['label']:x for x in w.get('notes',[]) if x.get('label')}
            for n in v.get('notes',[]):
                if n['label'] not in on: continue
                ps,idx=pmap(n['text']); toks=[(m.group(),idx[m.start()],idx[m.end()-1]+1) for m in re.finditer(r'\S+',ps)]
                M=[t[0] for t in toks]; O=plain(on[n['label']]['text']).split()
                if len(M)<4 or len(O)<4: continue
                if sn is None: sn=scrape_notes(b,ch['chapter'])
                key=[sk2(x) for x in M[:3]]; S=None
                for so,sm in sn:
                    sw=sm.split()
                    if [sk2(x) for x in sw[:3]]==key: S=sm;break
                if S is None: continue
                Sw=S.split(); Ms,Mi=sktoks(M); Os,Oi=sktoks(O); Ss,Si=sktoks(Sw)
                sm_=difflib.SequenceMatcher(None,Ms,Os,autojunk=False)
                for tag,i1,i2,j1,j2 in sm_.get_opcodes():
                    if tag=='equal': continue
                    L=Os[max(0,j1-2):j1]; R=Os[j2:j2+2]
                    p=find_seq(Ss,L) if L else 0
                    if p<0: continue
                    p+=len(L); q=find_seq(Ss,R,p) if R else len(Ss)
                    if q<0: continue
                    sseg=Ss[p:q]; oseg=Os[j1:j2]; mseg=Ms[i1:i2]
                    if abs(len(sseg)-len(oseg))>max(1,len(oseg)*0.3): continue
                    if difflib.SequenceMatcher(None,sseg,oseg,autojunk=False).ratio()<0.8: continue
                    if ''.join(mseg)==''.join(oseg) or ''.join(sseg)==''.join(mseg): continue
                    mtxt=' '.join(M[Mi[x]] for x in range(i1,i2)); stxt=' '.join(Sw[x] for x in Si[p:q])
                    if bad(mtxt,stxt): continue
                    mt=[toks[Mi[x]] for x in range(i1,i2)]
                    if mt: span=(mt[0][1],mt[-1][2])
                    else:
                        if i1==0: continue
                        span=(toks[Mi[i1-1]][2],)*2
                    if (b,ch['chapter'],v['verse'],n['label'])==('2-paralipomenon',36,22,'b'): continue
                    edits[(f,ch['chapter'],v['verse'],n['label'])].append((span,tag,mtxt,stxt,n['text']))
                    show.append((b,ch['chapter'],v['verse'],n['label'],tag,mtxt,stxt))
print('hunks',len(show),'notes',len(edits))
for r in show[:90]: print(r[0][:12],r[1],r[2],r[3],r[4],'| [[',r[5][:46],']] ->',r[6][:70])
if APPLY:
    raw={}
    for (f,c,vv,l),lst in edits.items():
        t=lst[0][4]; new=t
        for span,tag,mt,st,_ in sorted(lst,key=lambda x:-x[0][0]):
            a0,b0=span
            if tag=='insert': new=new[:a0]+' '+st+new[b0:]
            elif not st:
                new=new[:a0]+new[b0:]; new=re.sub(r'  +',' ',new)
            else: new=new[:a0]+st+new[b0:]
        if f not in raw: raw[f]=open(f,encoding='utf-8').read()
        for ea in (False,True):
            o=json.dumps(t,ensure_ascii=ea)[1:-1]; nn=json.dumps(new,ensure_ascii=ea)[1:-1]
            if raw[f].count('"'+o+'"')==1: raw[f]=raw[f].replace('"'+o+'"','"'+nn+'"'); break
        else: print('FAILED',f,c,vv,l)
    for f,tx in raw.items(): open(f,'w',encoding='utf-8').write(tx)
    print('wrote',len(raw))
