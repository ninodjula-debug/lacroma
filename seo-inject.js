const fs=require('fs');
const pages={
 'index.html':{url:'https://lacroma.art/',title:'LACROMA — Nino Đula',desc:'LACROMA is the visual art practice of Nino Đula: drawings, faces, places, notes and objects.'},
 'exhibitions.html':{url:'https://lacroma.art/exhibitions.html',title:'Exhibitions — LACROMA · Nino Đula',desc:'Exhibitions and presentations of works by Nino Đula / LACROMA.'},
 'press.html':{url:'https://lacroma.art/press.html',title:'Press — LACROMA · Nino Đula',desc:'Selected press, texts and coverage related to the visual art practice of Nino Đula / LACROMA.'},
 'about.html':{url:'https://lacroma.art/about.html',title:'About Nino Đula — LACROMA',desc:'About Nino Đula and LACROMA, his visual practice of drawing and observation.'},
 'contact.html':{url:'https://lacroma.art/contact.html',title:'Contact — LACROMA · Nino Đula',desc:'Contact and official links for LACROMA, the visual art practice of Nino Đula.'}
};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
for(const [file,p] of Object.entries(pages)){
 if(!fs.existsSync(file))continue;
 let h=fs.readFileSync(file,'utf8');
 h=h.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(p.title)}</title>`);
 const tags=`\n<meta name="description" content="${esc(p.desc)}">\n<link rel="canonical" href="${p.url}">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="LACROMA">\n<meta property="og:title" content="${esc(p.title)}">\n<meta property="og:description" content="${esc(p.desc)}">\n<meta property="og:url" content="${p.url}">\n<meta name="twitter:card" content="summary_large_image">`;
 if(!/rel=["']canonical["']/i.test(h)) h=h.replace(/<\/head>/i,`${tags}\n</head>`);
 fs.writeFileSync(file,h,'utf8');
}
if(fs.existsSync('about.html')){
 let h=fs.readFileSync('about.html','utf8');
 if(!h.includes('data-lacroma-person-schema')){
  const data={"@context":"https://schema.org","@type":"ProfilePage","url":"https://lacroma.art/about.html","mainEntity":{"@type":"Person","@id":"https://lacroma.art/about.html#nino-dula","name":"Nino Đula","url":"https://lacroma.art/about.html","description":"Croatian journalist and visual artist; creator of LACROMA.","sameAs":["https://www.instagram.com/lacroma/"]}};
  h=h.replace(/<\/head>/i,`<script type="application/ld+json" data-lacroma-person-schema>${JSON.stringify(data)}</script>\n</head>`);
  fs.writeFileSync('about.html',h,'utf8');
 }
}
console.log('LACROMA: SEO metadata injected');
