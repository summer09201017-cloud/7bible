/* rcuv-core — 和修本(和合本2010)線上譯本核心
 * 正本在 skill fhl-bible-api/assets/rcuv-core.js,勿就地改;要改先改正本再同步 7bible / 8biblesearch。
 *
 * 為什麼是線上而不是打包:信望愛 abv.php 對 rcuv 標 candownload=0(不可下載離線資料庫),
 * 且 https://bible.fhl.net/json/ 明載「有些譯本僅授權給信望愛站使用…請勿任意使用,以免違法」。
 * ⇒ 走 qb.php 逐章即時查詢(該站說明本 API 供程式設計師呼叫開發使用),不重新散布經文。
 *
 * ⚠ 兩個實測地雷:
 *  1) version=unv,rcuv 這種逗號串多譯本 → status 仍是 success,但回傳「整本聖經」31,103 節 / 5.8MB。
 *     一定要一個版本一次呼叫。
 *  2) 失敗時 status 是一長串 SQL 而非 HTTP 錯 ⇒ 必須查 j.status === 'success' 且 record 有長度。
 */

const RCUV_API = 'https://bible.fhl.net/json/qb.php';
const TIMEOUT_MS = 12000;

/** 把 FHL rcuv 的 bible_text 拆成 { heading, text, notes:[{pos,body}] }
 *  已對真實資料驗證:16 章 619 節,零殘留註腳編號、零殘留 HTML 標籤、零佔位符外洩。
 *  text 刻意保持「純淨」(不含 [n] 標記) ⇒ 複製/朗讀/字級對比自動拿到乾淨經文。 */
export function cleanRcuvVerse(raw) {
  let s = String(raw == null ? '' : raw);
  let heading = '';

  // 1) 段落標題 <h2>…</h2> 外提(留在節文裡會在句子中間爆出大標題)
  s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, inner) => {
    const t = inner.replace(/<[^>]+>/g, '').trim();
    if (t) heading = heading ? `${heading} · ${t}` : t;
    return '';
  });

  // 2) 註腳 ( [3.16] … ) / ([1.1]…) 抽出;先用 \0(NUL)佔位,稍後換算成字元位置
  const bodies = [];
  const NOTE = /\((?:[^()]|\([^()]*\))*?\[\s*\d+[.:]\d+[a-z]?\s*\](?:[^()]|\([^()]*\))*\)/g;
  s = s.replace(NOTE, (m) => {
    const body = m
      .replace(/^\(\s*/, '')
      .replace(/\s*\)$/, '')
      .replace(/\[\s*(\d+[.:]\d+[a-z]?)\s*\]\s*/, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (!body) return '';
    bodies.push(body);
    return '\0';
  });

  // 3) 其餘標記:<br/> 併為空白;<u> 專名底線、<b> 等一律脫掉
  s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
  // U+3000 = 全形空白。用轉義而非字面字元:字面全形空白會觸發 eslint no-irregular-whitespace,
  // 且在編輯器裡看不出來。行為與字面全形空白完全相同。
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/^[\s\u3000]+/, '').replace(/[\s\u3000]+$/, '');

  // 4) 佔位符 → 字元位置
  const notes = [];
  let text = '';
  let bi = 0;
  for (const ch of s) {
    if (ch === '\0') notes.push({ pos: text.length, body: bodies[bi++] || '' });
    else text += ch;
  }
  return { heading, text, notes };
}

const chapterCache = new Map();   // `${abbrev}-${chap}` → { verses, heading }
const inflight = new Map();

/** 取一章和修本 → Map(sec → {text, heading, notes})。失敗丟 Error(讓呼叫端顯示,而非靜默降級)。 */
export async function fetchRcuvChapter(chineses, chap) {
  const key = `${chineses}-${chap}`;
  if (chapterCache.has(key)) return chapterCache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const url = `${RCUV_API}?chineses=${encodeURIComponent(chineses)}&chap=${chap}&version=rcuv&gb=0`;
      const resp = await fetch(url, { signal: ctl.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const j = await resp.json();
      if (j.status !== 'success' || !Array.isArray(j.record) || !j.record.length) {
        throw new Error('信望愛回應無此章經文');
      }
      const verses = new Map();
      j.record.forEach((r) => { verses.set(Number(r.sec), cleanRcuvVerse(r.bible_text)); });
      chapterCache.set(key, verses);
      return verses;
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? '連線逾時' : (e.message || '連線失敗'));
    } finally {
      clearTimeout(timer);
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
