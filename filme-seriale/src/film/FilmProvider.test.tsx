import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthContext } from '../auth/AuthProvider';
import { FilmContext, FilmProvider } from './FilmProvider';
import { createFilm, deleteFilm, FilmApiError, getFilms, updateFilm } from './filmApi';
import type { FilmProps } from './FilmProps';

vi.mock('./filmApi', async importOriginal => ({
    ...await importOriginal<typeof import('./filmApi')>(),
    createFilm: vi.fn(),
    deleteFilm: vi.fn(),
    updateFilm: vi.fn(),
    getFilms: vi.fn(),
    newWebSocket: () => () => {}
}));

const film: FilmProps = {
    _id: 'existing', title: 'Interstellar', kind: 'film',
    rating: 5, releaseDate: '2014-11-07', watched: true
};

function network(online: boolean) {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

afterEach(() => {
    cleanup();
    localStorage.clear();
    network(true);
    vi.resetAllMocks();
    vi.useRealTimers();
});

test('caches loaded films, keeps offline changes after reload, and synchronizes them in order', async () => {
    vi.mocked(getFilms).mockResolvedValue({ items: [film], hasMore: false });
    vi.mocked(createFilm).mockImplementation(async (_token, item) => item);
    vi.mocked(updateFilm).mockImplementation(async (_token, item) => item);
    let state: React.ContextType<typeof FilmContext>;
    function Harness() {
        state = useContext(FilmContext);
        return null;
    }
    const session = {
        token: 'token', username: 'test', userId: 'user-a', isAuthenticated: true, isAuthenticating: false,
        authenticationError: null, logout: vi.fn(), login: vi.fn(), signup: vi.fn()
    };
    const mount = () => render(
        <AuthContext.Provider value={session}><FilmProvider><Harness /></FilmProvider></AuthContext.Provider>
    );
    const first = mount();
    await waitFor(() => expect(state.films).toEqual([film]));
    act(() => network(false));
    await act(() => state.saveFilm({ ...film, _id: undefined, title: 'Offline' }));
    const added = state!.collection.find(item => item.title === 'Offline')!;
    await act(() => state.saveFilm({ ...added, title: 'Offline editat' }));
    expect(state!.pendingCount).toBe(2);
    expect(createFilm).not.toHaveBeenCalled();

    first.unmount();
    mount();
    expect(state!.online).toBe(false);
    expect(state!.collection.map(item => item.title)).toEqual(['Offline editat', film.title]);
    expect(state!.pendingIds.has(added._id!)).toBe(true);
    act(() => network(true));
    await waitFor(() => expect(state.pendingCount).toBe(0));
    expect(createFilm).toHaveBeenCalledWith('token', added);
    expect(updateFilm).toHaveBeenCalledWith('token', { ...added, title: 'Offline editat' });
    expect(vi.mocked(createFilm).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(updateFilm).mock.invocationCallOrder[0]);
});

test('uses server pagination and filters, and queues a change after a failed online request', async () => {
    vi.mocked(getFilms).mockResolvedValue({ items: [film], hasMore: true });
    vi.mocked(updateFilm).mockRejectedValue(new TypeError('Network error'));
    let state: React.ContextType<typeof FilmContext>;
    function Harness() {
        state = useContext(FilmContext);
        return null;
    }
    render(
        <AuthContext.Provider value={{
            token: 'token', username: 'test', userId: 'user-b', isAuthenticated: true, isAuthenticating: false,
            authenticationError: null, logout: vi.fn(), login: vi.fn(), signup: vi.fn()
        }}><FilmProvider><Harness /></FilmProvider></AuthContext.Provider>
    );
    await waitFor(() => expect(state.hasMore).toBe(true));
    act(() => state.loadMore());
    await waitFor(() => expect(getFilms).toHaveBeenLastCalledWith('token', { q: '', kind: '', watched: '' }, 5, 5, expect.anything()));
    act(() => state.setFilters({ q: 'Inter', kind: 'film', watched: 'true' }));
    await waitFor(() => expect(getFilms).toHaveBeenLastCalledWith('token', { q: 'Inter', kind: 'film', watched: 'true' }, 0, 5, expect.anything()));
    await act(() => state.saveFilm({ ...film, rating: 4 }));
    expect(updateFilm).toHaveBeenCalled();
    expect(state!.pendingCount).toBe(1);
    expect(state!.films[0].rating).toBe(4);
});

function mountCollection(userId: string) {
    let state!: React.ContextType<typeof FilmContext>;
    const logout = vi.fn();
    function Harness() {
        state = useContext(FilmContext);
        return null;
    }
    const view = render(
        <AuthContext.Provider value={{
            token: 'token-' + userId, username: userId, userId, isAuthenticated: true,
            isAuthenticating: false, authenticationError: null, logout, login: vi.fn(), signup: vi.fn()
        }}><FilmProvider><Harness /></FilmProvider></AuthContext.Provider>
    );
    return { ...view, logout, state: () => state };
}

test('an offline deletion survives remount and an already deleted server item clears the queue', async () => {
    vi.mocked(getFilms).mockResolvedValueOnce({ items: [film], hasMore: false })
        .mockResolvedValue({ items: [], hasMore: false });
    vi.mocked(deleteFilm).mockRejectedValue(new FilmApiError(404, 'Deja șters'));
    const first = mountCollection('delete');
    await waitFor(() => expect(first.state().films).toEqual([film]));
    act(() => network(false));
    await act(() => first.state().removeFilm('existing'));
    expect(first.state().films).toEqual([]);
    expect(first.state().pendingCount).toBe(1);
    expect(deleteFilm).not.toHaveBeenCalled();

    first.unmount();
    const restored = mountCollection('delete');
    expect(restored.state().films).toEqual([]);
    expect(restored.state().pendingCount).toBe(1);
    act(() => network(true));
    await waitFor(() => expect(restored.state().pendingCount).toBe(0));
    expect(deleteFilm).toHaveBeenCalledOnce();
    expect(restored.state().collection).toEqual([]);
});

test('server recovery retries pending work without a browser online event and reuses the create ID', async () => {
    vi.useFakeTimers();
    const failure = new FilmApiError(503, 'Server indisponibil');
    vi.mocked(getFilms).mockResolvedValue({ items: [film], hasMore: false });
    vi.mocked(createFilm)
        .mockRejectedValueOnce(failure)
        .mockRejectedValueOnce(failure)
        .mockImplementation(async (_token, item) => item);
    const view = mountCollection('retry');
    await act(async () => {});
    await act(() => view.state().saveFilm({ ...film, _id: undefined, title: 'Titlu în așteptare' }));
    expect(view.state().online).toBe(true);
    expect(view.state().pendingCount).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(view.state().pendingCount).toBe(1);
    expect(view.state().syncError).toBe(failure.message);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(view.state().pendingCount).toBe(0);
    expect(view.state().syncError).toBeNull();
    const ids = vi.mocked(createFilm).mock.calls.map(([, item]) => item._id);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBeTruthy();
    expect(new Set(ids).size).toBe(1);
    expect(view.state().collection.filter(item => item.title === 'Titlu în așteptare')).toHaveLength(1);
});

test('offline search, pagination and pending work use only the current account cache', async () => {
    const serial = { ...film, _id: 'serial', kind: 'serial' as const, title: 'Serial vizionat' };
    const firstPage = [film, ...Array.from({ length: 4 }, (_, i) => ({ ...film, _id: 'extra-' + i }))];
    vi.mocked(getFilms).mockResolvedValueOnce({ items: firstPage, hasMore: true })
        .mockResolvedValueOnce({ items: [serial], hasMore: false });
    const first = mountCollection('owner');
    await waitFor(() => expect(first.state().films).toHaveLength(5));
    act(() => first.state().loadMore());
    await waitFor(() => expect(first.state().films).toHaveLength(6));
    act(() => network(false));
    act(() => first.state().setFilters({ q: '', kind: '', watched: '' }));
    expect(first.state().films).toHaveLength(5);
    expect(first.state().hasMore).toBe(true);
    act(() => first.state().loadMore());
    expect(first.state().films).toHaveLength(6);
    act(() => first.state().setFilters({ q: 'VIZIONAT', kind: 'serial', watched: 'true' }));
    expect(first.state().films).toEqual([serial]);
    await act(() => first.state().saveFilm({ ...serial, rating: 4 }));
    expect(first.state().films[0].rating).toBe(4);
    expect(first.state().pendingCount).toBe(1);
    expect(getFilms).toHaveBeenCalledTimes(2);
    first.unmount();
    const other = mountCollection('other');
    expect(other.state().films).toEqual([]);
    expect(other.state().pendingCount).toBe(0);
});

test('validation errors are returned immediately and an unauthorized mutation ends the session', async () => {
    vi.mocked(getFilms).mockResolvedValue({ items: [film], hasMore: false });
    vi.mocked(updateFilm).mockRejectedValueOnce(new FilmApiError(400, 'Date invalide'))
        .mockRejectedValueOnce(new FilmApiError(401, 'Sesiune invalidă'));
    const view = mountCollection('errors');
    await waitFor(() => expect(view.state().films).toEqual([film]));
    await act(async () => {
        await expect(view.state().saveFilm({ ...film, rating: 0 })).rejects.toThrow('Date invalide');
    });
    expect(view.state().pendingCount).toBe(0);
    expect(view.logout).not.toHaveBeenCalled();
    await act(async () => {
        await expect(view.state().saveFilm(film)).rejects.toThrow('Sesiune invalidă');
    });
    expect(view.state().pendingCount).toBe(0);
    expect(view.logout).toHaveBeenCalledOnce();
});
