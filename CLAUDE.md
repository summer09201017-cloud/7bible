# CLAUDE.md

Guidance for future Claude Code agents working in this repo.

## Project

多譯本聖經查詢 — pure-frontend PWA. Loads 8 bible translations from local JSON, supports cross-version side-by-side comparison, keyword/reference search, personal annotations, and offline reading. Deployed via Netlify.

## Stack

- **React 19 + Vite 8** (no TypeScript)
- **Tailwind v4** (installed via `@tailwindcss/vite`, but currently **unused** — all styling is inline via the `S = {...}` object in `App.jsx` plus a few classes in `index.css`)
- **No backend, no auth, no DB** — everything is client-side; state persists to `localStorage` only.
- **Service Worker** (`public/sw.js`) for offline + lazy caching of bible JSON.

## Run / build

```
npm run dev       # http://localhost:5173
npm run build     # → dist/
npm run lint
npm run preview   # http://localhost:4173
```

`start.bat` is a Windows convenience: opens browser + runs dev.

## File map

| File | What it owns |
|---|---|
| `src/App.jsx` | **Everything** — App state, all components (SearchBar, VerseViewer, KeywordViewer, ActionBar, ChapterNavBar, UserLibrary, FontSizeControl, InstallButton, CopyVerseButton, VerseText, FhlLink). ~1500 lines, monolithic on purpose for now. |
| `src/api.js` | `fetchBible(query, versions, options)` — reference vs keyword routing, NIV per-book lazy load, search matcher (AND/OR/exact/exclude/scope). Exports `VERSIONS` (id, label, lang). |
| `src/bible_books.js` | `bookMap` (66 entries: `{ engs, fhlEngs, localAbbrev, names, nivFile }`). `findLocalAbbrev(input)` resolves any alias. |
| `src/localSearch.js` | **Legacy / unused by main flow**. Don't extend. |
| `public/data/{unv,niv,esv,web,ncv,lzz,asv,kjv}.json` | Single-file bibles (thiagobodruk format: `[{ abbrev, name, chapters: string[][] }]`). Total ~32 MB. |
| `public/data/NIV/{BOOK}.json` | NIV per-book files (`{ "1": [v1, v2, ...] }`). Loaded on demand. |
| `public/sw.js` | Lazy-cache SW. App shell pre-cached only; bible JSON cached on first request. **Bump `CACHE_NAME` when shipping breaking changes.** |
| `public/manifest.json` | PWA: shortcuts (繼續閱讀/約3:16/詩23) + `share_target` (incoming shared text → `?q=`). |
| `index.html` | Standard, registers SW. |

## Data flow

1. `fetchBible(query, versions, options)` in `api.js` decides if `query` is a reference (matches `^([book]) (chap)(:sec(-end)?)?$`) or keyword.
2. **Reference mode**: returns `{ mode: 'verse', abbrev, chap, sec, results: [{version, record:[{sec, bible_text}]}] }`.
3. **Keyword mode**: searches a primary version (CUV for Chinese queries, ASV for English) — *unless* `searchSelectedVersions` is on. Then looks up matching refs across all selected versions. Returns `{ mode: 'keyword', keyword, results: [{version, record, matchedCount}] }`.
4. App.jsx renders `VerseViewer` or `KeywordViewer` based on `data.mode`.

## State (localStorage via `LS_KEYS`)

```
history, annotations, versions, fontSize, diffEnabled, diffBase,
bookmark, copyFormat, theme
```

`versions` array order **is** the display order — no auto-sort. User reorders via ◀▶ on active pills.

## URL routing

- `?q=John%203:16&v=unv,niv` — shareable link, hydrated on first load
- `?resume=1` — pulls last bookmark and searches it (used by PWA shortcut)
- After every search: `replaceState` (no history pollution)

## Known gotchas / non-obvious things

1. **TDZ trap in App component**: `useCallback`/`useEffect` declarations execute top-down each render. If a `useEffect` deps array references a `const` declared later in the function body, you get `ReferenceError: Cannot access 'X' before initialization` and the whole app unmounts (= blank green screen on phones, often masked by stale bundles on desktop). **Always declare callbacks before effects that depend on them.** Order in `App` is: `useState` → `useRef` → simple effects → `useCallback` → effects that use callbacks.
2. **WEB version is hidden from UI** (`App.jsx` filters `v.id !== 'web'` in the pill row), but its JSON is shipped and SW-cached. Author may have hidden deliberately — confirm before un-hiding.
3. **ESV in `localSearch.js` falls back to KJV** (legacy code path; main flow doesn't hit it).
4. **NIV / ESV licensing**: not verified for public distribution. Open question.
5. **`bookMap.find` short-circuit on missing entry**: book select renders English fallback when no bookMap match — but every entry has Chinese names so it shouldn't fire. Watch for typos in `localAbbrev` mismatches between bookMap and bible JSON.
6. **Diff highlight respects language family**: `buildDiffContext` returns null when `getTextKind(current) !== getTextKind(compare)` — Chinese vs English never highlights tokens (would be meaningless). UI also tags `[中]`/`[英]` and warns on mixed selections.
7. **Search race**: `searchSeqRef` increments per call; stale responses bail before `setData`. If you add new async paths, follow the same pattern.
8. **Keyword viewer pagination**: `PAGE_SIZE = 50`, "載入更多" button extends. `selected` Set still operates on the full sorted verse list, not just the visible slice.
9. **NIV requires lazy-loading** by book — `loadNivBook(nivFile)` caches per book. Other versions are single-file. `STRIP_SPACE_VERSIONS = ['unv']` (CUV is stored with whitespace that needs stripping).
10. **`<style>` inline mega-object `S`**: every visual is inline. If you change a button color/border/shadow, search the `S = {...}` block at the top.

## Conventions

- **No new files unless necessary** — extending `App.jsx` with a new component at the appropriate spot is the project default.
- **No comments narrating code**. Existing code has very few. Keep it that way.
- **Don't introduce TypeScript** without discussion.
- **Don't add Tailwind classes** — even though Tailwind is installed, mixing styles makes refactoring hard. Stick with the inline `S` object until someone explicitly migrates.
- **Don't refactor App.jsx into separate files** without prior approval. The user prefers monolithic for now.
- **Bump SW `CACHE_NAME`** when shipping data/structure changes that old caches would break.

## Recent feature waves (for context)

- **Wave 1**: SW lazy cache, search race protection, keyword pagination, URL share, fix UserLibrary card overflow, move diff toggle out of fixed top bar, diff base version selector.
- **Wave 2**: per-verse copy → all selected, reading bookmark, multi-term keyword highlight palette, print mode, book grouping (`<optgroup>`), dark mode (`html[data-theme]`), copy format selector (plain/inline/markdown/html), keyboard shortcuts (/`j/k/c/Esc/?`), PWA shortcuts + share_target, chapter progress bar.

## Ideas explicitly NOT done yet

- TTS 朗讀 (Web Speech API), 背經模式 (progressive masking), 經文卡片圖匯出 (Canvas → PNG), AI 釋義 (Claude API), 串珠 (TSK), Strong's, 讀經計畫, 靈修日記, 統計圖表.
- Splitting App.jsx, migrating to Tailwind, adding tests.
