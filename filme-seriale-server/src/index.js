const http = require('http');

const { authRouter, verifyToken } = require('./auth');
const { filmRouter } = require('./film');
const { initWebSocket } = require('./wss');

const PORT = 3001;

const server = http.createServer(async (req, res) => {
    const allowedOrigins = [
        'http://localhost:8100',
        'http://localhost:5173'
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const pathname = new URL(
        req.url,
        `http://localhost:${PORT}`
    ).pathname;

    try {
        const authHandled = await authRouter(
            req,
            res,
            pathname
        );

        if (authHandled) {
            return;
        }

        const authorization =
            req.headers.authorization || '';

        const token = authorization.startsWith('Bearer ')
            ? authorization.substring(7)
            : '';

        let user;

        try {
            user = verifyToken(token);
        } catch {
            res.writeHead(401, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Unauthorized'
            }));

            return;
        }

        const handled = await filmRouter(
            req,
            res,
            user._id
        );

        if (!handled) {
            res.writeHead(404, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Route not found'
            }));
        }

    } catch (error) {
        console.error('Server error:', error);

        if (!res.headersSent) {
            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Internal server error'
            }));
        }
    }
});

initWebSocket(server);

server.listen(PORT, '127.0.0.1', () => {
    console.log(
        `Filme și seriale server running on port ${PORT}`
    );
});
