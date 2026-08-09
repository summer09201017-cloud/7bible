// ⚠ 共用 core 正本(skill: fhl-bible-api):FHL 站註釋(sc.php)排版核心。
// 兩站(7bible/8biblesearch)共用——**勿就地改**,要改先改本正本再同步過去。
// 只管「資料→段落/token」,不碰 DOM;site 層自己決定怎麼渲染(8bible=HTML 字串、7bible=React)。
//
// sc.php 實測(2026-08-10):
//   json/sc.php?book=3&engs=John&chap=3&sec=16 → { record:[{title, book_name, com_text}], prev, next }
//   ⚠ 書卷參數**只能用 engs=**(chineses=約 會回羅馬書!)——與 qb.php 正好相反。
//   com_text 是固定寬度硬換行+深縮排的 pre 排版,直接 pre-wrap 會把句子硬切(8bible v84 教訓)。

// 硬換行重排成自然段(正本收割自 8bible v84 實戰版,真資料驗證創/羅 71 行→24 段零殘留):
// 大綱標記行(壹、/一、/(一)/1./(1)/●/◎…)=新段落,其餘行併回上一段;縮排層級交給 site 層轉 padding。
export function reflowComText(txt) {
  const lines = String(txt || '').split(/\r?\n/);
  const BLOCK_START = /^(?:[●◎○■□★☆◆※]|[壹貳參肆伍陸柒捌玖拾]+、|[一二三四五六七八九十]+、|[（(][一二三四五六七八九十\d]+[）)]|\d{1,2}\.|[①-⑳])/;
  const blocks = [];
  let cur = null;
  for (const raw of lines) {
    const t = raw.replace(/[\s\u3000]+$/, '');
    const trimmed = t.replace(/^[\s\u3000]+/, '');
    if (!trimmed) { if (cur) { blocks.push(cur); cur = null; } continue; }
    const indent = t.length - trimmed.length;
    if (!cur || BLOCK_START.test(trimmed)) {
      if (cur) blocks.push(cur);
      cur = { indent: indent, text: trimmed };
    } else {
      // 中文接中文直接黏;英數接英數補一個空格(Strong 清單/英文句)
      const a = cur.text.slice(-1), b = trimmed[0];
      const needSpace = /[A-Za-z0-9,.;:)\]]/.test(a) && /[A-Za-z0-9([]/.test(b);
      cur.text += (needSpace ? ' ' : '') + trimmed;
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

// 把一段 com_text(或字典內文)切成三種 token,site 層自行渲染:
//   { t:'text', v }                     — 純文字
//   { t:'ref',  v:'創 36:39' }          — #參照|(可能無書卷=當前書卷,site 層自己補)
//   { t:'sn',   lang:'G'|'H', n:'25', label:'SG 25' } — 原文編號
// ⚠ 0810 全書掃描發現兩種變體(哀歌 `SNH 57` 帶空格、羅馬書裸 `SN00846` 不帶字母)——
//   regex 放寬:字母可省(用 defaultLang=書卷新舊約推)、字母與數字間容許空白。
export function tokenizeComText(text, defaultLang = 'G') {
  const tokens = [];
  const re = /#([^#|\r\n]{1,50})\||SN([GH])?[ \t\u3000]*0*(\d{1,6})/g;
  const src = String(text || '');
  let i = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > i) tokens.push({ t: 'text', v: src.slice(i, m.index) });
    if (m[1] !== undefined) {
      tokens.push({ t: 'ref', v: m[1].trim() });
    } else {
      const lang = m[2] || defaultLang;
      tokens.push({ t: 'sn', lang, n: m[3], label: (lang === 'G' ? 'SG ' : 'SH ') + m[3] });
    }
    i = re.lastIndex;
  }
  if (i < src.length) tokens.push({ t: 'text', v: src.slice(i) });
  return tokens;
}

// sc.php 回應 → 乾淨結構(records 各自帶 reflow 好的 blocks;prev/next 原樣透傳)
export function parseCommentary(data) {
  const records = (Array.isArray(data?.record) ? data.record : []).map((rec) => ({
    title: rec.title || '',
    bookName: rec.book_name || '信望愛站註釋',
    blocks: reflowComText(rec.com_text || ''),
  }));
  return { records, prev: data?.prev || null, next: data?.next || null };
}
