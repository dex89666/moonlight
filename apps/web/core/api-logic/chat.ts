import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
// Вот эти переменные, которые раньше "скучали":
import { SYSTEM_PROMPT, MODEL } from '../../config/ai.js';
import { isAllowedTopic } from '../guard.js';
import { getUser, incFree } from '../../data/store.js';

export async function handleChat(req: VercelRequest, res: VercelResponse) {
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
  
  // Проверка лимитов (если не PRO и лимит исчерпан)
  if (!u.isPro && u.freeUsedToday >= Number(process.env.FREE_MESSAGES_PER_DAY || 5)) {
    return res.status(402).json({ reason: 'paywall', plan: 'PRO', used: { freeLeft: 0, isPro: u.isPro } });
  }

  try {
    // Инициализация OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ 
        output: `(Тест) Ответ на: ${prompt}. (Ключ API не найден)`,
        isPro: u.isPro 
      });
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`[Chat] Отправляем запрос к модели: ${MODEL}`);

    // ⭐️ ВОТ ЗДЕСЬ МЫ ИХ ИСПОЛЬЗУЕМ:
    const completion = await openai.chat.completions.create({
      model: MODEL, // Используем модель из конфига
      messages: [
        { role: "system", content: SYSTEM_PROMPT }, // Используем промпт из конфига
        { role: "user", content: `Контекст: ${category}. Вопрос пользователя: ${prompt}` }
      ],
    });

    const answer = completion.choices[0].message.content || 'Нет ответа';
    
    // Увеличиваем счетчик бесплатных сообщений
    incFree(userId);

    return res.json({
      output: answer,
      used: { freeLeft: Math.max(0, Number(process.env.FREE_MESSAGES_PER_DAY || 5) - getUser(userId).freeUsedToday), isPro: u.isPro },
      isPro: u.isPro,
      brief: !u.isPro, // Если не ПРО, можно обрезать ответ на фронте, если нужно
    });

  } catch (error: any) {
    console.error('[Chat] Error:', error);
    return res.status(500).send(error.message);
  }
}