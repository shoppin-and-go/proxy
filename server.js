const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// CORS 설정
app.use(cors({
    origin: 'https://shoppin-and-go.github.io',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// WebSocket 프록시
wss.on('connection', (ws) => {
    console.log('Client connected');
    const targetWs = new WebSocket(`ws://${process.env.API_URL}/ws`);

    // 연결이 열리면 메시지 전달 시작
    targetWs.on('open', () => {
        console.log('Connected to target WebSocket');

        ws.on('message', (message) => {
            console.log('Client message:', message.toString());
            targetWs.send(message);
        });

        targetWs.on('message', (message) => {
            console.log('Server message:', message.toString());
            ws.send(message);
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        targetWs.close();
    });

    targetWs.on('error', (error) => {
        console.error('Target WebSocket error:', error);
        ws.close();
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});