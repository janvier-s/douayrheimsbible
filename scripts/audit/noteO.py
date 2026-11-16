import json,glob,os,re,difflib,collections,sys
SC=os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
slug={'isaie':'isaias','jeremie':'jeremias','malachie':'malachias'}
def plain(s): return re.sub(r'<[^>]+>',' ',s)
def surf(w): return re.sub(r'^[^\w]+|[^\w]+$','',w.lower().replace('ſ','s').replace('vv','w').replace('’',"'"))
def sk(w):
    w=surf(w); w=w.replace('w','u').replace('j','i').replace('v','u').replace('y','i'); w=re.sub(r'(.)\1',r'\1',w); return re.sub(r'[aeiou]','',w) or w
def scrape_notes(book,ch):
    out=[]
    for c in (ch-1,ch,ch+1):
        p=f'{SC}/{slug.get(book,book)}/{c}.json'
        if not os.path.exists(p): continue
        for v in json.load(open(p))['verses']:
            for side in ('left','right'):
                m=(v.get('margin') or {}).get(side)
                for n in (m or {}).get('notes',[]) if m else []:
                    if n.get('original') and n.get('modern'): out.append((n['original'],n['modern']))
    return out
