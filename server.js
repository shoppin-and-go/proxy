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
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    maxAge: 86400
}));

// OPTIONS 요청에 대한 직접적인 처리 추가
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).send();
});

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
            let bodyData = JSON.stringify(req.body);
            // 모든 헤더 로깅
            console.log('Original headers:', req.headers);
            console.log('Request body:', bodyData);

            // 기존 헤더 제거
            proxyReq.removeHeader('content-length');
            proxyReq.removeHeader('content-type');

            // 새 헤더 설정
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

            // body 쓰기
            proxyReq.write(bodyData);

            // 최종 헤더 로깅
            console.log('Final headers:', proxyReq.getHeaders());
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        // CORS 헤더 설정 - origin을 * 로 변경
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';

        // 모든 응답 로깅 (디버깅용)
        console.log('Response:', {
            statusCode: proxyRes.statusCode,
            headers: proxyRes.headers,
            method: req.method,
            url: req.url,
            body: req.body
        });

        // 응답 body 로깅 (디버깅용)
        let body = '';
        proxyRes.on('data', function (chunk) {
            body += chunk;
        });
        proxyRes.on('end', function () {
            console.log('Response body:', body);
        });
    }
});

app.use('/', proxy);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 