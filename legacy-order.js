const fs=require('fs'),path=require('path');
const clean=v=>String(v||'').trim().replace(/^["']|["']$/g,'');
const truthy=v=>/^(true|1|yes|on)$/i.test(String(v||''));
function parse(t=''){const o={};for(const line of t.replace(/\r/g,'').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(m)o[m[1]]=clean(m[2]);}return o;}
function collection(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(f=>/\.md$/i.test(f)&&!f.startsWith('.')).map(f=>{const t=fs.readFileSync(path.join(dir,f),'utf8'),fm=t.startsWith('---')?(t.split(/^---\s*$/m).slice(1,2)[0]||''):t;return parse(fm);});}
function text(s=''){return s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function attr(s=''){return esc(s).replace(/'/g,'&#39;');}

// PRESS: every existing item can be hidden and reordered. The first visible item occupies the locked featured design slot.
if(fs.existsSync('press.html')){
 let h=fs.readFileSync('press.html','utf8'),items=collection('data/press'),byTitle=new Map(items.map(x=>[x.title,x]));
 const blockRe=/<a\b[^>]*class=["'][^"']*press-(?:feature|small)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
 const blocks=h.match(blockRe)||[];
 const details=b=>{const title=text((b.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)||[])[1]||'');return{block:b,title,item:byTitle.get(title),href:(b.match(/\bhref=["']([^"']*)["']/i)||[])[1]||'#',meta:text((b.match(/<div\b[^>]*class=["'][^"']*meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)||[])[1]||''),desc:text((b.match(/<p[^>]*>([\s\S]*?)<\/p>/i)||[])[1]||''),img:(b.match(/<img\b[^>]*\bsrc=["']([^"']*)["']/i)||[])[1]||'',feature:/\bpress-feature\b/i.test(b)};};
 const ranked=blocks.map((b,i)=>{const d=details(b),it=d.item;return{...d,order:Number((it&&it.order)||((i+1)*10)),hidden:!!(it&&truthy(it.hidden))};}).filter(x=>!x.hidden).sort((a,b)=>a.order-b.order);
 const featureWrap=/(<section class=["']featured-press["']>)[\s\S]*?(<\/section>)/i;
 const moreWrap=/(<div class=["']more-press["']>)[\s\S]*?(<\/div>\s*(?:<\/section>)?)/i;
 const asFeature=(d,n)=>{if(d.feature)return d.block.replace(/(<div class=["']num["']>)[\s\S]*?(<\/div>)/i,`$1${String(n).padStart(2,'0')}$2`);const it=d.item||{};const desc=it.description||d.desc||'';const image=it.image||d.img||'';const meta=it.publication||d.meta||'';return `<a class="press-feature" href="${attr(it.link||it.pdf||d.href||'#')}" target="_blank" rel="noopener"><div class="num">${String(n).padStart(2,'0')}</div><div><h2>${esc(it.title||d.title||'Press')}</h2>${desc?`<p>${esc(desc)}</p>`:''}</div>${image?`<div class="photo"><img src="${attr(image)}" alt="${attr(it.title||d.title||'Press')}"></div>`:'<div class="photo"></div>'}<div class="meta">${esc(meta)}</div></a>`;};
 const asSmall=d=>{if(!d.feature)return d.block;const it=d.item||{};const meta=it.publication||d.meta||'';return `<a class="press-small" href="${attr(it.link||it.pdf||d.href||'#')}" target="_blank" rel="noopener"><div class="meta">${esc(meta)}</div><h3>${esc(it.title||d.title||'Press')}</h3><span>VIEW →</span></a>`;};
 if(ranked.length){h=h.replace(featureWrap,`$1${asFeature(ranked[0],1)}$2`);const rest=ranked.slice(1).map(asSmall).join('');h=h.replace(moreWrap,`$1${rest}$2`);}else{h=h.replace(featureWrap,'$1$2');h=h.replace(moreWrap,'$1$2');}
 fs.writeFileSync('press.html',h,'utf8');console.log('LACROMA: applied full Press hide/order controls');
}

// EXHIBITIONS: hide and reorder all existing exhibition sections.
if(fs.existsSync('exhibitions.html')){let h=fs.readFileSync('exhibitions.html','utf8'),items=collection('data/exhibitions'),byTitle=new Map(items.map(x=>[x.title,x]));const re=/<section\b[^>]*class=["'][^"']*exhibition[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,blocks=h.match(re)||[];if(blocks.length){const firstPos=h.indexOf(blocks[0]);let stripped=h;for(const b of blocks)stripped=stripped.replace(b,'');const ranked=blocks.map((b,i)=>{const title=text((b.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||''),it=byTitle.get(title);return{b,it,order:Number((it&&it.order)||((i+1)*10))};}).filter(x=>!(x.it&&truthy(x.it.hidden))).sort((a,b)=>a.order-b.order).map(x=>x.b).join('');h=stripped.slice(0,firstPos)+ranked+stripped.slice(firstPos);fs.writeFileSync('exhibitions.html',h,'utf8');console.log('LACROMA: applied Exhibitions hide/order controls');}}