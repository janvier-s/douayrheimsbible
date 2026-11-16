import json,glob,os,re,difflib,sys
sys.path.insert(0,'/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad')
from anndiff import plain,sk,load
SC=os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
slug={'isaie':'isaias','jeremie':'jeremias','malachie':'malachias'}
M,O=load('odr'),load('odr-original')
def join(D):
    R={}
    for (b,c,v,p),a in sorted(D.items()): R.setdefault((b,c,v),[]).append(a['text'])
    return {k:' '.join(x) for k,x in R.items()}
MT,OT=join(M),join(O)
SM={};SO={}
for b in {k[0] for k in MT}:
    for f in glob.glob(f'{SC}/{slug.get(b,b)}/*.json'):
        c=int(os.path.basename(f)[:-5]); d=json.load(open(f))
        for a in d.get('annotations',[]):
            try: v=int(a['verse'])
            except: continue
            for D,key in ((SM,'modern'),(SO,'original')):
                x=a.get(key)
                if isinstance(x,dict) and x.get('text'): D[(b,c,v)]=(D.get((b,c,v),'')+' '+x['text']).strip()
print('ours',len(MT),'scrape-mod',len(SM),'scrape-orig',len(SO),'missing in scrape',len(set(MT)-set(SM)),'scrape extra',len(set(SM)-set(MT)))
def hunks(A,B,minw=4):
    aw=plain(A).split();bw=plain(B).split()
    sm=difflib.SequenceMatcher(None,[sk(w) for w in aw],[sk(w) for w in bw],autojunk=False)
    out=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal':continue
        if abs((i2-i1)-(j2-j1))>=minw or (tag!='replace' and max(i2-i1,j2-j1)>=minw):
            out.append((tag,' '.join(aw[i1:i2]),' '.join(bw[j1:j2])))
    return out
res={}
for k in sorted(MT):
    r={}
    if k in SM: r['M~SM']=hunks(MT[k],SM[k])
    if k in SO: r['O~SO']=hunks(OT[k],SO[k])
    r['M~O']=hunks(MT[k],OT[k])
    res[k]=r
json.dump({'|'.join(map(str,k)):v for k,v in res.items()},open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.json','w'))
for name in ('M~SM','O~SO','M~O'):
    n=sum(1 for r in res.values() if r.get(name)); h=sum(len(r.get(name,[])) for r in res.values())
    print(name,'annotations with big hunks:',n,'hunks:',h)
