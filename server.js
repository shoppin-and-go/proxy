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

// WebSocket 프록시
wss.on('connection', (ws) => {
    console.log('Client connected');

    const targetWs = new WebSocket(`ws://${process.env.API_URL}/ws`);

    ws.on('message', (message) => {
        console.log('Forwarding message to API server');
        targetWs.send(message);
    });

    targetWs.on('message', (message) => {
        console.log('Forwarding message to client');
        ws.send(message);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        targetWs.close();
    });

    targetWs.on('error', (error) => {
        console.error('Target WebSocket error:', error);
    });
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

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});