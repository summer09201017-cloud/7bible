import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { fetchBible, fetchLocalVersion, loadXref, VERSIONS } from './api';
import { bookMap } from './bible_books';
import { toSpeakable } from './lib/tts-fix.js';
import { configureStrongs, fetchStrongsVerse, lookupStrongs } from './lib/strongs.js';
import { parseCommentary, tokenizeComText } from './lib/commentary-core.js';

configureStrongs({ dictKey: 'sevenbible-strongs-dict-v1' }); // 沿用 v23 既有快取鍵(是快取不進備份鏈)

const VERSION_COLORS = {
  unv: 'var(--version-unv)',
  niv: 'var(--version-niv)',
  esv: 'var(--version-esv)',
  web: 'var(--version-web)',
  ncv: 'var(--version-ncv)',
  lzz: 'var(--version-lzz)',
  asv: 'var(--version-asv)',
  kjv: 'var(--version-kjv)',
};

const LS_KEYS = {
  history: 'bible-tool-history-v1',
  versions: 'bible-tool-versions-v1',
  fontSize: 'bible-tool-font-size-v1',
  diffEnabled: 'bible-tool-diff-enabled-v1',
  diffBase: 'bible-tool-diff-base-v1',
  bookmark: 'bible-tool-bookmark-v1',
  copyFormat: 'bible-tool-copy-format-v1',
  theme: 'bible-tool-theme-v1',
  readingProgress: 'bible-tool-reading-progress-v1',
  readingLog: 'bible-tool-reading-log-v1',
};

const BOOK_GROUPS = [
  { label: '摩西五經', start: 0, end: 4 },
  { label: '歷史書', start: 5, end: 16 },
  { label: '詩歌智慧書', start: 17, end: 21 },
  { label: '大先知書', start: 22, end: 26 },
  { label: '小先知書', start: 27, end: 38 },
  { label: '福音書與使徒行傳', start: 39, end: 43 },
  { label: '保羅書信', start: 44, end: 56 },
  { label: '一般書信', start: 57, end: 64 },
  { label: '啟示錄', start: 65, end: 65 },
];

const FHL_ENGS_BY_LOCAL = {
  gn: 'Gen', ex: 'Ex', lv: 'Lev', nm: 'Num', dt: 'Deut',
  js: 'Josh', jud: 'Judg', rt: 'Ruth', '1sm': '1 Sam', '2sm': '2 Sam',
  '1kgs': '1 Kin', '2kgs': '2 Kin', '1chr': '1 Chr', '2chr': '2 Chr',
  ezr: 'Ezra', ne: 'Neh', es: 'Esth', job: 'Job', ps: 'Ps',
  prv: 'Prov', ec: 'Eccl', so: 'Song', is: 'Is', jr: 'Jer',
  lm: 'Lam', ez: 'Ezek', dn: 'Dan', ho: 'Hos', jl: 'Joel',
  am: 'Amos', ob: 'Obad', jn: 'Jon', mi: 'Mic', na: 'Nah',
  hab: 'Hab', zp: 'Zeph', hg: 'Hag', zc: 'Zech', ml: 'Mal',
  mt: 'Matt', mk: 'Mark', lk: 'Luke', jo: 'John', act: 'Acts',
  rm: 'Rom', '1co': '1 Cor', '2co': '2 Cor', gl: 'Gal', eph: 'Eph',
  ph: 'Phil', cl: 'Col', '1ts': '1 Thess', '2ts': '2 Thess',
  '1tm': '1 Tim', '2tm': '2 Tim', tt: 'Titus', phm: 'Philem',
  hb: 'Heb', jm: 'James', '1pe': '1 Pet', '2pe': '2 Pet',
  '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', jd: 'Jude', re: 'Rev',
};

const S = {
  bg: { background: 'var(--app-bg)', color: 'var(--page-text)', minHeight: '100vh' },
  card: { background: 'var(--surface-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-soft)', borderRadius: '14px' },
  input: { background: 'var(--input-bg)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', border: '2px solid var(--border-strong)', borderRadius: '10px', color: 'var(--page-text)' },
  btnSearch: { background: 'linear-gradient(145deg, #d32f2f, #9f1c1c)', boxShadow: '0 4px 8px rgba(183,28,28,0.25)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', width: '100%' },
  btnCopy: { background: 'linear-gradient(145deg, #1e88e5, #0d47a1)', boxShadow: '0 3px 6px rgba(13,71,161,0.25)', borderRadius: '9px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnCopied: { background: 'linear-gradient(145deg, #43a047, #2e7d32)', boxShadow: '0 3px 6px rgba(46,125,50,0.25)', borderRadius: '9px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnLine: { background: 'linear-gradient(145deg, #4caf50, #1b5e20)', boxShadow: '0 3px 6px rgba(27,94,32,0.25)', borderRadius: '9px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnEmail: { background: 'linear-gradient(145deg, #fb8c00, #e65100)', boxShadow: '0 3px 6px rgba(230,81,0,0.25)', borderRadius: '9px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnInstall: { background: 'linear-gradient(145deg, #6d4cff, #4527a0)', boxShadow: '0 4px 8px rgba(69,39,160,0.25)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  pillActive: { background: 'linear-gradient(145deg, #43a047, #2e7d32)', color: 'white', border: '1px solid #2e7d32', boxShadow: '0 3px 8px rgba(46,125,50,0.25)', borderRadius: '999px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' },
  pillInactive: { background: 'var(--pill-inactive-bg)', color: 'var(--pill-inactive-text)', border: '1px solid var(--border-muted)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '999px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' },
  tableHeader: { background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-strong)' },
  actionBar: { background: 'var(--action-bar-bg)', borderTop: '1px solid var(--border-soft)' },
  resultCard: { background: 'var(--surface-solid)', boxShadow: 'var(--result-shadow)', borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)', borderRadius: 0, overflow: 'hidden' },
  checkbox: { width: 18, height: 18, accentColor: '#2e7d32', cursor: 'pointer', flexShrink: 0 },
  statsBar: { background: 'var(--stats-bar-bg)', borderBottom: '1px solid var(--border-soft)' },
  select: { background: 'var(--input-bg)', border: '2px solid var(--border-strong)', borderRadius: '9px', padding: '10px 12px', fontSize: 14, outline: 'none', color: 'var(--heading-text)', fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)', flex: 1, minWidth: 130 },
  smallBtn: { border: '1px solid var(--border-strong)', background: 'var(--input-bg)', color: 'var(--heading-text)', borderRadius: 8, padding: '6px 10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }, /* 0809 B1:12→14,長輩看得到 */
  dangerBtn: { border: '1px solid var(--danger-border)', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  textarea: { width: '100%', minHeight: 72, resize: 'vertical', border: '1px solid var(--border-strong)', borderRadius: 8, padding: 8, fontSize: 13, lineHeight: 1.5, outline: 'none', background: 'var(--input-bg)', color: 'var(--page-text)' },
};

const THEME_VARS = {
  light: {
    '--app-bg': 'linear-gradient(135deg, #e8f5e9 0%, #f7fbef 50%, #e0f2e1 100%)',
    '--page-text': '#1f2937',
    '--heading-text': '#1b5e20',
    '--subtle-text': '#2e7d32',
    '--muted-text': '#6b7280',
    '--soft-text': '#555',
    '--link-text': '#1565c0',
    '--surface-bg': 'linear-gradient(145deg, #ffffff, #f7fbef)',
    '--surface-solid': '#ffffff',
    '--panel-bg': '#ffffffcc',
    '--input-bg': '#ffffff',
    '--pill-inactive-bg': '#ffffff',
    '--pill-inactive-text': '#555',
    '--table-header-bg': 'linear-gradient(145deg, #e8f5e9, #c8e6c9)',
    '--action-bar-bg': 'linear-gradient(to right, #e8f5e9, #f7fbef)',
    '--stats-bar-bg': 'linear-gradient(135deg, #fff9c4, #f1f8e9)',
    '--topbar-bg': 'linear-gradient(135deg, #e8f5e9 0%, #f7fbef 50%, #e0f2e1 100%)',
    '--mobile-checkbox-bg': 'linear-gradient(to right, #e8f5e9, #f9fff5)',
    '--mobile-verse-bg': '#ffffff',
    '--border-soft': '#c8e6c9',
    '--border-strong': '#a5d6a7',
    '--border-muted': '#e5e7eb',
    '--row-border': '#e8f5e9',
    '--progress-track': '#c8e6c9',
    '--selected-row-bg': '#e8f5e930',
    '--keyword-selected-row-bg': '#fef9c340',
    '--warning-text': '#b45309',
    '--warning-strong-text': '#92400e',
    '--warning-bg': '#fffbeb',
    '--warning-border': '#fcd34d',
    '--danger-bg': '#ffebee',
    '--danger-border': '#ef9a9a',
    '--danger-text': '#b71c1c',
    '--card-shadow': '0 8px 24px rgba(76,175,80,0.12), 0 2px 8px rgba(0,0,0,0.06)',
    '--result-shadow': '0 6px 20px rgba(76,175,80,0.08)',
    '--topbar-shadow': '0 2px 12px rgba(76,175,80,0.2)',
    '--scrollbar-thumb': '#a5d6a7',
    '--scrollbar-thumb-hover': '#66bb6a',
    '--version-unv': '#1a5276',
    '--version-niv': '#0277bd',
    '--version-esv': '#7b241c',
    '--version-web': '#1e8449',
    '--version-ncv': '#6c3483',
    '--version-lzz': '#b9770e',
    '--version-asv': '#2471a3',
    '--version-kjv': '#a04000',
  },
  dark: {
    '--app-bg': 'linear-gradient(135deg, #0f1713 0%, #172119 52%, #101814 100%)',
    '--page-text': '#dbe8d6',
    '--heading-text': '#bbf7d0',
    '--subtle-text': '#86efac',
    '--muted-text': '#a8b8a3',
    '--soft-text': '#c2d1bd',
    '--link-text': '#93c5fd',
    '--surface-bg': 'linear-gradient(145deg, #19251d, #101913)',
    '--surface-solid': '#121b15',
    '--panel-bg': '#162119dd',
    '--input-bg': '#0f1713',
    '--pill-inactive-bg': '#101913',
    '--pill-inactive-text': '#cbdac6',
    '--table-header-bg': 'linear-gradient(145deg, #1d2d22, #142018)',
    '--action-bar-bg': 'linear-gradient(to right, #17251b, #101913)',
    '--stats-bar-bg': 'linear-gradient(135deg, #262915, #132018)',
    '--topbar-bg': 'linear-gradient(135deg, #101913 0%, #17251b 55%, #0f1713 100%)',
    '--mobile-checkbox-bg': 'linear-gradient(to right, #17251b, #101913)',
    '--mobile-verse-bg': '#0f1713',
    '--border-soft': '#2f523a',
    '--border-strong': '#4f8a5c',
    '--border-muted': '#2b3d31',
    '--row-border': '#233a2a',
    '--progress-track': '#2b4633',
    '--selected-row-bg': '#315c3b55',
    '--keyword-selected-row-bg': '#5f4a1855',
    '--warning-text': '#fde68a',
    '--warning-strong-text': '#facc15',
    '--warning-bg': '#2b2410',
    '--warning-border': '#7c641d',
    '--danger-bg': '#321616',
    '--danger-border': '#7f1d1d',
    '--danger-text': '#fecaca',
    '--card-shadow': '0 10px 28px rgba(0,0,0,0.28), 0 2px 10px rgba(0,0,0,0.18)',
    '--result-shadow': '0 8px 24px rgba(0,0,0,0.22)',
    '--topbar-shadow': '0 2px 14px rgba(0,0,0,0.3)',
    '--scrollbar-thumb': '#4f8a5c',
    '--scrollbar-thumb-hover': '#86efac',
    '--version-unv': '#93c5fd',
    '--version-niv': '#7dd3fc',
    '--version-esv': '#fca5a5',
    '--version-web': '#86efac',
    '--version-ncv': '#d8b4fe',
    '--version-lzz': '#fcd34d',
    '--version-asv': '#bae6fd',
    '--version-kjv': '#fdba74',
  },
};

const THEME_META_COLORS = {
  light: '#e8f5e9',
  eye: '#101913',
  night: '#050807',
  dark: '#101913',
};

THEME_VARS.eye = THEME_VARS.dark;
THEME_VARS.night = {
  ...THEME_VARS.dark,
  '--app-bg': 'linear-gradient(135deg, #050807 0%, #08100b 52%, #030504 100%)',
  '--page-text': '#d5e7d2',
  '--heading-text': '#c7f9cc',
  '--surface-bg': 'linear-gradient(145deg, #0b120d, #050806)',
  '--surface-solid': '#060a07',
  '--panel-bg': '#0b120dee',
  '--input-bg': '#050806',
  '--pill-inactive-bg': '#050806',
  '--table-header-bg': 'linear-gradient(145deg, #0f1a12, #070d09)',
  '--action-bar-bg': 'linear-gradient(to right, #0b120d, #050806)',
  '--stats-bar-bg': 'linear-gradient(135deg, #17180b, #08100b)',
  '--topbar-bg': 'linear-gradient(135deg, #050806 0%, #0b120d 55%, #030504 100%)',
  '--mobile-checkbox-bg': 'linear-gradient(to right, #0b120d, #050806)',
  '--mobile-verse-bg': '#030504',
  '--border-soft': '#1f3626',
  '--border-muted': '#19241c',
  '--row-border': '#132017',
  '--card-shadow': '0 12px 30px rgba(0,0,0,0.38), 0 2px 10px rgba(0,0,0,0.26)',
  '--result-shadow': '0 10px 26px rgba(0,0,0,0.34)',
  '--topbar-shadow': '0 2px 16px rgba(0,0,0,0.42)',
};

const THEME_OPTIONS = [
  { id: 'light', label: '淺色' },
  { id: 'eye', label: '護眼' },
  { id: 'night', label: '夜讀' },
  { id: 'system', label: '跟隨系統' },
];

function normalizeThemePreference(value) {
  if (value === 'dark') return 'night';
  return THEME_OPTIONS.some((option) => option.id === value) ? value : 'light';
}

function resolveTheme(preference, systemDark) {
  const normalized = normalizeThemePreference(preference);
  if (normalized === 'system') return systemDark ? 'night' : 'light';
  return normalized;
}

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Cannot save ${key}`, error);
    }
  }, [key, value]);
  return [value, setValue];
}

function stripTags(text) {
  return String(text || '').replace(/<[^>]+>/g, '');
}

function getBookName(localAbbrev, longName = false) {
  const entry = bookMap.find((b) => b.localAbbrev === localAbbrev);
  return entry ? entry.names[longName ? 1 : 0] : localAbbrev;
}

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function ymdKey(date) {
  return `${ymKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

const FOOTPRINT_DWELL_MS = 15000;
const FOOTPRINT_DEDUPE_MS = 30 * 60 * 1000;
const FOOTPRINT_RECENT_TTL_MS = 60 * 60 * 1000;

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatVersesForShare(selectedVerses, format = 'plain') {
  if (!selectedVerses || selectedVerses.length === 0) return '';
  if (format === 'inline') {
    return selectedVerses.map((v) => `${v.ref} ${v.text}`).join('\n');
  }
  if (format === 'markdown') {
    return selectedVerses.map((v) => `> ${v.text}\n> — **${v.ref}**`).join('\n\n');
  }
  if (format === 'html') {
    return selectedVerses.map((v) => `<blockquote><p>${v.text}</p><cite>${v.ref}</cite></blockquote>`).join('\n');
  }
  return selectedVerses.map((v) => `${v.ref}\n${v.text}`).join('\n\n');
}

const COPY_FORMAT_OPTIONS = [
  { id: 'plain', label: '純文字' },
  { id: 'inline', label: '單行含引用' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'html', label: 'HTML' },
];

const SEARCH_CHIPS = [
  { label: 'love OR grace', query: 'love grace', options: { operator: 'or' } },
  { label: '只查新約', query: '恩典', options: { scope: 'nt' } },
];

function showToast(message) {
  document.dispatchEvent(new CustomEvent('app-toast', { detail: message }));
}

function Toast() {
  const [msg, setMsg] = useState(null);
  const timerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      setMsg(String(e.detail || ''));
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setMsg(null), 2200);
    };
    document.addEventListener('app-toast', handler);
    return () => {
      document.removeEventListener('app-toast', handler);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: 'var(--surface-solid)', color: 'var(--page-text)', border: '1px solid var(--border-strong)', borderRadius: 999, padding: '10px 22px', fontSize: 14, fontWeight: 700, boxShadow: 'var(--card-shadow)', maxWidth: '90vw', textAlign: 'center' }}>
      {msg}
    </div>
  );
}

function shareToLine(text) {
  window.open(`https://social-plugins.line.me/lineit/share?url=&text=${encodeURIComponent(text)}`, '_blank');
}

function shareToEmail(text) {
  window.location.href = `mailto:?subject=${encodeURIComponent('聖經經文分享')}&body=${encodeURIComponent(text)}`;
}

// ====== 朗讀/存語音:hfpc-tts Worker 神經人聲(Workers AI MeloTTS) ======
const SPEAK_RATE_KEY = 'sevenbible-speak-rate';

function getSpeakRateMul() {
  let r = 0.82;
  try {
    const s = parseFloat(localStorage.getItem(SPEAK_RATE_KEY));
    if (Number.isFinite(s)) r = s;
  } catch { /* localStorage 不可用時用預設 */ }
  return Math.max(0.5, Math.min(1.3, r));
}

// ====== 朗讀譯本(2026-07-25 使用者點名:朗讀要能選版本、預設 NIV)======
// 只影響「朗讀 / 存語音」讀哪一個譯本;畫面顯示的譯本清單完全不動。
const SPEAK_VER_KEY = 'sevenbible-speak-version';

function getSpeakVer() {
  try { return localStorage.getItem(SPEAK_VER_KEY) || 'niv'; } catch { return 'niv'; }
}
// 0809 審查 A3:朗讀速度/譯本兩鍵接進備份鏈(匯出/匯入)用的 raw 存取
function getSpeakRateRaw() { try { return localStorage.getItem(SPEAK_RATE_KEY); } catch { return null; } }
function setSpeakRateRaw(v) { try { localStorage.setItem(SPEAK_RATE_KEY, v); } catch { /* noop */ } }
function setSpeakVerRaw(v) { try { localStorage.setItem(SPEAK_VER_KEY, v); } catch { /* noop */ } }

// ====== 備份提醒(0809 B3輕,拍板走輕量版) ======
// 足跡/歷史只存本機,換手機=歸零;有像樣的資料且 30 天沒匯出就溫和提醒。
// 兩鍵都是「這台裝置」的狀態,刻意不進備份(table-ux-kit 鐵則①)。
const LAST_EXPORT_KEY = 'sevenbible-last-export';
const BACKUP_SNOOZE_KEY = 'sevenbible-backup-snooze';
function backupNudgeInfo(readingLog, history) {
  let last = 0, snooze = 0;
  try { last = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10) || 0; } catch { /* noop */ }
  try { snooze = parseInt(localStorage.getItem(BACKUP_SNOOZE_KEY) || '0', 10) || 0; } catch { /* noop */ }
  const dayCount = Object.keys(readingLog?.d || {}).length;
  if (dayCount < 7 && (!history || history.length < 10)) return null; // 資料還少,不吵
  const now = Date.now();
  if (snooze && now - snooze < 7 * 864e5) return null;
  if (last && now - last < 30 * 864e5) return null;
  return { days: last ? Math.floor((now - last) / 864e5) : null };
}
// 從「這次畫面上真的有的譯本結果」挑要朗讀的那一份;選的譯本不在畫面上就退回第一個。
function pickSpeakResult(list) {
  if (!Array.isArray(list) || !list.length) return null;
  return list.find((r) => r.version === getSpeakVer()) || list[0];
}

let _currentAudio = null;
let _speakStopped = false;

// 依句號斷句、打包成 ≤max 字的小塊(即時朗讀用:先播第一塊縮短等待)
function chunkForTTS(text, max) {
  const parts = String(text).split(/(?<=[。！？；!?;])\s*/).filter((p) => p.trim());
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur); cur = p; } else { cur += p; }
    while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
  }
  if (cur.trim()) out.push(cur);
  // 純標點/空白塊會讓 TTS 回 44 byte 空 WAV,直接略過
  return out.filter((c) => /[A-Za-z0-9一-鿿]/.test(c));
}

async function speakText(text) {
  const clean = stripTags(text).replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const isLatin = getTextKind(clean) === 'latin';
  const lang = isLatin ? 'en' : 'zh';
  stopSpeech();
  _speakStopped = false;
  const rate = Math.max(0.5, Math.min(1.3, getSpeakRateMul() * (isLatin ? 0.9 : 1)));
  // 破音字同音替換(共用 core tts-fix.js):只影響唸的字串,畫面經文不動
  const speakSrc = isLatin ? clean : toSpeakable(clean);
  const chunks = chunkForTTS(speakSrc, 110);
  let played = false;
  showToast('讀取語音中…');
  for (let i = 0; i < chunks.length; i++) {
    if (_speakStopped) return;
    try {
      const r = await fetch('https://hfpc-tts.summer09201017.workers.dev/tts?lang=' + lang + '&text=' + encodeURIComponent(chunks[i]));
      if (!r.ok) throw new Error('tts ' + r.status);
      if (_speakStopped) return;
      const audio = new Audio(URL.createObjectURL(await r.blob()));
      try { audio.preservesPitch = true; audio.mozPreservesPitch = true; audio.webkitPreservesPitch = true; } catch { /* 舊瀏覽器沒這屬性 */ }
      audio.playbackRate = rate;
      _currentAudio = audio;
      played = true;
      await new Promise((resolve) => {
        audio.onended = () => { try { URL.revokeObjectURL(audio.src); } catch { /* noop */ } resolve(); };
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {
      if (played) return;
      break;
    }
  }
  if (played || _speakStopped) return;
  // 人聲服務不可用 → 退回 Web Speech
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    showToast('這個瀏覽器目前不支援朗讀功能');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean.slice(0, 4000));
  utterance.lang = isLatin ? 'en-US' : 'zh-TW';
  utterance.rate = Math.max(0.4, (isLatin ? 0.92 : 0.86) * getSpeakRateMul() * (isLatin ? 0.72 : 1));
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  _speakStopped = true;
  window.speechSynthesis?.cancel();
  if (_currentAudio) {
    try { _currentAudio.pause(); } catch { /* noop */ }
    _currentAudio = null;
  }
}

// ====== 存語音檔調速:WSOLA 變速不變調 ======
// MeloTTS 的 speed 參數被 CF 忽略,所以在瀏覽器端把 WAV 做時間拉伸(音高不變)再存檔。零相依、離線可用。
function _wsola(input, sr, rate) {
  // rate<1=放慢(輸出變長)。frame 50ms、50% Hann overlap-add、±10ms 相關搜尋(步距3取樣加速)。
  const frame = Math.round(sr * 0.05) & ~1;
  const half = frame >> 1;                 // hopOut
  const hopIn = Math.max(1, Math.round(half * rate));
  const seek = Math.round(sr * 0.01);
  const win = new Float32Array(frame);
  for (let i = 0; i < frame; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame - 1)));
  const outLen = Math.ceil(input.length / rate) + frame * 2;
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  let inPos = 0, outPos = 0, prevStart = 0;
  while (inPos + frame + seek < input.length && outPos + frame < outLen) {
    let best = 0;
    if (outPos > 0) {                      // 找和「自然接續」最相關的偏移
      const refStart = prevStart + half;   // 上一段的自然下一步
      let bestScore = -Infinity;
      const lo = Math.max(0, inPos - seek), hi = Math.min(input.length - frame, inPos + seek);
      for (let cand = lo; cand <= hi; cand += 3) {
        let s = 0;
        for (let i = 0; i < half; i += 3) s += input[refStart + i] * input[cand + i];
        if (s > bestScore) { bestScore = s; best = cand - inPos; }
      }
    }
    const start = inPos + best;
    for (let i = 0; i < frame; i++) { out[outPos + i] += input[start + i] * win[i]; norm[outPos + i] += win[i]; }
    prevStart = start;
    outPos += half;
    inPos += hopIn;
  }
  for (let i = 0; i < outPos + half; i++) if (norm[i] > 1e-4) out[i] /= norm[i];
  return out.subarray(0, outPos + half);
}

function _encodeWav(samples, sr) {         // 16-bit PCM 單聲道 WAV
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const wstr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wstr(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); wstr(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  wstr(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0, o = 44; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// 把選取經文存成語音檔分享(Web Speech 無法錄檔 → hfpc-tts Worker / Workers AI MeloTTS,回 WAV)
// 2026-07-22:回歸「整段單發 fetch」(對齊 8bible)——切塊逐發會產生純標點空 WAV + 中文模型硬念英文塊=「come come」。
async function shareVerseAudio(text) {
  const clean = stripTags(text).replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 900);
  if (!clean) return;
  const lang = getTextKind(clean) === 'latin' ? 'en' : 'zh';
  // 破音字同音替換(共用 core tts-fix.js):只影響唸的字串,檔名/畫面不動
  const speakSrc = lang === 'zh' ? toSpeakable(clean) : clean;
  showToast('產生語音中…約幾秒');
  try {
    const r = await fetch('https://hfpc-tts.summer09201017.workers.dev/tts?lang=' + lang + '&text=' + encodeURIComponent(speakSrc));
    if (!r.ok) throw new Error('tts ' + r.status);
    let blob = await r.blob();
    // 依朗讀速度 WSOLA 變速不變調(整段一次,不再切塊串接);調速失敗就存原速檔,不擋下載
    const rate = Math.max(0.5, Math.min(1.2, getSpeakRateMul() * (lang === 'en' ? 0.72 : 1)));
    if (Math.abs(rate - 1) >= 0.03) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        try {
          const dec = await ctx.decodeAudioData(await blob.arrayBuffer());
          const mono = _wsola(dec.getChannelData(0).slice(0), dec.sampleRate, rate);
          blob = _encodeWav(mono, dec.sampleRate);
        } catch { /* 調速失敗 → 原速檔 */ }
        finally { try { ctx.close(); } catch { /* noop */ } }
      }
    }
    const file = new File([blob], '經文語音.wav', { type: 'audio/wav' });
    // 手機才試「分享」(直接傳 LINE/訊息);桌機一律直接下載(桌機分享面板常失敗且會亂改副檔名)
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    let shared = false;
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '經文語音' }); shared = true; } catch { shared = false; }
    }
    if (!shared) {
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = u; a.download = '經文語音.wav'; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 5000);
    }
  } catch { showToast('產生語音失敗，請稍後再試'); }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  String(text).split('\n').forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push('');
      return;
    }
    const units = getTextKind(paragraph) === 'cjk' ? Array.from(paragraph) : paragraph.split(/(\s+)/);
    let line = '';
    units.forEach((unit) => {
      const next = line + unit;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line.trimEnd());
        line = unit.trimStart();
      } else {
        line = next;
      }
    });
    if (line) lines.push(line.trimEnd());
  });
  return lines;
}

function downloadVerseCardFromText(text, title = '經文卡片') {
  const clean = stripTags(text).replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const width = 1080;
  const padding = 82;
  const maxTextWidth = width - padding * 2;
  canvas.width = width;
  ctx.font = '36px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  const wrapped = wrapCanvasText(ctx, clean.slice(0, 1800), maxTextWidth).slice(0, 26);
  if (wrapped.length === 26 && clean.length > 1800) wrapped[25] = `${wrapped[25]}...`;
  const height = Math.max(720, Math.min(1920, 220 + wrapped.length * 54 + 140));
  canvas.height = height;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#f4fbf0');
  bg.addColorStop(0.55, '#e8f5e9');
  bg.addColorStop(1, '#fff7d6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1b5e20';
  ctx.font = '700 42px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText(title, padding, 92);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(padding, 122, 150, 6);
  ctx.fillStyle = '#1f2937';
  ctx.font = '36px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  let y = 190;
  wrapped.forEach((line) => {
    if (!line) {
      y += 28;
      return;
    }
    ctx.fillText(line, padding, y);
    y += 54;
  });
  ctx.fillStyle = '#4b5563';
  ctx.font = '26px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('多譯本聖經查詢', padding, height - 76);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bible-card-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function getTextKind(text) {
  const cjk = (String(text).match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (String(text).match(/[A-Za-z]/g) || []).length;
  return cjk >= latin ? 'cjk' : 'latin';
}

function buildDiffContext(current, compareText) {
  if (!compareText || !current || stripTags(compareText) === current) return null;
  const currentKind = getTextKind(current);
  const compare = stripTags(compareText);
  if (currentKind !== getTextKind(compare)) return null;

  const tokens = currentKind === 'cjk'
    ? Array.from(compare).filter((ch) => /[\u4e00-\u9fff]/.test(ch))
    : (compare.toLowerCase().match(/[A-Za-z']{3,}/g) || []);

  return { kind: currentKind, set: new Set(tokens) };
}

function isDiffToken(token, diffContext) {
  if (!diffContext) return false;
  if (diffContext.kind === 'cjk') return /[\u4e00-\u9fff]/.test(token) && !diffContext.set.has(token);
  return /^[A-Za-z']{3,}$/.test(token) && !diffContext.set.has(token.toLowerCase());
}

const KEYWORD_PALETTE = [
  { bg: '#fef08a', fg: '#854d0e' },
  { bg: '#bae6fd', fg: '#075985' },
  { bg: '#fbcfe8', fg: '#9d174d' },
  { bg: '#bbf7d0', fg: '#166534' },
  { bg: '#fed7aa', fg: '#9a3412' },
  { bg: '#ddd6fe', fg: '#5b21b6' },
];

/* ===== 和修本(線上譯本)專用小元件 =====
 * 段落標題:rcuv 節文內嵌 <h2>…</h2>,已在 rcuv-core 外提。這裡貼在「和修本那一欄」的頂端,
 * 刻意不像 8biblesearch 那樣提到所有譯本之上 —— 7bible 是多欄並列,提到最上面會讓人以為
 * 那是和合本的標題(標題是和修本譯本自己的編輯產物)。
 * 註腳:掛在該欄末尾的「譯註」鈕,點開列出本節所有註。位置標記(notes[].pos)在 7bible 不逐字插入,
 * 因為 VerseText 為了字級對比會把中文逐字切開,插標記會打壞 diff/高亮;改成整節收在一個鈕裡。 */
function RcuvHeading({ heading }) {
  if (!heading) return null;
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#7b1fa2', margin: '2px 0 6px', letterSpacing: '0.02em' }}>
      {heading}
    </div>
  );
}

function RcuvNotes({ notes }) {
  const [open, setOpen] = useState(false);
  if (!notes || notes.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="和修本譯註(或譯/另有抄本),點開看"
        style={{
          display: 'inline-block', marginLeft: 6, padding: '1px 6px', minHeight: 22,
          fontSize: 11, fontWeight: 700, color: '#7b1fa2', background: open ? '#f3e5f5' : 'transparent',
          border: '1px solid #7b1fa2', borderRadius: 10, cursor: 'pointer', verticalAlign: 'middle',
        }}
      >
        譯註 {notes.length}
      </button>
      {open && (
        <div style={{
          margin: '6px 0 2px', padding: '8px 10px', borderLeft: '3px solid #7b1fa2',
          background: 'rgba(123,31,162,0.07)', borderRadius: '0 4px 4px 0',
          fontSize: 13, lineHeight: 1.7, color: 'var(--page-text)',
        }}>
          {notes.map((n, i) => (
            <div key={i} style={{ margin: '2px 0' }}>
              <span style={{ fontWeight: 700, color: '#7b1fa2', marginRight: 4 }}>[{i + 1}]</span>
              {n.body}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** 線上譯本取失敗時的明示。不可讓它退化成 '--' —— 那看起來像「這節沒有經文」,是騙人的。 */
function RcuvError({ message }) {
  return (
    <span style={{ fontSize: 13, color: '#b71c1c' }}>
      和修本沒取到（{message}）。和修本是線上譯本，需要連線；其餘譯本為離線資料，不受影響。
    </span>
  );
}

function VerseText({ text, keyword, compareText, exactPhrase }) {
  const cleanText = stripTags(text);
  const diffContext = useMemo(() => buildDiffContext(cleanText, compareText), [cleanText, compareText]);

  const terms = useMemo(() => {
    if (!keyword) return [];
    if (exactPhrase) return [keyword];
    return keyword.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  }, [keyword, exactPhrase]);

  const combinedRegex = useMemo(() => {
    if (terms.length === 0) return null;
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(${escaped.join('|')})`, 'gi');
  }, [terms]);

  const termIndex = useCallback((piece) => {
    const lower = piece.toLowerCase();
    return terms.findIndex((t) => t.toLowerCase() === lower);
  }, [terms]);

  const renderPlainPart = (part, keyPrefix) => {
    const pieces = diffContext?.kind === 'cjk' ? Array.from(part) : part.split(/([A-Za-z']+)/g);
    return pieces.map((piece, index) => {
      if (!piece) return null;
      if (!isDiffToken(piece, diffContext)) return <span key={`${keyPrefix}-${index}`}>{piece}</span>;
      return (
        <span key={`${keyPrefix}-${index}`} style={{ background: '#e0f2fe', borderBottom: '2px solid #0284c7', borderRadius: 3, padding: '0 1px' }}>
          {piece}
        </span>
      );
    });
  };

  if (!combinedRegex) return <span>{renderPlainPart(cleanText, 'plain')}</span>;

  return (
    <span>
      {cleanText.split(combinedRegex).map((part, index) => {
        if (!part) return null;
        const ti = termIndex(part);
        if (ti >= 0) {
          const color = KEYWORD_PALETTE[ti % KEYWORD_PALETTE.length];
          return <mark key={`kw-${index}`} style={{ background: color.bg, color: color.fg, borderRadius: 3, padding: '0 2px' }}>{part}</mark>;
        }
        return <span key={`part-${index}`}>{renderPlainPart(part, `part-${index}`)}</span>;
      })}
    </span>
  );
}

function getFhlCommentaryUrl(abbrev, chap, sec) {
  const fhlEngs = FHL_ENGS_BY_LOCAL[abbrev];
  if (!fhlEngs) return null;
  const params = new URLSearchParams({
    book: '3',
    engs: fhlEngs,
    chap: String(chap),
    sec: String(sec),
  });
  return `https://bible.fhl.net/new/com.php?${params.toString()}`;
}

function CopyVerseButton({ getText, countLabel }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const text = getText();
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      title={countLabel || '複製'}
      style={{
        marginLeft: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        border: copied ? '1px solid #2e7d32' : '1px solid #93c5fd',
        background: copied ? '#dcfce7' : '#eff6ff',
        color: copied ? '#166534' : '#1d4ed8',
        borderRadius: 5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '已複製' : countLabel || '複製'}
    </button>
  );
}

function SpeakButton({ getText, label = '朗讀' }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        speakText(getText());
      }}
      title={label}
      style={{
        marginLeft: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        border: '1px solid var(--border-strong)',
        background: 'var(--input-bg)',
        color: 'var(--heading-text)',
        borderRadius: 5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function formatXrefEntry(entry) {
  const [bi, chap, sec, end] = entry;
  const book = bookMap[bi];
  if (!book) return null;
  const label = `${book.names[0]} ${chap}:${sec}${end ? `-${end}` : ''}`;
  return { label, query: label };
}

function XrefButton({ open, onToggle }) {
  return (
    <button
      type="button"
      className="adv-tool"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      title="展開串珠（相關經文）"
      style={{
        marginLeft: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        border: '1px solid var(--border-strong)',
        background: open ? 'linear-gradient(145deg, #43a047, #2e7d32)' : 'var(--input-bg)',
        color: open ? 'white' : 'var(--heading-text)',
        borderRadius: 5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      串珠
    </button>
  );
}

function XrefPanel({ abbrev, chap, sec, onNavigate }) {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    let active = true;
    setRefs(null);
    loadXref(abbrev)
      .then((data) => {
        if (active) setRefs((data[`${chap}:${sec}`] || []).map(formatXrefEntry).filter(Boolean));
      })
      .catch(() => {
        if (active) setRefs([]);
      });
    return () => { active = false; };
  }, [abbrev, chap, sec]);

  return (
    <div style={{ padding: '8px 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', borderTop: '1px dashed var(--border-soft)' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--subtle-text)', marginRight: 2 }}>串珠</span>
      {refs === null && <span style={{ fontSize: 12, color: 'var(--muted-text)' }}>載入中...</span>}
      {refs !== null && refs.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted-text)' }}>此節暫無串珠資料</span>}
      {refs !== null && refs.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            onNavigate(item.query);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ ...S.smallBtn, borderRadius: 999, padding: '4px 10px' }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// 0809 讀5:上下文預覽——關鍵字結果不跳頁,原地展開前後各 2 節(與 8bible 同一互動模式)
function CtxButton({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      title="不跳頁,在這裡展開這節的前後幾節"
      style={{ marginLeft: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, borderRadius: 5, border: '1px solid var(--border-strong)', background: open ? 'var(--panel-bg)' : 'var(--input-bg)', color: 'var(--heading-text)', cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      {open ? '⊖ 收合' : '⊕ 前後文'}
    </button>
  );
}

function CtxPanel({ abbrev, chap, sec, version, onOpenChapter }) {
  const [recs, setRecs] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchLocalVersion(version || 'unv', abbrev, String(chap), '')
      .then((res) => { if (alive) setRecs(Array.isArray(res?.record) ? res.record : []); })
      .catch(() => { if (alive) setRecs([]); });
    return () => { alive = false; };
  }, [abbrev, chap, version]);
  const secN = Number(sec);
  const ctx = (recs || []).filter((r) => Math.abs(Number(r.sec) - secN) <= 2);
  const vi = VERSIONS.find((v) => v.id === (version || 'unv'));
  return (
    <div style={{ margin: '0 16px 12px', padding: '10px 12px', border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--panel-bg)' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--subtle-text)', marginBottom: 6 }}>
        📖 {getBookName(abbrev)} {chap} 章・前後文（{vi?.label || version || 'unv'}）
      </div>
      {recs === null && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>載入中…</div>}
      {recs !== null && ctx.length === 0 && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>讀不到前後文，點下面開整章。</div>}
      {ctx.map((r) => {
        const hit = Number(r.sec) === secN;
        return (
          <div key={r.sec} style={{ display: 'flex', gap: 8, padding: '4px 2px', lineHeight: 1.75, fontSize: 15, color: hit ? 'var(--page-text)' : 'var(--muted-text)', background: hit ? 'var(--keyword-selected-row-bg)' : 'transparent', borderRadius: 6, fontWeight: hit ? 700 : 400 }}>
            <span style={{ flex: '0 0 auto', minWidth: '1.6em', textAlign: 'right', color: 'var(--link-text)', fontWeight: 700 }}>{r.sec}</span>
            <span>{r.bible_text}</span>
          </div>
        );
      })}
      <button type="button" onClick={onOpenChapter} style={{ ...S.smallBtn, marginTop: 6 }}>開啟整章 →</button>
    </div>
  );
}

// 0809 讀6:Strong's 原文編號——點詞看原文字義(FHL 信望愛,行內面板,互動同串珠/前後文)
function StrongsButton({ open, onToggle }) {
  return (
    <button
      type="button"
      className="adv-tool"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      title="逐字原文編號與字義(資料來源:信望愛 FHL,需網路)"
      style={{ marginLeft: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: '1px solid var(--border-strong)', background: open ? 'linear-gradient(145deg, #7c3aed, #5b21b6)' : 'var(--input-bg)', color: open ? 'white' : 'var(--heading-text)', borderRadius: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      原文
    </button>
  );
}

// 字典內文的 #賽 59:9| 式引用轉成可點的站內查詢
function StrongsDictText({ text, onNavigate }) {
  const parts = String(text).split(/(#[^#|]{1,15}\|)/g);
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        const m = part.match(/^#([^#|]{1,15})\|$/);
        if (!m) return <span key={i}>{part}</span>;
        const ref = m[1].trim();
        return (
          <button
            key={i}
            type="button"
            onClick={() => { onNavigate(ref); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ border: 'none', background: 'none', color: 'var(--link-text)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit' }}
          >
            {ref}
          </button>
        );
      })}
    </span>
  );
}

function StrongsPanel({ abbrev, chap, sec, onNavigate }) {
  const [segs, setSegs] = useState(null);
  const [active, setActive] = useState(-1);
  const [dict, setDict] = useState(null);
  const pickSeqRef = useRef(0);

  useEffect(() => {
    let alive = true;
    setSegs(null);
    setActive(-1);
    setDict(null);
    fetchStrongsVerse(getBookName(abbrev), chap, sec)
      .then((s) => { if (alive) setSegs(s); })
      .catch(() => { if (alive) setSegs({ error: true }); });
    return () => { alive = false; };
  }, [abbrev, chap, sec]);

  const pickWord = async (idx, seg) => {
    if (idx === active) { setActive(-1); setDict(null); return; }
    const seq = ++pickSeqRef.current;
    setActive(idx);
    setDict('loading');
    const entries = await Promise.all(seg.nums.map(async (num) => {
      const key = `${num.lang}${num.n}`;
      const label = `${num.lang === 'G' ? '希臘文' : '希伯來文'} ${key}${num.parsing ? '(文法)' : ''}`;
      try {
        return { key, label, text: await lookupStrongs(num.lang, num.n) };
      } catch {
        return { key, label, error: true };
      }
    }));
    if (seq !== pickSeqRef.current) return;
    setDict({ word: seg.t || '(未譯出的原文字)', entries });
  };

  return (
    <div style={{ margin: '0 16px 12px', padding: '10px 12px', border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--panel-bg)' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--subtle-text)', marginBottom: 6 }}>
        🔤 {getBookName(abbrev)} {chap}:{sec} 原文編號（和合本・資料來源：信望愛 FHL）
      </div>
      {segs === null && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>載入原文中…</div>}
      {segs?.error && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>讀不到原文資料——查原文需要網路連線，請連線後再試。</div>}
      {Array.isArray(segs) && (
        <>
          <div style={{ lineHeight: 2.1, fontSize: 16 }}>
            {segs.map((seg, idx) => {
              if (!seg.nums.length) return <span key={idx} style={{ color: 'var(--muted-text)' }}>{seg.t}</span>;
              const on = idx === active;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pickWord(idx, seg)}
                  title={seg.nums.map((n) => n.lang + n.n).join(' ')}
                  style={{ border: 'none', margin: '0 1px', padding: '0 2px', borderRadius: 4, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit', background: on ? 'var(--keyword-selected-row-bg)' : 'transparent', color: seg.added ? 'var(--muted-text)' : 'var(--page-text)', borderBottom: '2px dotted var(--link-text)', fontWeight: on ? 700 : 400 }}
                >
                  {seg.t || '◦'}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 4 }}>點有底線的詞看原文字義；◦＝原文有、中文未譯出的字。</div>
        </>
      )}
      {dict === 'loading' && <div style={{ marginTop: 8, color: 'var(--muted-text)', fontSize: 14 }}>查字典中…</div>}
      {dict && dict !== 'loading' && dict.entries.map((en) => (
        <div key={en.key} style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--heading-text)', marginBottom: 4 }}>
            「{dict.word}」 {en.label}
          </div>
          {en.error
            ? <div style={{ fontSize: 13, color: 'var(--muted-text)' }}>查無字典條目（或網路中斷）。</div>
            : <div style={{ fontSize: 13, lineHeight: 1.7, maxHeight: 220, overflowY: 'auto', color: 'var(--page-text)' }}><StrongsDictText text={en.text} onNavigate={onNavigate} /></div>}
        </div>
      ))}
    </div>
  );
}

// 0810 v25:註釋改站內大字面板(與 8bible v80 同 sc.php 資料源;不再外跳信望愛)
function CommentButton({ open, onToggle }) {
  return (
    <button
      type="button"
      className="adv-tool"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      title="就地展開信望愛站註釋(大字、可換段;需網路)"
      style={{ color: open ? 'white' : 'var(--warning-text)', fontSize: 12, cursor: 'pointer', marginLeft: 8, padding: '2px 6px', border: '1px solid var(--warning-border)', borderRadius: 5, background: open ? 'linear-gradient(145deg, #d97706, #92400e)' : 'var(--warning-bg)', fontWeight: 700, display: 'inline-block' }}
    >
      註釋
    </button>
  );
}

// com_text 的一段:text 直出、#參照| 轉站內查詢、SNG/SNH 轉原文字義展開鈕
// defaultLang:裸 SN 編號(不帶 G/H,羅馬書實例)用書卷新舊約推語言
function ComBlockText({ text, abbrev, defaultLang, onNavigate, onPickSn, openSnKey }) {
  const tokens = useMemo(() => tokenizeComText(text, defaultLang), [text, defaultLang]);
  return (
    <>
      {tokens.map((tk, i) => {
        if (tk.t === 'text') return <span key={i}>{tk.v}</span>;
        if (tk.t === 'ref') {
          const q = /^\d/.test(tk.v) ? `${getBookName(abbrev)} ${tk.v}` : tk.v;
          return (
            <button key={i} type="button" onClick={() => { onNavigate(q); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{ border: 'none', background: 'none', color: 'var(--link-text)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit' }}>
              {tk.v}
            </button>
          );
        }
        const key = `${tk.lang}${tk.n}`;
        return (
          <button key={i} type="button" onClick={() => onPickSn(tk)}
            title="點了就地展開原文字義"
            style={{ border: 'none', background: 'none', color: 'var(--link-text)', textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit', fontWeight: openSnKey === key ? 700 : 400, whiteSpace: 'nowrap' }}>
            {tk.label}
          </button>
        );
      })}
    </>
  );
}

// 0810 v27:使用者拍板改「獨立彈窗」(與 8bible 同款),不佔經文版面;含「新分頁開啟」逃生口
function CommentaryModal({ abbrev, chap, sec, fontSize, onNavigate, onClose }) {
  const [cur, setCur] = useState({ engs: FHL_ENGS_BY_LOCAL[abbrev], chap: Number(chap), sec: Number(sec) });
  const [data, setData] = useState(null);
  const [openSn, setOpenSn] = useState(null); // { blockKey, lang, n, label, text|null, error }
  const seqRef = useRef(0);
  const defaultLang = bookMap.findIndex((b) => b.localAbbrev === abbrev) <= 38 ? 'H' : 'G';

  useEffect(() => { setCur({ engs: FHL_ENGS_BY_LOCAL[abbrev], chap: Number(chap), sec: Number(sec) }); }, [abbrev, chap, sec]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    if (!cur.engs) { setData({ error: true }); return undefined; }
    let alive = true;
    setData(null);
    setOpenSn(null);
    fetch(`https://bible.fhl.net/json/sc.php?book=3&engs=${encodeURIComponent(cur.engs)}&chap=${cur.chap}&sec=${cur.sec}&gb=0`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => {
        if (!alive) return;
        if (json?.status !== 'success') throw new Error('API 回應異常');
        setData(parseCommentary(json));
      })
      .catch(() => { if (alive) setData({ error: true }); });
    return () => { alive = false; };
  }, [cur]);

  const pickSn = async (blockKey, tk) => {
    const key = `${tk.lang}${tk.n}`;
    if (openSn && openSn.blockKey === blockKey && `${openSn.lang}${openSn.n}` === key && openSn.text !== undefined) {
      setOpenSn(null);
      return;
    }
    const seq = ++seqRef.current;
    setOpenSn({ blockKey, lang: tk.lang, n: tk.n, label: tk.label });
    try {
      const text = await lookupStrongs(tk.lang, tk.n);
      if (seq === seqRef.current) setOpenSn({ blockKey, lang: tk.lang, n: tk.n, label: tk.label, text });
    } catch {
      if (seq === seqRef.current) setOpenSn({ blockKey, lang: tk.lang, n: tk.n, label: tk.label, error: true });
    }
  };

  const fs = fontSize || 15;
  const go = (q) => { onClose(); onNavigate(q); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const navBtn = { ...S.smallBtn, borderRadius: 999, padding: '6px 14px' };
  const renderNav = (info, arrow) => {
    if (!info || !info.engs) return null;
    const isBg = Number(info.chap) === 0;
    const label = arrow === 'prev' ? `← ${isBg ? '背景資料' : '上一段'}` : `${isBg ? '背景資料' : '下一段'} →`;
    return <button type="button" style={navBtn} onClick={() => setCur({ engs: info.engs, chap: Number(info.chap), sec: Number(info.sec) })}>{label}</button>;
  };

  const snCard = (blockKey) => {
    if (!openSn || openSn.blockKey !== blockKey) return null;
    return (
      <div style={{ margin: '6px 0 10px', padding: '8px 10px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--heading-text)', marginBottom: 4 }}>
          {openSn.label}（{openSn.lang === 'G' ? '希臘文' : '希伯來文'}原文）
        </div>
        {openSn.text === undefined && !openSn.error && <div style={{ fontSize: 13, color: 'var(--muted-text)' }}>查字典中…</div>}
        {openSn.error && <div style={{ fontSize: 13, color: 'var(--muted-text)' }}>查無字典條目（或網路中斷）。</div>}
        {openSn.text !== undefined && !openSn.error && (
          <div style={{ fontSize: 13, lineHeight: 1.7, maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', color: 'var(--page-text)' }}>
            <ComBlockText text={openSn.text} abbrev={abbrev} defaultLang={openSn.lang} onNavigate={go} onPickSn={(tk) => pickSn(blockKey, tk)} openSnKey={`${openSn.lang}${openSn.n}`} />
          </div>
        )}
      </div>
    );
  };

  const externalUrl = `https://bible.fhl.net/new/com.php?book=3&engs=${encodeURIComponent(cur.engs || '')}&chap=${cur.chap}&sec=${cur.sec}&m=0`;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(900px, 100vw)', height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-solid)', border: '1px solid var(--border-strong)', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-soft)' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--heading-text)', marginRight: 'auto' }}>📖 信望愛站註釋</span>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.smallBtn, textDecoration: 'none', padding: '6px 12px' }}>新分頁開啟</a>
          <button type="button" onClick={onClose} style={{ ...S.smallBtn, padding: '6px 12px', background: 'linear-gradient(145deg, #d97706, #92400e)', color: 'white', border: 'none' }}>關閉</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '10px 14px' }}>
          {data === null && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>註釋載入中…（需要連線）</div>}
          {data?.error && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>讀不到註釋——請連線後再試，或點上方「新分頁開啟」。</div>}
          {data && !data.error && (
            <>
              {data.records.length === 0 && <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>這一段沒有註釋資料，可用下方「上一段 / 下一段」換段閱讀。</div>}
              {data.records.map((rec, ri) => (
                <div key={ri}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning-text)', margin: '6px 0 8px' }}>{rec.title}（{rec.bookName}）</div>
                  {rec.blocks.map((blk, bi) => {
                    const blockKey = `${ri}:${bi}`;
                    return (
                      <div key={bi}>
                        <div style={{ paddingLeft: `${Math.min(5, blk.indent * 0.35).toFixed(1)}em`, fontSize: fs, lineHeight: 1.85, color: 'var(--page-text)', marginBottom: 7 }}>
                          <ComBlockText text={blk.text} abbrev={abbrev} defaultLang={defaultLang} onNavigate={go} onPickSn={(tk) => pickSn(blockKey, tk)} openSnKey={openSn && openSn.blockKey === blockKey ? `${openSn.lang}${openSn.n}` : null} />
                        </div>
                        {snCard(blockKey)}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {renderNav(data.prev, 'prev')}
                {renderNav(data.next, 'next')}
              </div>
            </>
          )}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--muted-text)' }}>
            資料來源：信望愛聖經網站（CBOL 計畫），版權屬原站所有；字級跟隨上方滑桿。
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBar({ getSelectedText, getFallbackText, getSpeakText, speakVersions, selectedCount, large, isTop, copyFormat, setCopyFormat }) {
  const [copied, setCopied] = useState(false);
  const [speakVer, setSpeakVer] = useState(getSpeakVer);
  const getActionText = () => getSelectedText() || getFallbackText?.() || '';
  // 朗讀/存語音用「只取單一主譯本」的純文字(沒有就退回一般取字)
  const getSpeechText = () => (getSpeakText ? getSpeakText() : getActionText());
  const handleCopy = async () => {
    const text = getActionText();
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const disabled = selectedCount === 0 && !getFallbackText;
  const disabledStyle = disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {};
  const copySize = large ? { padding: '14px 20px', fontSize: 18, minWidth: 220, flexGrow: 1, justifyContent: 'center' } : { padding: '6px 14px', fontSize: 12 };
  const shareSize = large ? { padding: '10px 18px', fontSize: 15 } : { padding: '6px 14px', fontSize: 12 };

  return (
    <div style={{ ...S.actionBar, padding: '14px 16px', position: 'sticky', bottom: isTop ? 'auto' : 0, top: isTop ? 44 : 'auto', zIndex: 9, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: large ? 15 : 12, color: 'var(--soft-text)', marginRight: 4, whiteSpace: 'nowrap' }}>
        已選 <strong style={{ color: 'var(--subtle-text)' }}>{selectedCount}</strong> 節
      </span>
      <button type="button" onClick={handleCopy} disabled={disabled} className="btn-active-effect" style={{ ...(copied ? S.btnCopied : S.btnCopy), ...disabledStyle, ...copySize, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {copied ? '已複製' : selectedCount > 0 ? '複製經文' : '複製目前內容'}
      </button>
      {setCopyFormat && (
        <select
          value={copyFormat || 'plain'}
          onChange={(e) => setCopyFormat(e.target.value)}
          className="adv-tool"
          title="複製格式"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: 'var(--heading-text)', fontWeight: 700, cursor: 'pointer' }}
        >
          {COPY_FORMAT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      )}
      {large && speakVersions?.length > 1 && (
        <select
          value={speakVersions.includes(speakVer) ? speakVer : speakVersions[0]}
          onChange={(e) => { setSpeakVer(e.target.value); try { localStorage.setItem(SPEAK_VER_KEY, e.target.value); } catch { /* noop */ } }}
          title="朗讀哪一個譯本（只影響朗讀與存語音，畫面顯示不變）"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: 'var(--heading-text)', fontWeight: 700, cursor: 'pointer' }}
        >
          {speakVersions.map((id) => (
            <option key={id} value={id}>🔊 讀:{VERSIONS.find((v) => v.id === id)?.label || id}</option>
          ))}
        </select>
      )}
      {large && (
        <select
          defaultValue={(() => { try { return localStorage.getItem(SPEAK_RATE_KEY) || '0.82'; } catch { return '0.82'; } })()}
          onChange={(e) => { try { localStorage.setItem(SPEAK_RATE_KEY, e.target.value); } catch { /* noop */ } }}
          title="朗讀速度（英文會再自動放慢一些）"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: 'var(--heading-text)', fontWeight: 700, cursor: 'pointer' }}
        >
          <option value="0.62">🐢 很慢</option>
          <option value="0.82">慢</option>
          <option value="1">正常</option>
          <option value="1.2">🐇 稍快</option>
        </select>
      )}
      <button type="button" onClick={() => speakText(getSpeechText())} disabled={disabled} className="btn-active-effect" style={{ ...S.smallBtn, ...disabledStyle, padding: large ? '10px 18px' : '6px 12px', fontSize: large ? 15 : 12 }}>
        朗讀
      </button>
      <button type="button" onClick={stopSpeech} className="btn-active-effect" style={{ ...S.smallBtn, padding: large ? '10px 18px' : '6px 12px', fontSize: large ? 15 : 12 }}>
        停止
      </button>
      <button type="button" onClick={() => shareVerseAudio(getSpeechText())} disabled={disabled} className="btn-active-effect" title="把這段經文存成語音檔（可下載或分享給別人聽；只存單一主譯本）" style={{ ...S.smallBtn, ...disabledStyle, padding: large ? '10px 18px' : '6px 12px', fontSize: large ? 15 : 12 }}>
        存語音
      </button>
      <button type="button" onClick={() => downloadVerseCardFromText(getActionText())} disabled={disabled} className="btn-active-effect" style={{ ...S.smallBtn, ...disabledStyle, padding: large ? '10px 18px' : '6px 12px', fontSize: large ? 15 : 12 }}>
        匯出 PNG
      </button>
      <button type="button" onClick={() => shareToLine(getActionText())} disabled={disabled} className="btn-active-effect" style={{ ...S.btnLine, ...disabledStyle, ...shareSize }}>
        分享到 Line
      </button>
      <button type="button" onClick={() => shareToEmail(getActionText())} disabled={disabled} className="btn-active-effect" style={{ ...S.btnEmail, ...disabledStyle, ...shareSize }}>
        Email 分享
      </button>
    </div>
  );
}

const btnNav = {
  background: 'linear-gradient(145deg, #43a047, #2e7d32)',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  fontWeight: 700,
  cursor: 'pointer',
  padding: '6px 14px',
  fontSize: 13,
  boxShadow: '0 2px 5px rgba(46,125,50,0.2)',
  transition: 'all 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
const btnNavDisabled = { ...btnNav, opacity: 0.35, cursor: 'not-allowed', boxShadow: 'none' };

function ChapterNavBar({ data, bibleStructure, onNavigate }) {
  if (!data || !bibleStructure || !onNavigate) return null;
  const { abbrev, chap, sec } = data;
  const chapNum = parseInt(chap, 10);
  const bookData = bibleStructure.find((b) => b.abbrev === abbrev);
  if (!bookData) return null;
  const totalChaps = bookData.chapters.length;
  const bookName = getBookName(abbrev);
  const hasPrevChap = chapNum > 1;
  const hasNextChap = chapNum < totalChaps;
  const isSingleVerse = sec && !sec.includes('-');
  const secNum = isSingleVerse ? parseInt(sec, 10) : 0;
  const totalVerses = bookData.chapters[chapNum - 1]?.length || 0;
  const hasPrevVerse = isSingleVerse && secNum > 1;
  const hasNextVerse = isSingleVerse && secNum < totalVerses;
  const go = (q) => {
    onNavigate(q);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ background: 'var(--table-header-bg)', borderTop: '1px solid var(--border-strong)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '100%' }}>
        <button type="button" disabled={!hasPrevChap} onClick={() => go(`${bookName} ${chapNum - 1}`)} className="btn-active-effect" style={{ ...(hasPrevChap ? btnNav : btnNavDisabled), flexShrink: 0 }}>
          上一章
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--heading-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', flex: '1 1 auto', minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bookName} {chapNum} 章 {isSingleVerse ? `${secNum}節` : ''}
          {data.timeMs && <span style={{ color: 'var(--muted-text)', fontSize: 11, marginLeft: 6, fontWeight: 500 }}>({data.timeMs}ms)</span>}
        </span>
        <button type="button" disabled={!hasNextChap} onClick={() => go(`${bookName} ${chapNum + 1}`)} className="btn-active-effect" style={{ ...(hasNextChap ? btnNav : btnNavDisabled), flexShrink: 0 }}>
          下一章
        </button>
      </div>
      {isSingleVerse && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <button type="button" disabled={!hasPrevVerse} onClick={() => go(`${bookName} ${chapNum}:${secNum - 1}`)} style={{ ...(hasPrevVerse ? { ...btnNav, background: 'linear-gradient(145deg, #1e88e5, #0d47a1)' } : btnNavDisabled), flexShrink: 0 }}>
            上一節
          </button>
          <span style={{ fontSize: 13, color: 'var(--soft-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 auto', minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>第 {secNum} / {totalVerses} 節</span>
          <button type="button" disabled={!hasNextVerse} onClick={() => go(`${bookName} ${chapNum}:${secNum + 1}`)} style={{ ...(hasNextVerse ? { ...btnNav, background: 'linear-gradient(145deg, #1e88e5, #0d47a1)' } : btnNavDisabled), flexShrink: 0 }}>
            下一節
          </button>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: 600, padding: '0 4px' }} title={`${bookName} 共 ${totalChaps} 章`}>
        <div style={{ height: 4, background: 'var(--progress-track)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${Math.max(2, (chapNum / totalChaps) * 100)}%`, background: 'linear-gradient(90deg, #43a047, #1b5e20)', transition: 'width 0.2s' }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted-text)', textAlign: 'center', marginTop: 2 }}>
          {bookName} {chapNum} / {totalChaps} 章{isSingleVerse ? ` · 第 ${secNum} / ${totalVerses} 節` : ''}
        </div>
      </div>
    </div>
  );
}

function SearchBar({ onSearch, isLoading, versions, setVersions, bibleStructure, diffEnabled, setDiffEnabled, diffBase, setDiffBase, topBarH = 56, simpleMode, setSimpleMode }) {
  const [query, setQuery] = useState('');
  const [selBook, setSelBook] = useState('');
  const [selChap, setSelChap] = useState('');
  const [selVerse, setSelVerse] = useState('');
  const [selEndVerse, setSelEndVerse] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scope, setScope] = useState('all');
  const [startBookIndex, setStartBookIndex] = useState(0);
  const [endBookIndex, setEndBookIndex] = useState(65);
  const [operator, setOperator] = useState('and');
  const [exactPhrase, setExactPhrase] = useState(false);
  const [exclude, setExclude] = useState('');
  const [searchSelectedVersions, setSearchSelectedVersions] = useState(false);
  const [composing, setComposing] = useState(false);

  const searchOptions = useMemo(() => ({
    scope,
    startBookIndex: Number(startBookIndex),
    endBookIndex: Number(endBookIndex),
    operator,
    exactPhrase,
    exclude: exclude.trim(),
    searchSelectedVersions,
  }), [scope, startBookIndex, endBookIndex, operator, exactPhrase, exclude, searchSelectedVersions]);

  useEffect(() => {
    if (!selBook) return;
    const bName = getBookName(selBook);
    let nextQuery = bName;
    if (selChap) {
      nextQuery += ` ${selChap}`;
      if (selVerse) {
        nextQuery += `:${selVerse}`;
        if (selEndVerse) nextQuery += `-${selEndVerse}`;
      }
    }
    setQuery(nextQuery);
  }, [selBook, selChap, selVerse, selEndVerse]);

  useEffect(() => {
    if (composing) return undefined;
    const q = query.trim();
    if (q.length < 2) return undefined;
    const timeout = window.setTimeout(() => onSearch(q, versions, searchOptions), q.length === 2 ? 120 : 260);
    return () => window.clearTimeout(timeout);
  }, [query, versions, searchOptions, onSearch, composing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query, versions, searchOptions);
  };

  const handleVersionToggle = (versionId) => {
    if (versions.includes(versionId)) {
      if (versions.length > 1) setVersions(versions.filter((v) => v !== versionId));
      return;
    }
    setVersions([...versions, versionId]);
  };

  const moveVersion = (versionId, direction) => {
    const idx = versions.indexOf(versionId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= versions.length) return;
    const next = [...versions];
    [next[idx], next[target]] = [next[target], next[idx]];
    setVersions(next);
  };

  const applySearchChip = (chip) => {
    setQuery(chip.query);
    setSelBook('');
    setSelChap('');
    setSelVerse('');
    setSelEndVerse('');
    if (!chip.options) return;
    if (chip.options.operator) setOperator(chip.options.operator);
    if (chip.options.scope) setScope(chip.options.scope);
    if (typeof chip.options.exactPhrase === 'boolean') setExactPhrase(chip.options.exactPhrase);
    setShowAdvanced(true);
  };

  let chaptersCount = 0;
  let versesCount = 0;
  if (bibleStructure && selBook) {
    const bookData = bibleStructure.find((b) => b.abbrev === selBook);
    if (bookData) {
      chaptersCount = bookData.chapters.length;
      if (selChap && parseInt(selChap, 10) <= chaptersCount) versesCount = bookData.chapters[parseInt(selChap, 10) - 1].length;
    }
  }

  return (
    <div style={{ ...S.card, padding: `${topBarH + 16}px 24px 24px`, marginTop: -topBarH, marginBottom: 0, borderRadius: 0, position: 'relative', zIndex: 5 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading-text)', textAlign: 'center', marginBottom: 18, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        多譯本聖經查詢 <small style={{ fontSize: 13, color: 'var(--subtle-text)', marginLeft: 8, verticalAlign: 'middle', fontWeight: 500, opacity: 0.8 }}>v1.5</small>
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selBook) {
              setSelBook('');
              setSelChap('');
              setSelVerse('');
              setSelEndVerse('');
            }
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          placeholder="關鍵字或書卷章節，例如：愛心、創 1、John 3:16 (按 / 聚焦, 按 ? 快速鍵說明)"
          id="bible-search-input"
          style={{ ...S.input, width: '100%', padding: '14px 18px', fontSize: 16, outline: 'none' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--subtle-text)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-strong)'; }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'var(--muted-text)', fontSize: 12, lineHeight: 1.5 }}>
            章節可輸入 John 3:16 / Psalm 23；關鍵字可輸入多詞，進階搜尋可切 AND/OR、完整片語、排除詞與查詢範圍。
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SEARCH_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => applySearchChip(chip)}
                style={{ ...S.smallBtn, borderRadius: 999, padding: '5px 10px' }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <select value={selBook} onChange={(e) => { setSelBook(e.target.value); setSelChap(''); setSelVerse(''); setSelEndVerse(''); }} style={S.select}>
            <option value="">選擇書卷</option>
            {bibleStructure && BOOK_GROUPS.map((group) => {
              const opts = bookMap.slice(group.start, group.end + 1).map((bInfo) => {
                const struct = bibleStructure.find((b) => b.abbrev === bInfo.localAbbrev);
                if (!struct) return null;
                return <option key={bInfo.localAbbrev} value={bInfo.localAbbrev}>{bInfo.names[1]}</option>;
              }).filter(Boolean);
              if (opts.length === 0) return null;
              return <optgroup key={group.label} label={group.label}>{opts}</optgroup>;
            })}
          </select>

          <select value={selChap} onChange={(e) => { setSelChap(e.target.value); setSelVerse(''); setSelEndVerse(''); }} disabled={!selBook} style={{ ...S.select, opacity: selBook ? 1 : 0.5 }}>
            <option value="">章</option>
            {chaptersCount > 0 && Array.from({ length: chaptersCount }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} 章</option>)}
          </select>

          <select value={selVerse} onChange={(e) => { setSelVerse(e.target.value); setSelEndVerse(''); }} disabled={!selChap} style={{ ...S.select, opacity: selChap ? 1 : 0.5 }}>
            <option value="">節</option>
            {versesCount > 0 && Array.from({ length: versesCount }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} 節</option>)}
          </select>

          <select value={selEndVerse} onChange={(e) => setSelEndVerse(e.target.value)} disabled={!selVerse} style={{ ...S.select, opacity: selVerse ? 1 : 0.5 }}>
            <option value="">至哪節</option>
            {versesCount > 0 && selVerse && Array.from({ length: versesCount - parseInt(selVerse, 10) }, (_, i) => {
              const verseNum = parseInt(selVerse, 10) + i + 1;
              return <option key={verseNum} value={verseNum}>{verseNum} 節</option>;
            })}
          </select>
        </div>

        <button type="submit" disabled={isLoading} className="btn-active-effect" style={{ ...S.btnSearch, padding: '15px 0', fontSize: 19 }}>
          {isLoading ? '查詢中...' : '查詢'}
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, maxWidth: 480, margin: '0 auto 6px' }}>
        {[
          ...versions.map((vid) => VERSIONS.find((v) => v.id === vid)).filter(Boolean),
          ...VERSIONS.filter((v) => v.id !== 'web' && !versions.includes(v.id)),
        ].map((v) => {
          const isActive = versions.includes(v.id);
          const idx = isActive ? versions.indexOf(v.id) : -1;
          const isFirst = idx === 0;
          const isLast = idx === versions.length - 1;
          return (
            <span key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
              {isActive && !isFirst && (
                <button type="button" className="adv-tool" onClick={() => moveVersion(v.id, -1)} title="往左移" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 2px', fontSize: 10, color: 'var(--heading-text)', fontWeight: 800, flexShrink: 0 }}>◀</button>
              )}
              <label style={{ ...(isActive ? S.pillActive : S.pillInactive), padding: '4px 6px', fontSize: 12, flex: 1, minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <input type="checkbox" style={{ display: 'none' }} checked={isActive} onChange={() => handleVersionToggle(v.id)} />
                {v.label}
              </label>
              {isActive && !isLast && (
                <button type="button" className="adv-tool" onClick={() => moveVersion(v.id, 1)} title="往右移" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 2px', fontSize: 10, color: 'var(--heading-text)', fontWeight: 800, flexShrink: 0 }}>▶</button>
              )}
            </span>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted-text)', marginBottom: 12 }}>
        點選譯本切換顯示, 用 ◀▶ 調整顯示順序（勾了哪些會自動記住, 下次打開就是你的組合）
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: showAdvanced ? 12 : 0 }}>
        <button
          type="button"
          onClick={() => { setSimpleMode(!simpleMode); if (!simpleMode) setShowAdvanced(false); }}
          style={S.smallBtn}
          title="簡易模式:收起進階搜尋/差異高亮/串珠/複製格式等查經工具,畫面只留查詢與讀經"
        >
          {simpleMode ? '↩ 回完整模式' : '🧓 簡易模式'}
        </button>
        {!simpleMode && (
        <button type="button" onClick={() => setShowAdvanced((v) => !v)} style={S.smallBtn}>
          {showAdvanced ? '收合進階搜尋' : '進階搜尋'}
        </button>
        )}
        {typeof diffEnabled === 'boolean' && !simpleMode && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--page-text)', fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" checked={diffEnabled} onChange={(e) => setDiffEnabled(e.target.checked)} />
            差異高亮
          </label>
        )}
        {diffEnabled && !simpleMode && versions.length >= 2 && (() => {
          const selectedLangs = new Set(versions.map((vid) => VERSIONS.find((v) => v.id === vid)?.lang).filter(Boolean));
          const baseLang = diffBase ? VERSIONS.find((v) => v.id === diffBase)?.lang : null;
          const skippedCount = baseLang ? versions.filter((vid) => {
            if (vid === diffBase) return false;
            const l = VERSIONS.find((v) => v.id === vid)?.lang;
            return l && l !== baseLang;
          }).length : 0;
          const showMixedHint = !diffBase && selectedLangs.size > 1;
          const zhVersions = versions.filter((vid) => VERSIONS.find((v) => v.id === vid)?.lang === 'zh');
          const enVersions = versions.filter((vid) => VERSIONS.find((v) => v.id === vid)?.lang === 'en');
          const renderOption = (vid) => {
            const vi = VERSIONS.find((v) => v.id === vid);
            const tag = vi?.lang === 'zh' ? '中' : vi?.lang === 'en' ? '英' : '';
            return <option key={vid} value={vid}>{tag ? `[${tag}] ` : ''}{vi?.label || vid}</option>;
          };
          return (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--page-text)', fontWeight: 700, flexWrap: 'wrap' }}>
              比較基準
              <select value={diffBase || ''} onChange={(e) => setDiffBase(e.target.value)} style={{ ...S.select, padding: '4px 8px', fontSize: 12, minWidth: 140, flex: 'none' }}>
                <option value="">自動 (第一個有內容)</option>
                {zhVersions.length > 0 && (
                  <optgroup label="中文譯本">
                    {zhVersions.map(renderOption)}
                  </optgroup>
                )}
                {enVersions.length > 0 && (
                  <optgroup label="英文譯本">
                    {enVersions.map(renderOption)}
                  </optgroup>
                )}
              </select>
              {skippedCount > 0 && (
                <span title="跨語系譯本不會做 token 差異比較" style={{ fontSize: 11, color: 'var(--warning-text)', fontWeight: 600, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 5, padding: '1px 6px' }}>
                  ⚠ 跨語系 {skippedCount} 個略過
                </span>
              )}
              {showMixedHint && (
                <span title="自動模式下跨語系譯本互比無意義, 建議指定基準" style={{ fontSize: 11, color: 'var(--muted-text)', fontWeight: 500 }}>
                  · 中英混選, 建議指定基準
                </span>
              )}
            </label>
          );
        })()}
      </div>

      {showAdvanced && (
        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--subtle-text)', fontWeight: 700 }}>
            搜尋範圍
            <select value={scope} onChange={(e) => setScope(e.target.value)} style={{ ...S.select, width: '100%' }}>
              <option value="all">整本聖經</option>
              <option value="ot">舊約</option>
              <option value="nt">新約</option>
              <option value="range">自訂書卷範圍</option>
            </select>
          </label>
          {scope === 'range' && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--subtle-text)', fontWeight: 700 }}>
                起始書卷
                <select value={startBookIndex} onChange={(e) => setStartBookIndex(Number(e.target.value))} style={{ ...S.select, width: '100%' }}>
                  {bookMap.map((b, index) => <option key={b.localAbbrev} value={index}>{b.names[1]}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--subtle-text)', fontWeight: 700 }}>
                結束書卷
                <select value={endBookIndex} onChange={(e) => setEndBookIndex(Number(e.target.value))} style={{ ...S.select, width: '100%' }}>
                  {bookMap.map((b, index) => <option key={b.localAbbrev} value={index}>{b.names[1]}</option>)}
                </select>
              </label>
            </>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--subtle-text)', fontWeight: 700 }}>
            多字條件
            <select value={operator} onChange={(e) => setOperator(e.target.value)} style={{ ...S.select, width: '100%' }}>
              <option value="and">AND：全部都要包含</option>
              <option value="or">OR：任一字即可</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--subtle-text)', fontWeight: 700 }}>
            排除字詞
            <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="例如：仇敵, 戰爭" style={{ ...S.input, padding: '10px 12px' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--page-text)', fontWeight: 700 }}>
            <input type="checkbox" checked={exactPhrase} onChange={(e) => setExactPhrase(e.target.checked)} />
            精確片語
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--page-text)', fontWeight: 700 }}>
            <input type="checkbox" checked={searchSelectedVersions} onChange={(e) => setSearchSelectedVersions(e.target.checked)} />
            只搜尋已選譯本
          </label>
        </div>
      )}
      </div>
    </div>
  );
}

const btnFontSize = {
  background: 'var(--input-bg)',
  border: '2px solid var(--border-strong)',
  borderRadius: 9,
  color: 'var(--heading-text)',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '6px 12px',
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 40,
};

function FontSizeControl({ fontSize, setFontSize, fixed, topSlot }) {
  const content = (
    <>
      <span style={{ fontSize: 13, color: 'var(--soft-text)', fontWeight: 700 }}>字型大小</span>
      <button type="button" onClick={() => setFontSize((s) => Math.max(10, s - 1))} style={btnFontSize} title="縮小">A-</button>
      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--heading-text)', minWidth: 32, textAlign: 'center' }}>{fontSize}</span>
      <button type="button" onClick={() => setFontSize((s) => Math.min(40, s + 1))} style={btnFontSize} title="放大">A+</button>
      <button type="button" onClick={() => setFontSize(15)} style={{ ...btnFontSize, fontSize: 12, padding: '6px 10px' }} title="重置">重置</button>
    </>
  );

  if (fixed) {
    return (
      <div id="app-top-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'var(--topbar-bg)', padding: '8px 16px', borderBottom: '2px solid var(--border-strong)', boxShadow: 'var(--topbar-shadow)' }}>
        {topSlot}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>{content}</div>
      </div>
    );
  }

  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>{content}</div>;
}

function EmptyState({ text }) {
  return <div className="result-bleed" style={{ textAlign: 'center', color: 'var(--muted-text)', padding: '48px 0', ...S.resultCard }}>{text}</div>;
}

function getRecordForVerse(result, chap, sec, chineses) {
  return result.record?.find((r) => r.sec === sec && (!chap || r.chap === chap) && (!chineses || r.chineses === chineses));
}

function getBaseTextForVerse(results, chap, sec, chineses, baseVersion) {
  if (baseVersion) {
    const baseResult = results.find((r) => r.version === baseVersion);
    const baseRecord = baseResult ? getRecordForVerse(baseResult, chap, sec, chineses) : null;
    if (baseRecord?.bible_text && baseRecord.bible_text !== '--') return baseRecord.bible_text;
  }
  const record = results
    .map((result) => getRecordForVerse(result, chap, sec, chineses))
    .find((r) => r?.bible_text && r.bible_text !== '--');
  return record ? record.bible_text : '';
}

function VerseViewer({ data, bibleStructure, onNavigate, fontSize, setFontSize, diffEnabled, diffBase, copyFormat, setCopyFormat }) {
  const { results } = data;
  const [selected, setSelected] = useState(new Set());
  const verseNums = useMemo(() => {
    const set = new Set();
    results.forEach((res) => res.record?.forEach((r) => set.add(r.sec)));
    return Array.from(set).sort((a, b) => a - b);
  }, [results]);
  const cols = results.length;
  const bookName = getBookName(data.abbrev);
  const [openXrefs, setOpenXrefs] = useState(new Set());
  const [openStrongs, setOpenStrongs] = useState(new Set());
  const [commentFor, setCommentFor] = useState(null); // v27:註釋改彈窗,單一開啟

  useEffect(() => {
    setSelected(new Set());
    setOpenXrefs(new Set());
    setOpenStrongs(new Set());
    setCommentFor(null);
  }, [data]);

  const toggleXref = (key) => {
    setOpenXrefs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleStrongs = (key) => {
    setOpenStrongs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleVerse = (n) => {
    const next = new Set(selected);
    next.has(n) ? next.delete(n) : next.add(n);
    setSelected(next);
  };
  const toggleAll = () => setSelected(selected.size === verseNums.length ? new Set() : new Set(verseNums));

  const getSelectedText = useCallback(() => {
    const lines = [];
    Array.from(selected).sort((a, b) => a - b).forEach((vNum) => {
      results.forEach((res) => {
        const vi = VERSIONS.find((v) => v.id === res.version);
        const vd = res.record?.find((r) => r.sec === vNum);
        if (vd?.bible_text && vd.bible_text !== '--') {
          lines.push({ ref: `[${vi?.label}] ${bookName} ${data.chap}:${vNum}`, text: stripTags(vd.bible_text) });
        }
      });
    });
    return formatVersesForShare(lines, copyFormat);
  }, [selected, results, bookName, data.chap, copyFormat]);

  const getAllText = useCallback(() => {
    const lines = [];
    verseNums.forEach((vNum) => {
      results.forEach((res) => {
        const vi = VERSIONS.find((v) => v.id === res.version);
        const vd = res.record?.find((r) => r.sec === vNum);
        if (vd?.bible_text && vd.bible_text !== '--') {
          lines.push({ ref: `[${vi?.label}] ${bookName} ${data.chap}:${vNum}`, text: stripTags(vd.bible_text) });
        }
      });
    });
    return formatVersesForShare(lines, copyFormat);
  }, [verseNums, results, bookName, data.chap, copyFormat]);

  const getSingleVerseText = useCallback((vNum) => {
    const lines = [];
    results.forEach((res) => {
      const vi = VERSIONS.find((v) => v.id === res.version);
      const vd = res.record?.find((r) => r.sec === vNum);
      if (vd?.bible_text && vd.bible_text !== '--') {
        lines.push({ ref: `[${vi?.label}] ${bookName} ${data.chap}:${vNum}`, text: stripTags(vd.bible_text) });
      }
    });
    return formatVersesForShare(lines, copyFormat);
  }, [results, bookName, data.chap, copyFormat]);

  // 朗讀/存語音用:只取「朗讀譯本」的純經文(不帶出處與譯本標籤)
  const getFirstVersionVerseText = useCallback((vNum) => {
    const vd = pickSpeakResult(results)?.record?.find((r) => r.sec === vNum);
    return vd?.bible_text && vd.bible_text !== '--' ? stripTags(vd.bible_text) : '';
  }, [results]);
  const getSpeakText = useCallback(
    () => (selected.size ? Array.from(selected).sort((a, b) => a - b) : verseNums).map(getFirstVersionVerseText).filter(Boolean).join(' '),
    [selected, verseNums, getFirstVersionVerseText]
  );
  // 朗讀譯本下拉的可選清單=這次畫面上真的有的譯本
  const speakVersions = useMemo(() => results.map((r) => r.version).filter(Boolean), [results]);

  useEffect(() => {
    const handler = () => {
      const text = getSelectedText();
      if (text) {
        copyToClipboard(text);
        showToast('已複製勾選的經文');
      } else {
        showToast('請先勾選要複製的經文');
      }
    };
    document.addEventListener('global-copy', handler);
    return () => document.removeEventListener('global-copy', handler);
  }, [getSelectedText]);

  if (verseNums.length === 0) return <EmptyState text="找不到相關經文" />;

  return (
    <div className="result-bleed" style={S.resultCard}>
      <ChapterNavBar data={data} bibleStructure={bibleStructure} onNavigate={onNavigate} />
      <ActionBar getSelectedText={getSelectedText} getFallbackText={getAllText} getSpeakText={getSpeakText} speakVersions={speakVersions} selectedCount={selected.size} large isTop copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
      <div className="responsive-header" style={{ ...S.tableHeader, display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="checkbox" checked={selected.size === verseNums.length && verseNums.length > 0} onChange={toggleAll} style={S.checkbox} />
        </div>
        {results.map((res) => {
          const vi = VERSIONS.find((v) => v.id === res.version);
          return <div key={res.version} style={{ fontWeight: 800, color: VERSION_COLORS[res.version] || 'var(--page-text)', textAlign: 'center', fontSize: 14 }}>{vi?.label}</div>;
        })}
      </div>
      <div>
        {verseNums.map((vNum) => {
          const baseText = getBaseTextForVerse(results, null, vNum, null, diffBase);
          const rowBackground = selected.has(vNum) ? 'var(--selected-row-bg)' : 'transparent';
          return (
            <div key={vNum} style={{ borderBottom: '1px solid var(--row-border)', background: rowBackground, transition: 'background 0.15s' }}>
              <div className="responsive-row" style={{ display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: 16 }}>
                <div className="responsive-checkbox-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input type="checkbox" checked={selected.has(vNum)} onChange={() => toggleVerse(vNum)} style={S.checkbox} />
                    <a onClick={(e) => { e.preventDefault(); onNavigate(`${bookName} ${data.chap}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} href="#top" className="mobile-verse-label" style={{ color: 'var(--link-text)', textDecoration: 'underline', cursor: 'pointer' }} title={`跳到 ${data.chap} 章`}>
                      第 {vNum} 節
                    </a>
                    <CommentButton open={commentFor === vNum} onToggle={() => setCommentFor(commentFor === vNum ? null : vNum)} />
                    <XrefButton open={openXrefs.has(vNum)} onToggle={() => toggleXref(vNum)} />
                    <StrongsButton open={openStrongs.has(vNum)} onToggle={() => toggleStrongs(vNum)} />
                    <CopyVerseButton
                      getText={() => {
                        const sel = getSelectedText();
                        return sel || getSingleVerseText(vNum);
                      }}
                      countLabel={selected.size > 0 ? `複製 ${selected.size} 節` : '複製本節'}
                    />
                    <SpeakButton getText={() => getSingleVerseText(vNum)} />
                  </div>
                </div>
                {results.map((res) => {
                  const vd = res.record?.find((r) => r.sec === vNum);
                  const text = vd?.bible_text || '--';
                  const vi = VERSIONS.find((v) => v.id === res.version);
                  const col = VERSION_COLORS[res.version] || 'var(--page-text)';
                  return (
                    <div key={res.version} className="verse-text-content" style={{ color: col, lineHeight: 1.75, fontSize: fontSize || 15 }}>
                      <div className="mobile-version-name" style={{ color: col }}>{vi?.label}</div>
                      <RcuvHeading heading={vd?.rcuvHeading} />
                      <a onClick={(e) => { e.preventDefault(); onNavigate(`${bookName} ${data.chap}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} href="#top" className="desktop-verse-num" style={{ color: 'var(--link-text)', fontSize: 13, fontWeight: 700, marginRight: 6, verticalAlign: 'top', textDecoration: 'underline', cursor: 'pointer' }} title={`跳到 ${data.chap} 章`}>
                        {vNum}
                      </a>
                      {res.error && res.version === 'rcuv'
                        ? <RcuvError message={res.error} />
                        : <VerseText text={text} compareText={diffEnabled ? baseText : ''} />}
                      <RcuvNotes notes={vd?.rcuvNotes} />
                    </div>
                  );
                })}
              </div>
              {openXrefs.has(vNum) && <XrefPanel abbrev={data.abbrev} chap={Number(data.chap)} sec={vNum} onNavigate={onNavigate} />}
              {openStrongs.has(vNum) && <StrongsPanel abbrev={data.abbrev} chap={Number(data.chap)} sec={vNum} onNavigate={onNavigate} />}
            </div>
          );
        })}
      </div>
      <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
      <ActionBar getSelectedText={getSelectedText} getFallbackText={getAllText} getSpeakText={getSpeakText} speakVersions={speakVersions} selectedCount={selected.size} large copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
      <ChapterNavBar data={data} bibleStructure={bibleStructure} onNavigate={onNavigate} />
      {commentFor != null && <CommentaryModal abbrev={data.abbrev} chap={Number(data.chap)} sec={commentFor} fontSize={fontSize} onNavigate={onNavigate} onClose={() => setCommentFor(null)} />}
    </div>
  );
}

const PAGE_SIZE = 50;

function KeywordViewer({ data, onNavigate, fontSize, setFontSize, diffEnabled, diffBase, copyFormat, setCopyFormat }) {
  const { results, keyword } = data;
  const [selected, setSelected] = useState(new Set());
  const [topCopied, setTopCopied] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [resultScope, setResultScope] = useState('all');
  const [bookFilter, setBookFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('all');
  const activeResults = useMemo(() => (
    versionFilter === 'all' ? results : results.filter((result) => result.version === versionFilter)
  ), [results, versionFilter]);
  const verses = useMemo(() => {
    const verseMap = new Map();
    activeResults.forEach((res) => {
      res.record?.forEach((r) => {
        const localAbbrev = r.localAbbrev || bookMap.find((b) => b.names[0] === r.chineses)?.localAbbrev;
        if (!localAbbrev) return;
        const key = `${localAbbrev}-${r.chap}-${r.sec}`;
        if (!verseMap.has(key)) {
          const bookIndex = bookMap.findIndex((b) => b.localAbbrev === localAbbrev);
          verseMap.set(key, { key, chineses: r.chineses, localAbbrev, chap: r.chap, sec: r.sec, bookIndex: bookIndex >= 0 ? bookIndex : 999 });
        }
      });
    });
    return Array.from(verseMap.values()).sort((a, b) => (a.bookIndex !== b.bookIndex ? a.bookIndex - b.bookIndex : a.chap !== b.chap ? a.chap - b.chap : a.sec - b.sec));
  }, [activeResults]);
  const filteredVerses = useMemo(() => verses.filter((verse) => {
    if (resultScope === 'ot' && verse.bookIndex > 38) return false;
    if (resultScope === 'nt' && verse.bookIndex < 39) return false;
    if (bookFilter && verse.localAbbrev !== bookFilter) return false;
    return true;
  }), [verses, resultScope, bookFilter]);
  const bookOptions = useMemo(() => Array.from(new Map(verses.map((verse) => [verse.localAbbrev, verse])).values()), [verses]);
  const selectedVisibleCount = filteredVerses.filter((verse) => selected.has(verse.key)).length;
  const totalCount = results.reduce((sum, result) => sum + (Number.isInteger(result.matchedCount) ? result.matchedCount : 0), 0);
  const cols = activeResults.length;

  const [openXrefs, setOpenXrefs] = useState(new Set());

  const [openCtx, setOpenCtx] = useState(new Set()); // 0809 讀5:展開中的前後文列

  const [openStrongs, setOpenStrongs] = useState(new Set()); // 0809 讀6:展開中的原文列

  const [commentFor, setCommentFor] = useState(null); // v27:註釋改彈窗,單一開啟(存 vo)

  useEffect(() => {
    setSelected(new Set());
    setDisplayLimit(PAGE_SIZE);
    setResultScope('all');
    setBookFilter('');
    setVersionFilter('all');
    setOpenXrefs(new Set());
    setOpenCtx(new Set());
    setOpenStrongs(new Set());
    setCommentFor(null);
  }, [data]);

  const toggleXref = (key) => {
    setOpenXrefs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleCtx = (key) => {
    setOpenCtx((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleStrongs = (key) => {
    setOpenStrongs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const visibleVerses = useMemo(() => filteredVerses.slice(0, displayLimit), [filteredVerses, displayLimit]);
  const hasMore = filteredVerses.length > displayLimit;

  const toggleVerse = (key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (selectedVisibleCount === filteredVerses.length && filteredVerses.length > 0) {
      filteredVerses.forEach((verse) => next.delete(verse.key));
    } else {
      filteredVerses.forEach((verse) => next.add(verse.key));
    }
    setSelected(next);
  };

  const getSelectedText = useCallback(() => {
    const lines = [];
    for (const vo of verses) {
      if (!selected.has(vo.key)) continue;
      activeResults.forEach((res) => {
        const vi = VERSIONS.find((v) => v.id === res.version);
        const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${getBookName(vo.localAbbrev)} ${vo.chap}:${vo.sec}`, text: stripTags(vd.bible_text) });
      });
    }
    return formatVersesForShare(lines, copyFormat);
  }, [selected, verses, activeResults, copyFormat]);

  // 朗讀/存語音用:只取「朗讀譯本」的純經文(不帶出處與譯本標籤)
  const getFirstVersionVerseText = useCallback((vo) => {
    const vd = pickSpeakResult(activeResults)?.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
    return vd?.bible_text && vd.bible_text !== '--' ? stripTags(vd.bible_text) : '';
  }, [activeResults]);
  const getSpeakText = useCallback(
    () => (selected.size ? verses.filter((vo) => selected.has(vo.key)) : filteredVerses).map(getFirstVersionVerseText).filter(Boolean).join(' '),
    [selected, verses, filteredVerses, getFirstVersionVerseText]
  );
  // 朗讀譯本下拉的可選清單=這次畫面上真的有的譯本
  const speakVersions = useMemo(() => activeResults.map((r) => r.version).filter(Boolean), [activeResults]);

  const getSingleVerseTextForKeyword = useCallback((vo) => {
    const lines = [];
    activeResults.forEach((res) => {
      const vi = VERSIONS.find((v) => v.id === res.version);
      const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
      if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${getBookName(vo.localAbbrev)} ${vo.chap}:${vo.sec}`, text: stripTags(vd.bible_text) });
    });
    return formatVersesForShare(lines, copyFormat);
  }, [activeResults, copyFormat]);

  const getFilteredText = useCallback(() => {
    const lines = [];
    for (const vo of filteredVerses) {
      activeResults.forEach((res) => {
        const vi = VERSIONS.find((v) => v.id === res.version);
        const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${getBookName(vo.localAbbrev)} ${vo.chap}:${vo.sec}`, text: stripTags(vd.bible_text) });
      });
    }
    return formatVersesForShare(lines, copyFormat);
  }, [filteredVerses, activeResults, copyFormat]);

  const handleTopCopy = useCallback(async () => {
    const text = getFilteredText();
    if (text) {
      await copyToClipboard(text);
      setTopCopied(true);
      window.setTimeout(() => setTopCopied(false), 2000);
    }
  }, [getFilteredText]);

  useEffect(() => {
    const handler = () => {
      if (selected.size === 0) {
        handleTopCopy();
        showToast('已複製全部經文');
      } else {
        const text = getSelectedText();
        copyToClipboard(text);
        showToast('已複製勾選的經文');
      }
    };
    document.addEventListener('global-copy', handler);
    return () => document.removeEventListener('global-copy', handler);
  }, [selected.size, handleTopCopy, getSelectedText]);

  // 只勾了線上譯本時,「找不到經文」是騙人的 —— 是搜不了,不是查不到
  if (verses.length === 0 && data.onlyOnline) {
    return <EmptyState text={`目前只勾了線上譯本（${data.onlineExcluded.map((id) => VERSIONS.find((v) => v.id === id)?.label || id).join('、')}），無法做全文搜尋。請至少勾一個離線譯本（如和合本），或改用「約 3:16」這種經文參照方式查。`} />;
  }
  if (verses.length === 0) return <EmptyState text={`找不到含有「${keyword}」的經文`} />;

  const goToChapter = (localAbbrev, chap) => {
    onNavigate(`${getBookName(localAbbrev)} ${chap}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="result-bleed" style={S.resultCard}>
      {/* 線上譯本無法全文搜尋 → 一定要明說。靜靜少一本 = 使用者以為和修本查不到這個詞。 */}
      {data.onlineExcluded?.length > 0 && (
        <div style={{ fontSize: 13, padding: '8px 16px', background: 'rgba(123,31,162,0.08)', color: '#7b1fa2', lineHeight: 1.6 }}>
          ℹ️ {data.onlineExcluded.map((id) => VERSIONS.find((v) => v.id === id)?.label || id).join('、')}
          是線上譯本，全文搜尋只能搜離線譯本，因此這次結果不含它。
          請改用「經文參照」方式查（例：約 3:16）就會顯示。
        </div>
      )}
      <div style={{ ...S.statsBar, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
        <span style={{ color: 'var(--warning-text)', fontSize: 14, fontWeight: 700 }}>關鍵字：<strong>「{keyword}」</strong></span>
        <span style={{ color: 'var(--warning-strong-text)', fontSize: 14 }}>共 <strong>{totalCount}</strong> 筆命中（顯示 {filteredVerses.length} / {verses.length} 節）<span style={{ color: 'var(--muted-text)', fontSize: 12, marginLeft: 6, fontWeight: 500 }}>{data.timeMs ? `${data.timeMs}ms` : ''}</span></span>
        <button type="button" onClick={handleTopCopy} className="btn-active-effect" style={{ ...(topCopied ? S.btnCopied : S.btnCopy), padding: '13px 24px', fontSize: 17, minWidth: 210, flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {topCopied ? '已複製全部' : '複製全部經文'}
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
          {activeResults.map((r) => {
            const vi = VERSIONS.find((v) => v.id === r.version);
            const searched = Number.isInteger(r.matchedCount);
            return <span key={r.version} style={{ fontSize: 11, border: '1px solid var(--warning-border)', color: VERSION_COLORS[r.version] || 'var(--warning-strong-text)', borderRadius: 999, padding: '2px 8px', fontWeight: 700, background: 'var(--warning-bg)' }}>{vi?.label}: {searched ? r.matchedCount : '對照'}</span>;
          })}
        </div>
      </div>
      <div style={{ ...S.actionBar, position: 'static', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border-soft)' }}>
        <span style={{ color: 'var(--heading-text)', fontWeight: 800, fontSize: 13 }}>二次篩選</span>
        <select value={resultScope} onChange={(e) => setResultScope(e.target.value)} style={{ ...S.select, flex: '0 1 140px', minWidth: 120, padding: '8px 10px' }} aria-label="搜尋結果範圍">
          <option value="all">全卷</option>
          <option value="ot">舊約</option>
          <option value="nt">新約</option>
        </select>
        <select value={bookFilter} onChange={(e) => setBookFilter(e.target.value)} style={{ ...S.select, flex: '0 1 170px', minWidth: 130, padding: '8px 10px' }} aria-label="搜尋結果書卷">
          <option value="">全部書卷</option>
          {bookOptions.map((book) => (
            <option key={book.localAbbrev} value={book.localAbbrev}>{getBookName(book.localAbbrev, true)}</option>
          ))}
        </select>
        <select value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)} style={{ ...S.select, flex: '0 1 150px', minWidth: 120, padding: '8px 10px' }} aria-label="搜尋結果譯本">
          <option value="all">全部譯本</option>
          {results.map((res) => {
            const vi = VERSIONS.find((v) => v.id === res.version);
            return <option key={res.version} value={res.version}>{vi?.label || res.version}</option>;
          })}
        </select>
        <button type="button" onClick={() => { setResultScope('all'); setBookFilter(''); setVersionFilter('all'); }} style={S.smallBtn}>重置</button>
      </div>
      <ActionBar getSelectedText={getSelectedText} getFallbackText={getFilteredText} getSpeakText={getSpeakText} speakVersions={speakVersions} selectedCount={selected.size} large isTop copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
      <div className="responsive-header" style={{ ...S.tableHeader, display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="checkbox" checked={selectedVisibleCount === filteredVerses.length && filteredVerses.length > 0} onChange={toggleAll} style={S.checkbox} />
        </div>
        {activeResults.map((res) => {
          const vi = VERSIONS.find((v) => v.id === res.version);
          return <div key={res.version} style={{ fontWeight: 800, color: VERSION_COLORS[res.version] || 'var(--page-text)', textAlign: 'center', fontSize: 14 }}>{vi?.label}</div>;
        })}
      </div>
      <div>
        {filteredVerses.length === 0 && <EmptyState text="目前篩選沒有結果" />}
        {visibleVerses.map((vo) => {
          const baseText = getBaseTextForVerse(activeResults, vo.chap, vo.sec, vo.chineses, diffBase);
          const rowBackground = selected.has(vo.key) ? 'var(--keyword-selected-row-bg)' : 'transparent';
          return (
            <div key={vo.key} style={{ borderBottom: '1px solid var(--row-border)', background: rowBackground, transition: 'background 0.15s' }}>
              <div className="responsive-row" style={{ display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: 16 }}>
                <div className="responsive-checkbox-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input type="checkbox" checked={selected.has(vo.key)} onChange={() => toggleVerse(vo.key)} style={S.checkbox} />
                    <a onClick={(e) => { e.preventDefault(); goToChapter(vo.localAbbrev, vo.chap); }} href="#top" className="mobile-verse-label" style={{ color: 'var(--link-text)', textDecoration: 'underline', cursor: 'pointer' }} title={`查看 ${getBookName(vo.localAbbrev)} 第 ${vo.chap} 章`}>
                      {getBookName(vo.localAbbrev)} {vo.chap}:{vo.sec}
                    </a>
                    <CommentButton open={commentFor?.key === vo.key} onToggle={() => setCommentFor(commentFor?.key === vo.key ? null : vo)} />
                    <XrefButton open={openXrefs.has(vo.key)} onToggle={() => toggleXref(vo.key)} />
                    <CtxButton open={openCtx.has(vo.key)} onToggle={() => toggleCtx(vo.key)} />
                    <StrongsButton open={openStrongs.has(vo.key)} onToggle={() => toggleStrongs(vo.key)} />
                    <CopyVerseButton
                      getText={() => {
                        const sel = getSelectedText();
                        return sel || getSingleVerseTextForKeyword(vo);
                      }}
                      countLabel={selected.size > 0 ? `複製 ${selected.size} 節` : '複製本節'}
                    />
                    <SpeakButton getText={() => getSingleVerseTextForKeyword(vo)} />
                  </div>
                </div>
                {activeResults.map((res) => {
                  const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
                  const vi = VERSIONS.find((v) => v.id === res.version);
                  const col = VERSION_COLORS[res.version] || 'var(--page-text)';
                  return (
                    <div key={res.version} className="verse-text-content" style={{ color: col, lineHeight: 1.75, fontSize: fontSize || 15 }}>
                      <div className="mobile-version-name" style={{ color: col }}>{vi?.label}</div>
                      <a onClick={(e) => { e.preventDefault(); goToChapter(vo.localAbbrev, vo.chap); }} href="#top" className="desktop-verse-num" style={{ color: 'var(--link-text)', fontSize: 11, fontWeight: 700, marginRight: 6, verticalAlign: 'top', opacity: 0.9, textDecoration: 'underline', cursor: 'pointer' }} title={`查看 ${getBookName(vo.localAbbrev)} 第 ${vo.chap} 章`}>
                        {getBookName(vo.localAbbrev)} {vo.chap}:{vo.sec}
                      </a>
                      {vd ? <VerseText text={vd.bible_text} keyword={keyword} exactPhrase={Boolean(data.searchOptions?.exactPhrase)} compareText={diffEnabled ? baseText : ''} /> : <span style={{ color: '#aaa' }}>--</span>}
                    </div>
                  );
                })}
              </div>
              {openXrefs.has(vo.key) && <XrefPanel abbrev={vo.localAbbrev} chap={vo.chap} sec={vo.sec} onNavigate={onNavigate} />}
              {openCtx.has(vo.key) && (
                <CtxPanel
                  abbrev={vo.localAbbrev}
                  chap={vo.chap}
                  sec={vo.sec}
                  version={activeResults[0]?.version}
                  onOpenChapter={() => goToChapter(vo.localAbbrev, vo.chap)}
                />
              )}
              {openStrongs.has(vo.key) && <StrongsPanel abbrev={vo.localAbbrev} chap={vo.chap} sec={vo.sec} onNavigate={onNavigate} />}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 16px', background: 'var(--action-bar-bg)', borderTop: '1px solid var(--border-soft)' }}>
          <button
            type="button"
            onClick={() => setDisplayLimit((n) => n + PAGE_SIZE)}
            className="btn-active-effect"
            style={{ ...S.btnLine, padding: '10px 24px', fontSize: 14 }}
          >
            載入更多 ({filteredVerses.length - displayLimit} 節未顯示)
          </button>
        </div>
      )}
      <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
      <ActionBar getSelectedText={getSelectedText} getFallbackText={getFilteredText} getSpeakText={getSpeakText} speakVersions={speakVersions} selectedCount={selected.size} large copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
      {commentFor && <CommentaryModal abbrev={commentFor.localAbbrev} chap={commentFor.chap} sec={commentFor.sec} fontSize={fontSize} onNavigate={onNavigate} onClose={() => setCommentFor(null)} />}
    </div>
  );
}

function getDayOfYearIndex(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000);
}

// 0809 讀1:一般化成任意天數(1/2/3 年+自訂年數);不帶 totalDays=原本的年曆制 365 天
function buildReadingPlan(bibleStructure, totalDays = 365) {
  if (!Array.isArray(bibleStructure)) return [];
  const chapters = [];
  bibleStructure.forEach((book) => {
    book.chapters?.forEach((_, index) => chapters.push({ abbrev: book.abbrev, chap: index + 1 }));
  });
  if (chapters.length === 0) return [];
  const days = Array.from({ length: totalDays }, () => []);
  let cursor = 0;
  for (let day = 0; day < totalDays; day += 1) {
    const next = Math.round(((day + 1) * chapters.length) / totalDays);
    days[day] = chapters.slice(cursor, next);
    cursor = next;
  }
  return days;
}

function planYearsText(y) { return (y === Math.floor(y) ? y : y.toFixed(1)) + ' 年'; }
function localYmd(d = new Date()) {
  // ⚠ 不用 toISOString(UTC 位移會差一天,本系列踩過的日期鍵地雷)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isValidPlanConfig(p) {
  return Boolean(p && Number(p.years) > 0 && Number(p.years) <= 20 && /^\d{4}-\d{2}-\d{2}$/.test(p.start || ''));
}

function formatPlanEntries(entries) {
  return entries.map((entry) => `${getBookName(entry.abbrev)} ${entry.chap}`).join('、');
}

function DailyReadingCard({ bibleStructure, readingProgress, setReadingProgress, onNavigate, planConfig, setPlanConfig }) {
  // 0809 讀1:雙制並存——沒設定=原本的年曆制一年計畫(打卡鍵 `${year}-${day}` 原樣不動,零遷移);
  // 有設定=自訂 1/2/3/N 年計畫,從開始日算天數,打卡鍵用 `plan-${start}-` 前綴隔離(換計畫不污染舊進度)。
  const [showPicker, setShowPicker] = useState(false);
  const [customYears, setCustomYears] = useState('');
  const custom = isValidPlanConfig(planConfig);
  const totalDays = custom ? Math.max(1, Math.round(Number(planConfig.years) * 365)) : 365;
  const plan = useMemo(() => buildReadingPlan(bibleStructure, totalDays), [bibleStructure, totalDays]);
  const today = new Date();
  const year = today.getFullYear();
  let dayIndex, keyPrefix, planLabel;
  if (custom) {
    const startMs = new Date(planConfig.start + 'T00:00:00').getTime();
    dayIndex = Math.min(Math.max(Math.floor((today.getTime() - startMs) / 86400000), 0), totalDays - 1);
    keyPrefix = `plan-${planConfig.start}-`;
    planLabel = `${planYearsText(Number(planConfig.years))}讀完整本聖經(${planConfig.start} 開始)`;
  } else {
    dayIndex = Math.min(getDayOfYearIndex(today), 364);
    keyPrefix = `${year}-`;
    planLabel = '一年計畫(年曆制,1/1 起算)';
  }
  const progressKey = keyPrefix + (dayIndex + 1);
  const entries = plan[dayIndex] || [];
  const done = Boolean(readingProgress?.[progressKey]);
  const completedDays = Object.entries(readingProgress || {}).filter(([key, value]) => key.startsWith(keyPrefix) && value).length;
  const percent = Math.min(100, Math.round((completedDays / totalDays) * 100));

  const toggleDone = () => {
    setReadingProgress((prev) => ({ ...(prev || {}), [progressKey]: !done }));
  };

  const openToday = () => {
    const first = entries[0];
    if (first) onNavigate(`${getBookName(first.abbrev)} ${first.chap}`);
  };

  const startPlan = (yearsRaw) => {
    const years = Math.round(Number(yearsRaw) * 2) / 2; // 半年為單位
    if (!(years >= 0.5 && years <= 20)) { showToast('請輸入 0.5 ~ 20 之間的年數'); return; }
    setPlanConfig({ years, start: localYmd() });
    setShowPicker(false);
    showToast(`📅 ${planYearsText(years)}讀經計畫開始!今天是第 1 天`);
  };
  const backToCalendarPlan = () => {
    if (!window.confirm('回到「一年計畫(年曆制)」?自訂計畫的打卡記錄會保留,只是不再顯示。')) return;
    setPlanConfig(null);
    setShowPicker(false);
  };

  return (
    <section style={{ ...S.card, padding: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <h2 style={{ margin: 0, color: 'var(--heading-text)', fontSize: 18 }}>每日讀經進度</h2>
        <span style={{ color: 'var(--subtle-text)', fontSize: 13, fontWeight: 800 }}>{percent}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--progress-track)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg, #43a047, #facc15)', borderRadius: 999 }} />
      </div>
      <div style={{ color: 'var(--muted-text)', fontSize: 13, marginBottom: 8 }}>
        📅 {planLabel} · 第 {dayIndex + 1} / {totalDays} 天 · 已打卡 {completedDays} 天
      </div>
      <div style={{ color: 'var(--page-text)', fontSize: 16, lineHeight: 1.7, minHeight: 54 }}>
        {entries.length > 0 ? formatPlanEntries(entries) : (custom ? '今天不用讀新的章——可以複習,或休息一天 😊' : '讀經計畫載入中...')}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" onClick={toggleDone} disabled={!custom && entries.length === 0} style={done ? { ...S.btnCopied, padding: '8px 14px', fontSize: 13 } : S.smallBtn}>
          {done ? '今日已打卡' : '勾選打卡'}
        </button>
        <button type="button" onClick={openToday} disabled={entries.length === 0} style={S.smallBtn}>開啟今日經文</button>
        <button type="button" onClick={() => setShowPicker((v) => !v)} style={S.smallBtn}>
          {showPicker ? '收合' : '⚙ 換計畫'}
        </button>
      </div>
      {showPicker && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
          <button type="button" onClick={() => startPlan(1)} style={S.smallBtn}>1 年讀完</button>
          <button type="button" onClick={() => startPlan(2)} style={S.smallBtn}>2 年讀完</button>
          <button type="button" onClick={() => startPlan(3)} style={S.smallBtn}>3 年讀完</button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" min="0.5" max="20" step="0.5" placeholder="自訂"
              value={customYears} onChange={(e) => setCustomYears(e.target.value)}
              style={{ width: 70, padding: 8, border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--input-bg)', color: 'var(--heading-text)', fontWeight: 700 }}
              aria-label="自訂年數"
            /> 年
            <button type="button" onClick={() => startPlan(customYears)} style={S.smallBtn}>開始</button>
          </span>
          {custom && (
            <button type="button" onClick={backToCalendarPlan} style={S.smallBtn}>回年曆制一年計畫</button>
          )}
          <span style={{ flexBasis: '100%', color: 'var(--muted-text)', fontSize: 12 }}>
            從按下去那天開始算,每天平均分配全聖經 1189 章;打卡記錄各計畫分開保存。
          </span>
        </div>
      )}
    </section>
  );
}

function DailyTools({ bibleStructure, readingProgress, setReadingProgress, onNavigate, planConfig, setPlanConfig }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, maxWidth: 1180, margin: '0 auto 22px' }}>
      <DailyReadingCard bibleStructure={bibleStructure} readingProgress={readingProgress} setReadingProgress={setReadingProgress} onNavigate={onNavigate} planConfig={planConfig} setPlanConfig={setPlanConfig} />
    </div>
  );
}

const FOOTPRINT_RANGES = [
  { id: '1m', label: '本月', months: 1 },
  { id: '3m', label: '近3月', months: 3 },
  { id: '6m', label: '近6月', months: 6 },
  { id: '12m', label: '近12月', months: 12 },
  { id: 'all', label: '歷年', months: 0 },
];

const FOOTPRINT_CELL_COLORS = ['var(--progress-track)', '#a5d6a7', '#66bb6a', '#2e7d32', '#1b5e20'];

function footprintLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function FootprintCard({ readingLog, bibleStructure, onNavigate }) {
  const [rangeId, setRangeId] = useState('3m');
  const rangeDef = FOOTPRINT_RANGES.find((r) => r.id === rangeId) || FOOTPRINT_RANGES[1];

  const aggregate = useMemo(() => {
    const m = readingLog?.m || {};
    let keys;
    if (rangeDef.months === 0) {
      keys = Object.keys(m);
    } else {
      keys = [];
      const now = new Date();
      for (let i = 0; i < rangeDef.months; i += 1) {
        keys.push(ymKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
      }
    }
    const counts = new Map();
    keys.forEach((key) => {
      Object.entries(m[key] || {}).forEach(([chapterKey, n]) => {
        counts.set(chapterKey, (counts.get(chapterKey) || 0) + n);
      });
    });
    return counts;
  }, [readingLog, rangeDef]);

  const allTimeChapterCount = useMemo(() => {
    const seen = new Set();
    Object.values(readingLog?.m || {}).forEach((bucket) => Object.keys(bucket).forEach((k) => seen.add(k)));
    return seen.size;
  }, [readingLog]);

  const streak = useMemo(() => {
    const d = readingLog?.d || {};
    let count = 0;
    const cursor = new Date();
    if (!d[ymdKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (d[ymdKey(cursor)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [readingLog]);

  const todayCount = (readingLog?.d || {})[ymdKey(new Date())] || 0;
  const totalChapters = useMemo(() => (
    Array.isArray(bibleStructure)
      ? bibleStructure.reduce((sum, b) => sum + (b.chapters?.length || 0), 0)
      : 1189
  ), [bibleStructure]);
  const percent = totalChapters > 0 ? Math.round((allTimeChapterCount / totalChapters) * 1000) / 10 : 0;

  const topChapters = useMemo(() => (
    Array.from(aggregate.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [bi, chap] = key.split(':').map(Number);
        const book = bookMap[bi];
        return book ? { key, count, label: `${book.names[0]} ${chap}`, query: `${book.names[0]} ${chap}` } : null;
      })
      .filter(Boolean)
  ), [aggregate]);

  const rangeTotal = useMemo(() => Array.from(aggregate.values()).reduce((sum, n) => sum + n, 0), [aggregate]);

  const statBox = { background: 'var(--panel-bg)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '10px 12px', textAlign: 'center', minWidth: 0 };
  const statNum = { fontSize: 22, fontWeight: 800, color: 'var(--heading-text)' };
  const statLabel = { fontSize: 12, color: 'var(--muted-text)', marginTop: 2 };

  return (
    <div style={{ ...S.card, maxWidth: 1180, margin: '0 auto 22px', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: 'var(--heading-text)', fontSize: 18 }}>讀經足跡</h2>
      </div>
      <div style={{ color: 'var(--muted-text)', fontSize: 12, marginBottom: 12 }}>
        閱讀整章並停留 15 秒才會自動記錄；單節查詢、關鍵字搜尋與開啟 App 自動還原不計。記錄只存在這台裝置。
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={statBox}><div style={statNum}>{todayCount}</div><div style={statLabel}>今日章次</div></div>
        <div style={statBox}><div style={statNum}>{streak}</div><div style={statLabel}>連續天數</div></div>
        <div style={statBox}><div style={statNum}>{allTimeChapterCount}</div><div style={statLabel}>讀過章數</div></div>
        <div style={statBox}><div style={statNum}>{percent}%</div><div style={statLabel}>全卷 {totalChapters} 章</div></div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        {FOOTPRINT_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRangeId(r.id)}
            style={rangeId === r.id ? { ...S.pillActive, padding: '5px 12px', fontSize: 12 } : { ...S.smallBtn, borderRadius: 999 }}
          >
            {r.label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--muted-text)' }}>{rangeDef.label}共 {rangeTotal} 章次</span>
      </div>
      {topChapters.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--subtle-text)', fontSize: 14 }}>熱區排行（點擊開啟）</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topChapters.map((item) => (
              <button key={item.key} type="button" onClick={() => onNavigate(item.query)} style={{ ...S.smallBtn, borderRadius: 999 }}>
                {item.label} · {item.count}
              </button>
            ))}
          </div>
        </div>
      )}
      <h3 style={{ margin: '0 0 8px', color: 'var(--subtle-text)', fontSize: 14 }}>全卷熱圖（點格子開啟該章）</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {bookMap.map((book, bi) => {
          const struct = Array.isArray(bibleStructure) ? bibleStructure.find((b) => b.abbrev === book.localAbbrev) : null;
          const chapCount = struct?.chapters?.length || 0;
          if (chapCount === 0) return null;
          return (
            <div key={book.localAbbrev} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 10, color: 'var(--muted-text)', width: 52, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.names[0]}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, flex: 1, minWidth: 0 }}>
                {Array.from({ length: chapCount }, (_, i) => {
                  const chap = i + 1;
                  const count = aggregate.get(`${bi}:${chap}`) || 0;
                  return (
                    <button
                      key={chap}
                      type="button"
                      onClick={() => onNavigate(`${book.names[0]} ${chap}`)}
                      title={`${book.names[0]} ${chap} 章 · ${count} 次`}
                      style={{ width: 9, height: 9, padding: 0, border: 'none', borderRadius: 2, cursor: 'pointer', background: FOOTPRINT_CELL_COLORS[footprintLevel(count)], flexShrink: 0 }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UserLibrary({ history, onRunHistory, onClearHistory, onDeleteHistory, onExport, onImport, backupNudge, onSnoozeBackup }) {
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(JSON.parse(reader.result));
        showToast('匯入完成');
      } catch {
        showToast('匯入失敗：JSON 格式不正確');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ ...S.card, maxWidth: 1180, margin: '0 auto 22px', padding: 18 }}>
      {backupNudge && (
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 14, color: 'var(--page-text)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 240px' }}>
            💾 {backupNudge.days === null ? '你的讀經足跡與紀錄還沒備份過' : `距上次備份已 ${backupNudge.days} 天`}
            ——足跡只存在這台裝置，換手機前記得匯出保存。
          </span>
          <button type="button" onClick={onExport} style={S.smallBtn}>立即匯出</button>
          <button type="button" onClick={onSnoozeBackup} style={S.smallBtn}>7 天後再提醒</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: 'var(--heading-text)', fontSize: 18 }}>查詢足跡</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onExport} style={S.smallBtn}>匯出 JSON</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={S.smallBtn}>匯入 JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
      <section style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, color: 'var(--subtle-text)', fontSize: 15 }}>查詢歷史</h3>
          {history.length > 0 && <button type="button" onClick={onClearHistory} style={S.dangerBtn}>清空</button>}
        </div>
        {history.length === 0 && <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 13 }}>查詢後會自動保留最近紀錄。</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflow: 'auto' }}>
          {history.slice(0, 20).map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border-muted)', borderRadius: 8, padding: '8px 12px', background: 'var(--surface-solid)' }}>
              <button type="button" onClick={() => onRunHistory(item)} style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                <strong style={{ color: 'var(--page-text)', fontSize: 14, display: 'block', overflowWrap: 'anywhere' }}>{item.query}</strong>
                <div style={{ color: 'var(--muted-text)', fontSize: 12, marginTop: 3 }}>
                  {formatDateTime(item.ts)} · {item.resultCount} 筆
                </div>
              </button>
              <button type="button" onClick={() => onDeleteHistory(item.id)} style={{ ...S.dangerBtn, flexShrink: 0 }}>刪除</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const VIEW_TABS = [
  { id: 'home', label: '查詢' },
  { id: 'library', label: '讀經進度與足跡' },
];

function ViewTabs({ view, setView, big }) {
  return (
    <div style={{ display: 'inline-flex', gap: big ? 8 : 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      {VIEW_TABS.map((tab) => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            style={{
              border: active ? '1px solid #2e7d32' : '1px solid var(--border-strong)',
              background: active ? 'linear-gradient(145deg, #43a047, #2e7d32)' : 'transparent',
              color: active ? 'white' : 'var(--heading-text)',
              borderRadius: 8,
              padding: big ? '6px 16px' : '7px 13px',
              fontSize: big ? 15 : 14, /* 0809 B1:12/13→14/15 */
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ThemeModeControl({ theme, resolvedTheme, setTheme }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', padding: 4, border: '1px solid var(--border-strong)', borderRadius: 999, background: 'var(--panel-bg)' }}>
      {THEME_OPTIONS.map((option) => {
        const active = normalizeThemePreference(theme) === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            title={option.id === 'system' ? `目前跟隨為 ${resolvedTheme === 'night' ? '夜讀' : '淺色'}` : option.label}
            style={{
              border: active ? '1px solid #2e7d32' : '1px solid transparent',
              background: active ? 'linear-gradient(145deg, #43a047, #2e7d32)' : 'transparent',
              color: active ? 'white' : 'var(--heading-text)',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// 0810 v26:⬆ 回頂鈕(與 8bible v79 同款——長章×多譯本滑到底,想換書卷要滑很久)
// 捲超過 1.5 個螢幕才出現;rAF 節流;z-index 800=蓋內容、壓在 Toast(10000) 之下
function BackToTopButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let ticking = false;
    const update = () => { ticking = false; setShow(window.scrollY > window.innerHeight * 1.5); };
    const onScroll = () => { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="回到頂部"
      title="回到頂部"
      onClick={() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); } }}
      style={{ position: 'fixed', right: 14, bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--border-strong)', background: 'linear-gradient(145deg, #43a047, #2e7d32)', color: 'white', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.85, boxShadow: '0 3px 12px rgba(0,0,0,0.25)', zIndex: 800, WebkitTapHighlightColor: 'transparent' }}
    >
      ⬆
    </button>
  );
}

function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };
    const installedHandler = () => setInstalled(true);

    if (window.deferredInstallPrompt) setDeferredPrompt(window.deferredInstallPrompt);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt || window.deferredInstallPrompt;
    if (!promptEvent) {
      window.alert('安裝方式：電腦或 Android 可使用網址列右側安裝按鈕；iPhone / iPad 請從 Safari 分享選單加入主畫面。');
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    window.deferredInstallPrompt = null;
  };

  if (installed) return <span style={{ fontSize: 12, color: 'var(--subtle-text)', padding: '6px 14px', borderRadius: 999, border: '1px solid var(--border-strong)', background: 'var(--surface-bg)', fontWeight: 700 }}>已安裝</span>;
  return <button type="button" onClick={handleInstall} style={{ ...S.btnInstall, padding: '10px 22px', fontSize: 14 }}>安裝 App</button>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [versions, setVersions] = usePersistentState(LS_KEYS.versions, ['unv', 'niv', 'esv', 'ncv', 'lzz']);
  // 🧓 簡易模式(0809 B1):收起查經工具(進階搜尋/差異高亮/串珠/註釋/複製格式/排序箭頭)。裝置層偏好,刻意不進備份。
  const [simpleMode, setSimpleMode] = usePersistentState('sevenbible-simple-mode', false);
  const [fontSize, setFontSize] = usePersistentState(LS_KEYS.fontSize, 15);
  const [diffEnabled, setDiffEnabled] = usePersistentState(LS_KEYS.diffEnabled, true);
  const [diffBase, setDiffBase] = usePersistentState(LS_KEYS.diffBase, '');
  const [history, setHistory] = usePersistentState(LS_KEYS.history, []);
  const [bibleStructure, setBibleStructure] = useState(null);
  const [view, setView] = useState('home');
  const [bookmark, setBookmark] = usePersistentState(LS_KEYS.bookmark, null);
  const [copyFormat, setCopyFormat] = usePersistentState(LS_KEYS.copyFormat, 'plain');
  const [theme, setTheme] = usePersistentState(LS_KEYS.theme, 'light');
  const [readingProgress, setReadingProgress] = usePersistentState(LS_KEYS.readingProgress, {});
  // 0809 讀1:自訂讀經計畫設定(null=沿用年曆制一年計畫);資料級,接匯出/匯入
  const [planConfig, setPlanConfig] = usePersistentState('bible-tool-plan-config-v1', null);
  const [readingLog, setReadingLog] = usePersistentState(LS_KEYS.readingLog, { enabled: true, m: {}, d: {}, recent: {} });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);
  const [topBarH, setTopBarH] = useState(96);
  const normalizedTheme = normalizeThemePreference(theme);
  const resolvedTheme = resolveTheme(theme, systemDark);
  const themeVars = useMemo(() => THEME_VARS[resolvedTheme] || THEME_VARS.light, [resolvedTheme]);
  const searchSeqRef = useRef(0);
  const footprintSkipRef = useRef(false);

  useEffect(() => {
    const expand = (list) => list.map((book) => ({
      abbrev: book.abbrev,
      chapters: book.chapters.map((c) => (Array.isArray(c) ? c : Array.from({ length: c }))),
    }));
    fetch('/data/structure.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no structure.json'))))
      .then((structure) => setBibleStructure(expand(structure)))
      .catch(() => fetch('/data/unv.json')
        .then((r) => r.json())
        .then((structure) => setBibleStructure(structure))
        .catch((err) => console.error('Error loading bible structure:', err)));
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const el = document.getElementById('app-top-bar');
    if (!el) return undefined;
    const update = () => setTopBarH(el.offsetHeight);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const addHistory = useCallback((query, selectedVersions, searchOptions, result) => {
    const resultCount = result.mode === 'keyword'
      ? new Set(result.results.flatMap((r) => r.record?.map((v) => `${v.localAbbrev}:${v.chap}:${v.sec}`) || [])).size
      : result.results.reduce((sum, r) => sum + (r.record?.length || 0), 0);
    const cleanOptions = searchOptions || {};
    const dedupeKey = JSON.stringify({ query, selectedVersions, cleanOptions });
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      key: dedupeKey,
      query,
      versions: selectedVersions,
      options: cleanOptions,
      mode: result.mode,
      resultCount,
      ts: new Date().toISOString(),
    };

    setHistory((prev) => [item, ...prev.filter((h) => h.key !== dedupeKey)].slice(0, 60));
  }, [setHistory]);

  const handleSearch = useCallback(async (query, selectedVersions = versions, searchOptions = {}) => {
    const t0 = performance.now();
    const seq = ++searchSeqRef.current;
    setView('home');
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBible(query, selectedVersions, searchOptions);
      if (seq !== searchSeqRef.current) return;
      res.timeMs = Math.round(performance.now() - t0);
      setData(res);
      addHistory(query.trim(), selectedVersions, searchOptions, res);
    } catch (err) {
      if (seq !== searchSeqRef.current) return;
      setError(err.message);
      setData(null);
    } finally {
      if (seq === searchSeqRef.current) setLoading(false);
    }
  }, [versions, addHistory]);

  const initialUrlSearchedRef = useRef(false);
  useEffect(() => {
    if (initialUrlSearchedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const resume = params.get('resume');
    if (resume === '1' && bookmark) {
      initialUrlSearchedRef.current = true;
      footprintSkipRef.current = true;
      handleSearch(bookmark.label, versions, {});
      return;
    }
    const q = params.get('q');
    if (!q) return;
    initialUrlSearchedRef.current = true;
    footprintSkipRef.current = true;
    const vParam = params.get('v');
    const urlVersions = vParam
      ? vParam.split(',').map((s) => s.trim()).filter((s) => VERSIONS.find((vv) => vv.id === s))
      : null;
    // 0809:?v= 深連結只作用「這一次查詢」的顯示,不再 setVersions 永久改掉使用者存好的偏好
    handleSearch(q, urlVersions && urlVersions.length > 0 ? urlVersions : versions, {});
  }, [handleSearch, versions, bookmark]);

  const commitReadingLog = useCallback((abbrev, chap) => {
    const bookIndex = bookMap.findIndex((b) => b.localAbbrev === abbrev);
    if (bookIndex < 0 || !Number.isInteger(chap) || chap < 1) return;
    const chapterKey = `${bookIndex}:${chap}`;
    const now = Date.now();
    setReadingLog((prev) => {
      const log = prev && typeof prev === 'object' ? prev : {};
      if (log.enabled === false) return prev;
      const recent = {};
      Object.entries(log.recent || {}).forEach(([k, ts]) => {
        if (now - ts < FOOTPRINT_RECENT_TTL_MS) recent[k] = ts;
      });
      if (recent[chapterKey] && now - recent[chapterKey] < FOOTPRINT_DEDUPE_MS) {
        return { ...log, recent };
      }
      recent[chapterKey] = now;
      const date = new Date(now);
      const ym = ymKey(date);
      const ymd = ymdKey(date);
      const monthBucket = { ...((log.m || {})[ym] || {}) };
      monthBucket[chapterKey] = (monthBucket[chapterKey] || 0) + 1;
      return {
        ...log,
        m: { ...(log.m || {}), [ym]: monthBucket },
        d: { ...(log.d || {}), [ymd]: ((log.d || {})[ymd] || 0) + 1 },
        recent,
      };
    });
  }, [setReadingLog]);

  useEffect(() => {
    if (!data) return undefined;
    const skip = footprintSkipRef.current;
    footprintSkipRef.current = false;
    if (skip || data.mode !== 'verse' || data.sec) return undefined;
    const abbrev = data.abbrev;
    const chap = parseInt(data.chap, 10);
    const timer = window.setTimeout(() => commitReadingLog(abbrev, chap), FOOTPRINT_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [data, commitReadingLog]);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams();
    const q = data.mode === 'verse'
      ? `${getBookName(data.abbrev)} ${data.chap}${data.sec ? `:${data.sec}` : ''}`
      : data.keyword;
    if (!q) return;
    params.set('q', q);
    // 0809:網址列不再寫 v=(譯本組合)——寫了等於把「當下勾選」封進書籤/分享連結,
    // 下次冷啟動或別人打開時就把人家存好的譯本偏好永久蓋掉。深連結要指定譯本仍可手寫 ?v=。
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', next);
    }
    if (data.mode === 'verse' && data.abbrev) {
      setBookmark({
        abbrev: data.abbrev,
        chap: data.chap,
        sec: data.sec || '',
        label: `${getBookName(data.abbrev)} ${data.chap}${data.sec ? `:${data.sec}` : ''}`,
        ts: new Date().toISOString(),
      });
    }
  }, [data, versions, setBookmark]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.body.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_META_COLORS[resolvedTheme] || THEME_META_COLORS.light);
  }, [resolvedTheme]);

  useEffect(() => {
    const handler = (e) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !inField) {
        e.preventDefault();
        document.getElementById('bible-search-input')?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (inField) {
          document.activeElement.blur();
        } else if (data) {
          setData(null);
          window.history.replaceState(null, '', window.location.pathname);
        }
        return;
      }
      if (inField) return;
      if (e.key === '?') {
        e.preventDefault();
        window.alert([
          '鍵盤快速鍵',
          '/  聚焦搜尋框',
          'j  下一章 / 下一節',
          'k  上一章 / 上一節',
          'c  複製已勾選經文',
          'Esc 清除/離開',
          '?  顯示說明',
        ].join('\n'));
        return;
      }
      if (e.key === 'c') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('global-copy'));
        return;
      }
      if ((e.key === 'j' || e.key === 'k') && data?.mode === 'verse' && data.abbrev && bibleStructure) {
        e.preventDefault();
        const dir = e.key === 'j' ? 1 : -1;
        const bookData = bibleStructure.find((b) => b.abbrev === data.abbrev);
        if (!bookData) return;
        const bookName = getBookName(data.abbrev);
        const chapNum = parseInt(data.chap, 10);
        const isSingleVerse = data.sec && !String(data.sec).includes('-');
        if (isSingleVerse) {
          const secNum = parseInt(data.sec, 10);
          const totalVerses = bookData.chapters[chapNum - 1]?.length || 0;
          const next = secNum + dir;
          if (next >= 1 && next <= totalVerses) {
            handleSearch(`${bookName} ${chapNum}:${next}`, versions, data.searchOptions || {});
          }
        } else {
          const next = chapNum + dir;
          if (next >= 1 && next <= bookData.chapters.length) {
            handleSearch(`${bookName} ${next}`, versions, data.searchOptions || {});
          }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [data, bibleStructure, handleSearch, versions]);

  // 0809 譯本偏好防蓋:重跑歷史=「用我現在的譯本組合再查一次」——
  // 舊版會把該筆歷史「當時」的勾選 setVersions 回去,等於每點一筆舊查詢就把使用者現在的預設蓋掉。
  const runHistory = useCallback((item) => {
    handleSearch(item.query, versions, item.options || {});
  }, [handleSearch, versions]);

  const [backupNudgeTick, setBackupNudgeTick] = useState(0);
  const backupNudge = useMemo(
    () => backupNudgeInfo(readingLog, history),
    [readingLog, history, backupNudgeTick], // eslint-disable-line react-hooks/exhaustive-deps -- tick 只為了讓匯出/稍後提醒後重算
  );
  const snoozeBackupNudge = useCallback(() => {
    try { localStorage.setItem(BACKUP_SNOOZE_KEY, String(Date.now())); } catch { /* noop */ }
    setBackupNudgeTick((t) => t + 1);
  }, []);

  const exportData = useCallback(() => {
    const payload = {
      app: '多譯本聖經查詢',
      version: 2,
      exportedAt: new Date().toISOString(),
      history,
      readingProgress,
      readingLog,
      planConfig,
      settings: {
        versions,
        fontSize,
        theme,
        copyFormat,
        diffEnabled,
        diffBase,
        bookmark,
        speakRate: getSpeakRateRaw(),
        speakVersion: getSpeakVer(),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bible-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    try { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); } catch { /* noop */ }
    setBackupNudgeTick((t) => t + 1);
  }, [history, readingProgress, readingLog, planConfig, versions, fontSize, theme, copyFormat, diffEnabled, diffBase, bookmark]);

  const importData = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    if (Array.isArray(payload.history)) {
      setHistory((prev) => [...payload.history, ...prev].slice(0, 80));
    }
    if (payload.readingProgress && typeof payload.readingProgress === 'object') {
      setReadingProgress((prev) => ({ ...prev, ...payload.readingProgress }));
    }
    if (isValidPlanConfig(payload.planConfig)) {
      setPlanConfig({ years: Number(payload.planConfig.years), start: payload.planConfig.start });
    }
    if (payload.readingLog && typeof payload.readingLog === 'object') {
      setReadingLog((prev) => {
        const log = prev && typeof prev === 'object' ? prev : {};
        const incoming = payload.readingLog;
        const m = { ...(log.m || {}) };
        Object.entries(incoming.m || {}).forEach(([ym, bucket]) => {
          m[ym] = { ...(m[ym] || {}) };
          Object.entries(bucket || {}).forEach(([k, n]) => {
            if (Number.isFinite(n)) m[ym][k] = (m[ym][k] || 0) + n;
          });
        });
        const d = { ...(log.d || {}) };
        Object.entries(incoming.d || {}).forEach(([ymd, n]) => {
          if (Number.isFinite(n)) d[ymd] = (d[ymd] || 0) + n;
        });
        return { ...log, enabled: log.enabled !== false, m, d };
      });
    }
    const settings = payload.settings;
    if (settings && typeof settings === 'object') {
      if (Array.isArray(settings.versions)) {
        const valid = settings.versions.filter((id) => VERSIONS.some((v) => v.id === id));
        if (valid.length > 0) setVersions(valid);
      }
      if (Number.isFinite(settings.fontSize)) setFontSize(Math.min(40, Math.max(10, settings.fontSize)));
      if (typeof settings.theme === 'string') setTheme(settings.theme);
      if (COPY_FORMAT_OPTIONS.some((o) => o.id === settings.copyFormat)) setCopyFormat(settings.copyFormat);
      if (typeof settings.diffEnabled === 'boolean') setDiffEnabled(settings.diffEnabled);
      if (typeof settings.diffBase === 'string') setDiffBase(settings.diffBase);
      if (settings.bookmark && typeof settings.bookmark === 'object' && settings.bookmark.label) setBookmark(settings.bookmark);
      // A3:朗讀偏好還原(raw 寫入;朗讀元件下次讀取時生效)
      if (typeof settings.speakRate === 'string' && settings.speakRate) setSpeakRateRaw(settings.speakRate);
      if (typeof settings.speakVersion === 'string' && VERSIONS.some((v) => v.id === settings.speakVersion)) setSpeakVerRaw(settings.speakVersion);
    }
  }, [setHistory, setReadingProgress, setReadingLog, setPlanConfig, setVersions, setFontSize, setTheme, setCopyFormat, setDiffEnabled, setDiffBase, setBookmark]);

  return (
    <div id="top" data-theme={resolvedTheme} className={simpleMode ? 'simple-mode' : undefined} style={{ ...themeVars, ...S.bg, padding: 0, paddingTop: topBarH, paddingBottom: 32, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 16px' }}>
        <SearchBar onSearch={handleSearch} isLoading={loading} versions={versions} setVersions={setVersions} bibleStructure={bibleStructure} diffEnabled={diffEnabled} setDiffEnabled={setDiffEnabled} diffBase={diffBase} setDiffBase={setDiffBase} topBarH={topBarH} simpleMode={simpleMode} setSimpleMode={setSimpleMode} />
        <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} fixed topSlot={<ViewTabs view={view} setView={setView} big />} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <InstallButton />
          {bookmark && (
            <button
              type="button"
              onClick={() => handleSearch(bookmark.label, versions, {})}
              style={{ background: 'linear-gradient(145deg, #fb923c, #c2410c)', color: 'white', border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 6px rgba(194,65,12,0.25)' }}
              title={`上次讀到 ${bookmark.label} (${formatDateTime(bookmark.ts)})`}
            >
              繼續上次閱讀: {bookmark.label}
            </button>
          )}
          <ThemeModeControl theme={normalizedTheme} resolvedTheme={resolvedTheme} setTheme={setTheme} />
        </div>
        {view === 'library' && (
          <>
            <FootprintCard
              readingLog={readingLog}
              bibleStructure={bibleStructure}
              onNavigate={(q) => handleSearch(q, versions, {})}
            />
            <UserLibrary
              history={history}
              onRunHistory={runHistory}
              onClearHistory={() => { if (window.confirm('確定清空全部查詢歷史?清掉就找不回來了。')) setHistory([]); }}
              onDeleteHistory={(id) => setHistory((prev) => prev.filter((item) => item.id !== id))}
              onExport={exportData}
              onImport={importData}
              backupNudge={backupNudge}
              onSnoozeBackup={snoozeBackupNudge}
            />
            <DailyTools
              bibleStructure={bibleStructure}
              readingProgress={readingProgress}
              setReadingProgress={setReadingProgress}
              onNavigate={(q) => handleSearch(q, versions, {})}
              planConfig={planConfig}
              setPlanConfig={setPlanConfig}
            />
          </>
        )}
        {view === 'home' && (
          <>
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 12, padding: 16, textAlign: 'center', maxWidth: 900, margin: '0 auto 24px', fontSize: 14, color: 'var(--danger-text)' }}>警告：{error}</div>}
            {loading && <div style={{ textAlign: 'center', color: 'var(--subtle-text)', padding: '64px 0', fontSize: 18, fontWeight: 700 }}>搜尋中，請稍候...</div>}
            {!loading && data && data.mode === 'verse' && (
              <VerseViewer
                data={data}
                bibleStructure={bibleStructure}
                onNavigate={(q) => handleSearch(q, versions, data.searchOptions || {})}
                fontSize={fontSize}
                setFontSize={setFontSize}
                diffEnabled={diffEnabled}
                diffBase={diffBase}
                copyFormat={copyFormat}
                setCopyFormat={setCopyFormat}
              />
            )}
            {!loading && data && data.mode === 'keyword' && (
              <KeywordViewer
                data={data}
                onNavigate={(q) => handleSearch(q, versions, data.searchOptions || {})}
                fontSize={fontSize}
                setFontSize={setFontSize}
                diffEnabled={diffEnabled}
                diffBase={diffBase}
                copyFormat={copyFormat}
                setCopyFormat={setCopyFormat}
              />
            )}
          </>
        )}
        <footer style={{ marginTop: 48, textAlign: 'center', color: 'var(--muted-text)', fontSize: 12, paddingBottom: 32 }}>
          資料來源：信望愛 (FHL) 聖經、本機 JSON、8 種譯本離線可用 · 串珠資料：openbible.info (CC-BY)
          <div style={{ marginTop: 6 }}>
            <a href="https://hfpc-play-stats.summer09201017.workers.dev/stats" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              📊 使用統計（同工用）
            </a>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7 }}>
            build {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'}
          </div>
        </footer>
      </div>
      <Toast />
      <BackToTopButton />
    </div>
  );
}
