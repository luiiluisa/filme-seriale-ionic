export type TipMedia = 'film' | 'serial';
export interface Film { id: number; titlu: string; tip: TipMedia; gen: string; an: number; vazut: boolean; clientId?: string; pending?: boolean }
export type FilmNou = Omit<Film, 'id'>;
export interface Session { token: string; username: string; userId: number }
interface Operation { id: number; method: 'POST' | 'PUT' | 'DELETE'; film?: FilmNou }
interface Store { films: Film[]; queue: Operation[] }
export interface Filters { q?: string; tip?: string; vazut?: string }
export interface Page { items: Film[]; total: number; hasMore: boolean; cached?: boolean }
export const CHANGE = 'library-change';
export const AUTH = 'library-auth';
const sessionKey = 'filme-session';
export function getSession(): Session | null {
    try {
        const session = JSON.parse(localStorage.getItem(sessionKey) || 'null') as Session | null;
        if (!session || JSON.parse(atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000 <= Date.now()) return null;
        return session;
    } catch { return null; }
}
export function logout() { localStorage.removeItem(sessionKey); window.dispatchEvent(new Event(AUTH)); }
export async function login(username: string, password: string, register: boolean) {
    const response = await fetch('/api/auth/' + (register ? 'register' : 'login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.mesaj || 'Autentificarea a eșuat.');
    localStorage.setItem(sessionKey, JSON.stringify(data)); window.dispatchEvent(new Event(AUTH));
}
function key(s: Session) { return `filme-data-${s.userId}`; }
function read(s: Session): Store { return JSON.parse(localStorage.getItem(key(s)) || '{"films":[],"queue":[]}'); }
function write(s: Session, data: Store) { localStorage.setItem(key(s), JSON.stringify(data)); window.dispatchEvent(new Event(CHANGE)); }
function session() { const s = getSession(); if (!s) { logout(); throw new Error('Autentifică-te din nou.'); } return s; }
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
async function request(s: Session, url: string, options: RequestInit = {}) {
    const res = await fetch('/api/filme' + url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.token}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
        if (res.status === 401 && getSession()?.token === s.token) logout();
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.mesaj || `Cererea a eșuat (${res.status}).`);
    }
    return res.status === 204 ? undefined : res.json();
}
export function pendingCount() { const s = getSession(); return s ? read(s).queue.length : 0; }
function overlay(items: Film[], state: Store) {
    const result = new Map(items.map(f => [f.id, f]));
    for (const op of state.queue) {
        if (op.method === 'DELETE') result.delete(op.id);
        else result.set(op.id, { ...op.film!, id: op.id, pending: true });
    }
    return [...result.values()];
}
function matches(f: Film, filters: Filters) { return (!filters.q || f.titlu.toLocaleLowerCase().includes(filters.q.toLocaleLowerCase())) && (!filters.tip || f.tip === filters.tip) && (!filters.vazut || Number(f.vazut) === Number(filters.vazut)); }
export async function obtinePagina(page = 0, filters: Filters = {}): Promise<Page> {
    const s = session();
    try {
        if (!navigator.onLine) throw new TypeError('Offline');
        const params = new URLSearchParams({ page: String(page), limit: '10', ...filters });
        const data: Page = await request(s, '?' + params);
        const state = read(s);
        const cached = new Map(state.films.map(f => [f.id, f]));
        data.items.forEach(f => cached.set(f.id, f));
        // Unfiltered full first page also removes records deleted by another client.
        if (page === 0 && !data.hasMore && !filters.q && !filters.tip && !filters.vazut) state.films = data.items;
        else state.films = [...cached.values()];
        localStorage.setItem(key(s), JSON.stringify(state));
        return { ...data, items: overlay(data.items, state).filter(f => matches(f, filters)) };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        const all = overlay(read(s).films, read(s)).filter(f => matches(f, filters)).sort((a, b) => b.id - a.id);
        return { items: all.slice(page * 10, (page + 1) * 10), total: all.length, hasMore: (page + 1) * 10 < all.length, cached: true };
    }
}
export async function obtineFilm(id: number): Promise<Film> {
    const s = session(); const state = read(s);
    const local = overlay(state.films, state).find(f => f.id === id);
    if (local?.pending || id < 0 || !navigator.onLine) { if (local) return local; throw new Error('Titlul nu este disponibil local.'); }
    try {
        const film: Film = await request(s, '/' + id);
        const latest = read(s); latest.films = [...latest.films.filter(f => f.id !== id), film];
        localStorage.setItem(key(s), JSON.stringify(latest)); return film;
    } catch (error) { if (error instanceof ApiError || !local) throw error; return local; }
}
let serial: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> { const result = serial.then(fn); serial = result.catch(() => {}); return result; }
export function sincronizeaza() {
    return exclusive(async () => {
        const s = session();
        while (navigator.onLine && getSession()?.token === s.token) {
            const op = read(s).queue[0]; if (!op) return;
            try {
                const saved: Film | undefined = await request(s, op.method === 'POST' ? '' : '/' + op.id, { method: op.method, body: op.film ? JSON.stringify(op.film) : undefined });
                const state = read(s); state.queue.shift();
                state.films = state.films.filter(f => f.id !== op.id && f.id !== saved?.id);
                if (saved) state.films.push(saved);
                if (saved && op.id < 0) for (const next of state.queue) if (next.id === op.id) { next.id = saved.id; if (next.method === 'POST') next.method = 'PUT'; }
                write(s, state);
            } catch (error) {
                if (error instanceof ApiError) throw error;
                return;
            }
        }
    });
}
function mutate(id: number | undefined, film: FilmNou | undefined, method: Operation['method']) {
    const owner = session();
    return exclusive(async () => {
        if (getSession()?.token !== owner.token) throw new Error('Contul s-a schimbat. Reîncearcă salvarea.');
        const s = owner; const state = read(s);
        const localId = id ?? Math.min(-Date.now(), ...state.films.map(f => f.id), ...state.queue.map(o => o.id)) - 1;
        const body = film ? { ...film, clientId: film.clientId || crypto.randomUUID() } : undefined;
        // Persist the intent before sending, so an interrupted request can be retried safely.
        const op: Operation = { id: localId, method, film: body };
        state.queue.push(op);
        state.films = state.films.filter(f => f.id !== localId);
        if (body) state.films.push({ ...body, id: localId, pending: true });
        write(s, state);
    }).then(async () => { await sincronizeaza(); });
}
export const adaugaFilm = (film: FilmNou) => mutate(undefined, film, 'POST');
export const modificaFilm = (id: number, film: FilmNou) => mutate(id, film, 'PUT');
export const stergeFilm = (id: number) => mutate(id, undefined, 'DELETE');
export function connectSocket(onChange: () => void) {
    let closed = false; let socket: WebSocket | undefined; let retry: ReturnType<typeof setTimeout>;
    const open = () => {
        const s = getSession(); if (closed || !s) return;
        socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
        socket.onopen = () => socket?.send(JSON.stringify({ token: s.token }));
        socket.onmessage = e => { if (JSON.parse(e.data).tip === 'lista-modificata') onChange(); };
        socket.onclose = () => { if (!closed) retry = setTimeout(open, 3000); };
    };
    open(); return () => { closed = true; clearTimeout(retry); socket?.close(); };
}
