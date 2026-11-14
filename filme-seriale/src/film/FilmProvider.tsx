import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/AuthProvider';
import {
    createFilm, deleteFilm, FilmApiError, getFilms, newWebSocket, updateFilm
} from './filmApi';
import type { FilmFilters } from './filmApi';
import type { FilmProps } from './FilmProps';
import { applyQueue, filterFilms, mergeFilms, readStore } from './filmStore';
import type { FilmStore, Operation } from './filmStore';
import { photoBase64 } from './photoStorage';

const PAGE_SIZE = 5;
const initialFilters: FilmFilters = { q: '', kind: '', watched: '' };

interface FilmsState {
    films: FilmProps[];
    collection: FilmProps[];
    fetching: boolean;
    fetchingError: string | null;
    saving: boolean;
    online: boolean;
    filters: FilmFilters;
    pendingIds: Set<string>;
    pendingCount: number;
    syncError: string | null;
    hasMore: boolean;
    setFilters: (filters: FilmFilters) => void;
    loadMore: () => void;
    saveFilm: (film: FilmProps) => Promise<void>;
    removeFilm: (id: string) => Promise<void>;
}

export const FilmContext = createContext<FilmsState>({
    films: [], collection: [], fetching: false, fetchingError: null,
    saving: false, online: true, filters: initialFilters, pendingIds: new Set(),
    pendingCount: 0, syncError: null, hasMore: false,
    setFilters: () => {}, loadMore: () => {}, saveFilm: async () => {}, removeFilm: async () => {}
});

function isRetryable(error: unknown) {
    return !(error instanceof FilmApiError) || error.status >= 500 || error.status === 429;
}

export function FilmProvider({ children }: { children: ReactNode }) {
    const { token, userId, logout } = useContext(AuthContext);
    const storageKey = 'filme-seriale-offline:' + userId;
    const [store, setStore] = useState(() => readStore(storageKey));
    const [online, setOnline] = useState(navigator.onLine);
    const [saving, setSaving] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [fetchingError, setFetchingError] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [filters, setFilters] = useState(initialFilters);
    const [page, setPage] = useState({ offset: 0 });
    const [serverIds, setServerIds] = useState<string[] | null>(null);
    const [serverHasMore, setServerHasMore] = useState(false);
    const operations = useRef(Promise.resolve());
    const active = useRef(false);

    const resetPages = useCallback(() => {
        setPage({ offset: 0 });
    }, []);

    const changeFilters = (next: FilmFilters) => {
        setServerIds(null);
        setFilters(next);
        resetPages();
    };

    const persist = useCallback((change: (current: FilmStore) => FilmStore) => {
        const updated = change(readStore(storageKey));
        localStorage.setItem(storageKey, JSON.stringify(updated));
        if (active.current) setStore(updated);
    }, [storageKey]);

    const exclusive = useCallback((action: () => Promise<void>) => {
        const run = async () => navigator.locks
            ? navigator.locks.request(storageKey, action)
            : action();
        const result = operations.current.then(run);
        operations.current = result.catch(() => {});
        return result;
    }, [storageKey]);

    const send = useCallback(async (operation: Operation) => {
        if (operation.method !== 'DELETE') {
            const { film } = operation;
            const sendFilm = operation.method === 'POST' ? createFilm : updateFilm;
            return film.photoPending && film.photoId
                ? sendFilm(token, film, await photoBase64(userId, film.photoId))
                : sendFilm(token, film);
        }
        try {
            return await deleteFilm(token, operation.id);
        } catch (error) {
            if (error instanceof FilmApiError && error.status === 404) return undefined;
            throw error;
        }
    }, [token, userId]);

    const commit = useCallback((operation: Operation, film?: FilmProps) => {
        persist(current => ({
            cached: film && operation.method !== 'DELETE'
                ? mergeFilms(current.cached, [film])
                : current.cached.filter(item => item._id !== operation.id),
            queue: current.queue.filter(item => item.key !== operation.key)
        }));
        if (active.current) resetPages();
    }, [persist, resetPages]);

    const synchronize = useCallback(() => exclusive(async () => {
        if (!active.current || !navigator.onLine) return;
        const queue = readStore(storageKey).queue;
        if (queue.length === 0) return;
        try {
            for (const operation of queue) {
                if (!active.current || !navigator.onLine) return;
                commit(operation, await send(operation));
            }
            if (active.current) setSyncError(null);
        } catch (error) {
            if (!active.current) return;
            if (error instanceof FilmApiError && error.status === 401) logout();
            else setSyncError(error instanceof Error ? error.message : 'Sincronizarea a eșuat.');
        }
    }), [commit, exclusive, logout, send, storageKey]);

    useEffect(() => {
        active.current = true;
        const sync = () => {
            void synchronize().catch(error => {
                if (active.current) setSyncError(error instanceof Error ? error.message : 'Sincronizarea a eșuat.');
            });
        };
        const networkChanged = () => {
            setOnline(navigator.onLine);
            if (navigator.onLine) {
                resetPages();
                sync();
            }
        };
        const storageChanged = (event: StorageEvent) => {
            if (event.key === storageKey) setStore(readStore(storageKey));
        };
        window.addEventListener('online', networkChanged);
        window.addEventListener('offline', networkChanged);
        window.addEventListener('storage', storageChanged);
        const timer = window.setInterval(sync, 5000);
        sync();
        return () => {
            active.current = false;
            window.clearInterval(timer);
            window.removeEventListener('online', networkChanged);
            window.removeEventListener('offline', networkChanged);
            window.removeEventListener('storage', storageChanged);
        };
    }, [resetPages, storageKey, synchronize]);

    useEffect(() => {
        if (!online) return;
        const controller = new AbortController();
        setFetching(true);
        setFetchingError(null);

        void getFilms(token, filters, page.offset, PAGE_SIZE, controller.signal).then(result => {
            if (controller.signal.aborted) return;
            persist(current => ({ ...current, cached: mergeFilms(current.cached, result.items) }));
            const ids = result.items.flatMap(film => film._id ? [film._id] : []);
            setServerIds(current => page.offset === 0 ? ids : [...new Set([...(current ?? []), ...ids])]);
            setServerHasMore(result.hasMore);
        }).catch(error => {
            if (controller.signal.aborted) return;
            if (error instanceof FilmApiError && error.status === 401) logout();
            else setFetchingError('Serverul nu răspunde. Sunt afișate datele disponibile local.');
        }).finally(() => {
            if (!controller.signal.aborted) setFetching(false);
        });
        return () => controller.abort();
    }, [filters, logout, online, page, persist, token]);

    useEffect(() => newWebSocket(token, message => {
        try {
            persist(current => ({
                ...current,
                cached: message.type === 'deleted'
                    ? current.cached.filter(film => film._id !== message.payload._id)
                    : mergeFilms(current.cached, [message.payload])
            }));
            resetPages();
        } catch {
            setSyncError('Datele nu au putut fi salvate local.');
        }
    }, resetPages), [persist, resetPages, token]);

    async function submit(operation: Operation) {
        setSaving(true);
        try {
            await exclusive(async () => {
                if (!active.current) return;
                const queued = readStore(storageKey).queue.some(item => item.id === operation.id);
                if (navigator.onLine && !queued) {
                    try {
                        commit(operation, await send(operation));
                        return;
                    } catch (error) {
                        if (!isRetryable(error)) {
                            if (error instanceof FilmApiError && error.status === 401) logout();
                            throw error;
                        }
                    }
                }
                persist(current => ({ ...current, queue: [...current.queue, operation] }));
            });
        } finally {
            if (active.current) setSaving(false);
        }
    }

    const saveFilm = (film: FilmProps) => {
        const id = film._id ?? crypto.randomUUID();
        return submit({ key: crypto.randomUUID(), method: film._id ? 'PUT' : 'POST', id, film: { ...film, _id: id } });
    };
    const removeFilm = (id: string) => submit({ key: crypto.randomUUID(), method: 'DELETE', id });

    const pendingIds = new Set(store.queue.map(item => item.id));
    const collection = applyQueue(store.cached, store.queue);
    const localMode = !online || fetchingError !== null || serverIds === null;
    const matching = filterFilms(collection, filters);
    const byId = new Map(matching.map(film => [film._id, film]));
    const visible = localMode
        ? matching.slice(0, page.offset + PAGE_SIZE)
        : mergeFilms(
            (serverIds ?? []).flatMap(id => byId.get(id) ?? []),
            matching.filter(film => film._id && pendingIds.has(film._id))
        );
    const hasMore = localMode ? matching.length > page.offset + PAGE_SIZE : serverHasMore;

    return (
        <FilmContext.Provider value={{
            films: visible, collection, fetching: online && fetching, fetchingError, saving, online,
            filters, setFilters: changeFilters, pendingIds, pendingCount: store.queue.length, syncError,
            hasMore,
            loadMore: () => {
                if (fetching && online) return;
                if (online) setFetching(true);
                setPage(current => ({ offset: current.offset + PAGE_SIZE }));
            },
            saveFilm, removeFilm
        }}>
            {children}
        </FilmContext.Provider>
    );
}
