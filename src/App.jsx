import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchBible, VERSIONS } from './api';
import { bookMap } from './bible_books';

// ─── Highlight helper ────────────────────────────────────────────────────────
function HighlightText({ text, keyword }) {
  if (!keyword || !text) return <span>{text || '--'}</span>;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
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
  const encoded = encodeURIComponent(text);
  window.open(`https://social-plugins.line.me/lineit/share?url=&text=${encoded}`, '_blank');
}

function shareToEmail(text) {
  const subject = encodeURIComponent('聖經經文分享');
  const body = encodeURIComponent(text);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

// ─── ActionBar ───────────────────────────────────────────────────────────────
function ActionBar({ getSelectedText, selectedCount }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = getSelectedText();
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-10">
      <span className="text-xs text-gray-500 mr-2">
        已選 <strong>{selectedCount}</strong> 節
      </span>
      <button
        onClick={handleCopy}
        disabled={selectedCount === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {copied ? '✅ 已複製' : '📋 複製經文'}
      </button>
      <button
        onClick={() => shareToLine(getSelectedText())}
        disabled={selectedCount === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        💬 分享到 Line
      </button>
      <button
        onClick={() => shareToEmail(getSelectedText())}
        disabled={selectedCount === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ✉️ Email 分享
      </button>
    </div>
  );
}

// ─── SearchBar ───────────────────────────────────────────────────────────────
function SearchBar({ onSearch, isLoading, versions, setVersions }) {
  const [query, setQuery] = useState('John 3:16');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query, versions);
  };

  const handleVersionToggle = (vId) => {
    if (versions.includes(vId)) {
      if (versions.length > 1) setVersions(versions.filter(v => v !== vId));
    } else {
      const newVersions = [...versions, vId];
      newVersions.sort((a, b) =>
        VERSIONS.findIndex(v => v.id === a) - VERSIONS.findIndex(v => v.id === b)
      );
      setVersions(newVersions);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-6 mb-6 max-w-4xl mx-auto border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-5 text-center tracking-tight">多譯本聖經查詢</h1>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="書卷章節：創 1、John 3:16　關鍵字：愛心、faith"
          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-700"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? '查詢中...' : '查詢'}
        </button>
      </form>
      <div className="flex flex-wrap gap-2 justify-center">
        {VERSIONS.map(v => (
          <label
            key={v.id}
            className={`cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium transition-all select-none border ${
              versions.includes(v.id)
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <input type="checkbox" className="hidden" checked={versions.includes(v.id)} onChange={() => handleVersionToggle(v.id)} />
            {v.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Verse mode viewer ───────────────────────────────────────────────────────
function VerseViewer({ data }) {
  const { results } = data;
  const [selected, setSelected] = useState(new Set());

  const verseNums = new Set();
  results.forEach(res => res.record?.forEach(r => verseNums.add(r.sec)));
  const verses = Array.from(verseNums).sort((a, b) => a - b);

  if (verses.length === 0) return <EmptyState text="找不到相關經文" />;

  const cols = results.length;
  const gridClass = cols <= 1 ? 'grid-cols-1' :
    cols === 2 ? 'md:grid-cols-2' :
    cols === 3 ? 'md:grid-cols-3' :
    cols === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
    cols <= 6 ? 'md:grid-cols-3 lg:grid-cols-6' :
    'md:grid-cols-3 lg:grid-cols-7';

  const toggleVerse = (vNum) => {
    const ns = new Set(selected);
    ns.has(vNum) ? ns.delete(vNum) : ns.add(vNum);
    setSelected(ns);
  };

  const toggleAll = () => {
    if (selected.size === verses.length) setSelected(new Set());
    else setSelected(new Set(verses));
  };

  const getSelectedText = () => {
    const lines = [];
    for (const vNum of Array.from(selected).sort((a, b) => a - b)) {
      results.forEach(res => {
        const vInfo = VERSIONS.find(v => v.id === res.version);
        const verseData = res.record?.find(r => r.sec == vNum);
        if (verseData?.bible_text && verseData.bible_text !== '--') {
          lines.push({ ref: `[${vInfo?.label}] ${vNum}`, text: verseData.bible_text.replace(/<[^>]+>/g, '') });
        }
      });
    }
    return formatVersesForShare(lines);
  };

  return (
    <div className="w-full bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header with select-all */}
      <div className={`hidden md:grid gap-4 bg-gray-50 border-b border-gray-100 px-4 py-3 sticky top-0 z-10`} style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}>
        <div className="flex items-center justify-center">
          <input type="checkbox" checked={selected.size === verses.length && verses.length > 0} onChange={toggleAll} className="w-4 h-4 accent-blue-600 cursor-pointer" />
        </div>
        {results.map((res, i) => {
          const vInfo = VERSIONS.find(v => v.id === res.version);
          return <div key={i} className="font-semibold text-gray-700 text-center text-sm">{vInfo?.label}</div>;
        })}
      </div>
      <div className="divide-y divide-gray-100">
        {verses.map(vNum => (
          <div key={vNum} className={`flex flex-col md:block transition-colors ${selected.has(vNum) ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}>
            <div className="md:hidden bg-blue-50 px-4 py-2 font-semibold text-blue-800 text-sm flex items-center gap-2">
              <input type="checkbox" checked={selected.has(vNum)} onChange={() => toggleVerse(vNum)} className="w-4 h-4 accent-blue-600" />
              第 {vNum} 節
            </div>
            <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}>
              <div className="hidden md:flex items-start justify-center pt-0.5">
                <input type="checkbox" checked={selected.has(vNum)} onChange={() => toggleVerse(vNum)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
              </div>
              {results.map((res, i) => {
                const verseData = res.record?.find(r => r.sec == vNum);
                const text = verseData?.bible_text || '--';
                const vInfo = VERSIONS.find(v => v.id === res.version);
                return (
                  <div key={i} className="text-gray-800 leading-relaxed text-[15px]">
                    <div className="md:hidden text-xs text-gray-400 mb-1 border-b pb-1 font-medium">{vInfo?.label}</div>
                    <span className="hidden md:inline text-blue-400 text-xs font-bold mr-1.5 align-top">{vNum}</span>
                    <span dangerouslySetInnerHTML={{ __html: text.replace(/<[^>]+>/g, '') }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} />
    </div>
  );
}

// ─── Keyword mode viewer ─────────────────────────────────────────────────────
function KeywordViewer({ data }) {
  const { results, keyword } = data;
  const [selected, setSelected] = useState(new Set());

  const verseMap = new Map();
  results.forEach(res => {
    res.record?.forEach(r => {
      const key = `${r.chineses}-${r.chap}-${r.sec}`;
      if (!verseMap.has(key)) {
        const bookIndex = bookMap.findIndex(b => b.names[0] === r.chineses || b.names.includes(r.chineses));
        verseMap.set(key, { key, chineses: r.chineses, chap: r.chap, sec: r.sec, bookIndex: bookIndex >= 0 ? bookIndex : 999 });
      }
    });
  });
  const verses = Array.from(verseMap.values()).sort((a, b) => {
    if (a.bookIndex !== b.bookIndex) return a.bookIndex - b.bookIndex;
    if (a.chap !== b.chap) return a.chap - b.chap;
    return a.sec - b.sec;
  });

  if (verses.length === 0) return <EmptyState text={`找不到含有「${keyword}」的經文`} />;

  const totalCount = results.reduce((s, r) => s + (r.record?.length || 0), 0);
  const cols = results.length;
  const gridClass = cols <= 1 ? 'grid-cols-1' :
    cols === 2 ? 'md:grid-cols-2' :
    cols === 3 ? 'md:grid-cols-3' :
    cols === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
    cols <= 6 ? 'md:grid-cols-3 lg:grid-cols-6' :
    'md:grid-cols-3 lg:grid-cols-7';

  const toggleVerse = (key) => {
    const ns = new Set(selected);
    ns.has(key) ? ns.delete(key) : ns.add(key);
    setSelected(ns);
  };

  const toggleAll = () => {
    if (selected.size === verses.length) setSelected(new Set());
    else setSelected(new Set(verses.map(v => v.key)));
  };

  const getSelectedText = () => {
    const lines = [];
    for (const verseObj of verses) {
      if (!selected.has(verseObj.key)) continue;
      results.forEach(res => {
        const vInfo = VERSIONS.find(v => v.id === res.version);
        const verseData = res.record?.find(r =>
          r.chineses === verseObj.chineses && r.chap === verseObj.chap && r.sec === verseObj.sec
        );
        if (verseData?.bible_text && verseData.bible_text !== '--') {
          lines.push({
            ref: `[${vInfo?.label}] ${verseObj.chineses} ${verseObj.chap}:${verseObj.sec}`,
            text: verseData.bible_text.replace(/<[^>]+>/g, ''),
          });
        }
      });
    }
    return formatVersesForShare(lines);
  };

  return (
    <div className="w-full bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-amber-50 border-b border-amber-100">
        <span className="text-amber-800 text-sm font-medium">
          🔍 關鍵字：<strong>「{keyword}」</strong>
        </span>
        <span className="text-amber-700 text-sm">共找到約 <strong>{totalCount}</strong> 筆結果（{verses.length} 節）</span>
        <div className="flex flex-wrap gap-2 ml-auto">
          {results.map(r => {
            const vInfo = VERSIONS.find(v => v.id === r.version);
            return (
              <span key={r.version} className="text-xs bg-white border border-amber-200 text-amber-700 rounded-full px-2 py-0.5">
                {vInfo?.label}: {r.record?.length ?? 0} 筆
              </span>
            );
          })}
        </div>
      </div>

      {/* Column headers with select-all */}
      <div className={`hidden md:grid gap-4 bg-gray-50 border-b border-gray-100 px-4 py-3 sticky top-0 z-10`} style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}>
        <div className="flex items-center justify-center">
          <input type="checkbox" checked={selected.size === verses.length && verses.length > 0} onChange={toggleAll} className="w-4 h-4 accent-blue-600 cursor-pointer" />
        </div>
        {results.map((res, i) => {
          const vInfo = VERSIONS.find(v => v.id === res.version);
          return <div key={i} className="font-semibold text-gray-700 text-center text-sm">{vInfo?.label}</div>;
        })}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {verses.map(verseObj => (
          <div key={verseObj.key} className={`flex flex-col md:block transition-colors ${selected.has(verseObj.key) ? 'bg-yellow-50/60' : 'hover:bg-yellow-50/30'}`}>
            <div className="md:hidden bg-blue-50 px-4 py-1.5 font-semibold text-blue-800 text-sm flex items-center gap-2">
              <input type="checkbox" checked={selected.has(verseObj.key)} onChange={() => toggleVerse(verseObj.key)} className="w-4 h-4 accent-blue-600" />
              {verseObj.chineses} {verseObj.chap}:{verseObj.sec}
            </div>
            <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}>
              <div className="hidden md:flex items-start justify-center pt-0.5">
                <input type="checkbox" checked={selected.has(verseObj.key)} onChange={() => toggleVerse(verseObj.key)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
              </div>
              {results.map((res, i) => {
                const verseData = res.record?.find(r =>
                  r.chineses === verseObj.chineses && r.chap === verseObj.chap && r.sec === verseObj.sec
                );
                const vInfo = VERSIONS.find(v => v.id === res.version);
                return (
                  <div key={i} className="text-gray-800 leading-relaxed text-[15px]">
                    <div className="md:hidden text-xs text-gray-400 mb-1 border-b pb-1 font-medium">{vInfo?.label}</div>
                    <span className="hidden md:inline text-blue-400 text-xs font-bold mr-1.5 align-top">
                      {verseObj.chineses} {verseObj.chap}:{verseObj.sec}
                    </span>
                    {verseData
                      ? <HighlightText text={verseData.bible_text.replace(/<[^>]+>/g, '')} keyword={keyword} />
                      : <span className="text-gray-300">--</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ActionBar getSelectedText={getSelectedText} selectedCount={selected.size} />
    </div>
  );
}

// ─── Shared empty state ──────────────────────────────────────────────────────
function EmptyState({ text }) {
  return (
    <div className="text-center text-gray-400 py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
      {text}
    </div>
  );
}

// ─── Install PWA Button ──────────────────────────────────────────────────────
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: show instructions
      alert('📲 安裝方式：\n\n• iPhone Safari：點選底部「分享」→「加入主畫面」\n• Android Chrome：點選右上「⋮」→「安裝應用程式」\n• 電腦 Chrome：網址列右邊的安裝圖示');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
        ✅ 已安裝
      </span>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
    >
      📲 安裝 App
    </button>
  );
}

// ─── App root ────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState(['unv', 'esv', 'web', 'ncv', 'lzz', 'asv', 'kjv']);

  const handleSearch = useCallback(async (query, selectedVersions) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBible(query, selectedVersions);
      setData(res);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-100">
      <div className="max-w-[1600px] mx-auto">
        <SearchBar onSearch={handleSearch} isLoading={loading} versions={versions} setVersions={setVersions} />

        {/* Install button row */}
        <div className="flex justify-center mb-6">
          <InstallButton />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-center max-w-4xl mx-auto border border-red-100 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-400 py-16 animate-pulse">
            搜尋中，請稍候…
          </div>
        )}

        {!loading && data && data.mode === 'verse' && <VerseViewer data={data} />}
        {!loading && data && data.mode === 'keyword' && <KeywordViewer data={data} />}

        <footer className="mt-12 text-center text-gray-400 text-xs pb-8">
          資料來源：信望愛 (FHL) 聖經 ・ 本機 JSON ・ 7 種譯本離線可用
        </footer>
      </div>
    </div>
  );
}
