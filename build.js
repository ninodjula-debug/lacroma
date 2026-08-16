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
function applyBrandMeta(page) {
  const title = "LACROMA — Nino Đula";
  const description = "Selected works by Nino Đula. Drawings, exhibitions and press.";
  const favicon = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23FAF9F6'/%3E%3Cpath d='M21 13V49H47' fill='none' stroke='%231C1C1A' stroke-width='3' stroke-linecap='square'/%3E%3C/svg%3E">`;
  page = page.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  page = page.replace(/\s*<meta\s+name=["']description["'][^>]*>/ig, "");
  page = page.replace(/\s*<meta\s+property=["']og:(?:title|description|url|type)["'][^>]*>/ig, "");
  page = page.replace(/\s*<meta\s+name=["']twitter:(?:card|title|description)["'][^>]*>/ig, "");
  page = page.replace(/\s*<link\s+rel=["'](?:shortcut )?icon["'][^>]*>/ig, "");
  const meta = `\n<meta name="description" content="${description}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${description}">\n<meta property="og:url" content="https://lacroma.art/">\n<meta property="og:type" content="website">\n<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="${title}">\n<meta name="twitter:description" content="${description}">\n${favicon}`;
  return page.replace(/<\/head>/i, `${meta}\n</head>`);
}

function parseYamlLike(text = "") {
  const out = {};
  const lines = text.replace(/\r/g, "").split("\n");
  for (let i=0;i<lines.length;i++) {
    const match = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1], raw = match[2];
    if (/^[>|][-+]?\s*$/.test(raw)) {
      const block=[]; i++;
      while (i<lines.length && (/^\s+/.test(lines[i]) || lines[i]==="")) { block.push(lines[i].replace(/^\s{2}/,"")); i++; }
      i--; out[key]=block.join("\n").trim(); continue;
    }
    out[key]=clean(raw);
  }
  return out;
}
function readYamlLike(file) { return fs.existsSync(file) ? parseYamlLike(fs.readFileSync(file,"utf8")) : {}; }
function readCollection(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>/\.(md|yml|yaml)$/i.test(f)&&!f.startsWith(".")).map(file=>{
    const text=fs.readFileSync(path.join(dir,file),"utf8");
    const fm=text.startsWith("---") ? (text.split(/^---\s*$/m).slice(1,2)[0]||"") : text;
    return {...parseYamlLike(fm),__file:file};
  });
}
function sortByOrder(items) { return items.sort((a,b)=>Number(a.order??999999)-Number(b.order??999999)); }
function saveHtml(file,html,label) { fs.writeFileSync(file,applyBrandMeta(html),"utf8"); console.log(`LACROMA: updated ${label}`); }
function injectBeforeBody(html,addition) { if(!addition||html.includes("data-lacroma-cms-package")) return html; return html.replace(/<\/body>/i,`${addition}\n</body>`); }

const works=sortByOrder(readCollection(worksDir).filter(w=>w.image&&w.category));
fs.writeFileSync(outputFile,JSON.stringify(works,null,2),"utf8");
console.log(`LACROMA: generated ${works.length} works → works.json`);

/* HOME + WORKS */
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
<script data-lacroma-cms-package>(()=>{const box=document.getElementById('lacroma-lightbox');if(!box)return;const image=box.querySelector('img');const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');image.removeAttribute('src');document.body.style.overflow='';};document.querySelectorAll('.thumb').forEach(thumb=>thumb.addEventListener('click',event=>{const source=thumb.querySelector('img');if(!source||!source.src)return;event.preventDefault();image.src=source.src;image.alt=source.alt||'';box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}));box.addEventListener('click',e=>{if(e.target===box)close();});box.querySelector('button').addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});})();</script>`;
html=injectBeforeBody(html,galleryEnhancement); saveHtml(indexFile,html,"index.html");

/* ABOUT */
if(fs.existsSync(aboutFile)){
  let ahtml=fs.readFileSync(aboutFile,"utf8"); const about=readYamlLike(aboutDataFile);
  if([about.intro,about.drawing,about.quote,about.practice,about.exhibitions_text].every(Boolean)){
    const markup=`<div class="about-copy"><div class="about-kicker">ABOUT</div><h1>${escapeHtml(about.name||"Nino Đula")}</h1><p>${renderInline(about.intro)}</p><p>${renderInline(about.drawing)}</p><p class="about-quote">${renderInline(about.quote)}</p><p>${renderInline(about.practice)}</p><p>${renderInline(about.exhibitions_text)}</p><div class="about-location">${escapeHtml(about.location||"")}</div></div>`;
    ahtml=ahtml.replace(/<div class=["']about-copy["']>[\s\S]*?<div class=["']about-location["']>[\s\S]*?<\/div><\/div>/i,markup);
  }
  if(about.photo) ahtml=ahtml.replace(/(<div class=["']about-photo["']>\s*<img\b[^>]*\bsrc=["'])[^"']*(["'][^>]*>)/i,`$1${escapeAttr(about.photo)}$2`);
  saveHtml(aboutFile,ahtml,"about.html");
}

/* CONTACT */
if(fs.existsSync(contactFile)){
  let chtml=fs.readFileSync(contactFile,"utf8"); const contact=readYamlLike(contactDataFile);
  if(contact.heading) chtml=chtml.replace(/(<section class=["']contact-page["'][^>]*>[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,`$1${escapeHtml(contact.heading)}$2`);
  if(contact.instagram_url||contact.instagram_label) chtml=chtml.replace(/<a href=["'][^"']*["'] target=["']_blank["'] rel=["']noopener["']>[\s\S]*?<\/a>/i,`<a href="${escapeAttr(contact.instagram_url||"https://www.instagram.com/lacroma/")}" target="_blank" rel="noopener">${escapeHtml(contact.instagram_label||"INSTAGRAM · @LACROMA →")}</a>`);
  if(contact.email&&!chtml.includes(`mailto:${contact.email}`)) chtml=chtml.replace(/(<a href=["']https:\/\/www\.instagram\.com\/lacroma\/?["'][\s\S]*?<\/a>)/i,`$1<br><a href="mailto:${escapeAttr(contact.email)}">${escapeHtml(contact.email)}</a>`);
  if(contact.location) chtml=chtml.replace(/(<div class=["']place["']>)[\s\S]*?(<\/div>)/i,`$1${escapeHtml(contact.location)}$2`);
  saveHtml(contactFile,chtml,"contact.html");
}

function updateLegacyPress(page,item){
  if(!item.legacy_title) return page;
  const needle=regexEscape(item.legacy_title);
  const blockRe=new RegExp(`<a\\b[^>]*class=["'][^"']*press-(?:feature|small)[^"']*["'][^>]*>[\\s\\S]*?<h[23]>\\s*${needle}\\s*<\\/h[23]>[\\s\\S]*?<\\/a>`,`i`);
  const match=page.match(blockRe); if(!match){console.warn(`LACROMA: legacy press not found: ${item.legacy_title}`);return page;}
  let block=match[0];
  if(item.title) block=block.replace(/(<h[23]>)[\s\S]*?(<\/h[23]>)/i,`$1${escapeHtml(item.title)}$2`);
  if(item.link||item.pdf) block=block.replace(/href=["'][^"']*["']/i,`href="${escapeAttr(item.link||item.pdf)}"`);
  if(item.image) block=block.replace(/(<img\b[^>]*\bsrc=["'])[^"']*(["'])/i,`$1${escapeAttr(item.image)}$2`);
  if(item.publication||item.date){const meta=[item.publication,item.date].filter(Boolean).map(escapeHtml).join(" · ");block=block.replace(/(<div class=["']meta["']>)[\s\S]*?(<\/div>)/i,`$1${meta}$2`);}
  if(item.description){ if(/<p\b/i.test(block)) block=block.replace(/(<p\b[^>]*>)[\s\S]*?(<\/p>)/i,`$1${escapeHtml(item.description)}$2`); else block=block.replace(/(<span\b[^>]*>)[\s\S]*?(<\/span>)/i,`$1${escapeHtml(item.description)}$2`); }
  return page.replace(blockRe,block);
}

function updateLegacyExhibition(page,item){
  if(!item.legacy_title) return page;
  const needle=regexEscape(item.legacy_title);
  const blockRe=new RegExp(`<section\\b[^>]*class=["'][^"']*exhibition[^"']*["'][^>]*>[\\s\\S]*?<h1>\\s*${needle}\\s*<\\/h1>[\\s\\S]*?<\\/section>`,`i`);
  const match=page.match(blockRe); if(!match){console.warn(`LACROMA: legacy exhibition not found: ${item.legacy_title}`);return page;}
  let block=match[0];
  if(item.title) block=block.replace(/(<h1>)[\s\S]*?(<\/h1>)/i,`$1${escapeHtml(item.title)}$2`);
  if(item.image) block=block.replace(/(<img\b[^>]*\bsrc=["'])[^"']*(["'])/i,`$1${escapeAttr(item.image)}$2`);
  if(item.description) block=block.replace(/(<div class=["']ex-copy["'][^>]*>[\s\S]*?<p>)[\s\S]*?(<\/p>)/i,`$1${escapeHtml(item.description)}$2`);
  if(item.link||item.pdf){const target=escapeAttr(item.link||item.pdf);block=block.replace(/(<a\b[^>]*href=["'])[^"']*(["'][^>]*class=["'][^"']*viewcat[^"']*["'])/i,`$1${target}$2`);}
  return page.replace(blockRe,block);
}

/* PRESS: legacy CMS records update existing locked markup; new records append. */
if(fs.existsSync(pressFile)){
  let phtml=fs.readFileSync(pressFile,"utf8"); const items=sortByOrder(readCollection(pressDir));
  items.filter(i=>i.legacy_title).forEach(i=>{phtml=updateLegacyPress(phtml,i);});
  const fresh=items.filter(i=>!i.legacy_title);
  if(fresh.length){const markup=fresh.map(item=>{const href=escapeAttr(item.link||item.pdf||"#");const meta=[item.publication,item.date].filter(Boolean).map(escapeHtml).join(" · ");const desc=item.description?`<span>${escapeHtml(item.description)}</span>`:`<span>VIEW →</span>`;return `<a class="press-small" data-cms-press="1" href="${href}" target="_blank" rel="noopener"><div class="meta">${meta}</div><h3>${escapeHtml(item.title||"Press")}</h3>${desc}</a>`;}).join("");phtml=phtml.replace(/(<div class=["']more-press["']>)([\s\S]*?)(<\/div>\s*(?:<\/section>)?)/i,(m,a,b,c)=>`${a}${b}${markup}${c}`);}
  saveHtml(pressFile,phtml,"press.html");
}

/* EXHIBITIONS: legacy CMS records update existing locked markup; new records append. */
if(fs.existsSync(exhibitionsFile)){
  let ehtml=fs.readFileSync(exhibitionsFile,"utf8"); const items=sortByOrder(readCollection(exhibitionsDir));
  items.filter(i=>i.legacy_title).forEach(i=>{ehtml=updateLegacyExhibition(ehtml,i);});
  const fresh=items.filter(i=>!i.legacy_title);
  if(fresh.length){const rows=fresh.map(item=>{const target=item.link||item.pdf||"";const start=target?`<a class="cms-exhibition-row" href="${escapeAttr(target)}" target="_blank" rel="noopener">`:`<div class="cms-exhibition-row">`;const end=target?`</a>`:`</div>`;const image=item.image?`<div class="cms-exhibition-image"><img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title||"Exhibition")}"></div>`:"";return `${start}<div class="cms-exhibition-year">${escapeHtml(item.year||"")}</div><div><h3>${escapeHtml(item.title||"Exhibition")}</h3><p>${escapeHtml(item.venue||"")}${item.description?` · ${escapeHtml(item.description)}`:""}</p></div>${image}${end}`;}).join("");const block=`<style data-lacroma-cms-exhibitions>.cms-exhibitions{margin-top:78px;border-top:1px solid var(--line)}.cms-exhibitions-head{padding:24px 0 18px;font-size:9px;letter-spacing:.17em;color:var(--muted)}.cms-exhibition-row{display:grid;grid-template-columns:90px 1fr 220px;gap:30px;align-items:center;padding:28px 0;border-top:1px solid var(--line);color:inherit;text-decoration:none}.cms-exhibition-year{font-size:9px;letter-spacing:.14em;color:var(--muted)}.cms-exhibition-row h3{font-family:Georgia,serif;font-size:23px;font-weight:400;margin:0 0 8px}.cms-exhibition-row p{font-size:9px;letter-spacing:.08em;line-height:1.6;color:var(--muted);margin:0}.cms-exhibition-image img{width:100%;max-height:140px;object-fit:contain;display:block}@media(max-width:850px){.cms-exhibition-row{grid-template-columns:55px 1fr}.cms-exhibition-image{grid-column:2}}</style><section class="cms-exhibitions"><div class="cms-exhibitions-head">MORE EXHIBITIONS</div>${rows}</section>`;ehtml=ehtml.replace(/<footer>/i,`${block}<footer>`);}
  saveHtml(exhibitionsFile,ehtml,"exhibitions.html");
}

console.log("LACROMA: CMS existing-content build complete");
