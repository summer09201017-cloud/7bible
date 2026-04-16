// Map various input formats (full name, english, short name) to FHL abbrev and local JSON abbrev.
// localAbbrev: used for looking up in the downloaded JSON files (kjv/asv/unv/ncv)
export const bookMap = [
    { engs: 'Gen', localAbbrev: 'gn',   nivFile: 'GEN', names: ['創', '創世記', 'gen', 'genesis', 'ge'] },
    { engs: 'Exo', localAbbrev: 'ex',   nivFile: 'EXO', names: ['出', '出埃及記', 'exo', 'exodus', 'ex'] },
    { engs: 'Lev', localAbbrev: 'lv',   nivFile: 'LEV', names: ['利', '利未記', 'lev', 'leviticus', 'le'] },
    { engs: 'Num', localAbbrev: 'nm',   nivFile: 'NUM', names: ['民', '民數記', 'num', 'numbers', 'nu'] },
    { engs: 'Deu', localAbbrev: 'dt',   nivFile: 'DEU', names: ['申', '申命記', 'deu', 'deuteronomy', 'dt'] },
    { engs: 'Jos', localAbbrev: 'js',   nivFile: 'JOS', names: ['書', '約書亞記', 'jos', 'joshua', 'jo'] },
    { engs: 'Jdg', localAbbrev: 'jud',  nivFile: 'JDG', names: ['士', '士師記', 'jdg', 'judges', 'ju'] },
    { engs: 'Rut', localAbbrev: 'rt',   nivFile: 'RUT', names: ['得', '路得記', 'rut', 'ruth', 'ru'] },
    { engs: '1Sa', localAbbrev: '1sm',  nivFile: '1SA', names: ['撒上', '撒母耳記上', '1sa', '1 samuel', '1sm'] },
    { engs: '2Sa', localAbbrev: '2sm',  nivFile: '2SA', names: ['撒下', '撒母耳記下', '2sa', '2 samuel', '2sm'] },
    { engs: '1Ki', localAbbrev: '1kgs', nivFile: '1KI', names: ['王上', '列王紀上', '1ki', '1 kings', '1kgs'] },
    { engs: '2Ki', localAbbrev: '2kgs', nivFile: '2KI', names: ['王下', '列王紀下', '2ki', '2 kings', '2kgs'] },
    { engs: '1Ch', localAbbrev: '1chr', nivFile: '1CH', names: ['代上', '歷代志上', '1ch', '1 chronicles', '1chr'] },
    { engs: '2Ch', localAbbrev: '2chr', nivFile: '2CH', names: ['代下', '歷代志下', '2ch', '2 chronicles', '2chr'] },
    { engs: 'Ezr', localAbbrev: 'ezr',  nivFile: 'EZR', names: ['拉', '以斯拉記', 'ezr', 'ezra'] },
    { engs: 'Neh', localAbbrev: 'ne',   nivFile: 'NEH', names: ['尼', '尼希米記', 'neh', 'nehemiah', 'ne'] },
    { engs: 'Est', localAbbrev: 'es',   nivFile: 'EST', names: ['斯', '以斯帖記', 'est', 'esther'] },
    { engs: 'Job', localAbbrev: 'job',  nivFile: 'JOB', names: ['伯', '約伯記', 'job'] },
    { engs: 'Psa', localAbbrev: 'ps',   nivFile: 'PSA', names: ['詩', '詩篇', 'psa', 'psalms', 'ps'] },
    { engs: 'Pro', localAbbrev: 'prv',  nivFile: 'PRO', names: ['箴', '箴言', 'pro', 'proverbs', 'pr'] },
    { engs: 'Ecc', localAbbrev: 'ec',   nivFile: 'ECC', names: ['傳', '傳道書', 'ecc', 'ecclesiastes', 'ec'] },
    { engs: 'Sng', localAbbrev: 'so',   nivFile: 'SNG', names: ['歌', '雅歌', 'sng', 'song of solomon', 'so'] },
    { engs: 'Isa', localAbbrev: 'is',   nivFile: 'ISA', names: ['賽', '以賽亞書', 'isa', 'isaiah', 'is'] },
    { engs: 'Jer', localAbbrev: 'jr',   nivFile: 'JER', names: ['耶', '耶利米書', 'jer', 'jeremiah', 'je'] },
    { engs: 'Lam', localAbbrev: 'lm',   nivFile: 'LAM', names: ['哀', '耶利米哀歌', 'lam', 'lamentations', 'la'] },
    { engs: 'Eze', localAbbrev: 'ez',   nivFile: 'EZK', names: ['結', '以西結書', 'eze', 'ezekiel', 'ez'] },
    { engs: 'Dan', localAbbrev: 'dn',   nivFile: 'DAN', names: ['但', '但以理書', 'dan', 'daniel', 'da'] },
    { engs: 'Hos', localAbbrev: 'ho',   nivFile: 'HOS', names: ['何', '何西阿書', 'hos', 'hosea', 'ho'] },
    { engs: 'Jol', localAbbrev: 'jl',   nivFile: 'JOL', names: ['珥', '約珥書', 'jol', 'joel', 'jl'] },
    { engs: 'Amo', localAbbrev: 'am',   nivFile: 'AMO', names: ['摩', '阿摩司書', 'amo', 'amos', 'am'] },
    { engs: 'Oba', localAbbrev: 'ob',   nivFile: 'OBA', names: ['俄', '俄巴底亞書', 'oba', 'obadiah', 'ob'] },
    { engs: 'Jon', localAbbrev: 'jn',   nivFile: 'JON', names: ['拿', '約拿書', 'jon', 'jonah'] },
    { engs: 'Mic', localAbbrev: 'mi',   nivFile: 'MIC', names: ['彌', '彌迦書', 'mic', 'micah', 'mi'] },
    { engs: 'Nah', localAbbrev: 'na',   nivFile: 'NAH', names: ['鴻', '那鴻書', 'nah', 'nahum', 'na'] },
    { engs: 'Hab', localAbbrev: 'hab',  nivFile: 'HAB', names: ['哈', '哈巴谷書', 'hab', 'habakkuk'] },
    { engs: 'Zep', localAbbrev: 'zp',   nivFile: 'ZEP', names: ['番', '西番雅書', 'zep', 'zephaniah', 'ze'] },
    { engs: 'Hag', localAbbrev: 'hg',   nivFile: 'HAG', names: ['該', '哈該書', 'hag', 'haggai'] },
    { engs: 'Zec', localAbbrev: 'zc',   nivFile: 'ZEC', names: ['亞', '撒迦利亞書', 'zec', 'zechariah', 'zc'] },
    { engs: 'Mal', localAbbrev: 'ml',   nivFile: 'MAL', names: ['瑪', '瑪拉基書', 'mal', 'malachi', 'ma'] },
    { engs: 'Mat', localAbbrev: 'mt',   nivFile: 'MAT', names: ['太', '馬太福音', 'mat', 'matthew', 'mt'] },
    { engs: 'Mak', localAbbrev: 'mk',   nivFile: 'MRK', names: ['可', '馬可福音', 'mak', 'mark', 'mk'] },
    { engs: 'Luk', localAbbrev: 'lk',   nivFile: 'LUK', names: ['路', '路加福音', 'luk', 'luke', 'lk'] },
    { engs: 'Jhn', localAbbrev: 'jo',   nivFile: 'JHN', names: ['約', '約翰福音', 'jhn', 'john', 'jn'] },
    { engs: 'Act', localAbbrev: 'act',  nivFile: 'ACT', names: ['徒', '使徒行傳', 'act', 'acts', 'ac'] },
    { engs: 'Rom', localAbbrev: 'rm',   nivFile: 'ROM', names: ['羅', '羅馬書', 'rom', 'romans', 'ro'] },
    { engs: '1Co', localAbbrev: '1co',  nivFile: '1CO', names: ['林前', '哥林多前書', '1co', '1 corinthians', '1cor'] },
    { engs: '2Co', localAbbrev: '2co',  nivFile: '2CO', names: ['林後', '哥林多後書', '2co', '2 corinthians', '2cor'] },
    { engs: 'Gal', localAbbrev: 'gl',   nivFile: 'GAL', names: ['加', '加拉太書', 'gal', 'galatians', 'ga'] },
    { engs: 'Eph', localAbbrev: 'eph',  nivFile: 'EPH', names: ['弗', '以弗所書', 'eph', 'ephesians', 'ep'] },
    { engs: 'Php', localAbbrev: 'ph',   nivFile: 'PHP', names: ['腓', '腓立比書', 'php', 'philippians', 'ph'] },
    { engs: 'Col', localAbbrev: 'cl',   nivFile: 'COL', names: ['西', '歌羅西書', 'col', 'colossians', 'co'] },
    { engs: '1Th', localAbbrev: '1ts',  nivFile: '1TH', names: ['帖前', '帖撒羅尼迦前書', '1th', '1 thessalonians'] },
    { engs: '2Th', localAbbrev: '2ts',  nivFile: '2TH', names: ['帖後', '帖撒羅尼迦後書', '2th', '2 thessalonians'] },
    { engs: '1Ti', localAbbrev: '1tm',  nivFile: '1TI', names: ['提前', '提摩太前書', '1ti', '1 timothy'] },
    { engs: '2Ti', localAbbrev: '2tm',  nivFile: '2TI', names: ['提後', '提摩太後書', '2ti', '2 timothy'] },
    { engs: 'Tit', localAbbrev: 'tt',   nivFile: 'TIT', names: ['多', '提多書', 'tit', 'titus', 'ti'] },
    { engs: 'Phm', localAbbrev: 'phm',  nivFile: 'PHM', names: ['門', '腓利門書', 'phm', 'philemon'] },
    { engs: 'Heb', localAbbrev: 'hb',   nivFile: 'HEB', names: ['來', '希伯來書', 'heb', 'hebrews', 'he'] },
    { engs: 'Jas', localAbbrev: 'jm',   nivFile: 'JAS', names: ['雅', '雅各書', 'jas', 'james', 'ja'] },
    { engs: '1Pe', localAbbrev: '1pe',  nivFile: '1PE', names: ['彼前', '彼得前書', '1pe', '1 peter'] },
    { engs: '2Pe', localAbbrev: '2pe',  nivFile: '2PE', names: ['彼後', '彼得後書', '2pe', '2 peter'] },
    { engs: '1Jn', localAbbrev: '1jo',  nivFile: '1JN', names: ['約一', '約翰一書', '1jn', '1 john'] },
    { engs: '2Jn', localAbbrev: '2jo',  nivFile: '2JN', names: ['約二', '約翰二書', '2jn', '2 john'] },
    { engs: '3Jn', localAbbrev: '3jo',  nivFile: '3JN', names: ['約三', '約翰三書', '3jn', '3 john'] },
    { engs: 'Jud', localAbbrev: 'jd',   nivFile: 'JUD', names: ['猶', '猶大書', 'jud', 'jude'] },
    { engs: 'Rev', localAbbrev: 're',   nivFile: 'REV', names: ['啟', '啟示錄', 'rev', 'revelation'] }
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
