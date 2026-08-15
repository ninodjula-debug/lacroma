const fs=require('fs');
function write(name,data){fs.writeFileSync(name,JSON.stringify(data,null,2),'utf8');console.log(`LACROMA inventory: ${name} ${data.length}`)}
function html(file){return fs.existsSync(file)?fs.readFileSync(file,'utf8'):''}
const home=html('index.html');
const grid=(home.match(/<section class=["']grid["']>([\s\S]*?)<\/section>/i)||[])[1]||'';
const thumbs=grid.match(/<a\b[^>]*class=["'][^"']*\bthumb\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi)||[];
write('legacy-homepage.json',thumbs.map((b,i)=>({index:i+1,category:(b.match(/data-cat=["']([^"']*)/i)||[])[1]||'',href:(b.match(/href=["']([^"']*)/i)||[])[1]||'',src:(b.match(/<img\b[^>]*src=["']([^"']*)/i)||[])[1]||'',alt:(b.match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||''})));
const p=html('press.html');
const press=[];
for(const re of [/<a\b[^>]*class=["'][^"']*press-feature[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,/<a\b[^>]*class=["'][^"']*press-small[^"']*["'][^>]*>[\s\S]*?<\/a>/gi]){
 for(const b of p.match(re)||[]){press.push({title:((b.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)||[])[1]||'').replace(/<[^>]+>/g,'').trim(),href:(b.match(/href=["']([^"']*)/i)||[])[1]||'',meta:((b.match(/<div class=["']meta["']>([\s\S]*?)<\/div>/i)||[])[1]||'').replace(/<[^>]+>/g,'').trim(),src:(b.match(/<img\b[^>]*src=["']([^"']*)/i)||[])[1]||''});}
}
write('legacy-press.json',press);
const e=html('exhibitions.html');
const sections=e.match(/<section\b[^>]*class=["'][^"']*exhibition[^"']*["'][^>]*>[\s\S]*?<\/section>/gi)||[];
write('legacy-exhibitions.json',sections.map((b,i)=>({index:i+1,title:((b.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'').replace(/<[^>]+>/g,'').trim(),src:(b.match(/<img\b[^>]*src=["']([^"']*)/i)||[])[1]||'',href:(b.match(/<a\b[^>]*class=["'][^"']*viewcat[^"']*["'][^>]*href=["']([^"']*)/i)||b.match(/<a\b[^>]*href=["']([^"']*)["'][^>]*class=["'][^"']*viewcat/i)||[])[1]||''})));
