const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const sockjs = require('sockjs');
const StompServer = require('stomp-broker-js');

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
    log: (severity, message) => {
        console.log(severity, message);
    }
});

// STOMP 서버 생성
const stompServer = new StompServer({
    server: sockjsServer,
    path: '/ws',
    debug: (msg) => {
        console.log(msg);
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

// SockJS 핸들러 설치
sockjsServer.installHandlers(server);

// STOMP 메시지 처리
stompServer.subscribe('/queue/device/*', (msg, headers) => {
    const targetWs = new WebSocket(`ws://${process.env.API_URL}/ws`);

    targetWs.on('open', () => {
        targetWs.send(msg);
    });

    targetWs.on('message', (message) => {
        stompServer.send('/queue/device/*', {}, message.toString());
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});