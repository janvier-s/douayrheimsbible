import json,glob,os,re
def strip(t): return re.sub(r'<[^>]+>','',t)
def norm(s): return re.sub(r'\s+',' ',strip(s).replace('ſ','s')).strip()
bad=[];n=0;miss=0
for f in sorted(glob.glob('odr/*.json')):
    b=os.path.basename(f)[:-5]
    o=f.replace('odr/','odr-original/')
    if not os.path.exists(o): continue
    m=json.load(open(f)); r=json.load(open(o))
    for cm,cr in zip(m['chapters'],r['chapters']):
        rv={v['verse']:v for v in cr['verses']}
        for v in cm['verses']:
            w=rv.get(v['verse'])
            if not w: continue
            on={x['label']:x for x in w.get('notes',[]) if x.get('label')}
            mn={x['label']:x for x in v.get('notes',[]) if x.get('label')}
            for l,x in on.items():
                n+=1
                if l not in mn: miss+=1; bad.append((b,cm['chapter'],v['verse'],l,'MISSING',0)); continue
                a,c=len(norm(mn[l]['text'])),len(norm(x['text']))
                if c and a<0.8*c: bad.append((b,cm['chapter'],v['verse'],l,'SHORT',round(a/c,2)))
print(n,'orig notes;',miss,'missing in modern;',len(bad)-miss,'short')
for x in bad[:25]: print(x)
