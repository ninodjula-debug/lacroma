const fs = require("fs");
const path = require("path");

const worksDir = path.join(__dirname, "data", "works");
const outputFile = path.join(__dirname, "works.json");
const indexFile = path.join(__dirname, "index.html");
const homeFile = path.join(__dirname, "data", "home.yml");
function clean(value = "") {
  return value.trim().replace(/^["']|["']$/g, "");
}
function readSimpleYaml(file) {
  if (!fs.existsSync(file)) return {};

  const result = {};

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!match) continue;

    result[match[1]] = clean(match[2]);
  }

  return result;
}
function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const works = [];

if (fs.existsSync(worksDir)) {
  const files = fs
    .readdirSync(worksDir)
    .filter(file => file.endsWith(".md"));

  for (const file of files) {
    const text = fs.readFileSync(
      path.join(worksDir, file),
      "utf8"
    );

    const work = {};

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      const value = clean(match[2]);

      if (
["title", "image", "category", "year", "location", "order"].includes(key)      ) {
        work[key] = value;
      }
    }

    if (work.image && work.category) {
      works.push(work);
    }
  }
}

/* Generate works.json */
works.sort((a, b) => {
  const orderA = Number(a.order ?? 999999);
  const orderB = Number(b.order ?? 999999);
  return orderA - orderB;
});
fs.writeFileSync(
  outputFile,
  JSON.stringify(works, null, 2),
  "utf8"
);

console.log(
  `LACROMA: generated ${works.length} works → works.json`
);

/* Add CMS works to the existing locked LACROMA gallery */
if (!fs.existsSync(indexFile)) {
  throw new Error("LACROMA: index.html not found");
}

let html = fs.readFileSync(indexFile, "utf8");
const home = readSimpleYaml(homeFile);

if (home.hero_image) {
  html = html.replace(
    /(<section class=["']hero["'][^>]*>\s*<img\b[^>]*\bsrc=["'])[^"']*(["'])/i,
    (match, before, after) =>
      `${before}${escapeHtml(home.hero_image)}${after}`
  );
}

if (home.home_text) {
  html = html.replace(
    /(<div class=["']statement["'][^>]*>)[\s\S]*?(<\/div>)/i,
    (match, before, after) =>
      `${before}${escapeHtml(home.home_text)}${after}`
  );
}
const gridRegex =
  /<section class=["']grid["']>([\s\S]*?)<\/section>/i;

const match = html.match(gridRegex);

if (!match) {
  throw new Error(
    "LACROMA: gallery grid not found — index.html left unchanged"
  );
}

const existingGrid = match[1];

const newWorks = works.filter(
  work => !existingGrid.includes(work.image)
);

const cmsMarkup = newWorks
  .map(work => {
    const title = escapeHtml(work.title || "LACROMA artwork");
    const image = escapeHtml(work.image);
    const category = escapeHtml(
      (work.category || "").toLowerCase()
    );

    return `<a class="thumb" data-cat="${category}" href="#"><img alt="${title}" src="${image}" loading="lazy"></a>`;
  })
  .join("");

const updatedGrid =
  `<section class="grid">` +
  existingGrid +
  cmsMarkup +
  `</section>`;

html = html.replace(gridRegex, updatedGrid);

fs.writeFileSync(indexFile, html, "utf8");

console.log(
  `LACROMA: added ${newWorks.length} CMS works to gallery`
);
