import sys,difflib,json,re
APPLY='--apply' in sys.argv
KEYS=None
if '--keys' in sys.argv:
    KEYS=[tuple(x.split(':')) for x in sys.argv[sys.argv.index('--keys')+1].split(',')]
    KEYS=[(a,int(b),int(c)) for a,b,c in KEYS]
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
def pmap(raw):
    # plain string + raw index per plain char; tags -> single space
    out=[];idx=[];i=0
    while i<len(raw):
        if raw[i]=='<':
            j=raw.find('>',i)
            if j!=-1 and re.match(r'</?[a-z]+[^>]*>',raw[i:j+1]): out.append(' ');idx.append(i);i=j+1;continue
        c=raw[i].replace('ſ','s'); out.append(c);idx.append(i);i+=1
    return ''.join(out),idx
def toks(plain_s):
    return [(m.group(),m.start(),m.end()) for m in re.finditer(r'\S+',plain_s)]
MARK=re.compile(r'^[\[\]\d◦,.:;()\s]*$')
def plan(k):
    out=[]
    for part_key in [kk for kk in M if kk[:3]==k]:
        pass
    return out
# per-part text: operate on part level when parts exist; find part containing hunk by token alignment on joined text
def patch_key(k,dry=True):
    parts=[(kk,M[kk]) for kk in sorted(M) if kk[:3]==k]
    joined=' '.join(a['text'] for _,a in parts)
    raw_parts=[a['text'] for _,a in parts]
    # tokenise per part and concatenate
    allt=[];owner=[]
    pm=[pmap(r) for r in raw_parts]
    for pi,(ps,idx) in enumerate(pm):
        for w,s,e in toks(ps): allt.append((w,pi,idx[s],idx[e-1]+1)); 
    A=[t[0] for t in allt]; B=plain(SM[k]).split(); Ow=plain(OT[k]).split()
    sm=difflib.SequenceMatcher(None,[sk(w) for w in A],[sk(w) for w in B],autojunk=False)
    osk=[sk(w) for w in Ow]
    edits=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='equal' or tag=='delete': continue
        seg=B[j1:j2]
        if len(seg)<3: continue
        if i1==0 and tag=='replace': continue
        if tag=='replace':
            m=A[i1:i2]
            if all(MARK.match(x) for x in m): continue
            if len(m)>len(seg)*3 : continue
        # O confirmation: sk(seg) must occur in O in order
        sseq=[sk(w) for w in seg]
        mm=difflib.SequenceMatcher(None,sseq,osk,autojunk=False)
        matched=sum(b.size for b in mm.get_matching_blocks())
        ok=matched>=0.75*len(seg)
        edits.append((tag,i1,i2,seg,ok,' '.join(A[max(0,i1-4):i1]),' '.join(A[i1:i2])))
    return allt,edits,raw_parts
if __name__=='__main__':
    keys=KEYS or []
    for k in keys:
        allt,edits,rp=patch_key(k)
        print('##',k,len(edits),'edits')
        for tag,i1,i2,seg,ok,ctx,mt in edits: print('  ',tag,'OK' if ok else 'NO-O','|',ctx,'[[',mt[:90],']] ->',' '.join(seg)[:160])
