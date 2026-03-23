/**
 * 從信望愛 (FHL) qb.php API 下載呂振中譯本 (lzz) 與 ESV 的完整聖經 JSON
 * 用法: node download_fhl.js
 */
const fs = require('fs');
const path = require('path');

const FHL_BASE = 'https://bible.fhl.net/json/qb.php';
const DELAY = 200; // ms between requests to avoid overwhelming the server

// 66 books with their FHL chineses abbrev and chapter counts
const BOOKS = [
  { chineses: '創', chapters: 50, name: 'Genesis', localAbbrev: 'gn' },
  { chineses: '出', chapters: 40, name: 'Exodus', localAbbrev: 'ex' },
  { chineses: '利', chapters: 27, name: 'Leviticus', localAbbrev: 'lv' },
  { chineses: '民', chapters: 36, name: 'Numbers', localAbbrev: 'nm' },
  { chineses: '申', chapters: 34, name: 'Deuteronomy', localAbbrev: 'dt' },
  { chineses: '書', chapters: 24, name: 'Joshua', localAbbrev: 'js' },
  { chineses: '士', chapters: 21, name: 'Judges', localAbbrev: 'jud' },
  { chineses: '得', chapters: 4, name: 'Ruth', localAbbrev: 'rt' },
  { chineses: '撒上', chapters: 31, name: '1 Samuel', localAbbrev: '1sm' },
  { chineses: '撒下', chapters: 24, name: '2 Samuel', localAbbrev: '2sm' },
  { chineses: '王上', chapters: 22, name: '1 Kings', localAbbrev: '1kgs' },
  { chineses: '王下', chapters: 25, name: '2 Kings', localAbbrev: '2kgs' },
  { chineses: '代上', chapters: 29, name: '1 Chronicles', localAbbrev: '1chr' },
  { chineses: '代下', chapters: 36, name: '2 Chronicles', localAbbrev: '2chr' },
  { chineses: '拉', chapters: 10, name: 'Ezra', localAbbrev: 'ezr' },
  { chineses: '尼', chapters: 13, name: 'Nehemiah', localAbbrev: 'ne' },
  { chineses: '斯', chapters: 10, name: 'Esther', localAbbrev: 'es' },
  { chineses: '伯', chapters: 42, name: 'Job', localAbbrev: 'job' },
  { chineses: '詩', chapters: 150, name: 'Psalms', localAbbrev: 'ps' },
  { chineses: '箴', chapters: 31, name: 'Proverbs', localAbbrev: 'prv' },
  { chineses: '傳', chapters: 12, name: 'Ecclesiastes', localAbbrev: 'ec' },
  { chineses: '歌', chapters: 8, name: 'Song of Solomon', localAbbrev: 'so' },
  { chineses: '賽', chapters: 66, name: 'Isaiah', localAbbrev: 'is' },
  { chineses: '耶', chapters: 52, name: 'Jeremiah', localAbbrev: 'jr' },
  { chineses: '哀', chapters: 5, name: 'Lamentations', localAbbrev: 'lm' },
  { chineses: '結', chapters: 48, name: 'Ezekiel', localAbbrev: 'ez' },
  { chineses: '但', chapters: 12, name: 'Daniel', localAbbrev: 'dn' },
  { chineses: '何', chapters: 14, name: 'Hosea', localAbbrev: 'ho' },
  { chineses: '珥', chapters: 3, name: 'Joel', localAbbrev: 'jl' },
  { chineses: '摩', chapters: 9, name: 'Amos', localAbbrev: 'am' },
  { chineses: '俄', chapters: 1, name: 'Obadiah', localAbbrev: 'ob' },
  { chineses: '拿', chapters: 4, name: 'Jonah', localAbbrev: 'jn' },
  { chineses: '彌', chapters: 7, name: 'Micah', localAbbrev: 'mi' },
  { chineses: '鴻', chapters: 3, name: 'Nahum', localAbbrev: 'na' },
  { chineses: '哈', chapters: 3, name: 'Habakkuk', localAbbrev: 'hab' },
  { chineses: '番', chapters: 3, name: 'Zephaniah', localAbbrev: 'zp' },
  { chineses: '該', chapters: 2, name: 'Haggai', localAbbrev: 'hg' },
  { chineses: '亞', chapters: 14, name: 'Zechariah', localAbbrev: 'zc' },
  { chineses: '瑪', chapters: 4, name: 'Malachi', localAbbrev: 'ml' },
  { chineses: '太', chapters: 28, name: 'Matthew', localAbbrev: 'mt' },
  { chineses: '可', chapters: 16, name: 'Mark', localAbbrev: 'mk' },
  { chineses: '路', chapters: 24, name: 'Luke', localAbbrev: 'lk' },
  { chineses: '約', chapters: 21, name: 'John', localAbbrev: 'jo' },
  { chineses: '徒', chapters: 28, name: 'Acts', localAbbrev: 'act' },
  { chineses: '羅', chapters: 16, name: 'Romans', localAbbrev: 'rm' },
  { chineses: '林前', chapters: 16, name: '1 Corinthians', localAbbrev: '1co' },
  { chineses: '林後', chapters: 13, name: '2 Corinthians', localAbbrev: '2co' },
  { chineses: '加', chapters: 6, name: 'Galatians', localAbbrev: 'gl' },
  { chineses: '弗', chapters: 6, name: 'Ephesians', localAbbrev: 'eph' },
  { chineses: '腓', chapters: 4, name: 'Philippians', localAbbrev: 'ph' },
  { chineses: '西', chapters: 4, name: 'Colossians', localAbbrev: 'cl' },
  { chineses: '帖前', chapters: 5, name: '1 Thessalonians', localAbbrev: '1ts' },
  { chineses: '帖後', chapters: 3, name: '2 Thessalonians', localAbbrev: '2ts' },
  { chineses: '提前', chapters: 6, name: '1 Timothy', localAbbrev: '1tm' },
  { chineses: '提後', chapters: 4, name: '2 Timothy', localAbbrev: '2tm' },
  { chineses: '多', chapters: 3, name: 'Titus', localAbbrev: 'tt' },
  { chineses: '門', chapters: 1, name: 'Philemon', localAbbrev: 'phm' },
  { chineses: '來', chapters: 13, name: 'Hebrews', localAbbrev: 'hb' },
  { chineses: '雅', chapters: 5, name: 'James', localAbbrev: 'jm' },
  { chineses: '彼前', chapters: 5, name: '1 Peter', localAbbrev: '1pe' },
  { chineses: '彼後', chapters: 3, name: '2 Peter', localAbbrev: '2pe' },
  { chineses: '約一', chapters: 5, name: '1 John', localAbbrev: '1jo' },
  { chineses: '約二', chapters: 1, name: '2 John', localAbbrev: '2jo' },
  { chineses: '約三', chapters: 1, name: '3 John', localAbbrev: '3jo' },
  { chineses: '猶', chapters: 1, name: 'Jude', localAbbrev: 'jd' },
  { chineses: '啟', chapters: 22, name: 'Revelation', localAbbrev: 're' },
];

const totalChapters = BOOKS.reduce((s, b) => s + b.chapters, 0);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadVersion(version, filename) {
  console.log(`\n=== 開始下載 ${version} (${totalChapters} 章) ===`);
  const result = [];
  let done = 0;

  for (const book of BOOKS) {
    const chapters = new Array(book.chapters);
    const CONCURRENCY = 10;
    
    for (let i = 1; i <= book.chapters; i += CONCURRENCY) {
      const p = [];
      for (let j = 0; j < CONCURRENCY && (i + j) <= book.chapters; j++) {
        const chapIdx = i + j - 1;
        const chap = i + j;
        const url = `${FHL_BASE}?chineses=${encodeURIComponent(book.chineses)}&chap=${chap}&version=${version}&gb=0`;
        p.push((async (cIdx, c) => {
          try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.record && data.record.length > 0) {
              const verses = [];
              data.record.sort((a, b) => a.sec - b.sec).forEach(r => {
                verses[r.sec - 1] = r.bible_text;
              });
              chapters[cIdx] = verses;
            } else {
              chapters[cIdx] = [];
            }
          } catch (e) {
            console.error(`  ✗ ${book.chineses} ${c} 章失敗: ${e.message}`);
            chapters[cIdx] = [];
          }
          done++;
        })(chapIdx, chap));
      }
      await Promise.all(p);
      process.stdout.write(`  進度: ${done}/${totalChapters} (${Math.round(done / totalChapters * 100)}%)\r`);
      await sleep(DELAY);
    }
    
    result.push({
      abbrev: book.localAbbrev,
      name: book.name,
      chapters: chapters,
    });
    console.log(`  ✓ ${book.chineses} (${book.name}) - ${book.chapters} 章`);
  }

  const outDir = path.join(__dirname, 'public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(result));
  console.log(`\n✅ ${version} 已儲存為 ${filename} (${result.length} 書卷)`);
}

async function main() {
  // Download WEB (World English Bible) - replaces NIV (not available on FHL)
  await downloadVersion('web', 'web.json');
  console.log('\n🎉 全部下載完成！');
}

main().catch(console.error);
