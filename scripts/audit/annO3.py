import sys,difflib,json,re,collections
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
def surf(w): return re.sub(r'^[^\w]+|[^\w]+$','',w.lower().replace('ſ','s').replace('vv','w').replace('’',"'"))
rows=[];perann=collections.Counter()
for k in sorted(OT):
    if k not in SO: continue
    Ow=plain(OT[k]).split(); Sw=plain(SO[k]).split()
    a=[surf(w) for w in Ow]; b=[surf(w) for w in Sw]
    sm=difflib.SequenceMatcher(None,a,b,autojunk=False)
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag=='replace' and i2-i1==j2-j1 and i2-i1<=3:
            for x,y,ox,sy in zip(a[i1:i2],b[j1:j2],Ow[i1:i2],Sw[j1:j2]):
                if x!=y and difflib.SequenceMatcher(None,x,y).ratio()>=0.6: rows.append((k,ox,sy)); perann[k]+=1
print(len(rows),len(perann))
cat=collections.Counter()
for k,x,y in rows:
    if re.sub(r"'",'',x)==y or x.replace('-','')==y or x.replace('-',' ')==y: cat['apostrophe/hyphen']+=1
    elif 'ſ' not in x and 's' in x.lower(): cat['other']+=1
print(cat)
json.dump(rows,open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/annO3.json','w'),ensure_ascii=False)
for r in rows[:60]: print(r[0][:3],r[1],'->',r[2])
