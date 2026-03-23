// download_bibles.mjs  (ESM format)
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'bibles');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/';

const DOWNLOADS = [
  { url: BASE + 'zh_cuv.json', out: 'zh_cuv.json', desc: '和合本 CUV' },
  { url: BASE + 'zh_ncv.json', out: 'zh_ncv.json', desc: '新譯本 NCV' },
  { url: BASE + 'en_kjv.json', out: 'en_kjv.json', desc: 'KJV' },
  { url: BASE + 'en_bbe.json', out: 'en_asv.json', desc: 'ASV (BBE)' },
];

function download(url, dest, desc) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return download(res.headers.location, dest, desc).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(2);
        console.log(`✓ ${desc} -> ${path.basename(dest)} (${size} MB)`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

console.log('開始下載聖經 JSON 檔案...\n');
for (const d of DOWNLOADS) {
  const dest = path.join(OUT_DIR, d.out);
  try {
    await download(d.url, dest, d.desc);
  } catch (e) {
    console.error(`✗ ${d.desc}: ${e.message}`);
  }
}
console.log('\n全部完成！');
