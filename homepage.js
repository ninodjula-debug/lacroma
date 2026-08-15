const fs = require("fs");
const path = require("path");

const homepageDir = path.join(__dirname, "data", "homepage");
const indexFile = path.join(__dirname, "index.html");

function clean(value = "") {
  return String(value).trim().replace(/^["']|["']$/g, "");
}

function parseYamlLike(text = "") {
  const out = {};
  const lines = text.replace(/\r/g, "").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (match) out[match[1]] = clean(match[2]);
  }
  return out;
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

function readItems() {
  if (!fs.existsSync(homepageDir)) return [];
  return fs.readdirSync(homepageDir)
    .filter(file => /\.(md|yml|yaml)$/i.test(file) && !file.startsWith("."))
    .map(file => {
      const text = fs.readFileSync(path.join(homepageDir, file), "utf8");
      const fm = text.startsWith("---") ? (text.split(/^---\s*$/m).slice(1, 2)[0] || "") : text;
      return parseYamlLike(fm);
    })
    .filter(item => item.image)
    .sort((a, b) => Number(a.order || 999999) - Number(b.order || 999999));
}

if (!fs.existsSync(indexFile)) throw new Error("LACROMA homepage helper: index.html not found");

const items = readItems();
let html = fs.readFileSync(indexFile, "utf8");
const gridRegex = /<section class=["']grid["']>([\s\S]*?)<\/section>/i;
const match = html.match(gridRegex);
if (!match) throw new Error("LACROMA homepage helper: gallery grid not found");

const existing = match[1].replace(/<a\b[^>]*data-homepage-cms=["']1["'][\s\S]*?<\/a>/gi, "");
const cms = items.map(item => {
  const title = escapeAttr(item.title || "LACROMA artwork");
  const image = escapeAttr(item.image);
  const category = escapeAttr((item.category || "").toLowerCase());
  return `<a class="thumb" data-homepage-cms="1" data-cat="${category}" href="${image}"><img alt="${title}" src="${image}" loading="lazy"></a>`;
}).join("");

html = html.replace(gridRegex, `<section class="grid">${existing}${cms}</section>`);
fs.writeFileSync(indexFile, html, "utf8");
console.log(`LACROMA: rendered ${items.length} CMS homepage images`);
