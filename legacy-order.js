const fs=require('fs'),path=require('path');
const clean=v=>String(v||'').trim().replace(/^["']|["']$/g,'');
const truthy=v=>/^(true|1|yes|on)$/i.test(String(v||''));
function parse(t=''){const o={};for(const line of t.replace(/\r/g,'').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(m)o[m[1]]=clean(m[2]);}return o;}
function collection(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(f=>/\.md$/i.test(f)&&!f.startsWith('.')).map(f=>{const t=fs.readFileSync(path.join(dir,f),'utf8'),fm=t.startsWith('---')?(t.split(/^---\s*$/m).slice(1,2)[0]||''):t;return parse(fm);});}
function text(s=''){return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');}

// PRESS SAFETY: build.js can currently let a later legacy Press record overwrite
// fields in the first featured card because its matcher can span multiple cards.
// Do not reorder or rebuild Press markup here. Instead, after build.js finishes,
// restore only the semantic fields of the existing first featured shell from the
// lowest-order Press record. Photo, description, layout and every other card stay intact.
if(fs.existsSync('press.html')){
  let h=fs.readFileSync('press.html','utf8');
  const items=collection('data/press').filter(x=>x.legacy_title).sort((a,b)=>Number(a.order||999999)-Number(b.order||999999));
  const featured=items[0];
  const re=/<a\b([^>]*class=["'][^"']*\bpress-feature\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/i;
  const m=h.match(re);
  if(featured&&m){
    let attrs=m[1],body=m[2];
    if(featured.link||featured.pdf){const target=esc(featured.link||featured.pdf);if(/\bhref=["'][^"']*["']/i.test(attrs))attrs=attrs.replace(/\bhref=["'][^"']*["']/i,`href="${target}"`);else attrs=` href="${target}"${attrs}`;}
    if(featured.title)body=body.replace(/(<h2\b[^>]*>)[\s\S]*?(<\/h2>)/i,`$1${esc(featured.title)}$2`);
    if(featured.publication||featured.date){const meta=[featured.publication,featured.date].filter(Boolean).map(esc).join(' · ');body=body.replace(/(<div class=["']meta["']>)[\s\S]*?(<\/div>)/i,`$1${meta}$2`);}
    h=h.replace(re,`<a${attrs}>${body}</a>`);
    fs.writeFileSync('press.html',h,'utf8');
    console.log(`LACROMA: restored featured Press item → ${featured.title}`);
  }else console.warn('LACROMA: featured Press shell or CMS record not found; Press left unchanged');
}

// EXHIBITIONS: hide and reorder all existing exhibition sections.
if(fs.existsSync('exhibitions.html')){let h=fs.readFileSync('exhibitions.html','utf8'),items=collection('data/exhibitions'),byTitle=new Map(items.map(x=>[x.title,x]));const re=/<section\b[^>]*class=["'][^"']*exhibition[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,blocks=h.match(re)||[];if(blocks.length){const firstPos=h.indexOf(blocks[0]);let stripped=h;for(const b of blocks)stripped=stripped.replace(b,'');const ranked=blocks.map((b,i)=>{const title=text((b.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||''),it=byTitle.get(title);return{b,it,order:Number((it&&it.order)||((i+1)*10))};}).filter(x=>!(x.it&&truthy(x.it.hidden))).sort((a,b)=>a.order-b.order).map(x=>x.b).join('');h=stripped.slice(0,firstPos)+ranked+stripped.slice(firstPos);fs.writeFileSync('exhibitions.html',h,'utf8');console.log('LACROMA: applied Exhibitions hide/order controls');}}
