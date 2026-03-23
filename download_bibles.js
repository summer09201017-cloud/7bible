import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public', 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download() {
  const sources = [
    { id: 'kjv', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json' },
    { id: 'unv', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/zh_cuv.json' },
    { id: 'ncv', url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/zh_ncv.json' },
    // Trying a few common paths for ASV
    { id: 'asv', url: 'https://raw.githubusercontent.com/bibleapi/bibleapi-bibles-json/master/asv.json' }
  ];

  for (const s of sources) {
    try {
      console.log(`Downloading ${s.id}...`);
      let res = await fetch(s.url);
      if (!res.ok && s.fallback) {
         console.log('Failed, trying fallback for ' + s.id);
         res = await fetch(s.fallback);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      // Strip BOM if present
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      
      const data = JSON.parse(text);
      fs.writeFileSync(path.join(dir, `${s.id}.json`), JSON.stringify(data));
      console.log(`Saved ${s.id}.json`);
      if (s.id === 'unv' || s.id === 'asv') {
         console.log(`Sample ${s.id}:`, Object.keys(data[0]), data[0].abbrev || data[0].book, data[0].chapters?.length || data[0].chapters);
      }
    } catch (e) {
      console.error(`Error downloading ${s.id}:`, e.message);
    }
  }
}
download().catch(console.error);
