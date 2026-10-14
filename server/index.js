const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const Database = require('better-sqlite3');
const { WebSocketServer } = require('ws');

const app = express();

app.use(cors());
app.use(express.json());

// Baza de date se creează automat în folderul server.
const db = new Database(path.join(__dirname, 'filme-seriale.db'));

// Creăm tabelul dacă nu există deja.
db.exec(`
  CREATE TABLE IF NOT EXISTS filme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titlu TEXT NOT NULL,
    tip TEXT NOT NULL,
    gen TEXT NOT NULL,
    an INTEGER NOT NULL,
    vazut INTEGER NOT NULL DEFAULT 0
  )
`);

// Adăugăm filmele inițiale doar când tabelul este gol.
const rezultatNumar = db.prepare('SELECT COUNT(*) AS total FROM filme').get();

if (rezultatNumar.total === 0) {
    const adaugaInitial = db.prepare(`
    INSERT INTO filme (titlu, tip, gen, an, vazut)
    VALUES (?, ?, ?, ?, ?)
  `);

    adaugaInitial.run('Interstellar', 'film', 'SF', 2014, 1);
    adaugaInitial.run('Stranger Things', 'serial', 'SF', 2016, 0);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Trimitem o notificare către aplicație când lista se schimbă.
function anuntaModificarea() {
    const mesaj = JSON.stringify({ tip: 'lista-modificata' });

    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(mesaj);
        }
    });
}

// Transformăm valoarea 0/1 din SQLite în false/true.
function pregatesteFilmPentruRaspuns(film) {
    return {
        ...film,
        vazut: Boolean(film.vazut),
    };
}

// Verificăm datele primite de la aplicație.
function dateValide({ titlu, tip, gen, an }) {
    return (
        typeof titlu === 'string' &&
        titlu.trim() !== '' &&
        (tip === 'film' || tip === 'serial') &&
        typeof gen === 'string' &&
        gen.trim() !== '' &&
        String(an).trim() !== '' &&
        Number.isFinite(Number(an))
    );
}

// GET: obține toate filmele și serialele.
app.get('/api/filme', (req, res) => {
    const filme = db
        .prepare('SELECT * FROM filme ORDER BY id')
        .all()
        .map(pregatesteFilmPentruRaspuns);

    res.json(filme);
});

// GET: obține un film sau serial după ID.
app.get('/api/filme/:id', (req, res) => {
    const id = Number(req.params.id);

    const film = db
        .prepare('SELECT * FROM filme WHERE id = ?')
        .get(id);

    if (!film) {
        return res.status(404).json({ mesaj: 'Elementul nu a fost găsit.' });
    }

    res.json(pregatesteFilmPentruRaspuns(film));
});

// POST: adaugă un film sau serial nou.
app.post('/api/filme', (req, res) => {
    const { titlu, tip, gen, an, vazut } = req.body;

    if (!dateValide({ titlu, tip, gen, an })) {
        return res.status(400).json({ mesaj: 'Completează corect toate câmpurile.' });
    }

    const rezultat = db
        .prepare(`
      INSERT INTO filme (titlu, tip, gen, an, vazut)
      VALUES (?, ?, ?, ?, ?)
    `)
        .run(
            titlu.trim(),
            tip,
            gen.trim(),
            Number(an),
            vazut ? 1 : 0
        );

    const filmNou = db
        .prepare('SELECT * FROM filme WHERE id = ?')
        .get(Number(rezultat.lastInsertRowid));

    anuntaModificarea();

    res.status(201).json(pregatesteFilmPentruRaspuns(filmNou));
});

// PUT: modifică filmul sau serialul cu ID-ul dat.
app.put('/api/filme/:id', (req, res) => {
    const id = Number(req.params.id);
    const { titlu, tip, gen, an, vazut } = req.body;

    if (!dateValide({ titlu, tip, gen, an })) {
        return res.status(400).json({ mesaj: 'Completează corect toate câmpurile.' });
    }

    const filmExistent = db
        .prepare('SELECT id FROM filme WHERE id = ?')
        .get(id);

    if (!filmExistent) {
        return res.status(404).json({ mesaj: 'Elementul nu a fost găsit.' });
    }

    db.prepare(`
    UPDATE filme
    SET titlu = ?, tip = ?, gen = ?, an = ?, vazut = ?
    WHERE id = ?
  `).run(
        titlu.trim(),
        tip,
        gen.trim(),
        Number(an),
        vazut ? 1 : 0,
        id
    );

    const filmModificat = db
        .prepare('SELECT * FROM filme WHERE id = ?')
        .get(id);

    anuntaModificarea();

    res.json(pregatesteFilmPentruRaspuns(filmModificat));
});

// DELETE: șterge filmul sau serialul cu ID-ul dat.
app.delete('/api/filme/:id', (req, res) => {
    const id = Number(req.params.id);

    const rezultat = db
        .prepare('DELETE FROM filme WHERE id = ?')
        .run(id);

    if (rezultat.changes === 0) {
        return res.status(404).json({ mesaj: 'Elementul nu a fost găsit.' });
    }

    anuntaModificarea();

    res.status(204).send();
});

server.listen(3000, () => {
    console.log('Serverul rulează la http://localhost:3000');
});