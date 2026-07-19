import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const unv = JSON.parse(readFileSync(resolve(root, 'public/data/unv.json'), 'utf8'));
const structure = unv.map((book) => ({
  abbrev: book.abbrev,
  chapters: book.chapters.map((chapter) => chapter.length),
}));
const out = resolve(root, 'public/data/structure.json');
writeFileSync(out, JSON.stringify(structure));
const totalChapters = structure.reduce((sum, b) => sum + b.chapters.length, 0);
console.log(`structure.json: ${structure.length} books, ${totalChapters} chapters`);
