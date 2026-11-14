import { FilmProps } from './FilmProps';

const API_URL = 'http://localhost:3001/api/films';
const WS_URL = 'ws://localhost:3001';

export class FilmApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

async function request<T>(
    url: string,
    token: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new FilmApiError(response.status,
            data.error || 'Server error'
        );
    }

    return response.json();
}

export interface FilmFilters {
    q: string;
    kind: string;
    watched: string;
}

export const getFilms = (token: string, filters: FilmFilters, offset: number, limit: number, signal: AbortSignal) => {
    const params = new URLSearchParams({ ...filters, offset: String(offset), limit: String(limit) });
    return request<{ items: FilmProps[]; hasMore: boolean }>(API_URL + '?' + params, token, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)])
    });
};

export const createFilm = (
    token: string,
    film: FilmProps,
    photoUpload?: string
): Promise<FilmProps> =>
    request<FilmProps>(
        API_URL,
        token,
        {
            method: 'POST',
            body: JSON.stringify({ ...film, photoPending: undefined, clientId: film._id, photoUpload })
        }
    );

export const updateFilm = (
    token: string,
    film: FilmProps,
    photoUpload?: string
): Promise<FilmProps> =>
    request<FilmProps>(
        `${API_URL}/${film._id}`,
        token,
        {
            method: 'PUT',
            body: JSON.stringify({ ...film, photoPending: undefined, photoUpload })
        }
    );

export const deleteFilm = (token: string, id: string): Promise<FilmProps> =>
    request<FilmProps>(API_URL + '/' + encodeURIComponent(id), token, {
        method: 'DELETE'
    });

export async function getFilmPhoto(token: string, filmId: string, photoId: string, signal: AbortSignal) {
    const url = API_URL + "/" + encodeURIComponent(filmId) + "/photo/" + encodeURIComponent(photoId);
    const response = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)])
    });
    if (!response.ok) throw new FilmApiError(response.status, "Fotografia nu a putut fi descărcată.");
    return response.blob();
}

export interface FilmMessage {
    type: 'created' | 'updated' | 'deleted';
    payload: FilmProps;
}

export function newWebSocket(token: string, onMessage: (message: FilmMessage) => void, onConnect: () => void) {
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    let stopped = false;
    function connect() {
        socket = new WebSocket(WS_URL);
        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'authorization', payload: { token } }));
            onConnect();
        };
        socket.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                if (['created', 'updated', 'deleted'].includes(message.type) && message.payload?._id) onMessage(message);
            } catch (error) {
                console.error('Invalid WebSocket message', error);
            }
        };
        socket.onclose = event => {
            if (!stopped && event.code !== 1008) retry = setTimeout(connect, 3000);
        };
    }
    connect();
    return () => {
        stopped = true;
        clearTimeout(retry);
        socket.onopen = null;
        socket.onmessage = null;
        if (socket.readyState === WebSocket.CONNECTING) {
            socket.addEventListener('open', () => socket.close(), { once: true });
        } else {
            socket.close();
        }
    };
}
