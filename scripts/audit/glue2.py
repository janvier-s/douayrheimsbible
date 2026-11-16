import sys,re,json,difflib
sys.argv=['x']
exec(open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/ann3.py').read().split("res={}")[0])
W=set(w.strip().lower() for w in open('/usr/share/dict/words'))
def al(w): return re.sub(r'[^a-z]','',w.lower())
found=[]
for k in sorted(MT):
    if k not in SM: continue
    a=plain(MT[k]).split(); b=plain(SM[k]).split()
    sm=difflib.SequenceMatcher(None,[sk(x) for x in a],[sk(x) for x in b],autojunk=False)
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag!='replace': continue
        A=' '.join(a[i1:i2]); B=' '.join(b[j1:j2])
        # token-merge: M tokens (n) vs SM tokens (n+1..)
        if j2-j1>i2-i1:
            ma=al(''.join(a[i1:i2])); mb=al(''.join(b[j1:j2]))
            if ma==mb and any(al(x) and al(x) not in W and len(al(x))>=5 and al(x) not in {al(y) for y in b[j1:j2]} for x in a[i1:i2]):
                found.append((k,A,B))
print(len(found))
for f in found: print(f)
json.dump(found,open('/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible/fd1801e0-c068-43ed-b6dc-e1296c708420/scratchpad/glue2.json','w'))
