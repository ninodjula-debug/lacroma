const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'data','homepage'),file=path.join(__dirname,'index.html');
const clean=v=>String(v||'').trim().replace(/^["']|["']$/g,'');
const truthy=v=>/^(true|1|yes|on)$/i.test(String(v||''));
const esc=v=>String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');
function parse(t=''){const o={};for(const line of t.replace(/\r/g,'').split('\n')){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(m)o[m[1]]=clean(m[2]);}return o;}
function items(){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(f=>/\.(md|ya?ml)$/i.test(f)&&!f.startsWith('.')).map(f=>{const t=fs.readFileSync(path.join(dir,f),'utf8');const fm=t.startsWith('---')?(t.split(/^---\s*$/m).slice(1,2)[0]||''):t;return parse(fm);});}
function imageKey(markup=''){const m=markup.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)||markup.match(/\bhref=["']([^"']+)["']/i);return m?m[1].replace(/^https?:\/\/[^/]+/i,'').replace(/\?.*$/,'').toLowerCase():'';}
if(!fs.existsSync(file))throw new Error('LACROMA homepage helper: index.html not found');
let html=fs.readFileSync(file,'utf8');const gridRe=/<section class=["']grid["']>([\s\S]*?)<\/section>/i,m=html.match(gridRe);if(!m)throw new Error('LACROMA homepage helper: gallery grid not found');
const raw=m[1].replace(/<a\b[^>]*data-homepage-cms=["']1["'][\s\S]*?<\/a>/gi,'');
const thumbRe=/<a\b[^>]*class=["'][^"']*\bthumb\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,legacy=raw.match(thumbRe)||[];
const controls=items(),byLegacy=new Map(),fresh=[];for(const it of controls){const n=Number(it.legacy_index||0);if(n>0)byLegacy.set(n,it);else if(it.image&&!truthy(it.hidden))fresh.push(it);}
const unused=new Set(legacy.map((_,i)=>i));
function pickLegacy(it,idx){if(it&&it.image){const needle=String(it.image);for(const i of unused){if(legacy[i].includes(needle)){unused.delete(i);return legacy[i];}}}const preferred=idx-1;if(unused.has(preferred)){unused.delete(preferred);return legacy[preferred];}const first=unused.values().next();if(!first.done){unused.delete(first.value);return legacy[first.value];}return null;}
const managed=[];for(const [idx,it] of [...byLegacy.entries()].sort((a,b)=>a[0]-b[0])){let block=pickLegacy(it,idx);if(!block||truthy(it.hidden))continue;if(it.image){block=block.replace(/(href=["'])[^"']*(["'])/i,`$1${esc(it.image)}$2`);block=block.replace(/(<img\b[^>]*src=["'])[^"']*(["'])/i,`$1${esc(it.image)}$2`);}if(it.title){if(/<img\b[^>]*alt=/i.test(block))block=block.replace(/(<img\b[^>]*alt=["'])[^"']*(["'])/i,`$1${esc(it.title)}$2`);else block=block.replace(/<img\b/i,`<img alt="${esc(it.title)}"`);}if(it.category){if(/data-cat=/i.test(block))block=block.replace(/(data-cat=["'])[^"']*(["'])/i,`$1${esc(it.category.toLowerCase())}$2`);else block=block.replace(/<a\b/i,`<a data-cat="${esc(it.category.toLowerCase())}"`);}if(!/data-homepage-legacy=/i.test(block))block=block.replace(/<a\b/i,'<a data-homepage-legacy="1"');managed.push({order:Number(it.order||idx*10),markup:block});}
for(const i of unused)managed.push({order:(i+1)*10,markup:legacy[i]});
const added=fresh.map((it,i)=>({order:Number(it.order||((legacy.length+i+1)*10)),markup:`<a class="thumb" data-homepage-cms="1" data-cat="${esc((it.category||'').toLowerCase())}" href="${esc(it.image)}"><img alt="${esc(it.title||'LACROMA artwork')}" src="${esc(it.image)}" loading="lazy"></a>`}));
const seen=new Set();const rebuiltItems=[...managed,...added].sort((a,b)=>a.order-b.order).filter(x=>{const key=imageKey(x.markup);if(!key)return true;if(seen.has(key))return false;seen.add(key);return true;});
const rebuilt=rebuiltItems.map(x=>x.markup).join('');html=html.replace(gridRe,`<section class="grid">${rebuilt}</section>`);
html=html.replace(/<(a|button)\b[^>]*>\s*VIEW\s+ALL\s+WORKS\s*<\/\1>/gi,'');
if(!/id=["']worksMore["']/i.test(html))html=html.replace(/<\/section>/i,`</section><div class="more" id="worksMore"><button type="button">MORE</button></div>`);
const oldGalleryLogic=/const buttons=\[\.\.\.document\.querySelectorAll\('\.filters button'\)\];[\s\S]*?moreBtn\.addEventListener\('click',\(\)=>\{cards\.forEach\(c=>c\.classList\.remove\('more-hidden'\)\);moreWrap\.style\.display='none';\}\);\s*\}/;
const newGalleryLogic=`const buttons=[...document.querySelectorAll('.filters button')];
const cards=[...document.querySelectorAll('.thumb')];
const viewAllLabel=el=>(el.textContent||'').replace(/\\s+/g,' ').trim();
[...document.querySelectorAll('body *')].filter(el=>/^VIEW ALL WORKS\\b/i.test(viewAllLabel(el))&&![...el.children].some(ch=>/^VIEW ALL WORKS\\b/i.test(viewAllLabel(ch)))).forEach(el=>{let target=el;const parent=el.parentElement;if(parent&&parent!==document.body&&!parent.matches('.grid,.filters,#worksMore')&&/^VIEW ALL WORKS\\b/i.test(viewAllLabel(parent))&&viewAllLabel(parent).length<40&&parent.children.length<=3)target=parent;target.remove();});
const moreWrap=document.getElementById('worksMore');
const moreBtn=moreWrap?moreWrap.querySelector('button'):null;
const LIMIT=16;
const allowed=['places','faces','notes','objects'];
let active=allowed.includes(location.hash.slice(1).toLowerCase())?location.hash.slice(1).toLowerCase():'all',expanded=false;
function renderWorks(){const eligible=cards.filter(card=>active==='all'||card.dataset.cat===active);cards.forEach(card=>{card.classList.toggle('hidden',active!=='all'&&card.dataset.cat!==active);card.classList.remove('more-hidden');});if(!expanded)eligible.slice(LIMIT).forEach(card=>card.classList.add('more-hidden'));if(moreWrap)moreWrap.style.display=eligible.length>LIMIT&&!expanded?'block':'none';buttons.forEach(btn=>btn.classList.toggle('active',(btn.dataset.filter||'all')===active));}
function setCategory(next,writeHash=true){active=allowed.includes(next)?next:'all';expanded=false;if(writeHash){const target=active==='all'?'':('#'+active);if(location.hash!==target)history.replaceState(null,'',location.pathname+location.search+target);}renderWorks();}
buttons.forEach(btn=>btn.addEventListener('click',()=>setCategory(btn.dataset.filter||'all')));window.addEventListener('hashchange',()=>setCategory(location.hash.slice(1).toLowerCase(),false));if(moreBtn)moreBtn.addEventListener('click',()=>{expanded=true;renderWorks();});renderWorks();`;
if(!oldGalleryLogic.test(html))throw new Error('LACROMA homepage helper: expected gallery pagination block not found — index.html left unchanged');
html=html.replace(oldGalleryLogic,newGalleryLogic);
fs.writeFileSync(file,html,'utf8');console.log(`LACROMA: ${rebuiltItems.length} unique homepage cards; duplicates removed; 16 visible per active view before MORE; decorative VIEW ALL WORKS removed`);

/* Technical SEO: invisible to layout; generated every deploy. */
const pages={
 'index.html':{url:'https://lacroma.art/',title:'LACROMA — Nino Đula',description:'Selected works by Nino Đula. Drawings, exhibitions and press.'},
 'exhibitions.html':{url:'https://lacroma.art/exhibitions.html',title:'Exhibitions — LACROMA · Nino Đula',description:'Selected exhibitions and exhibition projects by Nino Đula.'},
 'press.html':{url:'https://lacroma.art/press.html',title:'Press — LACROMA · Nino Đula',description:'Selected press, reviews and articles about the work and exhibitions of Nino Đula.'},
 'about.html':{url:'https://lacroma.art/about.html',title:'About Nino Đula — LACROMA',description:'About Nino Đula and his drawing and artistic practice.'},
 'contact.html':{url:'https://lacroma.art/contact.html',title:'Contact — LACROMA · Nino Đula',description:'Contact and Instagram for LACROMA and Nino Đula.'}
};
const person={"@context":"https://schema.org","@type":"Person","name":"Nino Đula","url":"https://lacroma.art/about.html","sameAs":["https://www.instagram.com/lacroma/"]};
for(const [name,meta] of Object.entries(pages)){const p=path.join(__dirname,name);if(!fs.existsSync(p))continue;let s=fs.readFileSync(p,'utf8');s=s.replace(/<title>[\s\S]*?<\/title>/i,`<title>${meta.title}</title>`);s=s.replace(/\s*<link\s+rel=["']canonical["'][^>]*>/ig,'');s=s.replace(/\s*<script\s+type=["']application\/ld\+json["']\s+data-lacroma-seo[^>]*>[\s\S]*?<\/script>/ig,'');s=s.replace(/\s*<meta\s+name=["']description["'][^>]*>/ig,'');const extra=`\n<meta name="description" content="${meta.description}">\n<link rel="canonical" href="${meta.url}">\n<script type="application/ld+json" data-lacroma-seo>${JSON.stringify(person)}</script>`;s=s.replace(/<\/head>/i,`${extra}\n</head>`);fs.writeFileSync(p,s,'utf8');}
const urls=Object.values(pages).map(x=>`  <url><loc>${x.url}</loc></url>`).join('\n');
fs.writeFileSync(path.join(__dirname,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,'utf8');
fs.writeFileSync(path.join(__dirname,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: https://lacroma.art/sitemap.xml\n`,'utf8');
console.log('LACROMA: technical SEO generated — canonicals, descriptions, Person JSON-LD, sitemap.xml, robots.txt');
