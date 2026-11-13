// 版號一致測試(v32,2026-11-13):畫面版號的唯一來源是 index.html 的 APP_VERSIONS 第一筆,
// 它必須等於 public/sw.js 的 CACHE_NAME 尾碼;App.jsx 不可再手寫「v1.5」這類第二份版號。
// 跑法:npm test(= node tests/version.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function topEntry() {
  const html = read('index.html');
  const m = /var APP_VERSIONS = \[\s*\{\s*"v":\s*"v(\d+)",\s*"d":\s*"([^"]*)"/.exec(html);
  assert.ok(m, '找不到 index.html 的 APP_VERSIONS 第一筆(格式應為 { "v": "vN", "d": "YYYY-MM-DD", ... })');
  return { num: m[1], date: m[2] };
}

test('更新紀錄第一筆版號 = sw.js 快取名版號', () => {
  const { num } = topEntry();
  const cache = /const CACHE_NAME = 'bible-app-v(\d+)'/.exec(read('public/sw.js'));
  assert.ok(cache, "找不到 public/sw.js 的 CACHE_NAME = 'bible-app-vN'");
  assert.equal(num, cache[1], `更新紀錄最新是 v${num},sw.js 是 v${cache[1]}:改版要兩邊一起 +1`);
});

test('更新紀錄第一筆的日期是真的日期', () => {
  const { date } = topEntry();
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `日期格式要 YYYY-MM-DD,現在是「${date}」`);
  const d = new Date(`${date}T00:00:00Z`);
  assert.ok(!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date, `「${date}」不是真的日期`);
});

test('App.jsx 沒有手寫的 v數字.數字 版號', () => {
  const app = read('src/App.jsx');
  const hits = app.split(/\r?\n/)
    .map((line, i) => ({ line: i + 1, m: /\bv\d+\.\d+\b/.exec(line) }))
    .filter((x) => x.m)
    .map((x) => `第 ${x.line} 行「${x.m[0]}」`);
  assert.deepEqual(hits, [], `App.jsx 不要寫第二份版號(要讀 window.__appVersion):${hits.join('、')}`);
});
