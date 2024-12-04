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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// SockJS 서버 생성
const sockjsServer = sockjs.createServer({
    prefix: '/ws',
    response_limit: 128 * 1024,
    log: (severity, message) => {
        console.log(severity, message);
    }
});

// SockJS 핸들러 설치
sockjsServer.installHandlers(server);

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

// SockJS 연결 처리
sockjsServer.on('connection', (conn) => {
    console.log('Client connected');

    const targetWs = new WebSocket(`ws://${process.env.API_URL}/ws`);

    conn.on('data', (message) => {
        console.log('Client message:', message);
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(message);
        }
    });

    targetWs.on('message', (message) => {
        console.log('Server message:', message.toString());
        if (conn.writable) {
            conn.write(message.toString());
        }
    });

    conn.on('close', () => {
        console.log('Client disconnected');
        targetWs.close();
    });

    targetWs.on('error', (error) => {
        console.error('Target WebSocket error:', error);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});