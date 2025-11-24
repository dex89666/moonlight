import dotenv from 'dotenv'
dotenv.config()

let express: any
try {
    // try dynamic import of express so that dev workflow without installing deps doesn't crash
    // keep ESM semantics for environments that have express installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    express = await import('express').then(mod => mod.default ?? mod)
} catch (err) {
    // express is optional for the git-only workflow; log and create a minimal stub server
    console.warn('[local_server] optional dependency express not found — starting stub server (no API)')
    express = null
}

import cors from 'cors'

const app = express ? express() : null
const port = 3000

// Сначала даем "разрешение" на доступ с помощью cors
if (app) {
    app.use(cors({ origin: 'http://localhost:5173' }))
    // И только потом учим сервер читать JSON
    app.use(express.json())

    // --- Маршруты для нашего API ---

    app.post('/api/matrix', (req, res) => {
            // @ts-ignore
            matrixHandler(req, res);
    });

    app.post('/api/tarot', (req, res) => {
            // @ts-ignore
            tarotHandler(req, res);
    });

    app.post('/api/compat', (req, res) => {
            // @ts-ignore
            compatHandler(req, res);
    });

    app.post('/api/zodiac', (req, res) => {
            // @ts-ignore
            zodiacHandler(req, res);
    });

    // 2. ДОБАВЛЕН НОВЫЙ МАРШРУТ ДЛЯ PRO
    app.post('/api/pro', (req, res) => {
            // @ts-ignore
            proHandler(req, res);
    });

    app.listen(port, () => {
            console.log(`✅ Локальный API-сервер запущен на http://localhost:${port}`)
    });
} else {
    // no express available — create a tiny HTTP server to respond with 501 for /api/*
    const http = await import('node:http')
    const port = process.env.PORT ?? 3000
    http.createServer((req, res) => {
        if (req.url && req.url.startsWith('/api')) {
            res.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'local API disabled - install dependencies to enable' }))
            return
        }
        // serve a tiny index for other requests
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('local dev API stub - express not installed')
    }).listen(port, () => console.log('[local_server] stub server listening', port))
}
dotenv.config();

import express from 'express';
import cors from 'cors';

// Импортируем все наши обработчики API
import matrixHandler from './api/matrix.js';
import tarotHandler from './api/tarot.js';
import compatHandler from './api/compat.js';
import zodiacHandler from './api/zodiac.js';
import proHandler from './api/pro.js'; // <-- 1. ДОБАВЛЕН ИМПОРТ ДЛЯ PRO

const app = express();
const port = 3000;

// Сначала даем "разрешение" на доступ с помощью cors
app.use(cors({ origin: 'http://localhost:5173' }));

// И только потом учим сервер читать JSON
app.use(express.json());

// --- Маршруты для нашего API ---

app.post('/api/matrix', (req, res) => {
    // @ts-ignore
    matrixHandler(req, res);
});

app.post('/api/tarot', (req, res) => {
    // @ts-ignore
    tarotHandler(req, res);
});

app.post('/api/compat', (req, res) => {
    // @ts-ignore
    compatHandler(req, res);
});

app.post('/api/zodiac', (req, res) => {
    // @ts-ignore
    zodiacHandler(req, res);
});

// 2. ДОБАВЛЕН НОВЫЙ МАРШРУТ ДЛЯ PRO
app.post('/api/pro', (req, res) => {
    // @ts-ignore
    proHandler(req, res);
});


app.listen(port, () => {
    console.log(`✅ Локальный API-сервер запущен на http://localhost:${port}`);
});