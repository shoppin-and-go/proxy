const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const server = require('http').createServer(app);

// CORS 설정 더 자세히
app.use(cors({
    origin: 'https://shoppin-and-go.github.io',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400  // preflight 캐시 시간
}));

// 프록시 설정
const proxy = createProxyMiddleware({
    target: `http://${process.env.API_URL}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/ws': '/ws'
    },
    onProxyReq: (proxyReq, req, res) => {
        // 요청 로깅
        console.log('Proxying request:', {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body  // body도 로깅
        });

        // PATCH 요청 헤더 보존
        if (req.method === 'PATCH') {
            Object.keys(req.headers).forEach(key => {
                proxyReq.setHeader(key, req.headers[key]);
            });
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // CORS 헤더 추가
        proxyRes.headers['Access-Control-Allow-Origin'] = 'https://shoppin-and-go.github.io';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';

        // 응답 로깅
        console.log('Received response:', {
            statusCode: proxyRes.statusCode,
            headers: proxyRes.headers,
            method: req.method,
            url: req.url
        });
    }
});

app.use('/', proxy);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 