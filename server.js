const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const SockJS = require('sockjs');

const app = express();
const port = process.env.PORT || 3000;
const targetUrl = 'http://ec2-3-38-128-6.ap-northeast-2.compute.amazonaws.com';

// CORS 설정
app.use(cors());

// WebSocket 프록시 설정
const wsProxy = createProxyMiddleware('/ws', {
    target: targetUrl.replace('http', 'ws'),
    ws: true,
    changeOrigin: true
});

// HTTP 프록시 설정
const httpProxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true,
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error' });
    }
});

app.use('/ws', wsProxy);
app.use('/', httpProxy);

const server = app.listen(port, () => {
    console.log(`Proxy server is running on port ${port}`);
});

server.on('upgrade', wsProxy.upgrade); 