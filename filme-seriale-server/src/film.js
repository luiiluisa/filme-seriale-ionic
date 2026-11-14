const { randomUUID } = require('crypto');
const { broadcast } = require('./wss');

const { readFilms, writeFilms } = require('./filmStorage');
const { parseMedia, writeFilmPhoto, readFilmPhoto, removeFilmPhoto } = require('./filmMedia');

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify(data));
}

function isValidDate(value) {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] =
        value.split('-').map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function validateFilm(item) {
    return (
        item &&
        typeof item.title === 'string' &&
        item.title.trim().length > 0 &&
        (item.kind === 'film' || item.kind === 'serial') &&
        typeof item.rating === 'number' &&
        Number.isFinite(item.rating) &&
        item.rating >= 1 &&
        item.rating <= 5 &&
        isValidDate(item.releaseDate) &&
        typeof item.watched === 'boolean'
    );
}

async function readBody(req) {
    let body = '';

    for await (const chunk of req) {
        body += chunk;

        if (body.length > 700000) {
            const error = new Error('Request too large');
            error.status = 413;
            throw error;
        }
    }

    try {
        return JSON.parse(body);
    } catch {
        const error = new Error('Invalid JSON');
        error.status = 400;
        throw error;
    }
}

async function filmRouter(req, res, userId) {
    const url = new URL(
        req.url,
        'http://localhost:3001'
    );

    const pathname = url.pathname;

    if (
        req.method === 'GET' &&
        pathname === '/api/films'
    ) {
        const films = readFilms()
            .filter(item => item.userId === userId);

        if (!url.searchParams.has('offset') && !url.searchParams.has('limit')) {
            sendJson(res, 200, films);
            return true;
        }

        const offset = Number(url.searchParams.get('offset') ?? 0);
        const limit = Number(url.searchParams.get('limit') ?? 10);
        if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
            sendJson(res, 400, { error: 'Paginare invalidă.' });
            return true;
        }
        const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('ro');
        const kind = url.searchParams.get('kind');
        const watched = url.searchParams.get('watched');
        const filtered = films.filter(film =>
            film.title.toLocaleLowerCase('ro').includes(query) &&
            (!kind || film.kind === kind) &&
            (!watched || String(film.watched) === watched)
        );
        sendJson(res, 200, { items: filtered.slice(offset, offset + limit), hasMore: offset + limit < filtered.length });
        return true;
    }

    if (
        req.method === 'POST' &&
        pathname === '/api/films'
    ) {
        let data;

        try {
            data = await readBody(req);
        } catch (error) {
            sendJson(res, error.status || 400, {
                error: error.message
            });
            return true;
        }

        if (!validateFilm(data)) {
            sendJson(res, 400, {
                error: 'Invalid film data'
            });
            return true;
        }

        const films = readFilms();
        const clientId = data.clientId;
        if (clientId !== undefined && (typeof clientId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clientId))) {
            sendJson(res, 400, { error: 'Identificator de sincronizare invalid.' });
            return true;
        }
        const existing = clientId && films.find(item => item._id === clientId);
        if (existing) {
            if (existing.userId === userId) sendJson(res, 200, existing);
            else sendJson(res, 409, { error: 'Identificator indisponibil.' });
            return true;
        }

        const media = parseMedia(data);
        if (!media) {
            sendJson(res, 400, { error: 'Fotografie sau locație invalidă.' });
            return true;
        }

        const film = {
            _id: clientId ?? randomUUID(),
            userId,
            title: data.title.trim(),
            kind: data.kind,
            rating: data.rating,
            releaseDate: data.releaseDate,
            watched: data.watched,
            ...media.fields
        };
        if (media.photo) writeFilmPhoto(film, media.photo);

        films.unshift(film);
        writeFilms(films);

        sendJson(res, 201, film);

        broadcast(userId, 'created', film);

        return true;
    }

    const photoMatch = pathname.match(/^\/api\/films\/([^/]+)\/photo\/([^/]+)$/);
    if (req.method === 'GET' && photoMatch) {
        const film = readFilms().find(item =>
            item._id === photoMatch[1] && item.userId === userId && item.photoId === photoMatch[2]
        );
        const photo = film && readFilmPhoto(film);
        if (!photo) {
            sendJson(res, 404, { error: 'Fotografia nu a fost găsită.' });
            return true;
        }
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(photo);
        return true;
    }

    const match = pathname.match(
        /^\/api\/films\/([^/]+)$/
    );

    if (req.method === 'GET' && match) {
        const film = readFilms().find(
            item =>
                item._id === match[1] &&
                item.userId === userId
        );

        if (!film) {
            sendJson(res, 404, {
                error: 'Film not found'
            });
        } else {
            sendJson(res, 200, film);
        }

        return true;
    }

    if (req.method === 'PUT' && match) {
        let data;

        try {
            data = await readBody(req);
        } catch (error) {
            sendJson(res, error.status || 400, {
                error: error.message
            });
            return true;
        }

        if (!validateFilm(data)) {
            sendJson(res, 400, {
                error: 'Invalid film data'
            });
            return true;
        }

        const films = readFilms();

        const index = films.findIndex(
            item =>
                item._id === match[1] &&
                item.userId === userId
        );

        if (index === -1) {
            sendJson(res, 404, {
                error: 'Film not found'
            });
            return true;
        }

        const previous = films[index];
        const media = parseMedia(data, previous);
        if (!media) {
            sendJson(res, 400, { error: 'Fotografie sau locație invalidă.' });
            return true;
        }

        const film = {
            _id: match[1],
            userId,
            title: data.title.trim(),
            kind: data.kind,
            rating: data.rating,
            releaseDate: data.releaseDate,
            watched: data.watched,
            ...media.fields
        };
        if (media.photo) writeFilmPhoto(film, media.photo);

        films[index] = film;

        writeFilms(films);

        if (previous.photoId !== film.photoId) removeFilmPhoto(previous);
        sendJson(res, 200, film);

        broadcast(userId, 'updated', film);

        return true;
    }

    if (req.method === 'DELETE' && match) {
        const films = readFilms();
        const index = films.findIndex(item =>
            item._id === match[1] && item.userId === userId
        );

        if (index === -1) {
            sendJson(res, 404, { error: 'Titlul nu a fost găsit.' });
            return true;
        }

        const [deleted] = films.splice(index, 1);
        writeFilms(films);
        removeFilmPhoto(deleted);
        sendJson(res, 200, deleted);
        broadcast(userId, 'deleted', deleted);
        return true;
    }

    return false;
}

module.exports = {
    filmRouter
};
