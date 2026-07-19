import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookMap } from '../src/bible_books.js';

const MAX_REFS_PER_VERSE = 10;
const MIN_VOTES = 1;

const OSIS_ORDER = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam',
  '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov',
  'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos',
  'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt',
  'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil',
  'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas',
  '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
];
const osisIndex = new Map(OSIS_ORDER.map((code, i) => [code, i]));

function parseSingle(ref) {
  const m = /^([0-9A-Za-z]+)\.(\d+)\.(\d+)$/.exec(ref);
  if (!m) return null;
  const bi = osisIndex.get(m[1]);
  if (bi === undefined) return null;
  return { bi, chap: Number(m[2]), sec: Number(m[3]) };
}

function parseTarget(ref) {
  if (!ref.includes('-')) {
    const single = parseSingle(ref);
    return single ? { ...single, end: 0 } : null;
  }
  const [a, b] = ref.split('-');
  const start = parseSingle(a);
  const stop = parseSingle(b);
  if (!start) return null;
  if (stop && stop.bi === start.bi && stop.chap === start.chap && stop.sec > start.sec) {
    return { ...start, end: stop.sec };
  }
  return { ...start, end: 0 };
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = process.argv[2] || resolve(root, 'cross_references.txt');
const lines = readFileSync(srcPath, 'utf8').split('\n');

const perVerse = new Map();
let used = 0;
for (const line of lines) {
  const parts = line.split('\t');
  if (parts.length < 3 || parts[0] === 'From Verse') continue;
  const votes = parseInt(parts[2], 10);
  if (!Number.isFinite(votes) || votes < MIN_VOTES) continue;
  const from = parseSingle(parts[0].trim());
  if (!from) continue;
  const target = parseTarget(parts[1].trim());
  if (!target) continue;
  const key = `${from.bi}|${from.chap}:${from.sec}`;
  if (!perVerse.has(key)) perVerse.set(key, []);
  perVerse.get(key).push({ target, votes });
  used += 1;
}

const books = bookMap.map(() => ({}));
perVerse.forEach((entries, key) => {
  const [biStr, verseKey] = key.split('|');
  const bi = Number(biStr);
  entries.sort((a, b) => b.votes - a.votes);
  books[bi][verseKey] = entries.slice(0, MAX_REFS_PER_VERSE).map(({ target }) => (
    target.end ? [target.bi, target.chap, target.sec, target.end] : [target.bi, target.chap, target.sec]
  ));
});

const outDir = resolve(root, 'public/data/xref');
mkdirSync(outDir, { recursive: true });
let totalBytes = 0;
books.forEach((data, bi) => {
  const json = JSON.stringify(data);
  totalBytes += json.length;
  writeFileSync(resolve(outDir, `${bookMap[bi].localAbbrev}.json`), json);
});
console.log(`xref: ${used} refs kept, ${perVerse.size} verses, ${(totalBytes / 1024 / 1024).toFixed(2)} MB across ${books.length} files`);
