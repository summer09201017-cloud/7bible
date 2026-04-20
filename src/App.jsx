import { useState, useCallback, useEffect } from 'react';
import { fetchBible, VERSIONS } from './api';
import { bookMap } from './bible_books';

// ─── Per-version text colors ─────────────────────────────────────────────────
const VERSION_COLORS = {
  unv: '#1a5276',   // 深藍 — 和合本
  niv: '#0277bd',   // 深天藍 — NIV
  esv: '#7b241c',   // 深紅 — ESV
  web: '#1e8449',   // 深綠 — WEB
  ncv: '#6c3483',   // 紫色 — 新譯本
  lzz: '#b9770e',   // 金棕 — 呂振中
  asv: '#2471a3',   // 鋼藍 — ASV
  kjv: '#a04000',   // 橘棕 — KJV
};

// ─── Reusable styles ─────────────────────────────────────────────────────────
const S = {
  bg: { background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 50%, #e0f2e1 100%)', minHeight: '100vh' },
  card: { background: 'linear-gradient(145deg, #ffffff, #f1f8e9)', boxShadow: '0 8px 24px rgba(76,175,80,0.12), 0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #c8e6c9', borderRadius: '16px' },
  input: { background: 'linear-gradient(145deg, #ffffff, #f9fff5)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,0.9)', border: '2px solid #a5d6a7', borderRadius: '12px' },
  btnSearch: { background: 'linear-gradient(145deg, #e53935, #b71c1c)', boxShadow: '0 4px 8px rgba(183,28,28,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', width: '100%' },
  btnCopy: { background: 'linear-gradient(145deg, #1e88e5, #0d47a1)', boxShadow: '0 3px 6px rgba(13,71,161,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnCopied: { background: 'linear-gradient(145deg, #43a047, #2e7d32)', boxShadow: '0 3px 6px rgba(46,125,50,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnLine: { background: 'linear-gradient(145deg, #4caf50, #1b5e20)', boxShadow: '0 3px 6px rgba(27,94,32,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnEmail: { background: 'linear-gradient(145deg, #ff9800, #e65100)', boxShadow: '0 3px 6px rgba(230,81,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  btnInstall: { background: 'linear-gradient(145deg, #7c4dff, #4527a0)', boxShadow: '0 4px 8px rgba(69,39,160,0.3), inset 0 1px 0 rgba(255,255,255,0.2)', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' },
  pillActive: { background: 'linear-gradient(145deg, #43a047, #2e7d32)', color: 'white', border: '1px solid #2e7d32', boxShadow: '0 3px 8px rgba(46,125,50,0.3), inset 0 1px 0 rgba(255,255,255,0.15)', borderRadius: '999px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' },
  pillInactive: { background: 'linear-gradient(145deg, #ffffff, #f5f5f5)', color: '#666', border: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)', borderRadius: '999px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' },
  tableHeader: { background: 'linear-gradient(145deg, #e8f5e9, #c8e6c9)', borderBottom: '1px solid #a5d6a7' },
  actionBar: { background: 'linear-gradient(to right, #e8f5e9, #f1f8e9)', borderTop: '1px solid #c8e6c9' },
  resultCard: { background: '#ffffff', boxShadow: '0 6px 20px rgba(76,175,80,0.08)', border: '1px solid #c8e6c9', borderRadius: '16px', overflow: 'hidden' },
  checkbox: { width: 18, height: 18, accentColor: '#2e7d32', cursor: 'pointer', flexShrink: 0 },
  statsBar: { background: 'linear-gradient(135deg, #fff9c4, #f1f8e9)', borderBottom: '1px solid #c8e6c9' },
  select: { background: 'linear-gradient(145deg, #ffffff, #f9fff5)', border: '2px solid #a5d6a7', borderRadius: '10px', padding: '10px 14px', fontSize: 14, outline: 'none', color: '#1b5e20', fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)', flex: 1, minWidth: 120 },
};

// ─── Highlight helper ────────────────────────────────────────────────────────
function HighlightText({ text, keyword }) {
  if (!keyword || !text) return <span>{text || '--'}</span>;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase()
          ? <mark key={i} style={{ background: '#fef08a', color: '#854d0e', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
          : part
      )}
    </span>
  );
}

// ─── Share / Copy helpers ────────────────────────────────────────────────────
function formatVersesForShare(selectedVerses) {
  if (!selectedVerses || selectedVerses.length === 0) return '';
  return selectedVerses.map(v => `${v.ref}\n${v.text}`).join('\n\n');
}
function shareToLine(text) {
  window.open(`https://social-plugins.line.me/lineit/share?url=&text=${encodeURIComponent(text)}`, '_blank');
}
function shareToEmail(text) {
  window.location.href = `mailto:?subject=${encodeURIComponent('聖經經文分享')}&body=${encodeURIComponent(text)}`;
}
async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); return true; }
}

// ─── ActionBar ───────────────────────────────────────────────────────────────
function ActionBar({ getSelectedText, selectedCount, large, isTop }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const text = getSelectedText(); if (!text) return;
    await copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const disabled = selectedCount === 0;
  const disabledStyle = disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {};
  const sz = large ? { padding: '16px 24px', fontSize: 20, minWidth: '250px', flexGrow: 1, justifyContent: 'center' } : { padding: '6px 14px', fontSize: 12 };
  const shareSz = large ? { padding: '12px 20px', fontSize: 16 } : { padding: '6px 14px', fontSize: 12 };
  return (
    <div style={{ ...S.actionBar, padding: '16px', position: 'sticky', bottom: isTop ? 'auto' : 0, top: isTop ? 44 : 'auto', zIndex: 9, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: large ? 16 : 12, color: '#555', marginRight: 4, whiteSpace: 'nowrap' }}>
        已選 <strong style={{ color: '#2e7d32' }}>{selectedCount}</strong> 節
      </span>
      <button onClick={handleCopy} disabled={disabled} className="btn-active-effect" style={{ ...(copied ? S.btnCopied : S.btnCopy), ...disabledStyle, ...sz, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {copied ? '✅ 已複製' : '📋 複製經文'}
      </button>
      <button onClick={() => shareToLine(getSelectedText())} disabled={disabled} className="btn-active-effect" style={{ ...S.btnLine, ...disabledStyle, ...shareSz, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        💬 分享到 Line
      </button>
      <button onClick={() => shareToEmail(getSelectedText())} disabled={disabled} className="btn-active-effect" style={{ ...S.btnEmail, ...disabledStyle, ...shareSz, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        ✉️ Email 分享
      </button>
    </div>
  );
}

// ─── ChapterNavBar ───────────────────────────────────────────────────────────
const btnNav = {
  background: 'linear-gradient(145deg, #43a047, #2e7d32)',
  color: 'white', border: 'none', borderRadius: 10, fontWeight: 700,
  cursor: 'pointer', padding: '6px 14px', fontSize: 13,
  boxShadow: '0 2px 5px rgba(46,125,50,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
  transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 4,
};
const btnNavDisabled = { ...btnNav, opacity: 0.35, cursor: 'not-allowed', boxShadow: 'none' };

function ChapterNavBar({ data, bibleStructure, onNavigate }) {
  if (!data || !bibleStructure || !onNavigate) return null;
  const { abbrev, chap, sec } = data;
  const chapNum = parseInt(chap);
  const bookData = bibleStructure.find(b => b.abbrev === abbrev);
  if (!bookData) return null;
  const totalChaps = bookData.chapters.length;
  const bInfo = bookMap.find(b => b.localAbbrev === abbrev);
  const bookName = bInfo ? bInfo.names[0] : abbrev;

  const hasPrevChap = chapNum > 1;
  const hasNextChap = chapNum < totalChaps;

  // 單節導航 (only when viewing a specific verse)
  const isSingleVerse = sec && !sec.includes('-');
  const secNum = isSingleVerse ? parseInt(sec) : 0;
  const totalVerses = bookData.chapters[chapNum - 1]?.length || 0;
  const hasPrevVerse = isSingleVerse && secNum > 1;
  const hasNextVerse = isSingleVerse && secNum < totalVerses;

  const go = (q) => { onNavigate(q); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div style={{ background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', borderTop: '1px solid #a5d6a7', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {/* 章導航 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          disabled={!hasPrevChap}
          onClick={() => go(`${bookName} ${chapNum - 1}`)}
          className="btn-active-effect"
          style={hasPrevChap ? btnNav : btnNavDisabled}
        >
          ◀ 上一章
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1b5e20', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          📖 {bookName} {chapNum} 章 {isSingleVerse ? `${secNum}節` : ''}
          {data.timeMs && <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 6, fontWeight: 500 }}>({data.timeMs}ms)</span>}
        </span>
        <button
          disabled={!hasNextChap}
          onClick={() => go(`${bookName} ${chapNum + 1}`)}
          className="btn-active-effect"
          style={hasNextChap ? btnNav : btnNavDisabled}
        >
          下一章 ▶
        </button>
      </div>
      {/* 節導航 (only when single verse) */}
      {isSingleVerse && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            disabled={!hasPrevVerse}
            onClick={() => go(`${bookName} ${chapNum}:${secNum - 1}`)}
            style={hasPrevVerse ? { ...btnNav, background: 'linear-gradient(145deg, #1e88e5, #0d47a1)', boxShadow: '0 3px 8px rgba(13,71,161,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' } : btnNavDisabled}
          >
            ◀ 上一節
          </button>
          <span style={{ fontSize: 13, color: '#555', display: 'flex', alignItems: 'center' }}>
            第 {secNum} / {totalVerses} 節
          </span>
          <button
            disabled={!hasNextVerse}
            onClick={() => go(`${bookName} ${chapNum}:${secNum + 1}`)}
            style={hasNextVerse ? { ...btnNav, background: 'linear-gradient(145deg, #1e88e5, #0d47a1)', boxShadow: '0 3px 8px rgba(13,71,161,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' } : btnNavDisabled}
          >
            下一節 ▶
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SearchBar ───────────────────────────────────────────────────────────────
function SearchBar({ onSearch, isLoading, versions, setVersions, bibleStructure }) {
  const [query, setQuery] = useState('');
  const [selBook, setSelBook] = useState('');
  const [selChap, setSelChap] = useState('');
  const [selVerse, setSelVerse] = useState('');
  const [selEndVerse, setSelEndVerse] = useState('');

  useEffect(() => {
    if (selBook) {
      const bInfo = bookMap.find(b => b.localAbbrev === selBook);
      const bName = bInfo ? bInfo.names[0] : selBook;
      let q = bName;
      if (selChap) {
        q += ` ${selChap}`;
        if (selVerse) {
          q += `:${selVerse}`;
          if (selEndVerse) {
            q += `-${selEndVerse}`;
          }
        }
      }
      setQuery(q);
    }
  }, [selBook, selChap, selVerse, selEndVerse]);

  // 自動搜尋與 Debounce 機制
  useEffect(() => {
    const q = query.trim();
    // 只在 >=2 字元時自動查詢
    if (q.length < 2) return;

    // 第 2 個字時 debounce 0, 第 3 個字以上 120ms
    const delay = q.length === 2 ? 0 : 120;

    const timeout = setTimeout(() => {
      onSearch(q, versions);
    }, delay);

    return () => clearTimeout(timeout);
  }, [query, versions, onSearch]);

  const handleSubmit = (e) => { e.preventDefault(); if (query.trim()) onSearch(query, versions); };
  const handleVersionToggle = (vId) => {
    if (versions.includes(vId)) { if (versions.length > 1) setVersions(versions.filter(v => v !== vId)); }
    else { const nv = [...versions, vId]; nv.sort((a, b) => VERSIONS.findIndex(v => v.id === a) - VERSIONS.findIndex(v => v.id === b)); setVersions(nv); }
  };

  let chaptersCount = 0;
  let versesCount = 0;
  if (bibleStructure && selBook) {
    const bookData = bibleStructure.find(b => b.abbrev === selBook);
    if (bookData) {
      chaptersCount = bookData.chapters.length;
      if (selChap && parseInt(selChap) <= chaptersCount) {
        versesCount = bookData.chapters[parseInt(selChap) - 1].length;
      }
    }
  }

  return (
    <div style={{ ...S.card, padding: 24, marginBottom: 24, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1b5e20', textAlign: 'center', marginBottom: 20, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        📖 多譯本聖經查詢 <small style={{ fontSize: 13, color: '#66bb6a', marginLeft: 8, verticalAlign: 'middle', fontWeight: 500, opacity: 0.8 }}>v1.4</small>
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        <input type="text" value={query} onChange={(e) => {
          setQuery(e.target.value);
          if (selBook) { setSelBook(''); setSelChap(''); setSelVerse(''); setSelEndVerse(''); }
        }}
          placeholder="關鍵字或書卷章節 (例如：愛心、創 1、John 3:16)"
          style={{ ...S.input, width: '100%', padding: '14px 18px', fontSize: 16, outline: 'none', color: '#333' }}
          onFocus={(e) => e.target.style.borderColor = '#43a047'}
          onBlur={(e) => e.target.style.borderColor = '#a5d6a7'}
        />

        {/* Book / Chapter / Verse Selectors */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <select value={selBook} onChange={(e) => { setSelBook(e.target.value); setSelChap(''); setSelVerse(''); setSelEndVerse(''); }} style={S.select}>
            <option value="">📖 選擇書卷</option>
            {bibleStructure && bibleStructure.map(b => {
              const bInfo = bookMap.find(bm => bm.localAbbrev === b.abbrev);
              return <option key={b.abbrev} value={b.abbrev}>{bInfo ? bInfo.names[1] : b.name}</option>;
            })}
          </select>

          <select value={selChap} onChange={(e) => { setSelChap(e.target.value); setSelVerse(''); setSelEndVerse(''); }} disabled={!selBook} style={{ ...S.select, opacity: selBook ? 1 : 0.5 }}>
            <option value="">🔖 章</option>
            {chaptersCount > 0 && Array.from({ length: chaptersCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} 章</option>
            ))}
          </select>

          <select value={selVerse} onChange={(e) => { setSelVerse(e.target.value); setSelEndVerse(''); }} disabled={!selChap} style={{ ...S.select, opacity: selChap ? 1 : 0.5 }}>
            <option value="">📍 節</option>
            {versesCount > 0 && Array.from({ length: versesCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} 節</option>
            ))}
          </select>

          <select value={selEndVerse} onChange={(e) => setSelEndVerse(e.target.value)} disabled={!selVerse} style={{ ...S.select, opacity: selVerse ? 1 : 0.5 }}>
            <option value="">🏁 至哪節</option>
            {versesCount > 0 && selVerse && Array.from({ length: versesCount - parseInt(selVerse) }, (_, i) => {
              const verseNum = parseInt(selVerse) + i + 1;
              return <option key={verseNum} value={verseNum}>{verseNum} 節</option>;
            })}
          </select>
        </div>

        <button type="submit" disabled={isLoading} className="btn-active-effect" style={{ ...S.btnSearch, padding: '16px 0', fontSize: 20 }}>
          {isLoading ? '⏳ 查詢中...' : '🔍 查詢'}
        </button>
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {VERSIONS.map(v => (
          <label key={v.id} style={versions.includes(v.id) ? { ...S.pillActive, padding: '6px 16px', fontSize: 13 } : { ...S.pillInactive, padding: '6px 16px', fontSize: 13 }}>
            <input type="checkbox" style={{ display: 'none' }} checked={versions.includes(v.id)} onChange={() => handleVersionToggle(v.id)} />
            {v.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── FHL commentary link helper ──────────────────────────────────────────────
function getFhlCommentaryUrl(abbrev, chap, sec) {
  const bEntry = bookMap.find(b => b.localAbbrev === abbrev);
  if (!bEntry) return null;
  return `https://bible.fhl.net/new/com.php?book=3&engs=${bEntry.engs}&chap=${chap}&sec=${sec}`;
}

function FhlLink({ abbrev, chap, sec }) {
  const url = getFhlCommentaryUrl(abbrev, chap, sec);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="開啟信望愛經文註釋" style={{ color: '#ffb300', fontSize: 12, textDecoration: 'none', cursor: 'pointer', marginLeft: 8, padding: '2px 6px', border: '1px solid #ffe082', borderRadius: '4px', backgroundColor: '#fff8e1', fontWeight: 600, transition: 'all 0.2s', display: 'inline-block' }} onMouseEnter={e => { e.target.style.backgroundColor = '#ffecb3'; e.target.style.color = '#e65100'; }} onMouseLeave={e => { e.target.style.backgroundColor = '#fff8e1'; e.target.style.color = '#ffb300'; }}>
      [信望愛註釋]
    </a>
  );
}

// ─── Font size control ───────────────────────────────────────────────────────
const btnFontSize = {
  background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
  border: '2px solid #a5d6a7',
  borderRadius: '10px',
  color: '#1b5e20',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '6px 14px',
  fontSize: 15,
  transition: 'all 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 40,
};

function FontSizeControl({ fontSize, setFontSize, sticky }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, ...(sticky ? { position: 'sticky', top: 0, zIndex: 100, background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 50%, #e0f2e1 100%)', padding: '10px 16px', borderBottom: '1px solid #c8e6c9', boxShadow: '0 2px 8px rgba(76,175,80,0.15)' } : { marginBottom: 20 }) }}>
      <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>🔤 字型大小</span>
      <button onClick={() => setFontSize(s => Math.max(10, s - 1))} style={btnFontSize} title="縮小">A-</button>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1b5e20', minWidth: 32, textAlign: 'center' }}>{fontSize}</span>
      <button onClick={() => setFontSize(s => Math.min(40, s + 1))} style={btnFontSize} title="放大">A+</button>
      <button onClick={() => setFontSize(15)} style={{ ...btnFontSize, fontSize: 12, padding: '6px 10px' }} title="重置">重置</button>
    </div>
  );
}

// ─── Verse mode viewer ───────────────────────────────────────────────────────
function VerseViewer({ data, bibleStructure, onNavigate, fontSize, setFontSize }) {
  const { results } = data;
  const [selected, setSelected] = useState(new Set());
  const verseNums = new Set();
  results.forEach(res => res.record?.forEach(r => verseNums.add(r.sec)));
  const verses = Array.from(verseNums).sort((a, b) => a - b);
  const cols = results.length;
  const toggleVerse = (n) => { const s = new Set(selected); s.has(n) ? s.delete(n) : s.add(n); setSelected(s); };
  const toggleAll = () => { selected.size === verses.length ? setSelected(new Set()) : setSelected(new Set(verses)); };
  const getSelectedText = () => {
    const lines = [];
    for (const vNum of Array.from(selected).sort((a, b) => a - b)) {
      results.forEach(res => {
        const vi = VERSIONS.find(v => v.id === res.version); const vd = res.record?.find(r => r.sec == vNum);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${vNum}`, text: vd.bible_text.replace(/<[^>]+>/g, '') });
      });
    }
    return formatVersesForShare(lines);
  };

  useEffect(() => {
    const handler = () => {
      const txt = getSelectedText();
      if (txt) { copyToClipboard(txt); alert('✅ 已複製勾選的經文！'); }
      else { alert('⚠️ 請先勾選要複製的經文！'); }
    };
    document.addEventListener('global-copy', handler);
    return () => document.removeEventListener('global-copy', handler);
  }, [selected, results]);

  if (verses.length === 0) return <EmptyState text="找不到相關經文" />;

  return (
    <div style={S.resultCard}>
      <ChapterNavBar data={data} bibleStructure={bibleStructure} onNavigate={onNavigate} />
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large isTop />
      <div className="responsive-header" style={{ ...S.tableHeader, display: 'grid', gridTemplateColumns: `44px repeat(${cols}, 1fr)`, gap: 16, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="checkbox" checked={selected.size === verses.length && verses.length > 0} onChange={toggleAll} style={S.checkbox} />
        </div>
        {results.map((res, i) => {
          const vi = VERSIONS.find(v => v.id === res.version);
          return <div key={i} style={{ fontWeight: 800, color: VERSION_COLORS[res.version] || '#333', textAlign: 'center', fontSize: 14 }}>{vi?.label}</div>;
        })}
      </div>
      <div>
        {verses.map(vNum => (
          <div key={vNum} style={{ borderBottom: '1px solid #e8f5e9', background: selected.has(vNum) ? '#e8f5e930' : 'transparent', transition: 'background 0.15s' }}>
            <div className="responsive-row" style={{ display: 'grid', gridTemplateColumns: `44px repeat(${cols}, 1fr)`, gap: 16, padding: 16 }}>
              <div className="responsive-checkbox-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2 }}>
                <input type="checkbox" checked={selected.has(vNum)} onChange={() => toggleVerse(vNum)} style={S.checkbox} />
                <a
                  onClick={(e) => { e.preventDefault(); const bName = bookMap.find(b => b.localAbbrev === data.abbrev)?.names[0] || data.abbrev; onNavigate(`${bName} ${data.chap}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  href="#"
                  className="mobile-verse-label"
                  style={{ color: '#1565c0', textDecoration: 'underline', cursor: 'pointer' }}
                  title={`跳到 ${data.chap} 章`}
                >
                  第 {vNum} 節
                </a>
              </div>
              {results.map((res, i) => {
                const vd = res.record?.find(r => r.sec == vNum);
                const text = vd?.bible_text || '--';
                const vi = VERSIONS.find(v => v.id === res.version);
                const col = VERSION_COLORS[res.version] || '#333';
                return (
                  <div key={i} className="verse-text-content" style={{ color: col, lineHeight: 1.7, fontSize: fontSize || 15 }}>
                    <div className="mobile-version-name" style={{ color: col }}>{vi?.label}</div>
                    <a
                      onClick={(e) => { e.preventDefault(); const bName = bookMap.find(b => b.localAbbrev === data.abbrev)?.names[0] || data.abbrev; onNavigate(`${bName} ${data.chap}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      href="#"
                      className="desktop-verse-num"
                      style={{ color: '#1565c0', fontSize: 13, fontWeight: 700, marginRight: 6, verticalAlign: 'top', textDecoration: 'underline', cursor: 'pointer' }}
                      title={`跳到 ${data.chap} 章`}
                    >
                      {vNum}
                    </a>
                    <span dangerouslySetInnerHTML={{ __html: text.replace(/<[^>]+>/g, '') }} />
                    <FhlLink abbrev={data.abbrev} chap={data.chap} sec={vNum} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large />
      <ChapterNavBar data={data} bibleStructure={bibleStructure} onNavigate={onNavigate} />
    </div>
  );
}

// ─── Keyword mode viewer ─────────────────────────────────────────────────────
function KeywordViewer({ data, onNavigate, fontSize, setFontSize }) {
  const { results, keyword } = data;
  const [selected, setSelected] = useState(new Set());
  const [topCopied, setTopCopied] = useState(false);
  const verseMap = new Map();
  results.forEach(res => {
    res.record?.forEach(r => {
      const key = `${r.chineses}-${r.chap}-${r.sec}`;
      if (!verseMap.has(key)) {
        const bi = bookMap.findIndex(b => b.names[0] === r.chineses || b.names.includes(r.chineses));
        verseMap.set(key, { key, chineses: r.chineses, chap: r.chap, sec: r.sec, bookIndex: bi >= 0 ? bi : 999 });
      }
    });
  });
  const verses = Array.from(verseMap.values()).sort((a, b) => a.bookIndex !== b.bookIndex ? a.bookIndex - b.bookIndex : a.chap !== b.chap ? a.chap - b.chap : a.sec - b.sec);
  const totalCount = results.reduce((s, r) => s + (r.record?.length || 0), 0);
  const cols = results.length;
  const toggleVerse = (key) => { const s = new Set(selected); s.has(key) ? s.delete(key) : s.add(key); setSelected(s); };
  const toggleAll = () => { selected.size === verses.length ? setSelected(new Set()) : setSelected(new Set(verses.map(v => v.key))); };

  const getSelectedText = () => {
    const lines = [];
    for (const vo of verses) {
      if (!selected.has(vo.key)) continue;
      results.forEach(res => {
        const vi = VERSIONS.find(v => v.id === res.version);
        const vd = res.record?.find(r => r.chineses === vo.chineses && r.chap === vo.chap && r.sec === vo.sec);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${vo.chineses} ${vo.chap}:${vo.sec}`, text: vd.bible_text.replace(/<[^>]+>/g, '') });
      });
    }
    return formatVersesForShare(lines);
  };

  const handleTopCopy = async () => {
    // Select all, copy, then deselect
    const allKeys = new Set(verses.map(v => v.key));
    const lines = [];
    for (const vo of verses) {
      if (!allKeys.has(vo.key)) continue;
      results.forEach(res => {
        const vi = VERSIONS.find(v => v.id === res.version);
        const vd = res.record?.find(r => r.chineses === vo.chineses && r.chap === vo.chap && r.sec === vo.sec);
        if (vd?.bible_text && vd.bible_text !== '--') lines.push({ ref: `[${vi?.label}] ${vo.chineses} ${vo.chap}:${vo.sec}`, text: vd.bible_text.replace(/<[^>]+>/g, '') });
      });
    }
    const text = formatVersesForShare(lines);
    if (text) { await copyToClipboard(text); setTopCopied(true); setTimeout(() => setTopCopied(false), 2000); }
  };

  useEffect(() => {
    const handler = () => {
      if (selected.size === 0) {
        handleTopCopy();
        alert('✅ 已複製全部經文！');
      } else {
        const txt = getSelectedText();
        copyToClipboard(txt);
        alert('✅ 已複製勾選的經文！');
      }
    };
    document.addEventListener('global-copy', handler);
    return () => document.removeEventListener('global-copy', handler);
  }, [selected, verses, results]);

  if (verses.length === 0) return <EmptyState text={`找不到含有「${keyword}」的經文`} />;

  const goToChapter = (chineses, chap) => {
    if (onNavigate) {
      const q = `${chineses} ${chap}`;
      onNavigate(q);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={S.resultCard}>
      {/* Stats + Top Copy Button */}
      <div style={{ ...S.statsBar, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '12px 16px' }}>
        <span style={{ color: '#b45309', fontSize: 14, fontWeight: 600 }}>🔍 關鍵字：<strong>「{keyword}」</strong></span>
        <span style={{ color: '#92400e', fontSize: 14 }}>共 <strong>{totalCount}</strong> 筆（{verses.length} 節）<span style={{ color: '#6b7280', fontSize: 12, marginLeft: 6, fontWeight: 500 }} title="查詢花費時間">{data.timeMs ? `${data.timeMs}ms` : ''}</span></span>
        <button onClick={handleTopCopy} className="btn-active-effect" style={{ ...(topCopied ? S.btnCopied : S.btnCopy), padding: '16px 32px', fontSize: 20, minWidth: '250px', flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {topCopied ? '✅ 已複製全部' : '📋 複製全部經文'}
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
          {results.map(r => {
            const vi = VERSIONS.find(v => v.id === r.version);
            return <span key={r.version} style={{ fontSize: 11, border: '1px solid #fde68a', color: VERSION_COLORS[r.version] || '#92400e', borderRadius: 999, padding: '2px 8px', fontWeight: 600, background: 'linear-gradient(145deg, #fffde7, #fff9c4)' }}>
              {vi?.label}: {r.record?.length ?? 0}
            </span>;
          })}
        </div>
      </div>
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large isTop />
      {/* Headers */}
      <div className="responsive-header" style={{ ...S.tableHeader, display: 'grid', gridTemplateColumns: `44px repeat(${cols}, 1fr)`, gap: 16, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="checkbox" checked={selected.size === verses.length && verses.length > 0} onChange={toggleAll} style={S.checkbox} />
        </div>
        {results.map((res, i) => {
          const vi = VERSIONS.find(v => v.id === res.version);
          return <div key={i} style={{ fontWeight: 800, color: VERSION_COLORS[res.version] || '#333', textAlign: 'center', fontSize: 14 }}>{vi?.label}</div>;
        })}
      </div>
      {/* Rows */}
      <div>
        {verses.map(vo => (
          <div key={vo.key} style={{ borderBottom: '1px solid #e8f5e9', background: selected.has(vo.key) ? '#fef9c340' : 'transparent', transition: 'background 0.15s' }}>
            <div className="responsive-row" style={{ display: 'grid', gridTemplateColumns: `44px repeat(${cols}, 1fr)`, gap: 16, padding: 16 }}>
              <div className="responsive-checkbox-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2 }}>
                <input type="checkbox" checked={selected.has(vo.key)} onChange={() => toggleVerse(vo.key)} style={S.checkbox} />
                <a onClick={(e) => { e.preventDefault(); goToChapter(vo.chineses, vo.chap); }} href="#" className="mobile-verse-label" style={{ color: '#1565c0', textDecoration: 'underline', cursor: 'pointer' }} title={`查看 ${vo.chineses} 第 ${vo.chap} 章`}>{vo.chineses} {vo.chap}:{vo.sec}</a>
              </div>
              {results.map((res, i) => {
                const vd = res.record?.find(r => r.chineses === vo.chineses && r.chap === vo.chap && r.sec === vo.sec);
                const vi = VERSIONS.find(v => v.id === res.version);
                const col = VERSION_COLORS[res.version] || '#333';
                return (
                  <div key={i} className="verse-text-content" style={{ color: col, lineHeight: 1.7, fontSize: fontSize || 15 }}>
                    <div className="mobile-version-name" style={{ color: col }}>{vi?.label}</div>
                    <a
                      onClick={(e) => { e.preventDefault(); goToChapter(vo.chineses, vo.chap); }}
                      href="#"
                      className="desktop-verse-num"
                      style={{ color: '#1565c0', fontSize: 11, fontWeight: 700, marginRight: 6, verticalAlign: 'top', opacity: 0.85, textDecoration: 'underline', cursor: 'pointer' }}
                      title={`查看 ${vo.chineses} 第 ${vo.chap} 章`}
                    >
                      {vo.chineses} {vo.chap}:{vo.sec}
                    </a>
                    {vd ? <HighlightText text={vd.bible_text.replace(/<[^>]+>/g, '')} keyword={keyword} /> : <span style={{ color: '#ccc' }}>--</span>}
                    <FhlLink abbrev={bookMap.find(b => b.names[0] === vo.chineses)?.localAbbrev} chap={vo.chap} sec={vo.sec} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} large />
    </div>
  );
}

// ─── Shared empty state ──────────────────────────────────────────────────────
function EmptyState({ text }) {
  return <div style={{ textAlign: 'center', color: '#999', padding: '48px 0', ...S.resultCard }}>{text}</div>;
}

// ─── Install PWA Button ──────────────────────────────────────────────────────
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };
    // 萬一事件早已觸發
    if (window.deferredInstallPrompt) setDeferredPrompt(window.deferredInstallPrompt);

    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    const promptEvent = deferredPrompt || window.deferredInstallPrompt;
    if (!promptEvent) {
      alert('📲 安裝方式：\n\n• 電腦 / Android：目前環境可能不支援或您已安裝過。如果未安裝，請透過網址列右側的【安裝】按鈕來安裝。\n• iPhone / iPad：請點選 Safari 底部工具列的「分享按鈕」，然後選擇「加入主畫面」。');
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    window.deferredInstallPrompt = null;
  };
  if (installed) return <span style={{ fontSize: 12, color: '#2e7d32', padding: '6px 14px', borderRadius: 999, border: '1px solid #a5d6a7', background: 'linear-gradient(145deg, #e8f5e9, #c8e6c9)', fontWeight: 600 }}>✅ 已安裝</span>;
  return <button onClick={handleInstall} style={{ ...S.btnInstall, padding: '10px 22px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>📲 安裝 App</button>;
}

// ─── App root ────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState(['unv', 'niv', 'esv', 'ncv', 'lzz']);
  const [fontSize, setFontSize] = useState(15);
  const [bibleStructure, setBibleStructure] = useState(null);

  useEffect(() => {
    fetch('/data/unv.json')
      .then(r => r.json())
      .then(data => setBibleStructure(data))
      .catch(err => console.error("Error loading bible structure:", err));
  }, []);

  const handleSearch = useCallback(async (query, selectedVersions) => {
    const t0 = performance.now();
    setLoading(true); setError(null);
    try {
      const res = await fetchBible(query, selectedVersions);
      res.timeMs = Math.round(performance.now() - t0);
      setData(res);
    }
    catch (err) { setError(err.message); setData(null); }
    finally { setLoading(false); }
  }, []);

  return (
    <div style={{ ...S.bg, padding: '32px 16px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <SearchBar onSearch={handleSearch} isLoading={loading} versions={versions} setVersions={setVersions} bibleStructure={bibleStructure} />
        <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} sticky />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <InstallButton />
        </div>
        {error && <div style={{ background: 'linear-gradient(145deg, #ffebee, #ffcdd2)', border: '1px solid #ef9a9a', borderRadius: 12, padding: 16, textAlign: 'center', maxWidth: 900, margin: '0 auto 24px', fontSize: 14, color: '#c62828' }}>⚠️ {error}</div>}
        {loading && <div style={{ textAlign: 'center', color: '#2e7d32', padding: '64px 0', fontSize: 18, fontWeight: 600 }}>⏳ 搜尋中，請稍候…</div>}
        {!loading && data && data.mode === 'verse' && <VerseViewer data={data} bibleStructure={bibleStructure} onNavigate={(q) => handleSearch(q, versions)} fontSize={fontSize} setFontSize={setFontSize} />}
        {!loading && data && data.mode === 'keyword' && <KeywordViewer data={data} onNavigate={(q) => handleSearch(q, versions)} fontSize={fontSize} setFontSize={setFontSize} />}
        <footer style={{ marginTop: 48, textAlign: 'center', color: '#81c784', fontSize: 12, paddingBottom: 32 }}>
          資料來源：信望愛 (FHL) 聖經 ・ 本機 JSON ・ 8 種譯本離線可用
        </footer>
      </div>
    </div>
  );
}
