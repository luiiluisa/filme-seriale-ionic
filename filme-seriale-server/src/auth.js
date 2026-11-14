const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { addStarterFilms } = require('./filmStorage');

const USERS_FILE = path.join(__dirname, '../db/users.json');
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    throw new Error('JWT_SECRET is missing');
}

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
    }

    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2)
    );
}

function hashPassword(password, salt) {
    return crypto.scryptSync(
        password,
        salt,
        64
    ).toString('hex');
}

function createToken(user) {
    return jwt.sign(
        {
            _id: user._id,
            username: user.username
        },
        SECRET,
        { expiresIn: '1d' }
    );
}

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify(data));
}

async function readBody(req) {
    let body = '';

    for await (const chunk of req) {
        body += chunk;

        if (body.length > 10000) {
            throw new Error('Request too large');
        }
    }

    return JSON.parse(body);
}

async function authRouter(req, res, pathname) {
    if (
        pathname !== '/api/auth/login' &&
        pathname !== '/api/auth/signup'
    ) {
        return false;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, {
            error: 'Method not allowed'
        });
        return true;
    }

    try {
        const { username, password } = await readBody(req);

        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !password ||
            (pathname === '/api/auth/signup' && (username.trim().length < 3 || password.length < 3))
        ) {
            sendJson(res, 400, {
                error: pathname === '/api/auth/signup'
                    ? 'Numele de utilizator și parola trebuie să aibă cel puțin 3 caractere.'
                    : 'Username and password are required'
            });
            return true;
        }

        const users = getUsers();
        const normalizedUsername = username.trim();

        if (pathname === '/api/auth/signup') {
            const exists = users.some(
                user => user.username === normalizedUsername
            );

            if (exists) {
                sendJson(res, 409, {
                    error: 'Username already exists'
                });
                return true;
            }

            const salt = crypto.randomBytes(16).toString('hex');

            const user = {
                _id: crypto.randomUUID(),
                username: normalizedUsername,
                salt,
                passwordHash: hashPassword(password, salt)
            };

            addStarterFilms(user._id);
            users.push(user);
            saveUsers(users);

            sendJson(res, 201, {
                token: createToken(user)
            });

            return true;
        }

        const user = users.find(
            user => user.username === normalizedUsername
        );

        if (!user) {
            sendJson(res, 401, {
                error: 'Invalid credentials'
            });
            return true;
        }

        const submitted = Buffer.from(
            hashPassword(password, user.salt),
            'hex'
        );

        const stored = Buffer.from(
            user.passwordHash,
            'hex'
        );

        if (
            submitted.length !== stored.length ||
            !crypto.timingSafeEqual(submitted, stored)
        ) {
            sendJson(res, 401, {
                error: 'Invalid credentials'
            });
            return true;
        }

        sendJson(res, 200, {
            token: createToken(user)
        });

        return true;

    } catch (error) {
        sendJson(res, 400, {
            error: 'Invalid request'
        });
        return true;
    }
}

function verifyToken(token) {
    return jwt.verify(token, SECRET);
}

module.exports = {
    authRouter,
    verifyToken
};
