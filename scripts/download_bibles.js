// 下載所有需要的聖經 JSON 到 public/bibles/
const https = require('https');
const fs = require('fs');
const path = require('path');
const http = require('http');

const OUT_DIR = path.join(__dirname, '..', 'public', 'bibles');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/';

// thiagobodruk/bible 有 zh_cuv, zh_ncv, en_kjv, en_bbe
// 我們用 en_bbe 作為 ASV 替代（BBE 是公有領域）
// ESV 有版權，章節查詢繼續用 FHL API，關鍵字用 KJV 替代並不同名
const DOWNLOADS = [
  { url: BASE + 'zh_cuv.json', out: 'zh_cuv.json', desc: '和合本 CUV' },
  { url: BASE + 'zh_ncv.json', out: 'zh_ncv.json', desc: '新譯本 NCV' },
  { url: BASE + 'en_kjv.json', out: 'en_kjv.json', desc: 'KJV' },
  { url: BASE + 'en_bbe.json', out: 'en_asv.json', desc: 'ASV (BBE)' },
];

function download(url, dest, desc) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
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

async function main() {
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
}

main();
