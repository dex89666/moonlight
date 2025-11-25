import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
// ⭐️ ИСПРАВЛЕНО: Берем конфиг из соседней папки core
import { SYSTEM_PROMPT, MODEL } from '../config.js';
import { isAllowedTopic } from '../guard.js';
import { getUser, incFree } from '../../data/store.js';

// ... остальной код функции без изменений ...
export async function handleChat(req: VercelRequest, res: VercelResponse) {
  // ... (код тот же)
  // Просто скопируй сюда весь остальной код из прошлого chat.ts, если он стерся
  // Или оставь как есть, если ты меняешь только импорт.
  
  console.log('[Chat] 🚀 Запрос к чату...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { userId = 'guest', prompt, category = 'matrix' } = req.body as {
    userId?: string
    prompt?: string
    category?: string
  };

  if (!prompt) return res.status(400).send('no prompt');
  if (!isAllowedTopic(category)) return res.status(400).send('bad category');

  const u = getUser(userId);
  
  if (!u.isPro && u.freeUsedToday >= Number(process.env.FREE_MESSAGES_PER_DAY || 5)) {
    return res.status(402).json({ reason: 'paywall', plan: 'PRO', used: { freeLeft: 0, isPro: u.isPro } });
  }

  try {
    // Use Gemini only
    if (!isGeminiConfigured()) {
      return res.json({ output: `(Тест) Ответ на: ${prompt}. Проверьте GEMINI_API_KEY.`, isPro: u.isPro });
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\nКонтекст: ${category}. Вопрос пользователя: ${prompt}`;
    const answer = await generateWithGemini(fullPrompt, { timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 8000) });
    incFree(userId);

    return res.json({
      output: answer,
      used: { freeLeft: Math.max(0, Number(process.env.FREE_MESSAGES_PER_DAY || 5) - getUser(userId).freeUsedToday), isPro: u.isPro },
      isPro: u.isPro,
      brief: !u.isPro,
    });

  } catch (error: any) {
    console.error('[Chat] Error:', error);
    return res.status(500).send(error.message);
  }
}