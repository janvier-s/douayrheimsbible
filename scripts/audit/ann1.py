import json,glob,os,re
from collections import Counter
def plain(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',s).replace('ſ','s')).strip()
M={};O={}
for p,D in (('odr',M),('odr-original',O)):
    for f in glob.glob(f'{p}/*/annotations/*.json'):
        b=f.split('/')[1]; ch=int(os.path.basename(f)[:-5])
        for a in json.load(open(f))['annotations']: D[(b,ch,a['verse'],a.get('part',1))]=a
print('modern',len(M),'orig',len(O),'only-M',len(set(M)-set(O)),'only-O',len(set(O)-set(M)))
print(Counter(k for a in M.values() for k in a), )
short=[]
for k in sorted(set(M)&set(O)):
    a,b=len(plain(M[k]['text'])),len(plain(O[k]['text']))
    if b and a<0.9*b or a>1.1*b: short.append((k,a,b,round(a/b,2)))
print('ratio outside 0.9-1.1:',len(short))
for x in sorted(short,key=lambda x:x[3])[:25]: print(x)
print([k for k in sorted(set(M)-set(O))][:10],[k for k in sorted(set(O)-set(M))][:10])
