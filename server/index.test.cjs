const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_PATH = ':memory:';
const { server, db } = require('./index');
const { WebSocket } = require('ws');
let base;
before(async () => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
async function call(route, token, method = 'GET', body) {
 const response = await fetch(base + '/api/' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
 return { status: response.status, body: await response.json().catch(() => undefined) };
}
const film = { titlu: 'Test film', tip: 'film', gen: 'Drama', an: 2020, vazut: false };
test('JWT, ownership, pagination, filters, idempotent retries and secured sockets', async () => {
 assert.equal((await call('filme')).status, 401);
 const a = (await call('auth/register', null, 'POST', { username: 'test_a', password: 'secret123' })).body;
 const b = (await call('auth/register', null, 'POST', { username: 'test_b', password: 'secret123' })).body;
 assert.ok(a.token); assert.ok(b.token);
 assert.equal((await call('auth/login', null, 'POST', { username: 'test_a', password: 'wrong12' })).status, 401);
 assert.equal((await call('filme', a.token.slice(0, -4) + 'oops')).status, 401);
 const sockets = [a, b].map(user => new WebSocket(base.replace('http', 'ws') + '/ws'));
 await Promise.all(sockets.map((ws, i) => new Promise((resolve, reject) => { ws.on('error', reject); ws.on('open', () => ws.send(JSON.stringify({ token: [a, b][i].token }))); ws.once('message', data => { assert.equal(JSON.parse(data).tip, 'autentificat'); resolve(); }); })));
 let notices = [0, 0]; sockets.forEach((ws, i) => ws.on('message', () => notices[i]++));
 const created = await call('filme', a.token, 'POST', { ...film, clientId: 'once' });
 const id = created.body.id;
 assert.equal(created.status, 201);
 assert.equal((await call('filme', a.token, 'POST', { ...film, clientId: 'once' })).body.id, id);
 assert.equal((await call('filme', b.token)).body.total, 0);
 assert.equal((await call('filme/' + id, b.token)).status, 404);
 assert.equal((await call('filme/' + id, b.token, 'PUT', film)).status, 404);
 await call('filme/' + id, b.token, 'DELETE');
 assert.equal((await call('filme/' + id, a.token)).status, 200);
 for (let i = 0; i < 12; i++) await call('filme', a.token, 'POST', { ...film, titlu: 'Serial ' + i, tip: 'serial', vazut: true });
 const first = (await call('filme?limit=10&page=0', a.token)).body;
 const second = (await call('filme?limit=10&page=1', a.token)).body;
 assert.equal(first.items.length, 10); assert.equal(first.hasMore, true); assert.equal(second.items.length, 3);
 assert.equal(new Set([...first.items, ...second.items].map(f => f.id)).size, 13);
 assert.equal((await call('filme?q=Test&tip=film&vazut=0', a.token)).body.total, 1);
 assert.equal((await call('filme', a.token, 'POST', { ...film, an: 0 })).status, 400);
 await new Promise(resolve => setTimeout(resolve, 80));
 assert.ok(notices[0] > 0); assert.equal(notices[1], 1); // Only B's own DELETE sends its notification.
 await Promise.all(sockets.map(ws => new Promise(resolve => { ws.once('close', resolve); ws.close(); })));
 const invalid = new WebSocket(base.replace('http', 'ws') + '/ws');
 await new Promise((resolve, reject) => { invalid.on('error', reject); invalid.on('open', () => invalid.send(JSON.stringify({ token: 'invalid' }))); invalid.once('close', code => { assert.equal(code, 1008); resolve(); }); });
});
