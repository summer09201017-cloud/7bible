// ⚠ 共用 core 檔(0809 立):正本在 skills 合輯 web-speech-scripture/assets/tts-fix.js。
// 兩站(8biblesearch/7bible)共用同一份——**勿就地改**,要改先改正本再同步過來(否則三個月後兩份字典不一樣)。
// tts-fix.js — 經文朗讀三件套(正本):①破音字同音替換 ②斷句抑揚 ③中文語音排序。
// 零相依;ES module 匯出,也可整段貼進單檔站(8biblesearch 那型)。
// ★ 鐵則:替換只影響「唸給引擎聽的字串」,絕不影響畫面顯示的經文(經文正確性第一鐵則)。
// ★ 字典心法:把「常唸錯的詞」換成「讀音唯一且正確的同音字」——若引擎本來就唸對,替換是
//   聽感中性的(同音);若唸錯,替換就修正它。所以「寧可多收、不會變糟」,但每條都要耳朵驗收過。

// ── ① 破音字典(聖經常用詞;鍵=畫面上的詞,值=唸的字) ──
// 只收「高信心」條目;新增流程:牧者/老師回報哪個詞唸錯 → 找同音正確字 → 耳朵驗收 → 加一條。
export const TTS_PHRASES = [
  ['使徒行傳', '使徒行撰'],   // 傳 ㄓㄨㄢˋ(撰),常被唸成 ㄔㄨㄢˊ
  ['行傳', '行撰'],
  ['便雅憫', '變雅憫'],       // 便 ㄅㄧㄢˋ(變),常被唸成 ㄆㄧㄢˊ
  ['重生', '崇生'],           // 重 ㄔㄨㄥˊ(崇),常被唸成 ㄓㄨㄥˋ
  ['重新', '崇新'],
  ['供物', '貢物'],           // 供 ㄍㄨㄥˋ(貢),常被唸成 ㄍㄨㄥ
  ['供奉', '貢奉'],
  ['數算', '屬算'],           // 數 ㄕㄨˇ(屬),常被唸成 ㄕㄨˋ
  ['數點', '屬點'],
  ['差遣', '拆遣'],           // 差 ㄔㄞ(拆)
  ['奉差', '奉拆'],
  ['尼布甲尼撒', '尼布甲尼灑'], // 撒 ㄙㄚˇ(灑)結尾較穩;人名長串引擎易亂
  ['曝曬', '瀑曬'],
]
// 長詞優先(避免「行傳」先吃掉「使徒行傳」的位置)
const _sorted = [...TTS_PHRASES].sort((a, b) => b[0].length - a[0].length)

// 章節數字轉國字(「第14章」→「第十四章」;TTS 對阿拉伯數字偶爾亂斷)
export function numToZh(n) {
  n = Number(n)
  if (!Number.isFinite(n) || n < 0 || n > 999) return String(n)
  const D = '零一二三四五六七八九'
  if (n < 10) return D[n]
  if (n < 20) return '十' + (n % 10 ? D[n % 10] : '')
  if (n < 100) return D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '')
  const rem = n % 100
  return D[Math.floor(n / 100)] + '百' + (rem === 0 ? '' : rem < 10 ? '零' + D[rem] : rem < 20 ? '一' + numToZh(rem) : numToZh(rem))
}

// ── 把「顯示文字」轉成「唸的文字」──
export function toSpeakable(text) {
  let s = String(text || '')
  for (const [from, to] of _sorted) s = s.split(from).join(to)
  // 「第14章」「第5節」→ 國字;其他孤立數字留給引擎(日期/分數等不亂動)
  s = s.replace(/第(\d{1,3})([章節篇])/g, (_, n, u) => '第' + numToZh(n) + u)
  return s
}

// ── ② 斷句抑揚:把整段經文拆成短句,每句配 pitch/rate 微調 ──
// Web Speech 不支援 SSML;逐句 speak 天然產生停頓,問句尾音略升、感嘆稍強、末句放慢收尾。
export function chunkClauses(text, { rate = 0.9, pitch = 1 } = {}) {
  const s = String(text || '').trim()
  if (!s) return []
  // 以主要標點切句(保留標點供引擎自己停頓);逗頓號留在句內,引擎會自然小停。
  const parts = s.match(/[^。！？；!?;]+[。！？；!?;]?/g) || [s]
  const out = []
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i].trim()
    if (!t) continue
    const last = i === parts.length - 1
    let p = pitch, r = rate
    if (/[？?]$/.test(t)) p = pitch + 0.1           // 問句:尾音上揚
    else if (/[！!]$/.test(t)) { p = pitch + 0.06; r = rate + 0.03 } // 感嘆:稍強稍快
    if (last) r = r - 0.05                            // 末句放慢收尾
    out.push({ text: t, pitch: Math.min(2, p), rate: Math.max(0.5, r) })
  }
  return out
}

// ── ③ 中文語音排序:同一段程式,在 Edge 會自動選到「Natural 神經語音」──
// 分數:zh-TW 最優先;名稱含 Natural/Neural(Edge 曉臻/雲哲)大加分;Google 國語次之;傳統 SAPI 墊底。
export function scoreZhVoice(v) {
  let s = 0
  const lang = String(v.lang || ''), name = String(v.name || '')
  if (/zh[-_]TW/i.test(lang)) s += 100
  else if (/zh[-_]HK/i.test(lang)) s += 60
  else if (/^zh/i.test(lang)) s += 40
  else return -1                                     // 非中文
  if (/natural|neural/i.test(name)) s += 50          // Edge 神經語音
  if (/曉|Hsiao|Xiao/i.test(name)) s += 20           // 曉臻/曉雨(女聲,唸經文較柔)
  if (/雲|Yun/i.test(name)) s += 10
  if (/google/i.test(name)) s += 25                  // Google 國語(Chrome 上通常是最佳可得)
  return s
}
export function rankZhVoices(voices) {
  return (voices || [])
    .map((v) => ({ v, s: scoreZhVoice(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v)
}
// 挑最佳中文語音;savedName 有值且還存在就尊重使用者選擇。
export function pickZhVoice(voices, savedName) {
  const ranked = rankZhVoices(voices)
  if (savedName) { const hit = ranked.find((v) => v.name === savedName); if (hit) return hit }
  return ranked[0] || null
}

// ── ④ 預錄 mp3 用:字串正規化+雜湊(FNV-1a,瀏覽器/node 同步可算,不需 crypto) ──
// key 對「最終唸出的完整字串」計(先去空白;不先過破音字典——字典是引擎端補救,mp3 端由產生器自己套)。
// 活範例:hfpc-paul-game 的 scripts/gen-tts.mjs(烤 mp3)+ src/speak.js(manifest 查 mp3、缺檔退回 Web Speech)。
export function ttsKey(text) {
  const s = String(text || '').replace(/\s+/g, '')
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
