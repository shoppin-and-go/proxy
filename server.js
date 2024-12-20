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

app.options('*', cors());

// 모든 요청을 EC2 서버로 프록시
const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true,
    onProxyReq: (proxyReq, req, res) => {
        if (req.method === 'PATCH') {
            // 기존 헤더 제거
            proxyReq.removeHeader('user-agent');
            proxyReq.removeHeader('accept-encoding');
            proxyReq.removeHeader('accept');
            proxyReq.removeHeader('accept-language');
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('sec-ch-ua');
            proxyReq.removeHeader('sec-ch-ua-mobile');
            proxyReq.removeHeader('sec-ch-ua-platform');
            proxyReq.removeHeader('sec-fetch-dest');
            proxyReq.removeHeader('sec-fetch-mode');
            proxyReq.removeHeader('sec-fetch-site');

            // 새 헤더 설정
            proxyReq.setHeader('Content-Type', 'application/json;charset=UTF-8');
            proxyReq.setHeader('User-Agent', 'Dart/3.5 (dart:io)');
            proxyReq.setHeader('Accept-Encoding', 'gzip');
        }

        // 로깅 유지
        console.log('=== 요청 정보 ===');
        console.log('Method:', req.method);
        console.log('Headers:', proxyReq.getHeaders());
        console.log('URL:', req.url);
    },
    onProxyRes: (proxyRes, req, res) => {
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

server.on('upgrade', proxy.upgrade); 