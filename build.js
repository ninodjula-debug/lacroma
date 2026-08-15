const fs = require("fs");
const path = require("path");

const worksDir = path.join(__dirname, "data", "works");
const exhibitionsDir = path.join(__dirname, "data", "exhibitions");
const pressDir = path.join(__dirname, "data", "press");
const outputFile = path.join(__dirname, "works.json");
const indexFile = path.join(__dirname, "index.html");
const exhibitionsFile = path.join(__dirname, "exhibitions.html");
const pressFile = path.join(__dirname, "press.html");
const aboutFile = path.join(__dirname, "about.html");
const contactFile = path.join(__dirname, "contact.html");
const homeFile = path.join(__dirname, "data", "home.yml");
const aboutDataFile = path.join(__dirname, "data", "about.yml");
const contactDataFile = path.join(__dirname, "data", "contact.yml");

function clean(value = "") { return String(value).trim().replace(/^["']|["']$/g, ""); }
function escapeHtml(value = "") { return String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escapeAttr(value = "") { return escapeHtml(value).replace(/'/g,"&#39;"); }
function renderInline(value = "") { return escapeHtml(value).replace(/\*([^*]+)\*/g,"<em>$1</em>"); }
function regexEscape(value = "") { return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
function parseYamlLike(text = "") { const out={}; const lines=text.replace(/\r/g,"").split("\n"); for(let i=0;i<lines.length;i++){const match=lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(!match)continue;const key=match[1],raw=match[2];if(/^[>|][-+]?\s*$/.test(raw)){const block=[];i++;while(i<lines.length&&(/^\s+/.test(lines[i])||lines[i]==="")){block.push(lines[i].replace(/^\s{2}/,""));i++;}i--;out[key]=block.join("\n").trim();continue;}out[key]=clean(raw);}return out; }
function readYamlLike(file) { return fs.existsSync(file) ? parseYamlLike(fs.readFileSync(file,"utf8")) : {}; }
function readCollection(dir) { if(!fs.existsSync(dir))return[]; return fs.readdirSync(dir).filter(f=>/\.(md|yml|yaml)$/i.test(f)&&!f.startsWith(".")).map(file=>{const text=fs.readFileSync(path.join(dir,file),"utf8");const fm=text.startsWith("---")?(text.split(/^---\s*$/m).slice(1,2)[0]||""):text;return {...parseYamlLike(fm),__file:file};}); }
function sortByOrder(items) { return items.sort((a,b)=>Number(a.order??999999)-Number(b.order??999999)); }
function saveHtml(file,html,label) { fs.writeFileSync(file,html,"utf8"); console.log(`LACROMA: updated ${label}`); }
function injectBeforeBody(html,addition) { if(!addition||html.includes("data-lacroma-cms-package")) return html; return html.replace(/<\/body>/i,`${addition}\n</body>`); }

const works=sortByOrder(readCollection(worksDir).filter(w=>w.image&&w.category));
fs.writeFileSync(outputFile,JSON.stringify(works,null,2),"utf8");
console.log(`LACROMA: generated ${works.length} works → works.json`);

if (!fs.existsSync(indexFile)) throw new Error("LACROMA: index.html not found");
let html=fs.readFileSync(indexFile,"utf8");
const home=readYamlLike(homeFile);
if(home.hero_image) html=html.replace(/(<section class=["']hero["'][^>]*>\s*<img\b[^>]*\bsrc=["'])[^"']*(["'])/i,(m,a,b)=>`${a}${escapeAttr(home.hero_image)}${b}`);
if(home.home_text) html=html.replace(/(<div class=["']statement["'][^>]*>)[\s\S]*?(<\/div>)/i,(m,a,b)=>`${a}${escapeHtml(home.home_text)}${b}`);
const gridRegex=/<section class=["']grid["']>([\s\S]*?)<\/section>/i;
const gridMatch=html.match(gridRegex);
if(!gridMatch) throw new Error("LACROMA: gallery grid not found — index.html left unchanged");
const existingGrid=gridMatch[1];
const cmsMarkup=works.filter(w=>!existingGrid.includes(w.image)).map(w=>`<a class="thumb" data-cat="${escapeAttr((w.category||"").toLowerCase())}" data-cms-work="1" href="${escapeAttr(w.image)}"><img alt="${escapeAttr(w.title||"LACROMA artwork")}" src="${escapeAttr(w.image)}" loading="lazy"></a>`).join("");
html=html.replace(gridRegex,`<section class="grid">${existingGrid}${cmsMarkup}</section>`);
const galleryEnhancement=`
<style data-lacroma-cms-package>.caption{display:none!important}.thumb span{display:none!important}.thumb{cursor:zoom-in}.lacroma-lightbox{position:fixed;inset:0;z-index:9999;background:rgba(250,249,246,.97);display:none;align-items:center;justify-content:center;padding:28px}.lacroma-lightbox.open{display:flex}.lacroma-lightbox img{max-width:94vw;max-height:90vh;width:auto;height:auto;object-fit:contain}.lacroma-lightbox button{position:fixed;top:24px;right:28px;border:0;background:transparent;color:#1C1C1A;font:300 28px/1 Arial,sans-serif;cursor:pointer;padding:8px}@media(max-width:850px){.lacroma-lightbox{padding:16px}.lacroma-lightbox button{top:12px;right:12px}}</style>
<div class="lacroma-lightbox" id="lacroma-lightbox" aria-hidden="true"><button type="button" aria-label="Close">×</button><img alt=""></div>
<script data-lacroma-cms-package>(()=>{const LIMIT=16;const thumbs=[...document.querySelectorAll('.grid .thumb')];const more=[...document.querySelectorAll('button,a')].find(el=>/^more$/i.test((el.textContent||'').trim()));let active='all';let expanded=false;const cat=t=>(t.dataset.cat||'').toLowerCase();const render=()=>{const eligible=thumbs.filter(t=>active==='all'||cat(t)===active);thumbs.forEach(t=>t.style.display='none');eligible.forEach((t,i)=>{if(expanded||i<LIMIT)t.style.display='';});if(more){more.style.display=eligible.length>LIMIT&&!expanded?'':'none';}};document.querySelectorAll('[data-filter],.filters a,.filters button').forEach(el=>el.addEventListener('click',()=>{const raw=(el.dataset.filter||el.dataset.cat||el.textContent||'all').trim().toLowerCase();active=['places','faces','notes','objects'].includes(raw)?raw:'all';expanded=false;setTimeout(render,0);}));if(more)more.addEventListener('click',e=>{e.preventDefault();expanded=true;render();});render();const box=document.getElementById('lacroma-lightbox');if(!box)return;const image=box.querySelector('img');const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');image.removeAttribute('src');document.body.style.overflow='';};thumbs.forEach(thumb=>thumb.addEventListener('click',event=>{const source=thumb.querySelector('img');if(!source||!source.src)return;event.preventDefault();image.src=source.src;image.alt=source.alt||'';box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}));box.addEventListener('click',e=>{if(e.target===box)close();});box.querySelector('button').addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});})();</script>`;
html=injectBeforeBody(html,galleryEnhancement); saveHtml(indexFile,html,"index.html");

if(fs.existsSync(aboutFile)){let ahtml=fs.readFileSync(aboutFile,"utf8");const about=readYamlLike(aboutDataFile);if([about.intro,about.drawing,about.quote,about.practice,about.exhibitions_text].every(Boolean)){const markup=`<div class="about-copy"><div class="about-kicker">ABOUT</div><h1>${escapeHtml(about.name||"Nino Đula")}</h1><p>${renderInline(about.intro)}</p><p>${renderInline(about.drawing)}</p><p class="about-quote">${renderInline(about.quote)}</p><p>${renderInline(about.practice)}</p><p>${renderInline(about.exhibitions_text)}</p><div class="about-location">${escapeHtml(about.location||"")}</div></div>`;ahtml=ahtml.replace(/<div class=["']about-copy["']>[\s\S]*?<div class=["']about-location["']>[\s\S]*?<\/div><\/div>/i,markup);}if(about.photo)ahtml=ahtml.replace(/(<div class=["']about-photo["']>\s*<img\b[^>]*\bsrc=["'])[^"']*(["'][^>]*>)/i,`$1${escapeAttr(about.photo)}$2`);saveHtml(aboutFile,ahtml,"about.html");}
if(fs.existsSync(contactFile)){let chtml=fs.readFileSync(contactFile,"utf8");const contact=readYamlLike(contactDataFile);if(contact.heading)chtml=chtml.replace(/(<section class=["']contact-page["'][^>]*>[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,`$1${escapeHtml(contact.heading)}$2`);if(contact.location)chtml=chtml.replace(/(<div class=["']place["']>)[\s\S]*?(<\/div>)/i,`$1${escapeHtml(contact.location)}$2`);saveHtml(contactFile,chtml,"contact.html");}
console.log("LACROMA: CMS existing-content build complete");
