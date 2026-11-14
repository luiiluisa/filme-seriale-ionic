const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../db/photos');
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const photoLimit = 450 * 1024;

function photoPath(film) {
    if (![film.userId, film._id, film.photoId].every(id => typeof id === 'string' && uuid.test(id))) {
        throw new Error('Identificator de fotografie invalid.');
    }
    return path.join(root, film.userId, film._id + '-' + film.photoId + '.jpg');
}

function parseMedia(data, previous) {
    const location = data.location === undefined ? previous?.location : data.location;
    if (location !== undefined && (
        !location || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 ||
        !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180
    )) return null;

    const photoId = data.photoId === undefined ? previous?.photoId : data.photoId;
    const payload = data.photoUpload;
    if (payload === undefined && photoId !== previous?.photoId) return null;
    if (payload !== undefined && (
        typeof photoId !== 'string' || !uuid.test(photoId) || typeof payload !== 'string' ||
        payload.length > Math.ceil(photoLimit / 3) * 4 || !/^[a-z0-9+/]+={0,2}$/i.test(payload)
    )) return null;

    const photo = payload === undefined ? undefined : Buffer.from(payload, 'base64');
    if (photo && (
        photo.length < 5 || photo.length > photoLimit ||
        photo[0] !== 0xff || photo[1] !== 0xd8 || photo[2] !== 0xff ||
        photo[photo.length - 2] !== 0xff || photo[photo.length - 1] !== 0xd9
    )) return null;

    return {
        fields: {
            ...(location && { location: { latitude: location.latitude, longitude: location.longitude } }),
            ...(photoId && { photoId })
        },
        photo
    };
}

function writeFilmPhoto(film, photo) {
    const target = photoPath(film);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, photo);
}

function readFilmPhoto(film) {
    try {
        return fs.readFileSync(photoPath(film));
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

function removeFilmPhoto(film) {
    if (!film.photoId) return;
    try {
        fs.unlinkSync(photoPath(film));
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Fotografia veche nu a putut fi ștearsă.', error);
    }
}

module.exports = { parseMedia, writeFilmPhoto, readFilmPhoto, removeFilmPhoto };
