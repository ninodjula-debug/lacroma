const fs=require('fs'),path=require('path');
const clean=v=>String(v||'').trim().replace(/^["']|["']$/g,'');
const truthy=v=>/^(true|1|yes|on)$/i.test(String(v||''));
function parse(t=''){const o={};for(const line of t.replace(/\r/g,'').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(m)o[m[1]]=clean(m[2]);}return o;}
function collection(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(f=>/\.md$/i.test(f)&&!f.startsWith('.')).map(f=>{const t=fs.readFileSync(path.join(dir,f),'utf8'),fm=t.startsWith('---')?(t.split(/^---\s*$/m).slice(1,2)[0]||''):t;return parse(fm);});}
function text(s=''){return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}

// PRESS SAFETY: keep the locked Press markup intact in the migration preview.
// All existing Press records are now present in Decap CMS. We deliberately do not
// restructure press.html here because moving the featured card across containers
// can remove sibling cards in the legacy nested markup. Editing existing Press
// content remains handled by build.js; full cross-slot reordering will be added
// only with a DOM-safe renderer after the migration itself is approved.
if(fs.existsSync('press.html')) console.log('LACROMA: Press legacy layout preserved');

// EXHIBITIONS: hide and reorder all existing exhibition sections.
if(fs.existsSync('exhibitions.html')){let h=fs.readFileSync('exhibitions.html','utf8'),items=collection('data/exhibitions'),byTitle=new Map(items.map(x=>[x.title,x]));const re=/<section\b[^>]*class=["'][^"']*exhibition[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,blocks=h.match(re)||[];if(blocks.length){const firstPos=h.indexOf(blocks[0]);let stripped=h;for(const b of blocks)stripped=stripped.replace(b,'');const ranked=blocks.map((b,i)=>{const title=text((b.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||''),it=byTitle.get(title);return{b,it,order:Number((it&&it.order)||((i+1)*10))};}).filter(x=>!(x.it&&truthy(x.it.hidden))).sort((a,b)=>a.order-b.order).map(x=>x.b).join('');h=stripped.slice(0,firstPos)+ranked+stripped.slice(firstPos);fs.writeFileSync('exhibitions.html',h,'utf8');console.log('LACROMA: applied Exhibitions hide/order controls');}}