/**
 * localSearch.js
 * 載入本地 JSON 聖經並提供關鍵字搜尋功能
 * JSON 格式 (thiagobodruk/bible):
 *   Array of { abbrev, name, chapters: string[][] }
 *   chapters[chapIdx][verseIdx] = 經文文字
 */

// 書卷中文名稱對應（根據 thiagobodruk JSON 內部 abbrev，映射到我們 bookMap 的 chineses 名稱）
// thiagobodruk 用英文書名 (Genesis, Exodus...) 和 abbrev (gn, ex...)
// 我們用 bookMap 的 names[0] 做為 chineses key
const ABBREV_TO_CHINESE = [
  '創','出','利','民','申','書','士','得',
  '撒上','撒下','王上','王下','代上','代下',
  '拉','尼','斯','伯','詩','箴','傳','歌',
  '賽','耶','哀','結','但','何','珥','摩',
  '俄','拿','彌','鴻','哈','番','該','亞','瑪',
  '太','可','路','約','徒','羅',
  '林前','林後','加','弗','腓','西',
  '帖前','帖後','提前','提後','多','門',
  '來','雅','彼前','彼後','約一','約二','約三','猶','啟'
];

// 快取已載入的 JSON
const cache = {};

async function loadBible(versionId) {
  if (cache[versionId]) return cache[versionId];
  
  // 對應 versionId → 檔名
  const fileMap = {
    unv: '/bibles/zh_cuv.json',
    ncv: '/bibles/zh_ncv.json',
    kjv: '/bibles/en_kjv.json',
    asv: '/bibles/en_asv.json',
    esv: '/bibles/en_kjv.json',  // ESV 用 KJV 替代（僅關鍵字搜尋）
  };
  
  const file = fileMap[versionId];
  if (!file) throw new Error(`Unknown version: ${versionId}`);
  
  const res = await fetch(file);
  if (!res.ok) throw new Error(`Cannot load ${file}`);
  const data = await res.json();
  cache[versionId] = data;
  return data;
}

/**
 * 在本地 JSON 中搜尋關鍵字
 * 回傳 FHL-style record 格式: { chineses, engs, chap, sec, bible_text }
 */
export async function localKeywordSearch(keyword, versions) {
  const results = await Promise.all(versions.map(async (v) => {
    try {
      const bibleData = await loadBible(v);
      const records = [];
      const kw = keyword.toLowerCase();
      
      bibleData.forEach((book, bookIdx) => {
        const chineses = ABBREV_TO_CHINESE[bookIdx] || book.abbrev;
        book.chapters.forEach((chapter, chapIdx) => {
          chapter.forEach((verse, verseIdx) => {
            if (verse.toLowerCase().includes(kw)) {
              records.push({
                chineses,
                engs: book.abbrev,
                chap: chapIdx + 1,
                sec: verseIdx + 1,
                bible_text: verse,
              });
            }
          });
        });
      });
      
      if (records.length > 500) {
        throw new Error('查詢結果超過500筆，請縮小關鍵字範圍');
      }
      
      return { version: v, record: records };
    } catch (err) {
      if (err.message.includes('超過500筆')) throw err;
      console.error(`localSearch error for ${v}:`, err);
      return { version: v, record: [], error: err.message };
    }
  }));
  
  return results;
}
