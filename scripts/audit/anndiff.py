import json,glob,os,re,difflib,sys
def plain(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s).replace('ſ','s')).strip()
def sk(w):
    w=w.lower().replace('&','and'); w=re.sub(r'[^a-z0-9Ͱ-Ͽἀ-῿]','',w)
    w=w.replace('vv','w').replace('j','i').replace('v','u').replace('y','i').replace('ph','f')
    w=re.sub(r'(.)\1',r'\1',w); return re.sub(r'[aeiou]','',w) or w
def load(p):
    D={}
    for f in glob.glob(f'{p}/*/annotations/*.json'):
        b=f.split('/')[1]; ch=int(os.path.basename(f)[:-5])
        for a in json.load(open(f))['annotations']: D[(b,ch,a['verse'],a.get('part',1))]=a
    return D
if __name__=='__main__':
    M,O=load('odr'),load('odr-original'); out=[]
    for k in sorted(M):
        mw=plain(M[k]['text']).split(); ow=plain(O[k]['text']).split()
        a=[sk(w) for w in mw]; b=[sk(w) for w in ow]
        sm=difflib.SequenceMatcher(None,a,b,autojunk=False)
        for tag,i1,i2,j1,j2 in sm.get_opcodes():
            if tag=='equal': continue
            if tag=='replace' and (i2-i1)<=1 and (j2-j1)<=1: continue
            out.append((k,tag,' '.join(mw[i1:i2])[:140],' '.join(ow[j1:j2])[:140]))
    json.dump(out,open(sys.argv[1],'w'))
    print(len(out),'diff hunks in',len({o[0] for o in out}),'annotations')
    from collections import Counter; print(Counter(o[1] for o in out))
