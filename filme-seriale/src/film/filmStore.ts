import type { FilmFilters } from './filmApi';
import type { FilmProps } from './FilmProps';

export type Operation =
    | { key: string; method: 'POST' | 'PUT'; id: string; film: FilmProps }
    | { key: string; method: 'DELETE'; id: string };

export interface FilmStore {
    cached: FilmProps[];
    queue: Operation[];
}

export function readStore(key: string): FilmStore {
    try {
        return JSON.parse(localStorage.getItem(key) ?? '{"cached":[],"queue":[]}');
    } catch {
        return { cached: [], queue: [] };
    }
}

export function mergeFilms(current: FilmProps[], incoming: FilmProps[]) {
    const merged = new Map(incoming.map(film => [film._id, film]));
    for (const film of current) {
        if (!merged.has(film._id)) merged.set(film._id, film);
    }
    return [...merged.values()];
}

export function applyQueue(cached: FilmProps[], queue: Operation[]) {
    return queue.reduce((films, operation) => {
        if (operation.method === 'DELETE') return films.filter(film => film._id !== operation.id);
        if (operation.method === 'POST' || !films.some(film => film._id === operation.id)) {
            return mergeFilms(films, [operation.film]);
        }
        return films.map(film => film._id === operation.id ? operation.film : film);
    }, cached);
}

export function filterFilms(films: FilmProps[], filters: FilmFilters) {
    const query = filters.q.trim().toLocaleLowerCase('ro');
    return films.filter(film =>
        film.title.toLocaleLowerCase('ro').includes(query) &&
        (!filters.kind || film.kind === filters.kind) &&
        (!filters.watched || String(film.watched) === filters.watched)
    );
}
