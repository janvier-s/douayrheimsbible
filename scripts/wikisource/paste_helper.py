#!/usr/bin/env python3
"""Local paste helper for posting the 1582 Rhemes NT pages to Wikisource by hand.

    python3 -I scripts/wikisource/paste_helper.py [--port 8582] [--no-open]

Serves one page on 127.0.0.1 only. It never contacts any site; "Open edit page"
just opens the Wikisource edit URL in your browser. Page files, the paste sheet
and the posted state are read fresh on every request.
Posted state: wikisource/1582-rhemes-nt/paste-state.json (written by this server).
"""

import hashlib
import json
import os
import re
import sys
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "wikisource", "1582-rhemes-nt")
ROOT = os.path.normpath(ROOT)
PAGES = range(31, 114)
EDIT = "https://en.wikisource.org/w/index.php?title=Page:1582_Rhemes_New_Testament.pdf/{}&action=edit"
STATE_FILE = os.path.join(ROOT, "paste-state.json")
lock = threading.Lock()


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def load_state():
    try:
        s = json.loads(read(STATE_FILE))
    except (OSError, ValueError):
        s = {}
    s.setdefault("last", PAGES[0])
    s.setdefault("posted", {})
    return s


def save_state(s):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(s, f, indent=1, sort_keys=True)
        f.write("\n")
    os.replace(tmp, STATE_FILE)


def sha1_of(n):
    with open(os.path.join(ROOT, "pages", f"{n}.wiki"), "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()


def split_page(text):
    """Body = text between the first </noinclude> and the last <noinclude>."""
    a = text.index("</noinclude>") + len("</noinclude>")
    b = text.rindex("<noinclude>")
    return text[a:b]


def sheet_fields(n):
    """Header, footer, summary for page n, parsed from paste-sheet.md."""
    sheet = read(os.path.join(ROOT, "paste-sheet.md"))
    m = re.search(rf"^## Page {n}\n(.*?)(?=^## Page |\Z)", sheet, re.S | re.M)
    out = {"header": "", "footer": "", "summary": ""}
    if not m:
        return out
    for key in out:
        f = re.search(rf"^- {key.capitalize()}: `(.*)`[ \t]*$", m.group(1), re.M)
        if f:
            out[key] = f.group(1)
    return out


def page_data(n, state):
    text = read(os.path.join(ROOT, "pages", f"{n}.wiki"))
    d = sheet_fields(n)
    d.update(n=n, body=split_page(text), edit_url=EDIT.format(n), sha1=sha1_of(n))
    p = state["posted"].get(str(n))
    d["posted"] = bool(p)
    d["changed"] = bool(p) and p.get("sha1") != d["sha1"]
    d["posted_at"] = p.get("at") if p else None
    return d


def overview(state):
    rows = []
    for n in PAGES:
        p = state["posted"].get(str(n))
        try:
            changed = bool(p) and p.get("sha1") != sha1_of(n)
        except OSError:
            changed = False
        rows.append({"n": n, "posted": bool(p), "changed": changed})
    return {"last": state["last"], "pages": rows}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def js(self, obj, code=200):
        self.send(code, json.dumps(obj, ensure_ascii=False))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            return self.send(200, HTML, "text/html; charset=utf-8")
        with lock:
            if path == "/api/pages":
                return self.js(overview(load_state()))
            m = re.fullmatch(r"/api/page/(\d+)", path)
            if m and int(m.group(1)) in PAGES:
                try:
                    return self.js(page_data(int(m.group(1)), load_state()))
                except (OSError, ValueError) as e:
                    return self.js({"error": str(e)}, 500)
        self.js({"error": "not found"}, 404)

    def do_POST(self):
        # Reject cross-site posts: only our own page (Host is 127.0.0.1) may write.
        host = self.headers.get("Host", "")
        if not re.fullmatch(r"(127\.0\.0\.1|localhost)(:\d+)?", host):
            return self.js({"error": "bad host"}, 403)
        try:
            req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            n = int(req["n"])
            assert n in PAGES
        except (ValueError, KeyError, AssertionError):
            return self.js({"error": "bad request"}, 400)
        with lock:
            s = load_state()
            if self.path == "/api/last":
                s["last"] = n
            elif self.path == "/api/posted":
                if req.get("posted"):
                    s["posted"][str(n)] = {"sha1": sha1_of(n), "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
                else:
                    s["posted"].pop(str(n), None)
            else:
                return self.js({"error": "not found"}, 404)
            save_state(s)
            self.js(overview(s))


HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rhemes NT paste helper</title>
<style>
:root{color-scheme:light dark;--bg:#fafaf7;--fg:#1d1d1b;--mut:#6b6b64;--card:#fff;--line:#d9d8d0;--acc:#1f5fbf;--ok:#1b7a3d;--warn:#b45309;--code:#f3f2ec}
@media(prefers-color-scheme:dark){:root{--bg:#161614;--fg:#e8e7e1;--mut:#9a9990;--card:#1f1f1c;--line:#34342f;--acc:#6ea8fe;--ok:#4ade80;--warn:#fbbf24;--code:#262622}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:16px}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
button,select{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px 12px;cursor:pointer}
button:hover{border-color:var(--acc)}button.primary{background:var(--acc);border-color:var(--acc);color:#fff}
button.ok{border-color:var(--ok);color:var(--ok)}
h1{font-size:18px;margin:0 12px 0 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px}
.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin:0 0 8px;display:flex;justify-content:space-between;align-items:center}
.card h2 button{text-transform:none;letter-spacing:0;font-size:13px}
pre{margin:0;padding:8px;background:var(--code);border-radius:6px;white-space:pre-wrap;word-break:break-word;font:13px/1.45 ui-monospace,Menlo,monospace}
pre.body{max-height:340px;overflow:auto}
.warn{border-color:var(--warn);color:var(--warn);padding:8px 12px;border:1px solid;border-radius:6px;margin-bottom:12px}
.grid{display:flex;flex-wrap:wrap;gap:4px}
.cell{width:38px;padding:3px 0;text-align:center;font-size:12px;border-radius:4px}
.cell.posted{background:var(--ok);border-color:var(--ok);color:#fff}
.cell.changed{background:var(--warn);border-color:var(--warn);color:#000}
.cell.cur{outline:2px solid var(--acc);outline-offset:1px}
.mut{color:var(--mut);font-size:13px}kbd{background:var(--code);border:1px solid var(--line);border-radius:4px;padding:0 5px;font-size:12px}
label{display:inline-flex;gap:6px;align-items:center;cursor:pointer}
</style></head><body><main>
<div class="bar">
 <h1>Rhemes NT paste helper</h1>
 <button id="prev">← Prev</button>
 <select id="sel"></select>
 <button id="next">Next →</button>
 <button id="nextun">Next unposted ⏭</button>
 <button id="edit" class="primary">Open edit page ↗</button>
 <label><input type="checkbox" id="posted"> posted</label>
 <span class="mut" id="count"></span>
</div>
<div id="warn" class="warn" hidden>This page file changed since you marked it posted. Re-post it, then tick “posted” again.</div>
<div id="err" class="warn" hidden></div>
<div class="card"><h2>Header <button data-copy="header">Copy header <kbd>1</kbd></button></h2><pre id="header"></pre></div>
<div class="card"><h2>Body <button data-copy="body">Copy body <kbd>2</kbd></button></h2><pre id="body" class="body"></pre></div>
<div class="card"><h2>Footer <button data-copy="footer">Copy footer <kbd>3</kbd></button></h2><pre id="footer"></pre></div>
<div class="card"><h2>Summary <button data-copy="summary">Copy summary <kbd>4</kbd></button></h2><pre id="summary"></pre></div>
<div class="card"><h2>Overview <span class="mut" style="text-transform:none;letter-spacing:0">green = posted, amber = file changed since posted</span></h2><div class="grid" id="grid"></div></div>
<p class="mut">Shortcuts: <kbd>←</kbd>/<kbd>→</kbd> prev/next · <kbd>1</kbd> header · <kbd>2</kbd> body · <kbd>3</kbd> footer · <kbd>4</kbd> summary · <kbd>E</kbd> open edit page · <kbd>P</kbd> toggle posted · <kbd>N</kbd> next unposted. Status on Wikisource: “Not proofread”.</p>
</main><script>
const $=id=>document.getElementById(id);let cur=null,ov=null,pg=null,reqId=0;
const api=(u,b)=>fetch(u,b?{method:'POST',body:JSON.stringify(b)}:{}).then(r=>r.json());
function showErr(m){$('err').hidden=!m;$('err').textContent=m||''}
function drawOv(){
 $('grid').innerHTML='';let done=0;
 for(const p of ov.pages){if(p.posted)done++;const b=document.createElement('button');b.className='cell'+(p.posted?' posted':'')+(p.changed?' changed':'')+(p.n===cur?' cur':'');b.textContent=p.n;b.onclick=()=>go(p.n);$('grid').append(b)}
 $('count').textContent=done+' / '+ov.pages.length+' posted';
}
async function go(n){
 const id=++reqId;cur=n;$('sel').value=n;
 const d=await api('/api/page/'+n);if(id!==reqId)return;
 if(d.error){showErr(d.error);return}showErr('');pg=d;
 for(const k of['header','body','footer','summary'])$(k).textContent=d[k];
 $('posted').checked=d.posted;$('warn').hidden=!d.changed;
 api('/api/last',{n}).then(o=>{ov=o;drawOv()});if(ov)drawOv();
}
async function copy(k,btn){
 try{await navigator.clipboard.writeText(pg[k])}catch(e){showErr('Clipboard failed: '+e);return}
 const t=btn.dataset.t||btn.innerHTML;btn.dataset.t=t;btn.innerHTML='Copied ✓';btn.classList.add('ok');
 clearTimeout(btn._t);btn._t=setTimeout(()=>{btn.innerHTML=t;btn.classList.remove('ok')},1200);
}
function step(d){const n=cur+d;if(n>=31&&n<=113)go(n)}
function nextUn(){const l=ov.pages.filter(p=>!p.posted),a=l.find(p=>p.n>cur)||l[0];if(a)go(a.n)}
async function toggle(v){ov=await api('/api/posted',{n:cur,posted:v});await go(cur)}
document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy(b.dataset.copy,b));
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('nextun').onclick=nextUn;
$('edit').onclick=()=>window.open(pg.edit_url,'_blank','noopener');
$('sel').onchange=e=>go(+e.target.value);$('posted').onchange=e=>toggle(e.target.checked);
addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey||!pg||/^(SELECT|INPUT)$/.test(e.target.tagName))return;
 const k=e.key.toLowerCase(),c={1:'header',2:'body',3:'footer',4:'summary'}[k];
 if(k==='arrowleft')step(-1);else if(k==='arrowright')step(1);
 else if(c)copy(c,document.querySelector('[data-copy='+c+']'));
 else if(k==='e')$('edit').click();else if(k==='p')toggle(!pg.posted);else if(k==='n')nextUn();else return;
 e.preventDefault();
});
(async()=>{
 for(let n=31;n<=113;n++)$('sel').add(new Option('Page '+n,n));
 ov=await api('/api/pages');await go(ov.last);
})();
</script></body></html>
"""


def main():
    port = 8582
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"
    print(f"Paste helper on {url}  (Ctrl-C to stop)\nPosted state: {STATE_FILE}")
    if "--no-open" not in sys.argv:
        threading.Timer(0.5, webbrowser.open, [url]).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
