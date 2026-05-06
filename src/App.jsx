import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { fetchBible, VERSIONS } from './api';
import { bookMap } from './bible_books';

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

const HIGHLIGHT_COLORS = [
  { id: '', label: '無', color: '#ffffff' },
  { id: '#fff3a3', label: '黃', color: '#fff3a3' },
  { id: '#d9f99d', label: '綠', color: '#d9f99d' },
  { id: '#bfdbfe', label: '藍', color: '#bfdbfe' },
  { id: '#fbcfe8', label: '粉', color: '#fbcfe8' },
  { id: '#ddd6fe', label: '紫', color: '#ddd6fe' },
];

const LS_KEYS = {
  history: 'bible-tool-history-v1',
  annotations: 'bible-tool-annotations-v1',
  versions: 'bible-tool-versions-v1',
  fontSize: 'bible-tool-font-size-v1',
  diffEnabled: 'bible-tool-diff-enabled-v1',
  diffBase: 'bible-tool-diff-base-v1',
  bookmark: 'bible-tool-bookmark-v1',
  copyFormat: 'bible-tool-copy-format-v1',
  theme: 'bible-tool-theme-v1',
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
  smallBtn: { border: '1px solid var(--border-strong)', background: 'var(--input-bg)', color: 'var(--heading-text)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  dangerBtn: { border: '1px solid var(--danger-border)', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  textarea: { width: '100%', minHeight: 72, resize: 'vertical', border: '1px solid var(--border-strong)', borderRadius: 8, padding: 8, fontSize: 13, lineHeight: 1.5, outline: 'none', background: 'var(--input-bg)', color: 'var(--page-text)' },
};

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

function getVerseKey(ref) {
  return `${ref.abbrev}:${ref.chap}:${ref.sec}`;
}

function makeReference(abbrev, chap, sec) {
  const bEntry = bookMap.find((b) => b.localAbbrev === abbrev);
  const bookName = bEntry ? bEntry.names[0] : abbrev;
  return {
    abbrev,
    chap: Number(chap),
    sec: Number(sec),
    label: `${bookName} ${chap}:${sec}`,
    bookName,
  };
}

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

function shareToLine(text) {
  window.open(`https://social-plugins.line.me/lineit/share?url=&text=${encodeURIComponent(text)}`, '_blank');
}

function shareToEmail(text) {
  window.location.href = `mailto:?subject=${encodeURIComponent('聖經經文分享')}&body=${encodeURIComponent(text)}`;
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

function softColor(color) {
  if (!color) return 'transparent';
  return `linear-gradient(90deg, ${color} 0%, ${color}99 45%, transparent 100%)`;
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

function FhlLink({ abbrev, chap, sec }) {
  const url = getFhlCommentaryUrl(abbrev, chap, sec);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="開啟信望愛站註釋資料" style={{ color: 'var(--warning-text)', fontSize: 12, textDecoration: 'none', cursor: 'pointer', marginLeft: 8, padding: '2px 6px', border: '1px solid var(--warning-border)', borderRadius: 5, backgroundColor: 'var(--warning-bg)', fontWeight: 700, display: 'inline-block' }}>
      註釋
    </a>
  );
}

function ActionBar({ getSelectedText, selectedCount, large, isTop, copyFormat, setCopyFormat }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const text = getSelectedText();
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const disabled = selectedCount === 0;
  const disabledStyle = disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {};
  const copySize = large ? { padding: '14px 20px', fontSize: 18, minWidth: 220, flexGrow: 1, justifyContent: 'center' } : { padding: '6px 14px', fontSize: 12 };
  const shareSize = large ? { padding: '10px 18px', fontSize: 15 } : { padding: '6px 14px', fontSize: 12 };

  return (
    <div style={{ ...S.actionBar, padding: '14px 16px', position: 'sticky', bottom: isTop ? 'auto' : 0, top: isTop ? 44 : 'auto', zIndex: 9, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: large ? 15 : 12, color: 'var(--soft-text)', marginRight: 4, whiteSpace: 'nowrap' }}>
        已選 <strong style={{ color: 'var(--subtle-text)' }}>{selectedCount}</strong> 節
      </span>
      <button type="button" onClick={handleCopy} disabled={disabled} className="btn-active-effect" style={{ ...(copied ? S.btnCopied : S.btnCopy), ...disabledStyle, ...copySize, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {copied ? '已複製' : '複製經文'}
      </button>
      {setCopyFormat && (
        <select
          value={copyFormat || 'plain'}
          onChange={(e) => setCopyFormat(e.target.value)}
          title="複製格式"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: 'var(--heading-text)', fontWeight: 700, cursor: 'pointer' }}
        >
          {COPY_FORMAT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      )}
      <button type="button" onClick={() => shareToLine(getSelectedText())} disabled={disabled} className="btn-active-effect" style={{ ...S.btnLine, ...disabledStyle, ...shareSize }}>
        分享到 Line
      </button>
      <button type="button" onClick={() => shareToEmail(getSelectedText())} disabled={disabled} className="btn-active-effect" style={{ ...S.btnEmail, ...disabledStyle, ...shareSize }}>
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

function SearchBar({ onSearch, isLoading, versions, setVersions, bibleStructure, diffEnabled, setDiffEnabled, diffBase, setDiffBase }) {
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
    const q = query.trim();
    if (q.length < 2) return undefined;
    const timeout = window.setTimeout(() => onSearch(q, versions, searchOptions), q.length === 2 ? 120 : 260);
    return () => window.clearTimeout(timeout);
  }, [query, versions, searchOptions, onSearch]);

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
    <div style={{ ...S.card, padding: '72px 24px 24px', marginTop: -56, marginBottom: 0, borderRadius: 0, position: 'relative', zIndex: 5 }}>
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
          placeholder="關鍵字或書卷章節，例如：愛心、創 1、John 3:16 (按 / 聚焦, 按 ? 快速鍵說明)"
          id="bible-search-input"
          style={{ ...S.input, width: '100%', padding: '14px 18px', fontSize: 16, outline: 'none' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--subtle-text)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-strong)'; }}
        />

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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
        {[
          ...versions.map((vid) => VERSIONS.find((v) => v.id === vid)).filter(Boolean),
          ...VERSIONS.filter((v) => v.id !== 'web' && !versions.includes(v.id)),
        ].map((v) => {
          const isActive = versions.includes(v.id);
          const idx = isActive ? versions.indexOf(v.id) : -1;
          const isFirst = idx === 0;
          const isLast = idx === versions.length - 1;
          return (
            <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
              {isActive && !isFirst && (
                <button type="button" onClick={() => moveVersion(v.id, -1)} title="往左移" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 4px', fontSize: 12, color: 'var(--heading-text)', fontWeight: 800 }}>◀</button>
              )}
              <label style={isActive ? { ...S.pillActive, padding: '6px 16px', fontSize: 13 } : { ...S.pillInactive, padding: '6px 16px', fontSize: 13 }}>
                <input type="checkbox" style={{ display: 'none' }} checked={isActive} onChange={() => handleVersionToggle(v.id)} />
                {v.label}
              </label>
              {isActive && !isLast && (
                <button type="button" onClick={() => moveVersion(v.id, 1)} title="往右移" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 4px', fontSize: 12, color: 'var(--heading-text)', fontWeight: 800 }}>▶</button>
              )}
            </span>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted-text)', marginBottom: 12 }}>
        點選譯本切換顯示, 用 ◀▶ 調整顯示順序
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: showAdvanced ? 12 : 0 }}>
        <button type="button" onClick={() => setShowAdvanced((v) => !v)} style={S.smallBtn}>
          {showAdvanced ? '收合進階搜尋' : '進階搜尋'}
        </button>
        {typeof diffEnabled === 'boolean' && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--page-text)', fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" checked={diffEnabled} onChange={(e) => setDiffEnabled(e.target.checked)} />
            差異高亮
          </label>
        )}
        {diffEnabled && versions.length >= 2 && (() => {
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

function AnnotationEditor({ reference, annotation, onChange }) {
  const [open, setOpen] = useState(false);
  const current = annotation || {};
  const hasData = Boolean(current.favorite || current.note || current.color);

  const update = (patch) => onChange(reference, patch);
  const clear = () => onChange(reference, { note: '', color: '', favorite: false, clear: true });

  return (
    <div style={{ marginTop: 8, width: '100%' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => update({ favorite: !current.favorite })} style={{ ...S.smallBtn, background: current.favorite ? 'var(--warning-bg)' : 'var(--input-bg)', borderColor: current.favorite ? 'var(--warning-border)' : 'var(--border-strong)', color: current.favorite ? 'var(--warning-text)' : 'var(--heading-text)' }}>
          {current.favorite ? '已收藏' : '收藏'}
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} style={S.smallBtn}>
          {current.note ? '編輯筆記' : '筆記'}
        </button>
        {hasData && <button type="button" onClick={clear} style={S.dangerBtn}>清除</button>}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => update({ color: c.id })}
            title={`${c.label}螢光筆`}
            style={{ width: 22, height: 22, borderRadius: 6, border: current.color === c.id ? '2px solid #166534' : '1px solid #94a3b8', background: c.color, cursor: 'pointer' }}
          />
        ))}
      </div>
      {open && (
        <textarea
          value={current.note || ''}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="在這節旁寫筆記..."
          style={{ ...S.textarea, marginTop: 8 }}
        />
      )}
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

function FontSizeControl({ fontSize, setFontSize, fixed }) {
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--topbar-bg)', padding: '8px 16px', borderBottom: '2px solid var(--border-strong)', boxShadow: 'var(--topbar-shadow)' }}>
        {content}
      </div>
    );
  }

  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>{content}</div>;
}

function EmptyState({ text }) {
  return <div style={{ textAlign: 'center', color: 'var(--muted-text)', padding: '48px 0', ...S.resultCard }}>{text}</div>;
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

function VerseViewer({ data, bibleStructure, onNavigate, fontSize, setFontSize, annotations, onAnnotationChange, diffEnabled, diffBase, copyFormat, setCopyFormat }) {
  const { results } = data;
  const [selected, setSelected] = useState(new Set());
  const verseNums = useMemo(() => {
    const set = new Set();
    results.forEach((res) => res.record?.forEach((r) => set.add(r.sec)));
    return Array.from(set).sort((a, b) => a - b);
  }, [results]);
  const cols = results.length;
  const bookName = getBookName(data.abbrev);

  useEffect(() => setSelected(new Set()), [data]);

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

  useEffect(() => {
    const handler = () => {
      const text = getSelectedText();
      if (text) {
        copyToClipboard(text);
        window.alert('已複製勾選的經文');
      } else {
        window.alert('請先勾選要複製的經文');
      }
    };
    document.addEventListener('global-copy', handler);
    return () => document.removeEventListener('global-copy', handler);
  }, [getSelectedText]);

  if (verseNums.length === 0) return <EmptyState text="找不到相關經文" />;

  return (
    <div style={S.resultCard}>
      <ChapterNavBar data={data} bibleStructure={bibleStructure} onNavigate={onNavigate} />
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large isTop copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
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
          const reference = makeReference(data.abbrev, Number(data.chap), vNum);
          const annotation = annotations[getVerseKey(reference)];
          const baseText = getBaseTextForVerse(results, null, vNum, null, diffBase);
          const rowBackground = selected.has(vNum) ? 'var(--selected-row-bg)' : softColor(annotation?.color);
          return (
            <div key={vNum} style={{ borderBottom: '1px solid var(--row-border)', background: rowBackground, transition: 'background 0.15s' }}>
              <div className="responsive-row" style={{ display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: 16 }}>
                <div className="responsive-checkbox-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input type="checkbox" checked={selected.has(vNum)} onChange={() => toggleVerse(vNum)} style={S.checkbox} />
                    <a onClick={(e) => { e.preventDefault(); onNavigate(`${bookName} ${data.chap}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} href="#top" className="mobile-verse-label" style={{ color: 'var(--link-text)', textDecoration: 'underline', cursor: 'pointer' }} title={`跳到 ${data.chap} 章`}>
                      第 {vNum} 節
                    </a>
                    <FhlLink abbrev={data.abbrev} chap={data.chap} sec={vNum} />
                    <CopyVerseButton
                      getText={() => {
                        const sel = getSelectedText();
                        return sel || getSingleVerseText(vNum);
                      }}
                      countLabel={selected.size > 0 ? `複製 ${selected.size} 節` : '複製本節'}
                    />
                  </div>
                  <AnnotationEditor reference={reference} annotation={annotation} onChange={onAnnotationChange} />
                </div>
                {results.map((res) => {
                  const vd = res.record?.find((r) => r.sec === vNum);
                  const text = vd?.bible_text || '--';
                  const vi = VERSIONS.find((v) => v.id === res.version);
                  const col = VERSION_COLORS[res.version] || 'var(--page-text)';
                  return (
                    <div key={res.version} className="verse-text-content" style={{ color: col, lineHeight: 1.75, fontSize: fontSize || 15 }}>
                      <div className="mobile-version-name" style={{ color: col }}>{vi?.label}</div>
                      <a onClick={(e) => { e.preventDefault(); onNavigate(`${bookName} ${data.chap}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }} href="#top" className="desktop-verse-num" style={{ color: 'var(--link-text)', fontSize: 13, fontWeight: 700, marginRight: 6, verticalAlign: 'top', textDecoration: 'underline', cursor: 'pointer' }} title={`跳到 ${data.chap} 章`}>
                        {vNum}
                      </a>
                      <VerseText text={text} compareText={diffEnabled ? baseText : ''} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
      <ChapterNavBar data={data} bibleStructure={bibleStructure} onNavigate={onNavigate} />
    </div>
  );
}

const PAGE_SIZE = 50;

function KeywordViewer({ data, onNavigate, fontSize, setFontSize, annotations, onAnnotationChange, diffEnabled, diffBase, copyFormat, setCopyFormat }) {
  const { results, keyword } = data;
  const [selected, setSelected] = useState(new Set());
  const [topCopied, setTopCopied] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const verses = useMemo(() => {
    const verseMap = new Map();
    results.forEach((res) => {
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
  }, [results]);
  const totalCount = results.reduce((sum, result) => sum + (Number.isInteger(result.matchedCount) ? result.matchedCount : (result.record?.length || 0)), 0);
  const cols = results.length;

  useEffect(() => {
    setSelected(new Set());
    setDisplayLimit(PAGE_SIZE);
  }, [data]);

  const visibleVerses = useMemo(() => verses.slice(0, displayLimit), [verses, displayLimit]);
  const hasMore = verses.length > displayLimit;

  const toggleVerse = (key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };
  const toggleAll = () => setSelected(selected.size === verses.length ? new Set() : new Set(verses.map((v) => v.key)));

  const getSelectedText = useCallback(() => {
    const lines = [];
    for (const vo of verses) {
      if (!selected.has(vo.key)) continue;
      results.forEach((res) => {
        const vi = VERSIONS.find((v) => v.id === res.version);
        const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${getBookName(vo.localAbbrev)} ${vo.chap}:${vo.sec}`, text: stripTags(vd.bible_text) });
      });
    }
    return formatVersesForShare(lines, copyFormat);
  }, [selected, verses, results, copyFormat]);

  const getSingleVerseTextForKeyword = useCallback((vo) => {
    const lines = [];
    results.forEach((res) => {
      const vi = VERSIONS.find((v) => v.id === res.version);
      const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
      if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${getBookName(vo.localAbbrev)} ${vo.chap}:${vo.sec}`, text: stripTags(vd.bible_text) });
    });
    return formatVersesForShare(lines, copyFormat);
  }, [results, copyFormat]);

  const handleTopCopy = useCallback(async () => {
    const lines = [];
    for (const vo of verses) {
      results.forEach((res) => {
        const vi = VERSIONS.find((v) => v.id === res.version);
        const vd = res.record?.find((r) => r.localAbbrev === vo.localAbbrev && r.chap === vo.chap && r.sec === vo.sec);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${getBookName(vo.localAbbrev)} ${vo.chap}:${vo.sec}`, text: stripTags(vd.bible_text) });
      });
    }
    const text = formatVersesForShare(lines, copyFormat);
    if (text) {
      await copyToClipboard(text);
      setTopCopied(true);
      window.setTimeout(() => setTopCopied(false), 2000);
    }
  }, [verses, results, copyFormat]);

  useEffect(() => {
    const handler = () => {
      if (selected.size === 0) {
        handleTopCopy();
        window.alert('已複製全部經文');
      } else {
        const text = getSelectedText();
        copyToClipboard(text);
        window.alert('已複製勾選的經文');
      }
    };
    document.addEventListener('global-copy', handler);
    return () => document.removeEventListener('global-copy', handler);
  }, [selected.size, handleTopCopy, getSelectedText]);

  if (verses.length === 0) return <EmptyState text={`找不到含有「${keyword}」的經文`} />;

  const goToChapter = (localAbbrev, chap) => {
    onNavigate(`${getBookName(localAbbrev)} ${chap}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={S.resultCard}>
      <div style={{ ...S.statsBar, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
        <span style={{ color: 'var(--warning-text)', fontSize: 14, fontWeight: 700 }}>關鍵字：<strong>「{keyword}」</strong></span>
        <span style={{ color: 'var(--warning-strong-text)', fontSize: 14 }}>共 <strong>{totalCount}</strong> 筆命中（{verses.length} 節）<span style={{ color: 'var(--muted-text)', fontSize: 12, marginLeft: 6, fontWeight: 500 }}>{data.timeMs ? `${data.timeMs}ms` : ''}</span></span>
        <button type="button" onClick={handleTopCopy} className="btn-active-effect" style={{ ...(topCopied ? S.btnCopied : S.btnCopy), padding: '13px 24px', fontSize: 17, minWidth: 210, flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {topCopied ? '已複製全部' : '複製全部經文'}
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
          {results.map((r) => {
            const vi = VERSIONS.find((v) => v.id === r.version);
            const count = Number.isInteger(r.matchedCount) ? r.matchedCount : (r.record?.length ?? 0);
            return <span key={r.version} style={{ fontSize: 11, border: '1px solid var(--warning-border)', color: VERSION_COLORS[r.version] || 'var(--warning-strong-text)', borderRadius: 999, padding: '2px 8px', fontWeight: 700, background: 'var(--warning-bg)' }}>{vi?.label}: {count}</span>;
          })}
        </div>
      </div>
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large isTop copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
      <div className="responsive-header" style={{ ...S.tableHeader, display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="checkbox" checked={selected.size === verses.length && verses.length > 0} onChange={toggleAll} style={S.checkbox} />
        </div>
        {results.map((res) => {
          const vi = VERSIONS.find((v) => v.id === res.version);
          return <div key={res.version} style={{ fontWeight: 800, color: VERSION_COLORS[res.version] || 'var(--page-text)', textAlign: 'center', fontSize: 14 }}>{vi?.label}</div>;
        })}
      </div>
      <div>
        {visibleVerses.map((vo) => {
          const reference = makeReference(vo.localAbbrev, vo.chap, vo.sec);
          const annotation = annotations[getVerseKey(reference)];
          const baseText = getBaseTextForVerse(results, vo.chap, vo.sec, vo.chineses, diffBase);
          const rowBackground = selected.has(vo.key) ? 'var(--keyword-selected-row-bg)' : softColor(annotation?.color);
          return (
            <div key={vo.key} style={{ borderBottom: '1px solid var(--row-border)', background: rowBackground, transition: 'background 0.15s' }}>
              <div className="responsive-row" style={{ display: 'grid', gridTemplateColumns: `52px repeat(${cols}, 1fr)`, gap: 16, padding: 16 }}>
                <div className="responsive-checkbox-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input type="checkbox" checked={selected.has(vo.key)} onChange={() => toggleVerse(vo.key)} style={S.checkbox} />
                    <a onClick={(e) => { e.preventDefault(); goToChapter(vo.localAbbrev, vo.chap); }} href="#top" className="mobile-verse-label" style={{ color: 'var(--link-text)', textDecoration: 'underline', cursor: 'pointer' }} title={`查看 ${getBookName(vo.localAbbrev)} 第 ${vo.chap} 章`}>
                      {getBookName(vo.localAbbrev)} {vo.chap}:{vo.sec}
                    </a>
                    <FhlLink abbrev={vo.localAbbrev} chap={vo.chap} sec={vo.sec} />
                    <CopyVerseButton
                      getText={() => {
                        const sel = getSelectedText();
                        return sel || getSingleVerseTextForKeyword(vo);
                      }}
                      countLabel={selected.size > 0 ? `複製 ${selected.size} 節` : '複製本節'}
                    />
                  </div>
                  <AnnotationEditor reference={reference} annotation={annotation} onChange={onAnnotationChange} />
                </div>
                {results.map((res) => {
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
            載入更多 ({verses.length - displayLimit} 節未顯示)
          </button>
        </div>
      )}
      <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large copyFormat={copyFormat} setCopyFormat={setCopyFormat} />
    </div>
  );
}

function UserLibrary({ history, annotations, onRunHistory, onClearHistory, onDeleteHistory, onRunAnnotation, onDeleteAnnotation, onExport, onImport }) {
  const fileInputRef = useRef(null);
  const annotationItems = useMemo(() => Object.entries(annotations)
    .map(([key, value]) => ({ key, ...value }))
    .filter((item) => item.favorite || item.note || item.color)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)), [annotations]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(JSON.parse(reader.result));
        window.alert('匯入完成');
      } catch {
        window.alert('匯入失敗：JSON 格式不正確');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ ...S.card, maxWidth: 1180, margin: '0 auto 22px', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: 'var(--heading-text)', fontSize: 18 }}>我的查詢與筆記</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onExport} style={S.smallBtn}>匯出 JSON</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={S.smallBtn}>匯入 JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))', gap: 14 }}>
        <section style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: 12, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: 'var(--subtle-text)', fontSize: 15 }}>查詢歷史</h3>
            {history.length > 0 && <button type="button" onClick={onClearHistory} style={S.dangerBtn}>清空</button>}
          </div>
          {history.length === 0 && <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 13 }}>查詢後會自動保留最近紀錄。</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflow: 'auto' }}>
            {history.slice(0, 12).map((item) => (
              <div key={item.id} style={{ border: '1px solid var(--border-muted)', borderRadius: 8, padding: 8, background: 'var(--surface-solid)', minWidth: 0, overflow: 'hidden' }}>
                <button type="button" onClick={() => onRunHistory(item)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  <strong style={{ color: 'var(--page-text)', fontSize: 14 }}>{item.query}</strong>
                  <div style={{ color: 'var(--muted-text)', fontSize: 12, marginTop: 3 }}>
                    {formatDateTime(item.ts)} · {item.resultCount} 筆
                  </div>
                </button>
                <button type="button" onClick={() => onDeleteHistory(item.id)} style={{ ...S.dangerBtn, marginTop: 6 }}>刪除</button>
              </div>
            ))}
          </div>
        </section>
        <section style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: 12, minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 8px', color: 'var(--subtle-text)', fontSize: 15 }}>收藏 / 筆記 / 螢光筆</h3>
          {annotationItems.length === 0 && <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: 13 }}>在經文旁可收藏、標色與寫筆記。</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflow: 'auto' }}>
            {annotationItems.slice(0, 30).map((item) => (
              <div key={item.key} style={{ border: '1px solid var(--border-muted)', borderRadius: 8, padding: 8, background: item.color || 'var(--surface-solid)', minWidth: 0, overflow: 'hidden' }}>
                <button type="button" onClick={() => onRunAnnotation(item)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  <strong style={{ color: 'var(--page-text)', fontSize: 14 }}>{item.label}</strong>
                  <div style={{ color: 'var(--soft-text)', fontSize: 12, marginTop: 3 }}>{item.favorite ? '已收藏' : '已標記'} · {formatDateTime(item.updatedAt)}</div>
                  {item.note && <p style={{ margin: '6px 0 0', color: 'var(--page-text)', fontSize: 13, lineHeight: 1.45, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{item.note}</p>}
                </button>
                <button type="button" onClick={() => onDeleteAnnotation(item)} style={{ ...S.dangerBtn, marginTop: 6 }}>刪除</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
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
  const [fontSize, setFontSize] = usePersistentState(LS_KEYS.fontSize, 15);
  const [diffEnabled, setDiffEnabled] = usePersistentState(LS_KEYS.diffEnabled, true);
  const [diffBase, setDiffBase] = usePersistentState(LS_KEYS.diffBase, '');
  const [history, setHistory] = usePersistentState(LS_KEYS.history, []);
  const [annotations, setAnnotations] = usePersistentState(LS_KEYS.annotations, {});
  const [bibleStructure, setBibleStructure] = useState(null);
  const [bookmark, setBookmark] = usePersistentState(LS_KEYS.bookmark, null);
  const [copyFormat, setCopyFormat] = usePersistentState(LS_KEYS.copyFormat, 'plain');
  const [theme, setTheme] = usePersistentState(LS_KEYS.theme, 'light');
  const searchSeqRef = useRef(0);

  useEffect(() => {
    fetch('/data/unv.json')
      .then((r) => r.json())
      .then((structure) => setBibleStructure(structure))
      .catch((err) => console.error('Error loading bible structure:', err));
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
      handleSearch(bookmark.label, versions, {});
      return;
    }
    const q = params.get('q');
    if (!q) return;
    initialUrlSearchedRef.current = true;
    const vParam = params.get('v');
    const urlVersions = vParam
      ? vParam.split(',').map((s) => s.trim()).filter((s) => VERSIONS.find((vv) => vv.id === s))
      : null;
    if (urlVersions && urlVersions.length > 0) setVersions(urlVersions);
    handleSearch(q, urlVersions && urlVersions.length > 0 ? urlVersions : versions, {});
  }, [handleSearch, setVersions, versions, bookmark]);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams();
    const q = data.mode === 'verse'
      ? `${getBookName(data.abbrev)} ${data.chap}${data.sec ? `:${data.sec}` : ''}`
      : data.keyword;
    if (!q) return;
    params.set('q', q);
    params.set('v', versions.join(','));
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
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

  const updateAnnotation = useCallback((reference, patch) => {
    setAnnotations((prev) => {
      const key = getVerseKey(reference);
      if (patch.clear) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const nextItem = {
        ...(prev[key] || {}),
        ...reference,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      const isEmpty = !nextItem.favorite && !nextItem.note && !nextItem.color;
      const next = { ...prev };
      if (isEmpty) delete next[key];
      else next[key] = nextItem;
      return next;
    });
  }, [setAnnotations]);

  const deleteAnnotation = useCallback((item) => {
    setAnnotations((prev) => {
      const next = { ...prev };
      delete next[item.key || getVerseKey(item)];
      return next;
    });
  }, [setAnnotations]);

  const runHistory = useCallback((item) => {
    if (Array.isArray(item.versions) && item.versions.length > 0) setVersions(item.versions);
    handleSearch(item.query, item.versions || versions, item.options || {});
  }, [handleSearch, setVersions, versions]);

  const runAnnotation = useCallback((item) => {
    const query = `${getBookName(item.abbrev)} ${item.chap}:${item.sec}`;
    handleSearch(query, versions, {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [handleSearch, versions]);

  const exportData = useCallback(() => {
    const payload = {
      app: '多譯本聖經查詢',
      version: 1,
      exportedAt: new Date().toISOString(),
      history,
      annotations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bible-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history, annotations]);

  const importData = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    if (Array.isArray(payload.history)) {
      setHistory((prev) => [...payload.history, ...prev].slice(0, 80));
    }
    if (payload.annotations && typeof payload.annotations === 'object') {
      setAnnotations((prev) => ({ ...prev, ...payload.annotations }));
    }
  }, [setHistory, setAnnotations]);

  return (
    <div id="top" style={{ ...S.bg, padding: 0, paddingTop: 56, paddingBottom: 32, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 16px' }}>
        <SearchBar onSearch={handleSearch} isLoading={loading} versions={versions} setVersions={setVersions} bibleStructure={bibleStructure} diffEnabled={diffEnabled} setDiffEnabled={setDiffEnabled} diffBase={diffBase} setDiffBase={setDiffBase} />
        <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} fixed />
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
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="切換深色/淺色"
            style={{ background: 'var(--input-bg)', color: 'var(--heading-text)', border: '2px solid var(--border-strong)', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {theme === 'dark' ? '☀ 淺色' : '🌙 深色'}
          </button>
        </div>
        <UserLibrary
          history={history}
          annotations={annotations}
          onRunHistory={runHistory}
          onClearHistory={() => setHistory([])}
          onDeleteHistory={(id) => setHistory((prev) => prev.filter((item) => item.id !== id))}
          onRunAnnotation={runAnnotation}
          onDeleteAnnotation={deleteAnnotation}
          onExport={exportData}
          onImport={importData}
        />
        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 12, padding: 16, textAlign: 'center', maxWidth: 900, margin: '0 auto 24px', fontSize: 14, color: 'var(--danger-text)' }}>警告：{error}</div>}
        {loading && <div style={{ textAlign: 'center', color: 'var(--subtle-text)', padding: '64px 0', fontSize: 18, fontWeight: 700 }}>搜尋中，請稍候...</div>}
        {!loading && data && data.mode === 'verse' && (
          <VerseViewer
            data={data}
            bibleStructure={bibleStructure}
            onNavigate={(q) => handleSearch(q, versions, data.searchOptions || {})}
            fontSize={fontSize}
            setFontSize={setFontSize}
            annotations={annotations}
            onAnnotationChange={updateAnnotation}
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
            annotations={annotations}
            onAnnotationChange={updateAnnotation}
            diffEnabled={diffEnabled}
            diffBase={diffBase}
            copyFormat={copyFormat}
            setCopyFormat={setCopyFormat}
          />
        )}
        <footer style={{ marginTop: 48, textAlign: 'center', color: 'var(--muted-text)', fontSize: 12, paddingBottom: 32 }}>
          資料來源：信望愛 (FHL) 聖經、本機 JSON、8 種譯本離線可用
        </footer>
      </div>
    </div>
  );
}
