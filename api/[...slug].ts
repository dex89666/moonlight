import type { VercelRequest, VercelResponse } from '@vercel/node';

// 1. ⭐️ Импортируем ВСЮ нашу исправленную логику
// (Обрати внимание на ../core/api-logic/ и .js в конце)

import { handleMatrix } from '../core/api-logic/matrix.js';
import { handleCompat } from '../core/api-logic/compat.js';
import { handleTelegramWebhook } from '../core/api-logic/telegram/webhook.js';
import { handlePro } from '../core/api-logic/pro.js';
import { handleTarot } from '../core/api-logic/tarot.js';
import { handleZodiac } from '../core/api-logic/zodiac.js';
import { handleUser } from '../core/api-logic/user.js';
import { handleChat } from '../core/api-logic/chat.js';
import { handleHealth } from '../core/api-logic/health.js';

// (Мы пока не будем импортировать 'payments' и 'admin',
// так как они не вызываются напрямую через /api/payments, а используются другим кодом)

/**
 * Единый Роутер API
 * Vercel направит ВСЕ запросы /api/* сюда.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // req.url будет /api/matrix, /api/telegram/webhook, и т.д.
  const url = new URL(req.url!, `https://${req.headers.host}`);
  const path = url.pathname;

  try {
    // 2. ⭐️ Маршрутизируем запрос (пути должны совпадать со СТАРЫМИ)
    
    if (path === '/api/matrix') {
      return await handleMatrix(req, res);
    }
    if (path === '/api/compat') {
      return await handleCompat(req, res);
    }
    if (path === '/api/telegram/webhook') {
      return await handleTelegramWebhook(req, res);
    }
    if (path === '/api/pro') {
      return await handlePro(req, res);
    }
    if (path === '/api/tarot') {
      return await handleTarot(req, res);
    }
    if (path === '/api/zodiac') {
      return await handleZodiac(req, res);
    }
    if (path === '/api/user') {
      return handleUser(req, res); // (этот не 'async', поэтому без 'await')
    }
    if (path === '/api/chat') {
      return await handleChat(req, res);
    }
    if (path === '/api/health') {
      return handleHealth(req, res); // (этот не 'async', поэтому без 'await')
    }
    
    // 3. ⭐️ Если ничего не найдено
    // (Это также будет ловить запросы к /api/admin/*, /api/payments/*,
    // которые мы еще не добавили в роутер, если они были)
    
    return res.status(404).json({ error: 'API endpoint not found', path: path });

  } catch (error: any) {
    console.error(`[Единый Роутер] Ошибка в ${path}:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}