// Downloads aruljohn/Bible-kjv-1611 (80 files) to ~/facsimiles/kjv-1611/aruljohn/. Never re-fetches.
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const API = 'https://api.github.com/repos/aruljohn/Bible-kjv-1611/contents/';
const RAW = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv-1611/master/';
const DIR = join(homedir(), 'facsimiles/kjv-1611/aruljohn');
const UA = 'bible-data-build/1.0';

mkdirSync(DIR, { recursive: true });
const list = (await (await fetch(API, { headers: { 'User-Agent': UA } })).json()) as {
	name: string;
}[];
let got = 0;
for (const { name } of list) {
	if (!name.endsWith('.json')) continue;
	const out = join(DIR, name);
	if (existsSync(out)) continue;
	const r = await fetch(RAW + encodeURIComponent(name), { headers: { 'User-Agent': UA } });
	if (!r.ok) throw new Error(`${name}: ${r.status}`);
	writeFileSync(out, await r.text());
	got++;
	await new Promise((res) => setTimeout(res, 500));
}
console.log(`fetched ${got} new files into ${DIR}`);
