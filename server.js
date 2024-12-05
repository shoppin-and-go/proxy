const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');
const SockJS = require('sockjs');

const app = express();
const port = process.env.PORT || 3000;
const targetUrl = 'http://ec2-3-38-128-6.ap-northeast-2.compute.amazonaws.com';

// CORS 설정
app.use(cors());

// HTTP 프록시 설정
app.use('/', createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true, // 웹소켓 지원 활성화
    pathRewrite: {
        '^/': '/' // URL 경로 재작성 규칙
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error' });
    }
}));

// 웹소켓 서버 설정
const sockjs = SockJS.createServer({
    prefix: '/ws',
    log: (severity, message) => {
        console.log('[SockJS]', severity, message);
    }
});

// SockJS 이벤트 핸들러
sockjs.on('connection', (conn) => {
    console.log('Client connected');

    // 웹소켓 프록시 연결
    const ws = new WebSocket(`${targetUrl.replace('http', 'ws')}/ws`);

    ws.on('open', () => {
        console.log('Connected to target WebSocket server');
    });

    ws.on('message', (data) => {
        conn.write(data);
    });

    conn.on('data', (message) => {
        ws.send(message);
    });

    conn.on('close', () => {
        console.log('Client disconnected');
        ws.close();
    });

    ws.on('error', (error) => {
        console.error('WebSocket Error:', error);
        conn.close();
    });
});

const server = app.listen(port, () => {
    console.log(`Proxy server is running on port ${port}`);
});

// SockJS를 HTTP 서버에 연결
sockjs.attach(server);