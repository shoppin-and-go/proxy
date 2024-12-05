const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const server = require('http').createServer(app);

// body-parser 미들웨어 추가
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 설정
app.use(cors({
    origin: 'https://shoppin-and-go.github.io',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
}));

// OPTIONS 요청 처리 추가
app.options('*', cors());

// 프록시 설정
const proxy = createProxyMiddleware({
    target: `http://${process.env.API_URL}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/ws': '/ws'
    },
    onProxyReq: (proxyReq, req, res) => {
        // PATCH 요청 처리 개선
        if (req.method === 'PATCH' && req.body) {
            const bodyData = JSON.stringify(req.body);
            // 기존 content-length 헤더 제거
            proxyReq.removeHeader('Content-Length');
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }

        console.log('Proxying request:', {
            method: req.method,
            url: req.url,
            body: req.body,  // body 로깅 추가
            headers: proxyReq.getHeaders()  // 실제 전송되는 헤더 로깅
        });
    },
    onProxyRes: (proxyRes, req, res) => {
        // CORS 헤더 업데이트
        proxyRes.headers['Access-Control-Allow-Origin'] = 'https://shoppin-and-go.github.io';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        proxyRes.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization';  // 추가

        // 에러 발생 시 더 자세한 로깅
        if (proxyRes.statusCode >= 400) {
            console.error('Error response:', {
                statusCode: proxyRes.statusCode,
                headers: proxyRes.headers,
                method: req.method,
                url: req.url,
                body: req.body
            });
        }
    }
});

app.use('/', proxy);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 