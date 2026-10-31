const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { WebSocketServer } = require('ws');
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'filme-seriale.db'));
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS filme (id INTEGER PRIMARY KEY AUTOINCREMENT, titlu TEXT NOT NULL, tip TEXT NOT NULL, gen TEXT NOT NULL, an INTEGER NOT NULL, vazut INTEGER NOT NULL DEFAULT 0);`);
if (!db.prepare('SELECT value FROM settings WHERE key = ?').get('secret')) db.prepare('INSERT INTO settings VALUES (?, ?)').run('secret', crypto.randomBytes(48).toString('hex'));
const secret = process.env.JWT_SECRET || db.prepare('SELECT value FROM settings WHERE key = ?').get('secret').value;
if (!db.prepare('SELECT id FROM users WHERE username = ?').get('demo')) db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('demo', bcrypt.hashSync('demo123', 12));
const demo = db.prepare('SELECT id FROM users WHERE username = ?').get('demo').id;
const columns = db.prepare('PRAGMA table_info(filme)').all();
if (!columns.some(c => c.name === 'userId')) { db.exec('ALTER TABLE filme ADD COLUMN userId INTEGER'); db.prepare('UPDATE filme SET userId = ?').run(demo); }
if (!columns.some(c => c.name === 'clientId')) db.exec('ALTER TABLE filme ADD COLUMN clientId TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS film_client ON filme(userId, clientId)');
const app = express();
app.use(require('cors')());
app.use(express.json({ limit: '100kb' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const verify = token => jwt.verify(token, secret, { algorithms: ['HS256'] });
server.on('upgrade', (req, socket, head) => {
 if (req.url !== '/ws') return socket.destroy();
 wss.handleUpgrade(req, socket, head, client => {
  const timer = setTimeout(() => client.close(1008, 'Authentication required'), 5000);
  client.on('message', raw => {
   try {
    const user = verify(JSON.parse(raw.toString()).token);
    client.userId = Number(user.sub); clearTimeout(timer); clearTimeout(client.expiry);
    client.expiry = setTimeout(() => client.close(1008, 'Token expired'), Math.max(0, user.exp * 1000 - Date.now()));
    client.send(JSON.stringify({ tip: 'autentificat' }));
   } catch { client.close(1008, 'Invalid token'); }
  });
  client.on('close', () => { clearTimeout(timer); clearTimeout(client.expiry); });
 });
});
function notify(userId) { for (const c of wss.clients) if (c.userId === userId && c.readyState === 1) c.send(JSON.stringify({ tip: 'lista-modificata' })); }
const attempts = new Map();
app.post('/api/auth/:action', async (req, res) => {
 const { username, password } = req.body;
 if (!['login', 'register'].includes(req.params.action)) return res.sendStatus(404);
 if (typeof username !== 'string' || !/^[\p{L}\p{N}_.-]{3,40}$/u.test(username) || typeof password !== 'string' || password.length < 6 || password.length > 100) return res.status(400).json({ mesaj: 'Nume: 3-40 caractere fara spatii. Parola: 6-100 caractere.' });
 const previous = attempts.get(req.ip);
 const current = previous && previous.until > Date.now() ? previous : { count: 0, until: Date.now() + 60000 };
 attempts.set(req.ip, current);
 if (++current.count > 30) return res.status(429).json({ mesaj: 'Prea multe incercari. Reincearca peste un minut.' });
 if (req.params.action === 'register') {
  const hash = await bcrypt.hash(password, 12);
  try { db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash); }
  catch { return res.status(409).json({ mesaj: 'Numele este deja folosit.' }); }
 }
 const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
 if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ mesaj: 'Nume sau parola incorecta.' });
 res.json({ token: jwt.sign({}, secret, { subject: String(user.id), expiresIn: '7d' }), username: user.username, userId: user.id });
});
app.use('/api', (req, res, next) => {
 try { req.userId = Number(verify((req.headers.authorization || '').replace(/^Bearer /, '')).sub); next(); }
 catch { res.status(401).json({ mesaj: 'Sesiunea a expirat. Autentifica-te din nou.' }); }
});
const output = f => ({ ...f, vazut: Boolean(f.vazut) });
app.get('/api/filme', (req, res) => {
 const page = Math.max(0, parseInt(req.query.page) || 0);
 const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
 const where = "userId = ? AND instr(lower(titlu), lower(?)) > 0 AND (? = '' OR tip = ?) AND (? = '' OR vazut = ?)";
 const params = [req.userId, String(req.query.q || ''), String(req.query.tip || ''), String(req.query.tip || ''), String(req.query.vazut ?? ''), Number(req.query.vazut)];
 const total = db.prepare(`SELECT COUNT(*) AS n FROM filme WHERE ${where}`).get(...params).n;
 const items = db.prepare(`SELECT * FROM filme WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, page * limit).map(output);
 res.json({ items, total, hasMore: (page + 1) * limit < total });
});
app.get('/api/filme/:id', (req, res) => {
 const film = db.prepare('SELECT * FROM filme WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
 if (!film) return res.status(404).json({ mesaj: 'Elementul nu a fost gasit.' });
 res.json(output(film));
});
function valid(f) { return typeof f.titlu === 'string' && f.titlu.trim().length > 0 && ['film', 'serial'].includes(f.tip) && typeof f.gen === 'string' && f.gen.trim().length > 0 && Number.isInteger(f.an) && f.an >= 1888 && f.an <= 2200 && typeof f.vazut === 'boolean'; }
app.post('/api/filme', (req, res) => {
 if (!valid(req.body)) return res.status(400).json({ mesaj: 'Date invalide. Anul trebuie sa fie intre 1888 si 2200.' });
 const { titlu, tip, gen, an, vazut, clientId } = req.body;
 if (clientId !== undefined && (typeof clientId !== 'string' || clientId.length > 100)) return res.sendStatus(400);
 const existing = clientId && db.prepare('SELECT * FROM filme WHERE userId = ? AND clientId = ?').get(req.userId, clientId);
 if (existing) return res.json(output(existing));
 const result = db.prepare('INSERT INTO filme (titlu, tip, gen, an, vazut, userId, clientId) VALUES (?, ?, ?, ?, ?, ?, ?)').run(titlu.trim(), tip, gen.trim(), an, +vazut, req.userId, clientId || null);
 notify(req.userId);
 res.status(201).json(output(db.prepare('SELECT * FROM filme WHERE id = ?').get(result.lastInsertRowid)));
});
app.put('/api/filme/:id', (req, res) => {
 if (!valid(req.body)) return res.status(400).json({ mesaj: 'Date invalide. Verifica titlul, genul si anul (1888-2200).' });
 const { titlu, tip, gen, an, vazut } = req.body;
 const result = db.prepare('UPDATE filme SET titlu = ?, tip = ?, gen = ?, an = ?, vazut = ? WHERE id = ? AND userId = ?').run(titlu.trim(), tip, gen.trim(), an, +vazut, req.params.id, req.userId);
 if (!result.changes) return res.sendStatus(404);
 notify(req.userId);
 res.json(output(db.prepare('SELECT * FROM filme WHERE id = ? AND userId = ?').get(req.params.id, req.userId)));
});
app.delete('/api/filme/:id', (req, res) => {
 db.prepare('DELETE FROM filme WHERE id = ? AND userId = ?').run(req.params.id, req.userId);
 notify(req.userId); res.sendStatus(204);
});
if (require.main === module) server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Server: http://localhost:3000'));
module.exports = { server, db };
