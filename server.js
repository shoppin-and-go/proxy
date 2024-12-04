const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const sockjs = require('sockjs');
const StompServer = require('@stomp/stompjs').Server;

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

// STOMP 서버 설정
const stompServer = new StompServer({
    debug: (str) => {
        console.log(str);
    }
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

    // STOMP 연결 설정
    stompServer.connectWebSocket(conn);

    // 구독 설정
    stompServer.subscribe('/queue/device/*', (msg, headers) => {
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(msg);
        }
    });

    targetWs.on('message', (message) => {
        console.log('Server message:', message.toString());
        stompServer.send('/queue/device/*', {}, message.toString());
    });

    conn.on('close', () => {
        console.log('Client disconnected');
        targetWs.close();
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