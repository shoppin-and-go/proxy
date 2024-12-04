const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const sockjs = require('sockjs');

const app = express();
const server = require('http').createServer(app);

// CORS 설정
app.use(cors({
    origin: 'https://shoppin-and-go.github.io',
    methods: ['GET', 'POST', 'PUT', PATCH, 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// SockJS 서버 생성
const sockjsServer = sockjs.createServer({
    prefix: '/ws',
    log: (severity, message) => {
        console.log(severity, message);
    }
});

// SockJS 연결 처리
sockjsServer.on('connection', (conn) => {
    console.log('Client connected');

    const targetWs = new WebSocket(`ws://${process.env.API_URL}/ws`);

    targetWs.on('open', () => {
        console.log('Connected to target WebSocket');

        conn.on('data', (message) => {
            console.log('Client message:', message);
            if (targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(message);
            }
        });

        targetWs.on('message', (message) => {
            console.log('Server message:', message.toString());
            conn.write(message.toString());
        });
    });

    conn.on('close', () => {
        console.log('Client disconnected');
        targetWs.close();
    });

    targetWs.on('error', (error) => {
        console.error('Target WebSocket error:', error);
    });
});

// HTTP 프록시
app.use('/', createProxyMiddleware({
    target: `http://${process.env.API_URL}`,
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Proxy error', details: err.message });
    }
}));

// SockJS를 서버에 연결
sockjsServer.attach(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});