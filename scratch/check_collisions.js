import { bookMap } from './src/bible_books.js';

const collisions = [];

bookMap.forEach((book, i) => {
    const local = book.localAbbrev;
    bookMap.forEach((other, j) => {
        if (i === j) return;
        if (other.names.includes(local)) {
            collisions.push({
                book: book.engs,
                localAbbrev: local,
                otherBook: other.engs,
                matchedInNames: true
            });
        }
        if (other.localAbbrev === local) {
             collisions.push({
                book: book.engs,
                localAbbrev: local,
                otherBook: other.engs,
                matchedLocalAbbrev: true
            });
        }
    });
});

console.log('Collisions found:');
console.log(JSON.stringify(collisions, null, 2));
