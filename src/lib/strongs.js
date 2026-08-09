// ⚠ 共用 core 正本(skill: fhl-bible-api):Strong's 原文編號(FHL 信望愛資料源)。
// 兩站(7bible/8biblesearch)共用同一份——**勿就地改**,要改先改本正本再同步過去。
// 搬運:7bible=整檔進 src/lib/;8bible=整段貼進 index.html 並去掉 export 關鍵字。
//
// 資料源(2026-08-09 實測,CORS 皆通):
//   qb.php?chineses=約&chap=3&sec=16&version=unv&strong=1 → 帶 <WG25> 式標籤的和合本
//   sd.php?k=25&N=0 → 中文原文字典(N=0 新約希臘文 / N=1 舊約希伯來文;k 不吃前導零)
//   標籤家族:<WG新約字> <WH舊約字> <WTG/WTH文法碼(時態/字幹)> <WAH希伯來前綴詞>;
//   {…} = 譯者補字或未譯出的原文字。⚠ qb.php 的 engs 參數實測會回錯書卷,一律用 chineses。

const QB_URL = 'https://bible.fhl.net/json/qb.php';
const SD_URL = 'https://bible.fhl.net/json/sd.php';
const DICT_CAP = 200;
const FETCH_TIMEOUT_MS = 10000;

// 站別設定:字典快取的 localStorage 鍵(快取不是使用者資料,刻意不進備份鏈)。
// 7bible='sevenbible-strongs-dict-v1'、8bible='bible-strongs-dict-v1'。
let DICT_LS_KEY = 'strongs-dict-v1';
export function configureStrongs(opts) {
  if (opts && typeof opts.dictKey === 'string' && opts.dictKey) DICT_LS_KEY = opts.dictKey;
}

const verseCache = new Map();
const memDict = new Map();
let dictStore = null; // 模組級單一 store:並發查多編號詞時共用同一物件,避免讀改寫互蓋

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 把帶標籤的 bible_text 攤成 [{ t, nums:[{lang,n,parsing}], added }];
// 標點切成純文字段,編號只掛在最後一個詞塊,免得點擊塊包著逗號。
export function parseStrongsText(raw) {
  const segs = [];
  let lastTextSeg = null;
  let added = false;
  const re = /<W([A-Z]*)([GH])0*(\d+)>|\{|\}|([^<{}]+)/g;
  let m;
  while ((m = re.exec(String(raw || ''))) !== null) {
    if (m[4] !== undefined) {
      const pieces = m[4].split(/([\s\u3000,\uFF0C.\u3002\uFF0E;\uFF1B:\uFF1A?\uFF1F!\uFF01\u3001\u300C\u300D\u300E\u300F\u201C\u201D\u2018\u2019()\uFF08\uFF09\u2014\u2026\u00B7-]+)/).filter(Boolean);
      pieces.forEach((piece) => {
        const isPunct = /^[\s\u3000,\uFF0C.\u3002\uFF0E;\uFF1B:\uFF1A?\uFF1F!\uFF01\u3001\u300C\u300D\u300E\u300F\u201C\u201D\u2018\u2019()\uFF08\uFF09\u2014\u2026\u00B7-]+$/.test(piece);
        const seg = { t: piece, nums: [], added };
        segs.push(seg);
        if (!isPunct) lastTextSeg = seg;
      });
    } else if (m[0] === '{') {
      added = true;
      lastTextSeg = null;
    } else if (m[0] === '}') {
      added = false;
      lastTextSeg = null;
    } else {
      const num = { lang: m[2], n: m[3], parsing: m[1].includes('T') };
      if (lastTextSeg) {
        lastTextSeg.nums.push(num);
      } else {
        lastTextSeg = { t: '', nums: [num], added };
        segs.push(lastTextSeg);
      }
    }
  }
  return segs;
}

// chineses = FHL 中文書卷縮寫(創/出/…/約/啟)
export async function fetchStrongsVerse(chineses, chap, sec) {
  const key = `${chineses}:${chap}:${sec}`;
  if (verseCache.has(key)) return verseCache.get(key);
  const url = `${QB_URL}?chineses=${encodeURIComponent(chineses)}&chap=${chap}&sec=${sec}&version=unv&strong=1&gb=0`;
  const data = await fetchJson(url);
  const text = data?.record?.[0]?.bible_text;
  if (data?.status !== 'success' || !text) throw new Error('FHL 查無此節原文資料');
  const segs = parseStrongsText(text);
  verseCache.set(key, segs);
  return segs;
}

function readDictStore() {
  if (dictStore) return dictStore;
  try {
    const raw = localStorage.getItem(DICT_LS_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    dictStore = obj && typeof obj === 'object' ? obj : {};
  } catch {
    dictStore = {};
  }
  return dictStore;
}

function writeDictStore(store) {
  try {
    const keys = Object.keys(store);
    if (keys.length > DICT_CAP) {
      keys.sort((a, b) => (store[a].at || 0) - (store[b].at || 0))
        .slice(0, keys.length - DICT_CAP)
        .forEach((k) => delete store[k]);
    }
    localStorage.setItem(DICT_LS_KEY, JSON.stringify(store));
  } catch { /* 容量滿或私密模式:略過,純線上照常可用 */ }
}

// lang 'G'|'H',n 不帶前導零。回傳字典全文(中文);查過即入 localStorage,重複查免網路。
export async function lookupStrongs(lang, n) {
  const key = `${lang}${n}`;
  if (memDict.has(key)) return memDict.get(key);
  const store = readDictStore();
  if (store[key] && store[key].t) {
    store[key].at = Date.now();
    writeDictStore(store);
    memDict.set(key, store[key].t);
    return store[key].t;
  }
  const url = `${SD_URL}?k=${n}&N=${lang === 'G' ? 0 : 1}&gb=0`;
  const data = await fetchJson(url);
  const records = Array.isArray(data?.record) ? data.record : [];
  const text = records.map((r) => String(r.dic_text || '').trim()).filter(Boolean).join('\n──\n');
  if (data?.status !== 'success' || !text) throw new Error('查無字典條目');
  memDict.set(key, text);
  store[key] = { t: text, at: Date.now() };
  writeDictStore(store);
  return text;
}
