const fs = require("fs");
const path = require("path");

const worksDir = path.join(__dirname, "data", "works");
const outputFile = path.join(__dirname, "works.json");

function clean(value = "") {
  return value.trim().replace(/^["']|["']$/g, "");
}

const works = [];

if (fs.existsSync(worksDir)) {
  const files = fs.readdirSync(worksDir).filter(file => file.endsWith(".md"));

  for (const file of files) {
    const text = fs.readFileSync(path.join(worksDir, file), "utf8");

    const work = {};

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      const value = clean(match[2]);

      if (["title", "image", "category", "year", "location"].includes(key)) {
        work[key] = value;
      }
    }

    if (work.image && work.category) {
      works.push(work);
    }
  }
}

fs.writeFileSync(outputFile, JSON.stringify(works, null, 2), "utf8");

console.log(`LACROMA: generated ${works.length} works → works.json`);
