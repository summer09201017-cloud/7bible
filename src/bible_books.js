// Map various input formats (full name, english, short name) to FHL abbrev and local JSON abbrev.
// localAbbrev: used for looking up in the downloaded JSON files (kjv/asv/unv/ncv)
// fhlEngs: used for FHL commentary URL (com.php?book=3&engs=...)
export const bookMap = [
    { engs: 'Gen', fhlEngs: 'Gen',     localAbbrev: 'gn',   names: ['創', '創世記', 'gen', 'genesis', 'ge'] },
    { engs: 'Exo', fhlEngs: 'Ex',      localAbbrev: 'ex',   names: ['出', '出埃及記', 'exo', 'exodus', 'ex'] },
    { engs: 'Lev', fhlEngs: 'Lev',     localAbbrev: 'lv',   names: ['利', '利未記', 'lev', 'leviticus', 'le'] },
    { engs: 'Num', fhlEngs: 'Num',     localAbbrev: 'nm',   names: ['民', '民數記', 'num', 'numbers', 'nu'] },
    { engs: 'Deu', fhlEngs: 'Deut',    localAbbrev: 'dt',   names: ['申', '申命記', 'deu', 'deuteronomy', 'dt'] },
    { engs: 'Jos', fhlEngs: 'Josh',    localAbbrev: 'js',   names: ['書', '約書亞記', 'jos', 'joshua', 'jo'] },
    { engs: 'Jdg', fhlEngs: 'Judg',    localAbbrev: 'jud',  names: ['士', '士師記', 'jdg', 'judges', 'ju'] },
    { engs: 'Rut', fhlEngs: 'Ruth',    localAbbrev: 'rt',   names: ['得', '路得記', 'rut', 'ruth', 'ru'] },
    { engs: '1Sa', fhlEngs: '1 Sam',   localAbbrev: '1sm',  names: ['撒上', '撒母耳記上', '1sa', '1 samuel', '1sm'] },
    { engs: '2Sa', fhlEngs: '2 Sam',   localAbbrev: '2sm',  names: ['撒下', '撒母耳記下', '2sa', '2 samuel', '2sm'] },
    { engs: '1Ki', fhlEngs: '1 Kin',   localAbbrev: '1kgs', names: ['王上', '列王紀上', '1ki', '1 kings', '1kgs'] },
    { engs: '2Ki', fhlEngs: '2 Kin',   localAbbrev: '2kgs', names: ['王下', '列王紀下', '2ki', '2 kings', '2kgs'] },
    { engs: '1Ch', fhlEngs: '1 Chr',   localAbbrev: '1chr', names: ['代上', '歷代志上', '1ch', '1 chronicles', '1chr'] },
    { engs: '2Ch', fhlEngs: '2 Chr',   localAbbrev: '2chr', names: ['代下', '歷代志下', '2ch', '2 chronicles', '2chr'] },
    { engs: 'Ezr', fhlEngs: 'Ezra',    localAbbrev: 'ezr',  names: ['拉', '以斯拉記', 'ezr', 'ezra'] },
    { engs: 'Neh', fhlEngs: 'Neh',     localAbbrev: 'ne',   names: ['尼', '尼希米記', 'neh', 'nehemiah', 'ne'] },
    { engs: 'Est', fhlEngs: 'Esth',    localAbbrev: 'es',   names: ['斯', '以斯帖記', 'est', 'esther'] },
    { engs: 'Job', fhlEngs: 'Job',     localAbbrev: 'job',  names: ['伯', '約伯記', 'job'] },
    { engs: 'Psa', fhlEngs: 'Ps',      localAbbrev: 'ps',   names: ['詩', '詩篇', 'psa', 'psalms', 'ps'] },
    { engs: 'Pro', fhlEngs: 'Prov',    localAbbrev: 'prv',  names: ['箴', '箴言', 'pro', 'proverbs', 'pr'] },
    { engs: 'Ecc', fhlEngs: 'Eccl',    localAbbrev: 'ec',   names: ['傳', '傳道書', 'ecc', 'ecclesiastes', 'ec'] },
    { engs: 'Sng', fhlEngs: 'Song',    localAbbrev: 'so',   names: ['歌', '雅歌', 'sng', 'song of solomon', 'so'] },
    { engs: 'Isa', fhlEngs: 'Is',      localAbbrev: 'is',   names: ['賽', '以賽亞書', 'isa', 'isaiah', 'is'] },
    { engs: 'Jer', fhlEngs: 'Jer',     localAbbrev: 'jr',   names: ['耶', '耶利米書', 'jer', 'jeremiah', 'je'] },
    { engs: 'Lam', fhlEngs: 'Lam',     localAbbrev: 'lm',   names: ['哀', '耶利米哀歌', 'lam', 'lamentations', 'la'] },
    { engs: 'Eze', fhlEngs: 'Ezek',    localAbbrev: 'ez',   names: ['結', '以西結書', 'eze', 'ezekiel', 'ez'] },
    { engs: 'Dan', fhlEngs: 'Dan',     localAbbrev: 'dn',   names: ['但', '但以理書', 'dan', 'daniel', 'da'] },
    { engs: 'Hos', fhlEngs: 'Hos',     localAbbrev: 'ho',   names: ['何', '何西阿書', 'hos', 'hosea', 'ho'] },
    { engs: 'Jol', fhlEngs: 'Joel',    localAbbrev: 'jl',   names: ['珥', '約珥書', 'jol', 'joel', 'jl'] },
    { engs: 'Amo', fhlEngs: 'Amos',    localAbbrev: 'am',   names: ['摩', '阿摩司書', 'amo', 'amos', 'am'] },
    { engs: 'Oba', fhlEngs: 'Obad',    localAbbrev: 'ob',   names: ['俄', '俄巴底亞書', 'oba', 'obadiah', 'ob'] },
    { engs: 'Jon', fhlEngs: 'Jon',     localAbbrev: 'jn',   names: ['拿', '約拿書', 'jon', 'jonah'] },
    { engs: 'Mic', fhlEngs: 'Mic',     localAbbrev: 'mi',   names: ['彌', '彌迦書', 'mic', 'micah', 'mi'] },
    { engs: 'Nah', fhlEngs: 'Nah',     localAbbrev: 'na',   names: ['鴻', '那鴻書', 'nah', 'nahum', 'na'] },
    { engs: 'Hab', fhlEngs: 'Hab',     localAbbrev: 'hab',  names: ['哈', '哈巴谷書', 'hab', 'habakkuk'] },
    { engs: 'Zep', fhlEngs: 'Zeph',    localAbbrev: 'zp',   names: ['番', '西番雅書', 'zep', 'zephaniah', 'ze'] },
    { engs: 'Hag', fhlEngs: 'Hag',     localAbbrev: 'hg',   names: ['該', '哈該書', 'hag', 'haggai'] },
    { engs: 'Zec', fhlEngs: 'Zech',    localAbbrev: 'zc',   names: ['亞', '撒迦利亞書', 'zec', 'zechariah', 'zc'] },
    { engs: 'Mal', fhlEngs: 'Mal',     localAbbrev: 'ml',   names: ['瑪', '瑪拉基書', 'mal', 'malachi', 'ma'] },
    { engs: 'Mat', fhlEngs: 'Matt',    localAbbrev: 'mt',   names: ['太', '馬太福音', 'mat', 'matthew', 'mt'] },
    { engs: 'Mak', fhlEngs: 'Mark',    localAbbrev: 'mk',   names: ['可', '馬可福音', 'mak', 'mark', 'mk'] },
    { engs: 'Luk', fhlEngs: 'Luke',    localAbbrev: 'lk',   names: ['路', '路加福音', 'luk', 'luke', 'lk'] },
    { engs: 'Jhn', fhlEngs: 'John',    localAbbrev: 'jo',   names: ['約', '約翰福音', 'jhn', 'john', 'jn'] },
    { engs: 'Act', fhlEngs: 'Acts',    localAbbrev: 'act',  names: ['徒', '使徒行傳', 'act', 'acts', 'ac'] },
    { engs: 'Rom', fhlEngs: 'Rom',     localAbbrev: 'rm',   names: ['羅', '羅馬書', 'rom', 'romans', 'ro'] },
    { engs: '1Co', fhlEngs: '1 Cor',   localAbbrev: '1co',  names: ['林前', '哥林多前書', '1co', '1 corinthians', '1cor'] },
    { engs: '2Co', fhlEngs: '2 Cor',   localAbbrev: '2co',  names: ['林後', '哥林多後書', '2co', '2 corinthians', '2cor'] },
    { engs: 'Gal', fhlEngs: 'Gal',     localAbbrev: 'gl',   names: ['加', '加拉太書', 'gal', 'galatians', 'ga'] },
    { engs: 'Eph', fhlEngs: 'Eph',     localAbbrev: 'eph',  names: ['弗', '以弗所書', 'eph', 'ephesians', 'ep'] },
    { engs: 'Php', fhlEngs: 'Phil',    localAbbrev: 'ph',   names: ['腓', '腓立比書', 'php', 'philippians', 'ph'] },
    { engs: 'Col', fhlEngs: 'Col',     localAbbrev: 'cl',   names: ['西', '歌羅西書', 'col', 'colossians', 'co'] },
    { engs: '1Th', fhlEngs: '1 Thess', localAbbrev: '1ts',  names: ['帖前', '帖撒羅尼迦前書', '1th', '1 thessalonians'] },
    { engs: '2Th', fhlEngs: '2 Thess', localAbbrev: '2ts',  names: ['帖後', '帖撒羅尼迦後書', '2th', '2 thessalonians'] },
    { engs: '1Ti', fhlEngs: '1 Tim',   localAbbrev: '1tm',  names: ['提前', '提摩太前書', '1ti', '1 timothy'] },
    { engs: '2Ti', fhlEngs: '2 Tim',   localAbbrev: '2tm',  names: ['提後', '提摩太後書', '2ti', '2 timothy'] },
    { engs: 'Tit', fhlEngs: 'Titus',   localAbbrev: 'tt',   names: ['多', '提多書', 'tit', 'titus', 'ti'] },
    { engs: 'Phm', fhlEngs: 'Philem',  localAbbrev: 'phm',  names: ['門', '腓利門書', 'phm', 'philemon'] },
    { engs: 'Heb', fhlEngs: 'Heb',     localAbbrev: 'hb',   names: ['來', '希伯來書', 'heb', 'hebrews', 'he'] },
    { engs: 'Jas', fhlEngs: 'James',   localAbbrev: 'jm',   names: ['雅', '雅各書', 'jas', 'james', 'ja'] },
    { engs: '1Pe', fhlEngs: '1 Pet',   localAbbrev: '1pe',  names: ['彼前', '彼得前書', '1pe', '1 peter'] },
    { engs: '2Pe', fhlEngs: '2 Pet',   localAbbrev: '2pe',  names: ['彼後', '彼得後書', '2pe', '2 peter'] },
    { engs: '1Jn', fhlEngs: '1 John',  localAbbrev: '1jo',  names: ['約一', '約翰一書', '1jn', '1 john'] },
    { engs: '2Jn', fhlEngs: '2 John',  localAbbrev: '2jo',  names: ['約二', '約翰二書', '2jn', '2 john'] },
    { engs: '3Jn', fhlEngs: '3 John',  localAbbrev: '3jo',  names: ['約三', '約翰三書', '3jn', '3 john'] },
    { engs: 'Jud', fhlEngs: 'Jude',    localAbbrev: 'jd',   names: ['猶', '猶大書', 'jud', 'jude'] },
    { engs: 'Rev', fhlEngs: 'Rev',     localAbbrev: 're',   names: ['啟', '啟示錄', 'rev', 'revelation'] }
];

function findBook(input) {
    const q = input.toLowerCase().trim();
    return bookMap.find(b => b.names.includes(q) || b.engs.toLowerCase() === q);
}

export function findChineseAbbreviation(input) {
    const match = findBook(input);
    return match ? match.names[0] : null;  // First name is the Chinese short abbrev for FHL
}

export function findLocalAbbrev(input) {
    const match = findBook(input);
    return match ? match.localAbbrev : null;
}
