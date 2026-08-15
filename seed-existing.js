const fs=require('fs'),path=require('path');
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const q=s=>JSON.stringify(String(s||''));
const ensure=d=>fs.mkdirSync(d,{recursive:true});
function readExisting(dir,key){const m=new Map();if(!fs.existsSync(dir))return m;for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.md'))){const t=fs.readFileSync(path.join(dir,f),'utf8');const r=new RegExp('^'+key+':\\s*["\']?(.*?)["\']?\\s*$','mi').exec(t);if(r)m.set(r[1].trim(),f);}return m;}
function writeMd(dir,file,obj){ensure(dir);let s='---\n';for(const [k,v] of Object.entries(obj)){if(v===undefined||v===null||v==='')continue;s+=`${k}: ${typeof v==='number'||typeof v==='boolean'?v:q(v)}\n`;}s+='---\n';fs.writeFileSync(path.join(dir,file),s,'utf8');}
function extractImage(src,index){
  if(!src)return '';
  const m=src.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if(!m)return src;
  const kind=m[1].toLowerCase();
  const ext=(kind==='jpeg'||kind==='jpg')?'jpg':kind;
  ensure('media');
  const filename=`homepage-${String(index).padStart(2,'0')}.${ext}`;
  fs.writeFileSync(path.join('media',filename),Buffer.from(m[2].replace(/\s/g,''),'base64'));
  return `/media/${filename}`;
}

const home=fs.readFileSync('index.html','utf8');
const grid=(home.match(/<section class=["']grid["']>([\s\S]*?)<\/section>/i)||[])[1]||'';
const thumbs=grid.match(/<a\b[^>]*class=["'][^"']*\bthumb\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi)||[];
ensure('data/homepage');
for(let i=0;i<thumbs.length;i++){
  const b=thumbs[i];
  const cat=(b.match(/data-cat=["']([^"']*)/i)||[])[1]||'';
  const imgTag=(b.match(/<img\b[^>]*>/i)||[])[0]||'';
  const alt=clean((imgTag.match(/\balt=["']([^"']*)/i)||[])[1]||'');
  const src=(imgTag.match(/\bsrc=["']([^"']*)["']/i)||[])[1]||'';
  const image=extractImage(src,i+1);
  writeMd('data/homepage',`existing-${String(i+1).padStart(3,'0')}.md`,{
    title:alt||`Homepage image ${String(i+1).padStart(2,'0')}`,
    image,
    legacy_index:i+1,
    order:(i+1)*10,
    category:cat?cat[0].toUpperCase()+cat.slice(1):''
  });
}

const p=fs.readFileSync('press.html','utf8'),pressBlocks=[...(p.match(/<a\b[^>]*class=["'][^"']*press-feature[^"']*["'][^>]*>[\s\S]*?<\/a>/gi)||[]),...(p.match(/<a\b[^>]*class=["'][^"']*press-small[^"']*["'][^>]*>[\s\S]*?<\/a>/gi)||[])];const pm=readExisting('data/press','legacy_title');for(let i=0;i<pressBlocks.length;i++){const b=pressBlocks[i],title=clean((b.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)||[])[1]||'');if(!title)continue;const meta=clean((b.match(/<div class=["']meta["']>([\s\S]*?)<\/div>/i)||[])[1]||''),href=(b.match(/href=["']([^"']*)/i)||[])[1]||'';writeMd('data/press',pm.get(title)||`existing-${String(i+1).padStart(2,'0')}.md`,{title,legacy_title:title,publication:meta,link:href,order:(i+1)*10});}
const e=fs.readFileSync('exhibitions.html','utf8'),secs=e.match(/<section\b[^>]*class=["'][^"']*exhibition[^"']*["'][^>]*>[\s\S]*?<\/section>/gi)||[],em=readExisting('data/exhibitions','legacy_title');for(let i=0;i<secs.length;i++){const b=secs[i],title=clean((b.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');if(!title)continue;const desc=clean((b.match(/<div class=["']ex-copy["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)||[])[1]||'');writeMd('data/exhibitions',em.get(title)||`existing-${String(i+1).padStart(2,'0')}.md`,{title,legacy_title:title,description:desc,order:(i+1)*10});}
console.log(`Seeded ${thumbs.length} homepage images as real media files, ${pressBlocks.length} press, ${secs.length} exhibitions records.`);
