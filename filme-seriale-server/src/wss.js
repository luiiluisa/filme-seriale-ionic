const {
    WebSocketServer,
    WebSocket
} = require('ws');

const { verifyToken } = require('./auth');

let wss;

function initWebSocket(server) {
    wss = new WebSocketServer({ server });

    wss.on('connection', socket => {
        console.log('WebSocket client connected');

        socket.user = null;

        socket.on('message', raw => {
            try {
                const message = JSON.parse(raw.toString());

                if (!socket.user) {
                    if (message.type !== 'authorization') {
                        socket.close(1008, 'Authorization required');
                        return;
                    }

                    const token = message.payload?.token;

                    socket.user = verifyToken(token);

                    console.log(
                        'WebSocket authenticated:',
                        socket.user.username
                    );
                }
            } catch (error) {
                console.error('WebSocket authentication failed');
                socket.close(1008, 'Invalid token');
            }
        });

        socket.on('close', () => {
            console.log('WebSocket disconnected');
        });

        socket.on('error', error => {
            console.error('WebSocket error:', error);
        });
    });
}

function broadcast(userId, type, payload) {
    if (!wss) return;

    const message = JSON.stringify({
        type,
        payload
    });

    wss.clients.forEach(client => {
        if (
            client.readyState === WebSocket.OPEN &&
            client.user &&
            client.user._id === userId &&
            client.user.exp * 1000 > Date.now()
        ) {
            client.send(message);
        }
    });
}

module.exports = {
    initWebSocket,
    broadcast
};
