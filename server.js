const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 3000;
const targetUrl = 'http://ec2-3-38-128-6.ap-northeast-2.compute.amazonaws.com';

// CORS 설정
app.use(cors({
    origin: 'https://shoppin-and-go.github.io',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// OPTIONS 요청 처리
app.options('*', cors());

// 모든 요청을 EC2 서버로 프록시
const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true, // 웹소켓 활성화
    onProxyReq: (proxyReq, req, res) => {
        // User-Agent 헤더를 Dart/3.5로 변경
        proxyReq.setHeader('User-Agent', 'Dart/3.5 (dart:io)');
        // HTTP 버전 강제 설정 (필요한 경우)
        proxyReq.setHeader('Connection', 'keep-alive');
    },
    onProxyRes: (proxyRes, req, res) => {
        // CORS 헤더 추가
        proxyRes.headers['Access-Control-Allow-Origin'] = 'https://shoppin-and-go.github.io';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,PATCH,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error' });
    }
});

app.use('/', proxy);

const server = app.listen(port, () => {
    console.log(`Proxy server is running on port ${port}`);
});

// 웹소켓 업그레이드 요청 처리
server.on('upgrade', proxy.upgrade); 