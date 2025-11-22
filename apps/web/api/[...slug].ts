import type { VercelRequest, VercelResponse } from '@vercel/node';

// 0. ЛОГ: Файл начал загружаться
console.log('[API] 🚀 Файл [...slug].ts начал загрузку...');

// Пытаемся импортировать логику.
// Если папка 'core' недоступна, код упадет ПРЯМО ЗДЕСЬ.
import { handleMatrix } from '../core/api-logic/matrix.js';
import { handleCompat } from '../core/api-logic/compat.js';
import { handleTelegramWebhook } from '../core/api-logic/telegram/webhook.js';
import { handlePro } from '../core/api-logic/pro.js';
import { handleTarot } from '../core/api-logic/tarot.js';
import { handleZodiac } from '../core/api-logic/zodiac.js';
import { handleUser } from '../core/api-logic/user.js';
import { handleChat } from '../core/api-logic/chat.js';
import { handleHealth } from '../core/api-logic/health.js';

console.log('[API] ✅ Все импорты прошли успешно!');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. ЛОГ: Запрос пришел
  console.log(`[API] 📥 Входящий запрос: ${req.method} ${req.url}`);
  
  const url = new URL(req.url!, `https://${req.headers.host}`);
  const path = url.pathname;

  try {
    console.log(`[API] 📍 Роутинг для пути: ${path}`);

    if (path.includes('/matrix')) {
      console.log('[API] 👉 Вызываю handleMatrix');
      return await handleMatrix(req, res);
    }
    if (path.includes('/compat')) {
      console.log('[API] 👉 Вызываю handleCompat');
      return await handleCompat(req, res);
    }
    if (path.includes('/telegram/webhook')) {
      console.log('[API] 👉 Вызываю handleTelegramWebhook');
      return await handleTelegramWebhook(req, res);
    }
    if (path.includes('/pro')) return await handlePro(req, res);
    if (path.includes('/tarot')) return await handleTarot(req, res);
    if (path.includes('/zodiac')) return await handleZodiac(req, res);
    if (path.includes('/user')) return handleUser(req, res);
    if (path.includes('/chat')) return await handleChat(req, res);
    if (path.includes('/health')) return handleHealth(req, res);
    
    console.warn(`[API] ⚠️ Маршрут не найден: ${path}`);
    return res.status(404).json({ error: 'API route not found', path });

  } catch (error: any) {
    // 2. ЛОГ: Ошибка внутри функции
    console.error(`[API] ❌ КРИТИЧЕСКАЯ ОШИБКА в ${path}:`, error);
    return res.status(500).json({ 
      error: error.message, 
      stack: error.stack, // Покажем стек ошибки, чтобы понять где упало
      location: 'Inside Handler' 
    });
  }
}