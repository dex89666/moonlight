import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { getUser } from '../data/store.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { userId = 'guest' } = req.body as { userId?: string }
    const u = getUser(userId)

    // If not PRO - provide a short/basic card (freemium)
    if (!u.isPro) {
      const brief = `Карточка дня: Тёплый ветер — сегодня подходящее время для небольших экспериментов. Совет: попробуй сделать маленький шаг в новом направлении.`
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' })
    }

    // Local dev fallback: если нет ключа, возвращаем stub-ответ для быстрой разработки (для PRO)
    if (!process.env.OPENAI_API_KEY) {
      const stub = `# Карта дня: Теплый Ветер\n\n**Толкование:** Сегодня вы можете почувствовать легкое движение в сторону новых идей.\n\n**Совет:** Сделайте маленький шаг в новом направлении.`
      return res.json({ analysis: stub, isPro: true, brief: false })
    }

    // Instantiate OpenAI lazily so tests and local dev without API key don't error on import
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    // --- БЕЗОПАСНЫЙ ПРОМПТ ДЛЯ МЕТАФОРИЧЕСКИХ КАРТ ---
    const prompt = `
    Ты — творческий ассистент.
    **ЗАДАНИЕ:** Придумай метафорическую "Карту Дня".
    1.  Назови карту (например, "Карта Внутренней Силы" или "Карта Новых Начинаний").
    2.  Напиши для неё краткое (2 абзаца) позитивное толкование на сегодня.
    3.  Дай один простой практический совет.
    Используй Markdown для выделения названия карты.
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;
  
    if (!text) {
      throw new Error('ИИ вернул пустой ответ.');
    }
  
    return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    console.error('ОШИБКА в api/tarot:', error);
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}