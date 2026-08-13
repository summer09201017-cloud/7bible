# CLAUDE.md

Guidance for future Claude Code agents working in this repo.

## 現況 (2026-08-14)

- **上線中**：https://7bible.netlify.app/ ，GitHub repo `summer09201017-cloud/7bible`，Netlify **已連 GitHub 自動部署**（push `main` 即上線；site id `6d0419a7-7222-4c5e-a9c3-610b0a7cb3a7`）。不需手動 `netlify deploy`。
- **已完成到 Wave 3**：分頁化（查詢 / 讀經進度與足跡）、讀經足跡、串珠交叉引用、多項 UX 修正；同時**移除**每日金句、背經模式、個人筆記/收藏/螢光筆（見下方「Removed features」）。
- **健康度**：`npm run lint`（僅有一條**既存**的 `getFhlCommentaryUrl` unused 警示，不是本輪造成）、`npm run build` 成功、無自動化測試（沒有 `npm test`）。SW 版本 `bible-app-v29`(0814)。
- **最近一輪 (2026-08-14)**：📖 **和修本（和合本2010, `rcuv`）＝第 9 本譯本、線上取用**。詳見下方「和修本」節。
- **下一步（roadmap 第一列）**：搜尋移到 Web Worker + 簡單索引（根治多譯本全書掃描卡頓）。

## Project

多譯本聖經查詢 — pure-frontend PWA. Loads **8 bible translations from local JSON + 1 fetched live** (和修本/rcuv，見下方「和修本」節), supports cross-version side-by-side comparison, keyword/reference search, per-book cross-references (串珠), a usage-based reading footprint, and offline reading. Deployed via Netlify (auto-deploy on push to `main`).

## 和修本（rcuv）＝唯一的線上譯本

**為什麼不打包**：信望愛 `abv.php` 對 `rcuv` 標 `candownload=0`（不可下載離線資料庫），
且 `https://bible.fhl.net/json/` 明載「有些譯本僅授權給信望愛站使用…請勿任意使用，以免違法」
⇒ 走 `qb.php` 逐章即時查詢，不重新散布經文。
（順帶：`ncv`/`esv` 也是 `candownload=0` 而目前仍打包在 `public/data/` — **待使用者決定**，別擅自改。）

- `src/lib/rcuv-core.js` — `cleanRcuvVerse(raw)` → `{heading, text, notes:[{pos,body}]}`＋
  `fetchRcuvChapter(chineses, chap)`（單飛＋章快取＋12s timeout）。
  ★ **正本在 skill `fhl-bible-api/assets/rcuv-core.js`，勿就地改**（同 strongs.js / commentary-core.js）。
- `src/api.js` — `fetchLocalVersion` 多一條 `if (version === 'rcuv')` 分支（與既有 `niv` 分支同構）。
  record 是 `{sec, bible_text, rcuvHeading, rcuvNotes}`；**`bible_text` 是純淨經文**（不含 `[n]`）
  ⇒ 複製/朗讀都走 `stripTags(bible_text)`，自動拿到乾淨版。
- `App.jsx` — `RcuvHeading` / `RcuvNotes` / `RcuvError`（定義在 `VerseText` 之前）。
  - 段落標題貼在**和修本那一欄**頂端，**刻意不**提到所有譯本之上：本站多欄並列，
    提到最上面會讓人以為那是和合本的標題（標題是和修本自己的編輯產物）。
    ⚠ 這與 8biblesearch 的做法**故意不同**，不是漏做。
  - 註腳收成欄末「譯註 n」鈕，**不逐字插 `[n]`**：`VerseText` 為了字級對比會把中文逐字切開，
    插標記會打壞 diff 與關鍵字高亮。
  - `res.error && res.version === 'rcuv'` → `<RcuvError>`。**不可**讓失敗退化成 `--`，
    那看起來像「這節沒有經文」（App.jsx 原本不處理 version 層的 `.error`，是這輪補的）。

### 和修本 gotchas（踩過的，別重犯）
1. **書卷參數只能用 `chineses=`**（`bookMap` 的 `names[0]`）。`engs=John` 會回**羅馬書**。
   全 66 卷已逐卷對 rcuv 實測通過。⚠ 注意 `sc.php`（註釋）**相反**，只能用 `engs=`。
2. **`version=unv,rcuv` 逗號串多譯本會回整本聖經 31,103 節 / 5.8MB，而 `status` 仍是 `success`。**
   一個版本一次呼叫。
3. **失敗時 `status` 是一長串 SQL，不是丟 HTTP 錯** ⇒ 必須查 `j.status === 'success'` 且 `record` 有長度。
4. **全文搜尋排除線上譯本**（`api.js` 的 `offlineSelected` / `onlineExcluded` / `onlyOnline`）。
   理由不只「手上只有讀過的章」——就算拿命中清單逐節補查，一次搜尋可能要向信望愛抓上百章，
   那是把志工營運的服務當自己的資料庫用。結果頁必須**明示**被排除，只勾線上譯本時要說
   「無法做全文搜尋」而非騙人的「找不到經文」。
5. **驗斷網要用 `context.setOffline(true)`，不能用 `page.route`**：`public/sw.js` 第 32-35 行對
   `bible.fhl.net` 是 `respondWith(fetch(...))` 直通，SW 發出的 fetch 不受 `page.route` 影響
   ⇒ 你以為攔掉了其實沒有（0814 差點誤判功能壞掉）。
6. **佔位符用 `'\0'` 轉義，不要寫字面 NUL 位元組**：0814 原本寫成字面 NUL，
   git 把 4KB 的 `rcuv-core.js` 判成 binary（diff 顯示 `- -`）才暴露；
   同一份程式在 8biblesearch 的大 index.html 裡躲過偵測（git binary 判定只掃前 8000 位元組）。
   eslint 的 `no-irregular-whitespace` 同理會擋字面全形空白 → 用 `　`。

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
| `src/App.jsx` | **Everything** — App state, all components (SearchBar, VerseViewer, KeywordViewer, ActionBar, ChapterNavBar, ViewTabs, FootprintCard, UserLibrary, FontSizeControl, InstallButton, CopyVerseButton, VerseText, XrefButton/XrefPanel, StrongsButton/StrongsPanel, CommentButton/CommentaryModal, **RcuvHeading/RcuvNotes/RcuvError**, Toast). ~3260 lines, monolithic on purpose for now. |
| `src/api.js` | `fetchBible(query, versions, options)` — reference vs keyword routing, NIV per-book lazy load, **rcuv live-fetch branch**, search matcher (AND/OR/exact/exclude/scope). `loadXref(localAbbrev)` — 串珠 per-book lazy load. Exports `VERSIONS` (id, label, lang, online), `ONLINE_VERSION_IDS`, `isOnlineVersion`. |
| `src/lib/rcuv-core.js` | 和修本清洗＋逐章取用。**正本在 skill `fhl-bible-api/assets/`，勿就地改。** |
| `src/bible_books.js` | `bookMap` (66 entries: `{ engs, fhlEngs, localAbbrev, names, nivFile }`). `findLocalAbbrev(input)` resolves any alias. |
| `src/localSearch.js` | **Legacy / unused by main flow**. Don't extend. |
| `src/lib/strongs.js` + `src/lib/commentary-core.js` | 共用 core(正本在 skill `fhl-bible-api`,勿就地改):Strong 原文編號(qb/sd.php+LS LRU 快取)與 sc.php 註釋排版核心(reflow+tokenize)。 |
| `public/data/{unv,niv,esv,web,ncv,lzz,asv,kjv}.json` | Single-file bibles (thiagobodruk format: `[{ abbrev, name, chapters: string[][] }]`). Total ~32 MB. |
| `public/data/NIV/{BOOK}.json` | NIV per-book files (`{ "1": [v1, v2, ...] }`). Loaded on demand. |
| `public/data/structure.json` | Lightweight book/chapter/verse-count structure (5 KB), generated by `scripts/gen-structure.mjs` from unv.json. App boots from this instead of the 4 MB unv.json (falls back to unv.json if missing). Regenerate if bible data changes. |
| `public/data/xref/{localAbbrev}.json` | 串珠 cross-references per book (`{ "chap:verse": [[bookIndex, chap, verse, endVerse?], ...] }`, ≤10 refs/verse). Generated by `scripts/gen-xref.mjs` from openbible.info cross-references data (CC-BY, attributed in footer). ~2.6 MB total, lazy-loaded. |
| `public/sw.js` | Lazy-cache SW. App shell pre-cached only; bible JSON cached on first request. **Bump `CACHE_NAME` when shipping breaking changes.** (currently v10) |
| `public/manifest.json` | PWA: shortcuts (繼續閱讀/約3:16/詩23) + `share_target` (incoming shared text → `?q=`). |
| `index.html` | Standard, registers SW. |
| `scripts/gen-structure.mjs` | Regenerates `public/data/structure.json`. |
| `scripts/gen-xref.mjs` | Regenerates `public/data/xref/` from a cross_references.txt path passed as argv. |

## Data flow

1. `fetchBible(query, versions, options)` in `api.js` decides if `query` is a reference (matches `^([book]) (chap)(:sec(-end)?)?$`) or keyword.
2. **Reference mode**: returns `{ mode: 'verse', abbrev, chap, sec, results: [{version, record:[{sec, bible_text}]}] }`.
3. **Keyword mode**: searches a primary version (CUV for Chinese queries, ASV for English) — *unless* `searchSelectedVersions` is on. Then looks up matching refs across all selected versions. Returns `{ mode: 'keyword', keyword, results: [{version, record, matchedCount}] }`.
4. App.jsx renders `VerseViewer` or `KeywordViewer` based on `data.mode`.

## State (localStorage via `LS_KEYS`)

```
history, versions, fontSize, diffEnabled, diffBase,
bookmark, copyFormat, theme, readingProgress, readingLog
```

`versions` array order **is** the display order — no auto-sort. User reorders via ◀▶ on active pills (3-per-row grid).

## Views

Two in-app tabs (`view` state, not persisted): `home` = search + results;
`library` = 每日讀經進度 + 讀經足跡 (FootprintCard) + 查詢足跡 (history). Any search switches back to `home`.

## 讀經足跡 (readingLog) — follows the cross-project `reading-footprint` skill

- Only a **full-chapter** verse view that stays on screen **15 s** counts (dwell timer cancelled by the next search).
- URL hydration (`?q=` / `?resume=1`) never counts (`footprintSkipRef`); single-verse/range and keyword searches never count.
- Same chapter within 30 min counts once (`recent` map, entries >1 h pruned on write).
- Storage: month buckets `{ m: { "2026-07": { "bookIndex:chap": n } }, d: { "2026-07-19": n }, recent, enabled }`.
- UI: stats card (今日/連續/讀過章數/全卷%), range chips (本月→歷年), top-10 hot list, 66×chapter heatmap (click = open chapter), 停用 and 清除 are **separate** actions.
- Included in JSON export/import (import merges by summing counts).

## Removed features (do not re-add without asking)

每日金句 card, 背經模式 (MemoryMode), per-verse 筆記/收藏/螢光筆 (annotations) — removed 2026-07-19 at user request. Old localStorage keys (`bible-tool-annotations-v1`) are left untouched on user devices but unused.

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
- **Wave 3 (2026-07-19)**: removed 每日金句/背經模式/annotations per user request; library view tab (讀經進度+足跡); version pills → 3-per-row grid; IME composition guard on live search; keyword hit-count fix (非搜尋譯本 shows 對照); full-settings export/import; `structure.json` boot (5 KB vs 4 MB); toast replaces transient alerts; 讀經足跡 (reading-footprint skill); 串珠 cross-references (openbible.info CC-BY, per-book lazy JSON); SW → v10.

## Ideas explicitly NOT done yet

- AI 釋義 (Claude API), 靈修日記, 統計圖表, Web Worker 搜尋索引, 語音輸入搜尋. (Strong's 原文編號 v23、上下文預覽 v22 已完成)
- Splitting App.jsx, migrating to Tailwind, adding tests.
