import { findLocalAbbrev, bookMap } from './bible_books';
import { fetchRcuvChapter } from './lib/rcuv-core';

// Version details for UI - order = display order (left to right)
// lang: 'zh' / 'en' - 用於差異高亮的同語系判斷
export const VERSIONS = [
  { id: 'unv', label: '和合本 (CUV)', lang: 'zh' },
  // 和修本(和合本2010)= 線上譯本,刻意不打包進 public/data:
  // 信望愛 abv.php 對 rcuv 標 candownload=0(不可下載離線資料庫),文件並註明
  // 「有些譯本僅授權給信望愛站使用…請勿任意使用」⇒ 只走 qb.php 即時查詢,不重新散布。
  { id: 'rcuv', label: '和修本 (RCUV)', lang: 'zh', online: true },
  { id: 'niv', label: 'NIV', lang: 'en' },
  { id: 'esv', label: 'ESV', lang: 'en' },
  { id: 'web', label: 'WEB', lang: 'en' },
  { id: 'ncv', label: '新譯本 (NCV)', lang: 'zh' },
  { id: 'lzz', label: '呂振中', lang: 'zh' },
  { id: 'asv', label: 'ASV', lang: 'en' },
  { id: 'kjv', label: 'KJV', lang: 'en' },
];

/** 線上譯本:不在 public/data 裡,逐章向信望愛 qb.php 取。全文搜尋無法涵蓋(手上只有讀過的章)。 */
export const ONLINE_VERSION_IDS = ['rcuv'];
export const isOnlineVersion = (id) => ONLINE_VERSION_IDS.includes(id);

const STRIP_SPACE_VERSIONS = ['unv'];
const localCache = {};
const nivBookCache = {};
const xrefCache = {};

export async function loadXref(localAbbrev) {
  if (xrefCache[localAbbrev]) return xrefCache[localAbbrev];
  const res = await fetch(`/data/xref/${localAbbrev}.json`);
  if (!res.ok) throw new Error(`讀取串珠資料失敗`);
  const data = await res.json();
  xrefCache[localAbbrev] = data;
  return data;
}

async function loadLocalBible(version) {
  if (localCache[version]) return localCache[version];
  const res = await fetch(`/data/${version}.json`);
  if (!res.ok) throw new Error(`讀取 ${version} 失敗`);
  const data = await res.json();
  localCache[version] = data;
  return data;
}

async function loadNivBook(nivFile) {
  const cacheKey = `niv_${nivFile}`;
  if (nivBookCache[cacheKey]) return nivBookCache[cacheKey];
  const res = await fetch(`/data/NIV/${nivFile}.json`);
  if (!res.ok) throw new Error(`讀取 NIV ${nivFile} 失敗`);
  const data = await res.json();
  nivBookCache[cacheKey] = data;
  return data;
}

function getBookIndex(localAbbrev) {
  return bookMap.findIndex((b) => b.localAbbrev === localAbbrev);
}

function getScopeBounds(options = {}) {
  const scope = options.scope || 'all';
  if (scope === 'ot') return [0, 38];
  if (scope === 'nt') return [39, 65];
  if (scope === 'range') {
    const start = Number.isInteger(options.startBookIndex) ? options.startBookIndex : 0;
    const end = Number.isInteger(options.endBookIndex) ? options.endBookIndex : 65;
    return [Math.max(0, Math.min(start, end)), Math.min(65, Math.max(start, end))];
  }
  return [0, 65];
}

function inScope(bookIdx, options) {
  const [start, end] = getScopeBounds(options);
  return bookIdx >= start && bookIdx <= end;
}

function normalizeText(text, stripSpaces = false) {
  const value = String(text || '');
  return stripSpaces ? value.replace(/\s/g, '') : value;
}

function splitTerms(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function makeMatcher(keyword, options = {}, stripSpaces = false) {
  const sourceKeyword = normalizeText(keyword, stripSpaces).trim().toLowerCase();
  const exactPhrase = Boolean(options.exactPhrase);
  const includeTerms = exactPhrase ? [sourceKeyword] : splitTerms(sourceKeyword);
  const terms = includeTerms.length > 0 ? includeTerms : [sourceKeyword];
  const excludeTerms = splitTerms(normalizeText(options.exclude || '', stripSpaces).toLowerCase());
  const operator = options.operator === 'or' ? 'or' : 'and';

  return (text) => {
    const target = normalizeText(text, stripSpaces).toLowerCase();
    const includeOk = operator === 'or'
      ? terms.some((term) => target.includes(term))
      : terms.every((term) => target.includes(term));
    if (!includeOk) return false;
    return excludeTerms.every((term) => !target.includes(term));
  };
}

function makeRefKey(ref) {
  return `${ref.localAbbrev}:${ref.chap}:${ref.sec}`;
}

function getBookEntry(localAbbrev) {
  return bookMap.find((b) => b.localAbbrev === localAbbrev);
}

function getVersesFromLocal(data, abbrev, chap, sec, stripSpaces = false) {
  const book = data.find((b) => b.abbrev === abbrev);
  if (!book) return [];
  const chapter = book.chapters[parseInt(chap, 10) - 1];
  if (!chapter) return [];

  const processText = (text) => normalizeText(text, stripSpaces);

  if (sec) {
    if (sec.includes('-')) {
      const [start, end] = sec.split('-').map(Number);
      const startIdx = Math.max(0, start - 1);
      const endIdx = Math.min(chapter.length - 1, end - 1);
      const results = [];
      for (let i = startIdx; i <= endIdx; i += 1) {
        if (chapter[i]) results.push({ sec: i + 1, bible_text: processText(chapter[i]) });
      }
      return results;
    }
    const verseNumber = parseInt(sec, 10);
    const text = chapter[verseNumber - 1];
    return text ? [{ sec: verseNumber, bible_text: processText(text) }] : [];
  }

  return chapter.map((text, i) => ({ sec: i + 1, bible_text: processText(text) }));
}

function getNivVerses(bookData, chap, sec) {
  const chapter = bookData[String(chap)];
  if (!chapter) return [];

  if (sec) {
    if (sec.includes('-')) {
      const [start, end] = sec.split('-').map(Number);
      const results = [];
      for (let i = start; i <= Math.min(end, chapter.length); i += 1) {
        if (chapter[i - 1]) results.push({ sec: i, bible_text: chapter[i - 1] });
      }
      return results;
    }
    const verseNumber = parseInt(sec, 10);
    const text = chapter[verseNumber - 1];
    return text ? [{ sec: verseNumber, bible_text: text }] : [];
  }

  return chapter.map((text, i) => ({ sec: i + 1, bible_text: text }));
}

function isChinese(str) {
  const compact = str.replace(/\s/g, '');
  const chineseChars = compact.match(/[\u4e00-\u9fa5]/g);
  return Boolean(chineseChars && chineseChars.length > compact.length * 0.3);
}

function searchLocalBible(data, keyword, stripSpaces = false, options = {}) {
  const matcher = makeMatcher(keyword, options, stripSpaces);
  const matches = [];

  data.forEach((book, bookIdx) => {
    if (!inScope(bookIdx, options)) return;
    const bEntry = bookMap[bookIdx];
    const chineses = bEntry ? bEntry.names[0] : book.abbrev;
    const localAbbrev = bEntry ? bEntry.localAbbrev : book.abbrev;

    book.chapters.forEach((chapter, chapIdx) => {
      if (!chapter) return;
      chapter.forEach((text, verseIdx) => {
        if (!text || !matcher(text)) return;
        matches.push({
          chineses,
          localAbbrev,
          chap: chapIdx + 1,
          sec: verseIdx + 1,
          bible_text: normalizeText(text, stripSpaces),
        });
      });
    });
  });

  return matches;
}

async function searchNivBible(keyword, options = {}) {
  const matcher = makeMatcher(keyword, options, false);
  const matches = [];

  for (let bookIdx = 0; bookIdx < bookMap.length; bookIdx += 1) {
    if (!inScope(bookIdx, options)) continue;
    const bEntry = bookMap[bookIdx];
    if (!bEntry.nivFile) continue;

    try {
      const bookData = await loadNivBook(bEntry.nivFile);
      const chapNums = Object.keys(bookData).sort((a, b) => Number(a) - Number(b));
      for (const chapStr of chapNums) {
        const chapter = bookData[chapStr];
        if (!chapter) continue;
        chapter.forEach((text, verseIdx) => {
          if (!text || !matcher(text)) return;
          matches.push({
            chineses: bEntry.names[0],
            localAbbrev: bEntry.localAbbrev,
            chap: parseInt(chapStr, 10),
            sec: verseIdx + 1,
            bible_text: text,
          });
        });
      }
    } catch (_e) {
      console.error(`Error searching NIV book ${bEntry.nivFile}:`, _e);
    }
  }

  return matches;
}

function lookupVerses(data, refs, stripSpaces = false) {
  return refs.map((ref) => {
    const book = data.find((b) => b.abbrev === ref.localAbbrev);
    if (!book) return { ...ref, bible_text: '--' };
    const chapter = book.chapters[ref.chap - 1];
    if (!chapter) return { ...ref, bible_text: '--' };
    const text = chapter[ref.sec - 1];
    return { ...ref, bible_text: text ? normalizeText(text, stripSpaces) : '--' };
  });
}

async function lookupNivVerses(refs) {
  const results = [];

  for (const ref of refs) {
    const bEntry = getBookEntry(ref.localAbbrev);
    if (!bEntry || !bEntry.nivFile) {
      results.push({ ...ref, bible_text: '--' });
      continue;
    }

    try {
      const bookData = await loadNivBook(bEntry.nivFile);
      const chapter = bookData[String(ref.chap)];
      if (!chapter) {
        results.push({ ...ref, bible_text: '--' });
        continue;
      }
      results.push({ ...ref, bible_text: chapter[ref.sec - 1] || '--' });
    } catch {
      results.push({ ...ref, bible_text: '--' });
    }
  }

  return results;
}

/** 和修本:逐章向信望愛取。record 的 bible_text 是「純淨經文」(不含 [n] 標記),
 *  段落標題與註腳另放 rcuvHeading / rcuvNotes ⇒ 複製/朗讀(都走 stripTags(bible_text))自動拿到乾淨版。 */
async function fetchRcuvVersion(abbrev, chap, sec) {
  const bEntry = getBookEntry(abbrev);
  // ⚠ 必須用中文縮寫(names[0]):qb.php 的 engs= 會查錯書(engs=John 回羅馬書)。
  // 全 66 卷已用 names[0] 對 rcuv 實測通過。
  const zh = bEntry && bEntry.names && bEntry.names[0];
  if (!zh) return { version: 'rcuv', error: '找不到書卷對應', record: [] };

  try {
    const verses = await fetchRcuvChapter(zh, chap);
    const pick = (n) => {
      const v = verses.get(n);
      if (!v) return null;
      return { sec: n, bible_text: v.text, rcuvHeading: v.heading || '', rcuvNotes: v.notes || [] };
    };
    if (sec) {
      if (String(sec).includes('-')) {
        const [start, end] = String(sec).split('-').map(Number);
        const out = [];
        for (let i = start; i <= end; i += 1) { const r = pick(i); if (r) out.push(r); }
        return { version: 'rcuv', record: out };
      }
      const r = pick(parseInt(sec, 10));
      return { version: 'rcuv', record: r ? [r] : [] };
    }
    return {
      version: 'rcuv',
      record: [...verses.keys()].sort((a, b) => a - b).map(pick).filter(Boolean),
    };
  } catch (e) {
    // 失敗要往上帶,讓畫面明說「沒取到」——不可讓它退化成 '--'(看起來像「這節沒經文」)
    return { version: 'rcuv', error: e.message || '連線失敗', record: [] };
  }
}

export async function fetchLocalVersion(version, abbrev, chap, sec) {
  if (version === 'niv') return fetchNivVersion(abbrev, chap, sec);
  if (version === 'rcuv') return fetchRcuvVersion(abbrev, chap, sec);

  try {
    const data = await loadLocalBible(version);
    const stripSpaces = STRIP_SPACE_VERSIONS.includes(version);
    return { version, record: getVersesFromLocal(data, abbrev, chap, sec, stripSpaces) };
  } catch (_e) {
    console.error(`Error loading local ${version}:`, _e);
    return { version, error: '讀取失敗', record: [] };
  }
}

async function fetchNivVersion(abbrev, chap, sec) {
  try {
    const bEntry = getBookEntry(abbrev);
    if (!bEntry || !bEntry.nivFile) return { version: 'niv', record: [] };
    const bookData = await loadNivBook(bEntry.nivFile);
    return { version: 'niv', record: getNivVerses(bookData, chap, sec) };
  } catch (_e) {
    console.error('Error loading NIV:', _e);
    return { version: 'niv', error: '讀取失敗', record: [] };
  }
}

async function searchVersion(version, keyword, options = {}) {
  if (version === 'niv') return searchNivBible(keyword, options);
  const data = await loadLocalBible(version);
  const stripSpaces = STRIP_SPACE_VERSIONS.includes(version);
  return searchLocalBible(data, keyword, stripSpaces, options);
}

async function lookupVersion(version, refs) {
  if (version === 'niv') return lookupNivVerses(refs);
  const data = await loadLocalBible(version);
  const stripSpaces = STRIP_SPACE_VERSIONS.includes(version);
  return lookupVerses(data, refs, stripSpaces);
}

function makeRefFromMatch(match) {
  return {
    chineses: match.chineses,
    localAbbrev: match.localAbbrev,
    chap: match.chap,
    sec: match.sec,
  };
}

export async function fetchBible(query, versions, options = {}) {
  const trimmedQuery = query.trim();
  const selectedVersions = versions && versions.length ? versions : ['unv'];
  const refRegex = /^([a-zA-Z\s\u4e00-\u9fa5]+?)\s*(\d+)(?:[:：](\d+)(?:[-～~](\d+))?)?$/;
  const match = trimmedQuery.match(refRegex);

  if (match) {
    const rawBook = match[1].trim();
    const chap = match[2];
    const secStart = match[3] || '';
    const secEnd = match[4] || '';
    const sec = secEnd ? `${secStart}-${secEnd}` : secStart;
    const abbrev = findLocalAbbrev(rawBook);

    if (!abbrev) throw new Error(`找不到書卷：${rawBook}`);
    const bookIdx = getBookIndex(abbrev);
    if (!inScope(bookIdx, options)) throw new Error('這段經文不在目前設定的搜尋範圍內');

    const results = await Promise.all(selectedVersions.map((v) => fetchLocalVersion(v, abbrev, chap, sec)));
    return { mode: 'verse', abbrev, chap, sec, results, searchOptions: options };
  }

  if (trimmedQuery.length < 2) throw new Error('關鍵字至少需要 2 個字元');

  const primaryVersion = isChinese(trimmedQuery) ? 'unv' : 'asv';
  // 線上譯本不能做全文搜尋:①手上只有讀過的章,不是全本 ②即使拿命中清單去逐節補查,
  // 一次搜尋可能要向信望愛抓上百章 —— 那是把志工營運的服務當自己的資料庫用。
  // ⇒ 兩段都排除,並把被排除的譯本回報給 UI 明說(靜靜少一本 = 使用者以為和修本查不到這個詞)。
  const onlineExcluded = selectedVersions.filter(isOnlineVersion);
  const offlineSelected = selectedVersions.filter((v) => !isOnlineVersion(v));
  const searchVersions = (options.searchSelectedVersions ? offlineSelected : [primaryVersion])
    .filter((v) => !isOnlineVersion(v));
  const refMap = new Map();
  const matchCountByVersion = {};

  await Promise.all(searchVersions.map(async (version) => {
    try {
      const matches = await searchVersion(version, trimmedQuery, options);
      matchCountByVersion[version] = matches.length;
      matches.forEach((m) => {
        const ref = makeRefFromMatch(m);
        const key = makeRefKey(ref);
        if (!refMap.has(key)) refMap.set(key, ref);
      });
    } catch (_e) {
      console.error(`Error searching ${version}:`, _e);
      matchCountByVersion[version] = 0;
    }
  }));

  const refs = Array.from(refMap.values()).sort((a, b) => {
    const aBook = getBookIndex(a.localAbbrev);
    const bBook = getBookIndex(b.localAbbrev);
    if (aBook !== bBook) return aBook - bBook;
    if (a.chap !== b.chap) return a.chap - b.chap;
    return a.sec - b.sec;
  });

  const results = await Promise.all(offlineSelected.map(async (version) => {
    try {
      const record = await lookupVersion(version, refs);
      return { version, record, matchedCount: matchCountByVersion[version] };
    } catch {
      return { version, error: '讀取失敗', record: [], matchedCount: matchCountByVersion[version] || 0 };
    }
  }));

  // onlineExcluded 交給 UI 明說;onlyOnline = 使用者只勾了線上譯本 ⇒ 不是「查無結果」,是「搜不了」
  return {
    mode: 'keyword',
    keyword: trimmedQuery,
    results,
    searchOptions: options,
    onlineExcluded,
    onlyOnline: onlineExcluded.length > 0 && offlineSelected.length === 0,
  };
}
