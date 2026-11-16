import json,glob,os,re,collections
W=set(w.strip().lower() for w in open('/usr/share/dict/words'))
# vocabulary from original-spelling-free text: all words occurring >=3 times across modern notes+annotations
def plain(s): return re.sub(r'<[^>]+>',' ',s)
texts={}
for f in glob.glob('odr/*/annotations/*.json'):
    for a in json.load(open(f))['annotations']: texts[('ann',f,a['verse'],a.get('part'))]=a['text']
for f in glob.glob('odr/*.json'):
    for ch in json.load(open(f)).get('chapters',[]):
        for v in ch['verses']:
            for n in v.get('notes',[]): texts[('note',os.path.basename(f)[:-5],ch['chapter'],v['verse'],n['label'])]=n['text']
cnt=collections.Counter(w for t in texts.values() for w in re.findall(r"[A-Za-z']+",plain(t)).__iter__() )
low=collections.Counter(w.lower() for w in cnt.elements())
V={w for w,c in low.items() if c>=4}|W
out=[]
for k,t in texts.items():
    for m in re.finditer(r"[A-Za-z]{6,}",plain(t)):
        w=m.group().lower()
        if w in V: continue
        for i in range(2,len(w)-1):
            a,b=w[:i],w[i:]
            if a in V and b in V and len(a)>=2 and len(b)>=2 and (len(a)>=3 or a in('of','in','to','be','is','as','at','by','or','on','he','we','if','it','an','no','so','my','me','us','up','do')) and (len(b)>=3 or b in ('of','in','to','be','is','as','at','by','or','on','he','we','if','it','an','no','so','my','me','us','up','do')):
                out.append((k,m.group(),a,b)); break
print(len(out))
c=collections.Counter((a,b) for _,_,a,b in out)
for k,w,a,b in out[:80]: print(k[:4],w,a,b)
json.dump([(list(map(str,k)),w,a,b) for k,w,a,b in out],open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/glue.json','w'))
