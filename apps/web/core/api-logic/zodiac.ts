import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai'; // ⭐️ Используем SDK
import { isValidSign } from '../guard.js';
import { getUser } from '../../data/store.js';

export async function handleZodiac(req: VercelRequest, res: VercelResponse) {
  console.log('[Zodiac] 🚀 Начало обработки...');
  
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body || {};
  const { sign, userId = 'guest' } = body;

  if (!sign || !isValidSign(sign.toLowerCase())) {
    return res.status(400).send('bad sign');
  }

  try {
    const u = getUser(userId);

    if (!u.isPro) {
      const brief = `Краткий астрологический обзор для знака ${sign}: сегодня обратите внимание на настроение и небольшие возможности для развития.`;
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' });
    }

    if (!process.env.OPENAI_API_KEY) {
      const stub = `Локальный тестовый астрологический отчёт для знака ${sign}.`;
      return res.json({ analysis: stub, isPro: true, brief: false });
    }

    console.log('[Zodiac] 🤖 Запрос в OpenAI...');
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
    Сгенерируй позитивный и обобщённый астрологический анализ на сегодня по знаку ${sign}.
    Твой ответ должен быть текстом из 2-3 абзацев.
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || "mistralai/mistral-7b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error('Empty response from AI');

    console.log('[Zodiac] ✅ Успех');
    return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    console.error('[Zodiac] ❌ Ошибка:', error);
    return res.status(500).send(error.message);
  }
}