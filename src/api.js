import { findLocalAbbrev, bookMap } from './bible_books';

// Version details for UI — order = display order (左→右)
export const VERSIONS = [
  { id: 'unv', label: '和合本 (CUV)' },
  { id: 'niv', label: 'NIV' },
  { id: 'esv', label: 'ESV' },
  { id: 'web', label: 'WEB' },
  { id: 'ncv', label: '新譯本 (NCV)' },
  { id: 'lzz', label: '呂振中' },
  { id: 'asv', label: 'ASV' },
  { id: 'kjv', label: 'KJV' },
];

// CUV text has spaces between chars — need to strip for keyword matching
const STRIP_SPACE_VERSIONS = ['unv'];

// In-memory cache so we don't re-fetch JSON every query
const localCache = {};

// NIV book-level cache (per nivFile key)
const nivBookCache = {};

// ─── Local JSON helpers ───────────────────────────────────────────────────────

async function loadLocalBible(version) {
  if (localCache[version]) return localCache[version];
  const res = await fetch(`/data/${version}.json`);
  const data = await res.json();
  localCache[version] = data;
  return data;
}

// ─── NIV helpers (per-book JSON: { "1": [...], "2": [...] }) ──────────────────

async function loadNivBook(nivFile) {
  const cacheKey = `niv_${nivFile}`;
  if (nivBookCache[cacheKey]) return nivBookCache[cacheKey];
  const res = await fetch(`/data/NIV/${nivFile}.json`);
  const data = await res.json();
  nivBookCache[cacheKey] = data;
  return data;
}

function getNivVerses(bookData, chap, sec) {
  const chapter = bookData[String(chap)];
  if (!chapter) return [];

  if (sec) {
    if (sec.includes('-')) {
      const [start, end] = sec.split('-').map(Number);
      const results = [];
      for (let i = start; i <= Math.min(end, chapter.length); i++) {
        if (chapter[i - 1]) results.push({ sec: i, bible_text: chapter[i - 1] });
      }
      return results;
    } else {
      const text = chapter[parseInt(sec) - 1];
      return text ? [{ sec: parseInt(sec), bible_text: text }] : [];
    }
  }
  return chapter.map((text, i) => ({ sec: i + 1, bible_text: text }));
}

async function fetchNivVersion(abbrev, chap, sec) {
  try {
    const bEntry = bookMap.find(b => b.localAbbrev === abbrev);
    if (!bEntry || !bEntry.nivFile) return { version: 'niv', record: [] };
    const bookData = await loadNivBook(bEntry.nivFile);
    return { version: 'niv', record: getNivVerses(bookData, chap, sec) };
  } catch (_e) {
    console.error('Error loading NIV:', _e);
    return { version: 'niv', error: '讀取失敗', record: [] };
  }
}

async function searchNivBible(keyword) {
  const lowerKw = keyword.toLowerCase();
  const matches = [];
  for (let bookIdx = 0; bookIdx < bookMap.length; bookIdx++) {
    const bEntry = bookMap[bookIdx];
    if (!bEntry.nivFile) continue;
    try {
      const bookData = await loadNivBook(bEntry.nivFile);
      const chapNums = Object.keys(bookData).sort((a, b) => Number(a) - Number(b));
      for (const chapStr of chapNums) {
        const chapter = bookData[chapStr];
        if (!chapter) continue;
        chapter.forEach((text, verseIdx) => {
          if (!text) return;
          if (text.toLowerCase().includes(lowerKw)) {
            matches.push({
              chineses: bEntry.names[0],
              localAbbrev: bEntry.localAbbrev,
              chap: parseInt(chapStr),
              sec: verseIdx + 1,
              bible_text: text,
            });
          }
        });
      }
    } catch (_e) {
      console.error(`Error searching NIV book ${bEntry.nivFile}:`, _e);
    }
  }
  return matches;
}

async function lookupNivVerses(refs) {
  const results = [];
  for (const ref of refs) {
    const bEntry = bookMap.find(b => b.localAbbrev === ref.localAbbrev);
    if (!bEntry || !bEntry.nivFile) { results.push({ ...ref, bible_text: '--' }); continue; }
    try {
      const bookData = await loadNivBook(bEntry.nivFile);
      const chapter = bookData[String(ref.chap)];
      if (!chapter) { results.push({ chineses: ref.chineses, chap: ref.chap, sec: ref.sec, bible_text: '--' }); continue; }
      const text = chapter[ref.sec - 1];
      results.push({ chineses: ref.chineses, chap: ref.chap, sec: ref.sec, bible_text: text || '--' });
    } catch {
      results.push({ chineses: ref.chineses, chap: ref.chap, sec: ref.sec, bible_text: '--' });
    }
  }
  return results;
}

// ─── Standard (non-NIV) helpers ───────────────────────────────────────────────

function getVersesFromLocal(data, abbrev, chap, sec, stripSpaces = false) {
  const book = data.find(b => b.abbrev === abbrev);
  if (!book) return [];
  const chapIndex = parseInt(chap) - 1;
  const chapter = book.chapters[chapIndex];
  if (!chapter) return [];

  function processText(t) { return t ? (stripSpaces ? t.replace(/\s/g, '') : t) : ''; }

  if (sec) {
    if (sec.includes('-')) {
      const [start, end] = sec.split('-').map(Number);
      const startIdx = Math.max(0, start - 1);
      const endIdx = Math.min(chapter.length - 1, end - 1);
      const results = [];
      for (let i = startIdx; i <= endIdx; i++) {
        if (chapter[i]) results.push({ sec: i + 1, bible_text: processText(chapter[i]) });
      }
      return results;
    } else {
      const text = chapter[parseInt(sec) - 1];
      return text ? [{ sec: parseInt(sec), bible_text: processText(text) }] : [];
    }
  }
  return chapter.map((text, i) => ({ sec: i + 1, bible_text: processText(text) }));
}

/** Detect if a string is mostly Chinese characters */
function isChinese(str) {
  const chineseChars = str.match(/[\u4e00-\u9fa5]/g);
  return chineseChars && chineseChars.length > str.replace(/\s/g, '').length * 0.3;
}

/**
 * Search all verses in local JSON for a keyword.
 * For CUV: strip spaces before matching (CUV data has space between every char)
 */
function searchLocalBible(data, keyword, stripSpaces = false) {
  const lowerKw = keyword.toLowerCase();
  const matches = [];
  data.forEach((book, bookIdx) => {
    const bEntry = bookMap[bookIdx];
    const chineses = bEntry ? bEntry.names[0] : book.abbrev;
    const localAbbrev = bEntry ? bEntry.localAbbrev : book.abbrev;
    book.chapters.forEach((chapter, chapIdx) => {
      if (!chapter) return;
      chapter.forEach((text, verseIdx) => {
        if (!text) return;
        const searchText = stripSpaces ? text.replace(/\s/g, '') : text;
        if (searchText.toLowerCase().includes(lowerKw)) {
          matches.push({
            chineses,
            localAbbrev,
            chap: chapIdx + 1,
            sec: verseIdx + 1,
            bible_text: stripSpaces ? searchText : text,
          });
        }
      });
    });
  });
  return matches;
}

/** Look up specific verses from a local bible by their references */
function lookupVerses(data, refs, stripSpaces = false) {
  const results = [];
  for (const ref of refs) {
    const book = data.find(b => b.abbrev === ref.localAbbrev);
    if (!book) { results.push({ ...ref, bible_text: '--' }); continue; }
    const chapter = book.chapters[ref.chap - 1];
    if (!chapter) { results.push({ ...ref, bible_text: '--' }); continue; }
    const text = chapter[ref.sec - 1];
    const finalTxt = text ? (stripSpaces ? text.replace(/\s/g, '') : text) : '--';
    results.push({ chineses: ref.chineses, chap: ref.chap, sec: ref.sec, bible_text: finalTxt });
  }
  return results;
}

// ─── Verse-by-reference ───────────────────────────────────────────────────────

async function fetchLocalVersion(version, abbrev, chap, sec) {
  // NIV uses separate per-book JSON files
  if (version === 'niv') {
    return fetchNivVersion(abbrev, chap, sec);
  }
  try {
    const data = await loadLocalBible(version);
    const stripSpaces = STRIP_SPACE_VERSIONS.includes(version);
    return { version, record: getVersesFromLocal(data, abbrev, chap, sec, stripSpaces) };
  } catch (_e) {
    console.error(`Error loading local ${version}:`, _e);
    return { version, error: '讀取失敗', record: [] };
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function fetchBible(query, versions) {
  const trimmedQuery = query.trim();

  // Detect if it's a chapter/verse reference or keyword search
  const refRegex = /^([a-zA-Z\s\u4e00-\u9fa5]+?)\s*(\d+)(?:[:：](\d+)(?:[-～~](\d+))?)?$/;
  const match = trimmedQuery.match(refRegex);

  // ── Mode 1: Chapter/Verse reference ──
  if (match) {
    const rawBook = match[1].trim();
    const chap = match[2];
    const secStart = match[3] || '';
    const secEnd = match[4] || '';
    const sec = secEnd ? `${secStart}-${secEnd}` : secStart;

    const abbrev = findLocalAbbrev(rawBook);
    if (!abbrev) throw new Error(`找不到書卷：${rawBook}`);
    const promises = versions.map(v => fetchLocalVersion(v, abbrev, chap, sec));
    const results = await Promise.all(promises);
    return { mode: 'verse', abbrev, chap, sec, results };
  }

  // ── Mode 2: Keyword search ──
  if (trimmedQuery.length < 2) throw new Error('關鍵字至少需要 2 個字元');

  const isChineseKeyword = isChinese(trimmedQuery);

  // Choose primary search version
  const primaryVersion = isChineseKeyword ? 'unv' : 'asv';
  const stripSpaces = STRIP_SPACE_VERSIONS.includes(primaryVersion);

  // Step 1: Search primary version
  let primaryMatches;
  if (primaryVersion === 'niv') {
    primaryMatches = await searchNivBible(trimmedQuery);
  } else {
    const primaryData = await loadLocalBible(primaryVersion);
    primaryMatches = searchLocalBible(primaryData, trimmedQuery, stripSpaces);
  }

  // Build reference list from primary matches
  const refs = primaryMatches.map(m => ({
    chineses: m.chineses,
    localAbbrev: m.localAbbrev,
    chap: m.chap,
    sec: m.sec,
  }));

  // Step 2: For each selected version, look up the same verses
  const results = await Promise.all(versions.map(async (v) => {
    if (v === primaryVersion) {
      return { version: v, record: primaryMatches };
    }
    // NIV uses its own lookup
    if (v === 'niv') {
      try {
        const record = await lookupNivVerses(refs);
        return { version: v, record };
      } catch {
        return { version: v, error: '讀取失敗', record: [] };
      }
    }
    try {
      const localData = await loadLocalBible(v);
      const stripSpace = STRIP_SPACE_VERSIONS.includes(v);
      const record = lookupVerses(localData, refs, stripSpace);
      return { version: v, record };
    } catch {
      return { version: v, error: '讀取失敗', record: [] };
    }
  }));

  return { mode: 'keyword', keyword: trimmedQuery, results };
}
