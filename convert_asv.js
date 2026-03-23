import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public', 'data');
const asvRaw = JSON.parse(fs.readFileSync(path.join(dir, 'asv.json'), 'utf8'));

// KJV as reference to get abbrev and name
const ref = JSON.parse(fs.readFileSync(path.join(dir, 'kjv.json'), 'utf8'));

const out = ref.map(b => ({
  abbrev: b.abbrev,
  name: b.name,
  chapters: []
}));

// ASV format: resultset.row array of { field: [id, bookNum, chapNum, verseNum, text] }
asvRaw.resultset.row.forEach(r => {
  const [bNum, cNum, vNum, text] = [r.field[1], r.field[2], r.field[3], r.field[4]];
  const bIndex = bNum - 1;
  const cIndex = cNum - 1;
  const vIndex = vNum - 1;
  
  if (bIndex < out.length) {
    if (!out[bIndex].chapters[cIndex]) out[bIndex].chapters[cIndex] = [];
    out[bIndex].chapters[cIndex][vIndex] = text;
  }
});

fs.writeFileSync(path.join(dir, 'asv.json'), JSON.stringify(out));
console.log('Converted asv.json successfully');
