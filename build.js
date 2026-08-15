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

function clean(value = "") {
  return String(value).trim().replace(/^["']|["']$/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function parseYamlLike(text = "") {
  const out = {};
  const lines = text.replace(/\r/g, "").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let raw = match[2];

    if (/^[>|][-+]?\s*$/.test(raw)) {
      const block = [];
      i++;
      while (i < lines.length && (/^\s+/.test(lines[i]) || lines[i] === "")) {
        block.push(lines[i].replace(/^\s{2}/, ""));
        i++;
      }
      i--;
      out[key] = block.join("\n").trim();
      continue;
    }

    out[key] = clean(raw);
  }

  return out;
}

function readYamlLike(file) {
  if (!fs.existsSync(file)) return {};
  return parseYamlLike(fs.readFileSync(file, "utf8"));
}

function readCollection(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(file => /\.(md|yml|yaml)$/i.test(file) && !file.startsWith("."))
    .map(file => {
      const text = fs.readFileSync(path.join(dir, file), "utf8");
      const frontmatter = text.startsWith("---")
        ? text.split(/^---\s*$/m).slice(1, 2)[0] || ""
        : text;
      return { ...parseYamlLike(frontmatter), __file: file };
    });
}

function sortByOrder(items) {
  return items.sort((a, b) => {
    const av = Number(a.order ?? 999999);
    const bv = Number(b.order ?? 999999);
    return av - bv;
  });
}

function saveHtml(file, html, label) {
  fs.writeFileSync(file, html, "utf8");
  console.log(`LACROMA: updated ${label}`);
}

function injectBeforeBody(html, addition) {
  if (!addition || html.includes("data-lacroma-cms-package")) return html;
  return html.replace(/<\/body>/i, `${addition}\n</body>`);
}

const works = sortByOrder(
  readCollection(worksDir).filter(work => work.image && work.category)
);

fs.writeFileSync(outputFile, JSON.stringify(works, null, 2), "utf8");
console.log(`LACROMA: generated ${works.length} works → works.json`);

/* HOME + WORKS */
if (!fs.existsSync(indexFile)) {
  throw new Error("LACROMA: index.html not found");
}

let html = fs.readFileSync(indexFile, "utf8");
const home = readYamlLike(homeFile);

if (home.hero_image) {
  html = html.replace(
    /(<section class=["']hero["'][^>]*>\s*<img\b[^>]*\bsrc=["'])[^"']*(["'])/i,
    (match, before, after) => `${before}${escapeAttr(home.hero_image)}${after}`
  );
}

if (home.home_text) {
  html = html.replace(
    /(<div class=["']statement["'][^>]*>)[\s\S]*?(<\/div>)/i,
    (match, before, after) => `${before}${escapeHtml(home.home_text)}${after}`
  );
}

const gridRegex = /<section class=["']grid["']>([\s\S]*?)<\/section>/i;
const gridMatch = html.match(gridRegex);

if (!gridMatch) {
  throw new Error("LACROMA: gallery grid not found — index.html left unchanged");
}

const existingGrid = gridMatch[1];
const cmsMarkup = works
  .filter(work => !existingGrid.includes(work.image))
  .map(work => {
    const title = escapeAttr(work.title || "LACROMA artwork");
    const image = escapeAttr(work.image);
    const category = escapeAttr((work.category || "").toLowerCase());
    return `<a class="thumb" data-cat="${category}" data-cms-work="1" href="${image}"><img alt="${title}" src="${image}" loading="lazy"></a>`;
  })
  .join("");

html = html.replace(
  gridRegex,
  `<section class="grid">${existingGrid}${cmsMarkup}</section>`
);

const galleryEnhancement = `
<style data-lacroma-cms-package>
  .caption{display:none!important}
  .thumb span{display:none!important}
  .thumb{cursor:zoom-in}
  .lacroma-lightbox{position:fixed;inset:0;z-index:9999;background:rgba(250,249,246,.97);display:none;align-items:center;justify-content:center;padding:28px}
  .lacroma-lightbox.open{display:flex}
  .lacroma-lightbox img{max-width:94vw;max-height:90vh;width:auto;height:auto;object-fit:contain}
  .lacroma-lightbox button{position:fixed;top:24px;right:28px;border:0;background:transparent;color:#1C1C1A;font:300 28px/1 Arial,sans-serif;cursor:pointer;padding:8px}
  @media(max-width:850px){.lacroma-lightbox{padding:16px}.lacroma-lightbox button{top:12px;right:12px}}
</style>
<div class="lacroma-lightbox" id="lacroma-lightbox" aria-hidden="true">
  <button type="button" aria-label="Close">×</button>
  <img alt="">
</div>
<script data-lacroma-cms-package>
(() => {
  const box = document.getElementById('lacroma-lightbox');
  if (!box) return;
  const image = box.querySelector('img');
  const close = () => {
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    image.removeAttribute('src');
    document.body.style.overflow = '';
  };
  document.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', event => {
      const source = thumb.querySelector('img');
      if (!source || !source.src) return;
      event.preventDefault();
      image.src = source.src;
      image.alt = source.alt || '';
      box.classList.add('open');
      box.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
    });
  });
  box.addEventListener('click', event => { if (event.target === box) close(); });
  box.querySelector('button').addEventListener('click', close);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
})();
</script>`;

html = injectBeforeBody(html, galleryEnhancement);
saveHtml(indexFile, html, "index.html");

/* ABOUT */
if (fs.existsSync(aboutFile)) {
  let aboutHtml = fs.readFileSync(aboutFile, "utf8");
  const about = readYamlLike(aboutDataFile);

  if (about.name) {
    aboutHtml = aboutHtml.replace(
      /(<div class=["']about-kicker["']>ABOUT<\/div>\s*<h1>)[\s\S]*?(<\/h1>)/i,
      `$1${escapeHtml(about.name)}$2`
    );
  }

  if (about.quote) {
    aboutHtml = aboutHtml.replace(
      /(<p class=["']about-quote["']>)[\s\S]*?(<\/p>)/i,
      `$1${escapeHtml(about.quote)}$2`
    );
  }

  if (about.photo) {
    aboutHtml = aboutHtml.replace(
      /(<div class=["']about-photo["']>\s*<img\b[^>]*\bsrc=["'])[^"']*(["'][^>]*>)/i,
      `$1${escapeAttr(about.photo)}$2`
    );
  }

  if (about.location) {
    aboutHtml = aboutHtml.replace(
      /(<div class=["']about-location["']>)[\s\S]*?(<\/div>)/i,
      `$1${escapeHtml(about.location)}$2`
    );
  }

  if (about.text) {
    const paragraphs = about.text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join("\n");

    aboutHtml = aboutHtml.replace(
      /(<div class=["']about-kicker["']>ABOUT<\/div><h1>[\s\S]*?<\/h1>)([\s\S]*?)(<p class=["']about-quote["'])/i,
      (match, head, middle, quoteStart) => {
        const cleaned = middle.replace(/<p>[\s\S]*?<\/p>\s*/gi, "");
        return `${head}\n${paragraphs}\n${cleaned}${quoteStart}`;
      }
    );
  }

  saveHtml(aboutFile, aboutHtml, "about.html");
}

/* CONTACT */
if (fs.existsSync(contactFile)) {
  let contactHtml = fs.readFileSync(contactFile, "utf8");
  const contact = readYamlLike(contactDataFile);

  if (contact.heading) {
    contactHtml = contactHtml.replace(
      /(<section class=["']contact-page["'][^>]*>[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,
      `$1${escapeHtml(contact.heading)}$2`
    );
  }

  if (contact.instagram_url || contact.instagram_label) {
    contactHtml = contactHtml.replace(
      /<a href=["'][^"']*["'] target=["']_blank["'] rel=["']noopener["']>[\s\S]*?<\/a>/i,
      `<a href="${escapeAttr(contact.instagram_url || "https://www.instagram.com/lacroma/")}" target="_blank" rel="noopener">${escapeHtml(contact.instagram_label || "INSTAGRAM · @LACROMA →")}</a>`
    );
  }

  if (contact.email) {
    const emailMarkup = `<br><a href="mailto:${escapeAttr(contact.email)}">${escapeHtml(contact.email)}</a>`;
    if (!contactHtml.includes(`mailto:${contact.email}`)) {
      contactHtml = contactHtml.replace(
        /(<a href=["']https:\/\/www\.instagram\.com\/lacroma\/?["'][\s\S]*?<\/a>)/i,
        `$1${emailMarkup}`
      );
    }
  }

  if (contact.location) {
    contactHtml = contactHtml.replace(
      /(<div class=["']place["']>)[\s\S]*?(<\/div>)/i,
      `$1${escapeHtml(contact.location)}$2`
    );
  }

  saveHtml(contactFile, contactHtml, "contact.html");
}

/* PRESS: CMS entries are added to the existing MORE PRESS grid. */
if (fs.existsSync(pressFile)) {
  let pressHtml = fs.readFileSync(pressFile, "utf8");
  const pressItems = sortByOrder(readCollection(pressDir));

  if (pressItems.length) {
    const pressMarkup = pressItems.map(item => {
      const href = escapeAttr(item.link || item.pdf || "#");
      const meta = [item.publication, item.date].filter(Boolean).map(escapeHtml).join(" · ");
      const title = escapeHtml(item.title || "Press");
      const description = item.description ? `<span>${escapeHtml(item.description)}</span>` : `<span>VIEW →</span>`;
      return `<a class="press-small" data-cms-press="1" href="${href}" target="_blank" rel="noopener"><div class="meta">${meta}</div><h3>${title}</h3>${description}</a>`;
    }).join("");

    pressHtml = pressHtml.replace(
      /(<div class=["']more-press["']>)([\s\S]*?)(<\/div>\s*(?:<\/section>)?)/i,
      (match, start, middle, end) => `${start}${middle}${pressMarkup}${end}`
    );
  }

  saveHtml(pressFile, pressHtml, "press.html");
}

/* EXHIBITIONS: CMS entries are added before footer in a design-neutral list. */
if (fs.existsSync(exhibitionsFile)) {
  let exhibitionsHtml = fs.readFileSync(exhibitionsFile, "utf8");
  const exhibitions = sortByOrder(readCollection(exhibitionsDir));

  if (exhibitions.length) {
    const rows = exhibitions.map(item => {
      const target = item.link || item.pdf || "";
      const wrapperStart = target
        ? `<a class="cms-exhibition-row" href="${escapeAttr(target)}" target="_blank" rel="noopener">`
        : `<div class="cms-exhibition-row">`;
      const wrapperEnd = target ? `</a>` : `</div>`;
      const image = item.image
        ? `<div class="cms-exhibition-image"><img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title || "Exhibition")}"></div>`
        : "";
      return `${wrapperStart}<div class="cms-exhibition-year">${escapeHtml(item.year || "")}</div><div><h3>${escapeHtml(item.title || "Exhibition")}</h3><p>${escapeHtml(item.venue || "")}${item.description ? ` · ${escapeHtml(item.description)}` : ""}</p></div>${image}${wrapperEnd}`;
    }).join("");

    const exhibitionBlock = `
<style data-lacroma-cms-exhibitions>
.cms-exhibitions{margin-top:78px;border-top:1px solid var(--line)}
.cms-exhibitions-head{padding:24px 0 18px;font-size:9px;letter-spacing:.17em;color:var(--muted)}
.cms-exhibition-row{display:grid;grid-template-columns:90px 1fr 220px;gap:30px;align-items:center;padding:28px 0;border-top:1px solid var(--line);color:inherit;text-decoration:none}
.cms-exhibition-year{font-size:9px;letter-spacing:.14em;color:var(--muted)}
.cms-exhibition-row h3{font-family:Georgia,serif;font-size:23px;font-weight:400;margin:0 0 8px}
.cms-exhibition-row p{font-size:9px;letter-spacing:.08em;line-height:1.6;color:var(--muted);margin:0}
.cms-exhibition-image img{width:100%;max-height:140px;object-fit:contain;display:block}
@media(max-width:850px){.cms-exhibition-row{grid-template-columns:55px 1fr}.cms-exhibition-image{grid-column:2}}
</style>
<section class="cms-exhibitions"><div class="cms-exhibitions-head">MORE EXHIBITIONS</div>${rows}</section>`;

    exhibitionsHtml = exhibitionsHtml.replace(/<footer>/i, `${exhibitionBlock}<footer>`);
  }

  saveHtml(exhibitionsFile, exhibitionsHtml, "exhibitions.html");
}

console.log("LACROMA: CMS final package build complete");
