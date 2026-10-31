import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adaugaFilm, modificaFilm, stergeFilm, obtinePagina, pendingCount, sincronizeaza, getSession, logout } from './api';
const film = { titlu: 'Offline film', tip: 'film' as const, gen: 'SF', an: 2024, vazut: false };
function user(id = 1) { localStorage.setItem('filme-session', JSON.stringify({ userId: id, username: `user${id}`, token: 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature' })); }
function online(value: boolean) { Object.defineProperty(navigator, 'onLine', { configurable: true, value }); }
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); user(); online(false); });
describe('offline storage and synchronization', () => {
 it('keeps create/edit across reload and remaps temporary IDs during synchronization', async () => {
  await adaugaFilm(film);
  const local = (await obtinePagina()).items[0];
  expect(local.id).toBeLessThan(0); expect(local.pending).toBe(true);
  await modificaFilm(local.id, { ...film, titlu: 'Edited offline' });
  expect(pendingCount()).toBe(2);
  expect((await obtinePagina()).items[0].titlu).toBe('Edited offline');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ ...film, id: 8 }))).mockResolvedValueOnce(new Response(JSON.stringify({ ...film, titlu: 'Edited offline', id: 8 })));
  online(true); await sincronizeaza();
  expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  expect(fetchMock.mock.calls[1][0]).toBe('/api/filme/8');
  expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT'); expect(pendingCount()).toBe(0);
  online(false); expect((await obtinePagina()).items[0]).toMatchObject({ id: 8, titlu: 'Edited offline' });
 });
 it('preserves queued changes on a failed request, retries with the same clientId', async () => {
  online(true); const mock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network failure'));
  await adaugaFilm(film); expect(pendingCount()).toBe(1);
  const first = JSON.parse(String(mock.mock.calls[0][1]?.body));
  mock.mockResolvedValue(new Response(JSON.stringify({ ...film, id: 9 })));
  await sincronizeaza();
  expect(JSON.parse(String(mock.mock.calls[1][1]?.body)).clientId).toBe(first.clientId);
  expect(pendingCount()).toBe(0);
 });
 it('isolates caches and queues between accounts and preserves them after logout', async () => {
  await adaugaFilm(film); expect(pendingCount()).toBe(1);
  logout(); expect(getSession()).toBeNull(); user(2);
  expect(pendingCount()).toBe(0); expect((await obtinePagina()).items).toEqual([]);
  user(1); expect(pendingCount()).toBe(1); expect((await obtinePagina()).items).toHaveLength(1);
 });
 it('filters and paginates cached data', async () => {
  localStorage.setItem('filme-data-1', JSON.stringify({ queue: [], films: Array.from({ length: 23 }, (_, i) => ({ ...film, id: i + 1, titlu: `Film ${i}`, tip: i % 2 ? 'serial' : 'film' })) }));
  expect((await obtinePagina(0)).items).toHaveLength(10);
  expect((await obtinePagina(2)).items).toHaveLength(3);
  expect((await obtinePagina(0, { tip: 'serial', q: 'Film 1' })).total).toBe(6);
 });
 it('synchronizes creation followed by deletion using the server ID', async () => {
  await adaugaFilm(film); const id = (await obtinePagina()).items[0].id;
  await stergeFilm(id); expect((await obtinePagina()).items).toHaveLength(0);
  const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ ...film, id: 10 }))).mockResolvedValueOnce(new Response(null, { status: 204 }));
  online(true); await sincronizeaza();
  expect(mock.mock.calls[1][0]).toBe('/api/filme/10'); expect(pendingCount()).toBe(0);
  online(false); expect((await obtinePagina()).items).toHaveLength(0);
 });
});
