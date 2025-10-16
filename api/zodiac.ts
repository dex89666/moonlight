import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidSign } from '../core/guard.js';
import { getUser } from '../data/store.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  
  const { sign, userId = 'guest' } = req.body as { sign?: string, userId?: string };
  
  if (!sign || !isValidSign(sign.toLowerCase())) {
    return res.status(400).send('bad sign');
  }

  try {
    const u = getUser(userId)

    // If not PRO, return brief/freemium analysis
    if (!u.isPro) {
      const brief = `Краткий астрологический обзор для знака ${sign}: сегодня обратите внимание на настроение и небольшие возможности для развития.`
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' })
    }
    // Local dev fallback: if no API key present, return a stubbed PRO response
    if (!process.env.OPENAI_API_KEY) {
      const stub = `Локальный тестовый астрологический отчёт для знака ${sign}.`
      return res.json({ analysis: stub, isPro: true, brief: false })
    }

    const prompt = `
    Сгенерируй позитивный и обобщённый астрологический анализ на сегодня по знаку ${sign}.

    Твой ответ должен быть текстом из 2-3 абзацев, описывающим общую динамику дня и возможные сценарии.
    `;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": process.env.MODEL || "openai/gpt-3.5-turbo",
        "messages": [
          { "role": "user", "content": prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`Ошибка от API: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();

    const text = aiData.choices[0].message.content;
    
    // Финальная проверка на пустой ответ
    if (!text || !text.trim()) {
      throw new Error('ИИ вернул пустой ответ.');
    }

    return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    console.error('!!! ОШИБКА НА БЭКЕНДЕ (zodiac):', error);
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}