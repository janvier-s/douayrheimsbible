import json,re,os,glob,sys
S='/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/'
SC=os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
DAT='static/data/'
APPLY='--apply' in sys.argv
def plain(s): return re.sub(r'<[^>]+>','',s)
def w(s): return re.sub(r'[^a-z0-9α-ω]','',s.lower().replace('&','and'))
def words(t): return [(m.group(),m.end()) for m in re.finditer(r'\S+',t) if w(m.group())]
def sk(x):
    x=w(x).replace('vv','w').replace('j','i').replace('v','u').replace('y','i'); return re.sub(r'[aeiou]','',x)
def scrape_notes(book,ch):
    out=[]
    for c in (ch-1,ch,ch+1):
        p=f'{SC}/{book}/{c}.json'
        if not os.path.exists(p): continue
        for v in json.load(open(p))['verses']:
            for side in ('left','right'):
                m=(v.get('margin') or {}).get(side)
                if m:
                    for n in m.get('notes',[]): 
                        if n.get('modern'): out.append(n['modern'])
    return out
cands=json.load(open(S+'trunc.json'))
extra=[tuple(x.split(',')) for x in []]
res=[];nomatch=[];edits=[]
files={}
for b,ch,vs,l,_ in cands:
    path=f'{DAT}odr/{b}.json'
    if path not in files: files[path]=json.load(open(path))
    d=files[path]
    note=[n for x in next(c for c in d['chapters'] if c['chapter']==ch)['verses'] if x['verse']==vs for n in x.get('notes',[]) if n.get('label')==l][0]
    cur=note['text']; cw=words(plain(cur))
    lead=1 if re.match(r'^[a-z0-9] [A-Z]',plain(cur)) else 0
    key=[w(x) for x,_ in cw[lead:lead+4]]
    last=[w(x) for x,_ in cw[-3:]]
    best=None
    for sn in scrape_notes(b.replace('isaie','isaias').replace('jeremie','jeremias'),ch):
        sw=words(sn)
        if [w(x) for x,_ in sw[:4]]!=key: continue
        sl=[w(x) for x,_ in sw]
        for i in range(len(sl)-2):
            if sl[i:i+3]==last and i+3<len(sw): best=(sn,sw[i+2][1]);break
        if best:break
    if not best: nomatch.append((b,ch,vs,l,plain(cur)[-70:])); continue
    sn,off=best
    tail=sn[off:].replace(' & ',' and ').replace('St. Augustine','S. Aug.')
    # cap tail by original extra
    ow=next(c for c in json.load(open(f'{DAT}odr-original/{b}.json'))['chapters'] if c['chapter']==ch)['verses']
    on=[n for x in ow if x['verse']==vs for n in x.get('notes',[]) if n.get('label')==l]
    cap=None
    if on:
        ot=re.sub(r'\s+',' ',plain(on[0]['text']).replace('ſ','s')).split(' · ')[0]
        ol=[sk(x) for x,_ in words(ot)]
        lk=[sk(x) for x,_ in cw[-3:]]
        for i in range(len(ol)-2):
            if ol[i:i+3]==lk: cap=len(ol)-(i+3)
    tw=words(tail)
    if cap is not None and len(tw)>cap+1: tail=tail[:tw[cap-1][1]] if cap>0 else ''
    new=cur+tail
    res.append((b,ch,vs,l,cur[-50:],tail))
    edits.append((path,cur,new))
for r in res: print(r[0],r[1],r[2],r[3],'|',r[4],'||ADD:',r[5])
print('NOMATCH');
for r in nomatch: print(r)

manual={('exodus',9,16,'f'):('+',' de Predest. et Grat. c. 6.'),('hebrews',11,1,'1'):('+',' ground of our hope.'),
('leviticus',6,12,'b'):('+',' heart by God\'s grace, must be continually nourished and kept burning, from which all other good works are derived.'),
('luke',10,35,'1'):('+',' whereby it is also evident against the Protestants, that there be such works. See Optatus li. 6 cont. Parmen. how aptly he applieth this parable to S. Paul\'s counsel of virginity (1 Cor. 7) as to a work of supererogation.'),
('matthew',28,1,'2'):('r','Easter eve.','Easter eve in the morning.'),
('psalms',24,12,'r'):('r','commodities here mentioned','commodities by his law here mentioned'),
('psalms',67,18,'d'):('+',' chariot of infinite magnificence. Dan. 7.'),
('psalms',77,14,'r'):('+',' they were in the desert.'),
('psalms',82,19,'c'):('+',' is WHICH IS. Exo. 3. v. 14. and 6. v. 3.'),
('psalms',115,4,'g'):('+',' he drank for mankind,'),
('psalms',125,1,'a'):('+',' Such spiritual joy devout souls have when they are delivered from sin.'),
('psalms',131,7,'g'):('+',' other place where his feet stood.'),
('psalms',132,1,'b'):('+',' in the Church of God.'),
('psalms',136,8,'n'):('+',' likewise prophesieth c. 13.'),
('lamentations',2,20,'e'):('+',' Joseph. li. 7. and 8. de bello Judaico.')}
for k,v in manual.items():
    b,ch,vs,l=k; path=f'{DAT}odr/{b}.json'
    d=json.load(open(path))
    note=[n for x in next(c for c in d['chapters'] if c['chapter']==ch)['verses'] if x['verse']==vs for n in x.get('notes',[]) if n.get('label')==l][0]
    cur=note['text']
    if v[0]=='+': new=cur+v[1]
    else:
        assert v[1] in cur,(k,cur[-80:]); new=cur.replace(v[1],v[2])
    edits.append((path,cur,new)); print('MANUAL',k,'|',new[-60:])
if APPLY:
    raw={}
    for p,old,new in edits:
        if p not in raw: raw[p]=open(p,encoding='utf-8').read()
        done=False
        for ea in (False,True):
            o=json.dumps(old,ensure_ascii=ea)[1:-1]; n=json.dumps(new,ensure_ascii=ea)[1:-1]
            if raw[p].count(o)==1: raw[p]=raw[p].replace(o,n); done=True; break
        if not done: print('FAILED',p,old[-40:],raw[p].count(o))
    for p,t in raw.items(): open(p,'w',encoding='utf-8').write(t)
