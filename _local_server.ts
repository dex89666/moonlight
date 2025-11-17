import dotenv from 'dotenv';
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