const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const file = path.join(__dirname, '../db/films.json');

const starterFilms = [
    { title: 'Interstellar', kind: 'film', rating: 5, releaseDate: '2014-11-07', watched: true },
    { title: 'Inception', kind: 'film', rating: 4.5, releaseDate: '2010-07-16', watched: true },
    { title: 'Titanic', kind: 'film', rating: 4, releaseDate: '1997-12-19', watched: false },
    { title: 'Breaking Bad', kind: 'serial', rating: 5, releaseDate: '2008-01-20', watched: true },
    { title: 'Stranger Things', kind: 'serial', rating: 4.5, releaseDate: '2016-07-15', watched: false }
];

function readFilms() {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeFilms(films) {
    fs.writeFileSync(file, JSON.stringify(films, null, 2) + '\n');
}

function addStarterFilms(userId) {
    const films = readFilms();
    const titles = new Set(films.filter(film => film.userId === userId).map(film => film.title));
    const added = starterFilms.filter(film => !titles.has(film.title))
        .map(film => ({ _id: randomUUID(), userId, ...film }));

    if (added.length) writeFilms([...films, ...added]);
}

module.exports = { readFilms, writeFilms, addStarterFilms };
