const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'data','homepage'),file=path.join(__dirname,'index.html');
const clean=v=>String(v||'').trim().replace(/^["']|["']$/g,'');
const truthy=v=>/^(true|1|yes|on)$/i.test(String(v||''));
const esc=v=>String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');
function parse(t=''){const o={};for(const line of t.replace(/\r/g,'').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(m)o[m[1]]=clean(m[2]);}return o;}
function items(){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(f=>/\.(md|ya?ml)$/i.test(f)&&!f.startsWith('.')).map(f=>{const t=fs.readFileSync(path.join(dir,f),'utf8');const fm=t.startsWith('---')?(t.split(/^---\s*$/m).slice(1,2)[0]||''):t;return parse(fm);});}
if(!fs.existsSync(file))throw new Error('LACROMA homepage helper: index.html not found');
let html=fs.readFileSync(file,'utf8');const gridRe=/<section class=["']grid["']>([\s\S]*?)<\/section>/i,m=html.match(gridRe);if(!m)throw new Error('LACROMA homepage helper: gallery grid not found');
/* Homepage Images is the sole source of editable homepage additions. Remove transient cards appended by Works and previous homepage builds before rebuilding. */
const raw=m[1]
 .replace(/<a\b[^>]*data-homepage-cms=["']1["'][\s\S]*?<\/a>/gi,'')
 .replace(/<a\b[^>]*data-cms-work=["']1["'][\s\S]*?<\/a>/gi,'');
const thumbRe=/<a\b[^>]*class=["'][^"']*\bthumb\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,legacy=raw.match(thumbRe)||[];
const controls=items(),byLegacy=new Map(),fresh=[];for(const it of controls){const n=Number(it.legacy_index||0);if(n>0)byLegacy.set(n,it);else if(it.image&&!truthy(it.hidden))fresh.push(it);}
/* A previous preview build may already have reordered the locked thumbnails. Match managed legacy items by their current image path first, not by their current DOM position. This keeps order changes stable across repeated Netlify builds. */
const unused=new Set(legacy.map((_,i)=>i));
function pickLegacy(it,idx){if(it&&it.image){const needle=String(it.image);for(const i of unused){if(legacy[i].includes(needle)){unused.delete(i);return legacy[i];}}}const preferred=idx-1;if(unused.has(preferred)){unused.delete(preferred);return legacy[preferred];}const first=unused.values().next();if(!first.done){unused.delete(first.value);return legacy[first.value];}return null;}
const managed=[];for(const [idx,it] of [...byLegacy.entries()].sort((a,b)=>a[0]-b[0])){let block=pickLegacy(it,idx);if(!block||truthy(it.hidden))continue;if(it.image){block=block.replace(/(href=["'])[^"']*(["'])/i,`$1${esc(it.image)}$2`);block=block.replace(/(<img\b[^>]*src=["'])[^"']*(["'])/i,`$1${esc(it.image)}$2`);}if(it.title){if(/<img\b[^>]*alt=/i.test(block))block=block.replace(/(<img\b[^>]*alt=["'])[^"']*(["'])/i,`$1${esc(it.title)}$2`);else block=block.replace(/<img\b/i,`<img alt="${esc(it.title)}"`);}if(it.category){if(/data-cat=/i.test(block))block=block.replace(/(data-cat=["'])[^"']*(["'])/i,`$1${esc(it.category.toLowerCase())}$2`);else block=block.replace(/<a\b/i,`<a data-cat="${esc(it.category.toLowerCase())}"`);}if(!/data-homepage-legacy=/i.test(block))block=block.replace(/<a\b/i,'<a data-homepage-legacy="1"');managed.push({order:Number(it.order||idx*10),markup:block});}
/* Preserve any unmanaged locked thumbnails as a safety fallback. */
for(const i of unused)managed.push({order:(i+1)*10,markup:legacy[i]});
const added=fresh.map((it,i)=>({order:Number(it.order||((legacy.length+i+1)*10)),markup:`<a class="thumb" data-homepage-cms="1" data-cat="${esc((it.category||'').toLowerCase())}" href="${esc(it.image)}"><img alt="${esc(it.title||'LACROMA artwork')}" src="${esc(it.image)}" loading="lazy"></a>`}));
const rebuilt=[...managed,...added].sort((a,b)=>a.order-b.order).map(x=>x.markup).join('');html=html.replace(gridRe,`<section class="grid">${rebuilt}</section>`);
/* Gallery pagination: Home and every category show up to 16 works before MORE appears. */
html=html.replace(/let\s+initialShown\s*=\s*\d+\s*;/g,'let initialShown = 16;').replace(/const\s+initialShown\s*=\s*\d+\s*;/g,'const initialShown = 16;');
fs.writeFileSync(file,html,'utf8');console.log(`LACROMA: managed ${managed.length} existing + ${added.length} homepage CMS images; first 16 works visible before MORE`);
