const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const sockjs = require('sockjs');
const Stomp = require('stompjs');

const app = express();
const server = require('http').createServer(app);

// CORS 설정
app.use(cors({
    origin: 'https://shoppin-and-go.github.io',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// SockJS 서버 설정
const sockjsServer = sockjs.createServer({
    prefix: '/ws',
    response_limit: 128 * 1024,
    websocket: true
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

// SockJS 연결 처리
sockjsServer.on('connection', (conn) => {
    console.log('Client connected');
    const targetWs = new WebSocket(`ws://${process.env.API_URL}/ws`);

    // STOMP 클라이언트 생성
    const stompClient = Stomp.over(targetWs);

    stompClient.connect({}, () => {
        console.log('Connected to STOMP server');

        // 구독 설정
        stompClient.subscribe('/queue/device/*', (message) => {
            if (conn.writable) {
                conn.write(message.body);
            }
        });
    });

    conn.on('data', (message) => {
        console.log('Client message:', message);
        if (stompClient.connected) {
            stompClient.send('/queue/device/*', {}, message);
        }
    });

    conn.on('close', () => {
        console.log('Client disconnected');
        if (stompClient.connected) {
            stompClient.disconnect();
        }
    });

    targetWs.on('error', (error) => {
        console.error('Target WebSocket error:', error);
        conn.close();
    });
});

// SockJS 핸들러 설치
sockjsServer.installHandlers(server, { prefix: '/ws' });

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});