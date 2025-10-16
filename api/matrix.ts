import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidDateStr } from '../core/guard.js';
import { pathNumber, summaryForPath } from '../core/numerology.js';
import { getUser } from '../data/store.js';
// import OpenAI from 'openai'; // Мы больше не используем библиотеку

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  
  const { birthDate, userId = 'guest' } = req.body as { birthDate?: string, userId?: string };
  
  if (!birthDate || !isValidDateStr(birthDate)) {
    return res.status(400).send('bad date');
  }

  try {
    const u = getUser(userId)

    // If user is not PRO, return a short basic analysis (freemium)
    if (!u.isPro) {
      const p = pathNumber(birthDate);
      const s = summaryForPath(p);
  const brief = `Короткий психологический портрет — ключевое число ${p}. ${s.summary} Кратко: ${s.traits.slice(0,3).join(', ')}.`
  return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' })
    }

    // Local dev fallback: if no API key provided, return a stubbed analysis for PRO testing
    if (!process.env.OPENAI_API_KEY) {
  const stub = `Локальный тестовый аналитический отчёт по дате ${birthDate}. Это демонстрационный ответ для разработки.`
  return res.json({ analysis: stub, isPro: true, brief: false });
    }

    const p = pathNumber(birthDate);
    const s = summaryForPath(p);

    const prompt = `
    Сгенерируй позитивное и обобщенное текстовое описание личности на основе предоставленных числовых данных. Обращайся к человеку на "ты".

    Входные данные:
    - Ключевое число: ${p}
    - Основная тема: "${s.summary}"
    - Связанные качества: ${s.traits.join(', ')}

    Твой ответ должен быть текстом из 2-3 абзацев, описывающим сильные стороны и потенциал, связанные с этими данными.
    `;
    
    console.log('[БЭКЕНД] Отправляю запрос к ИИ напрямую через fetch...');

    // --- ДЕЛАЕМ ЗАПРОС НАПРЯМУЮ, БЕЗ БИБЛИОТЕКИ ---
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": process.env.MODEL || "mistralai/mistral-7b-instruct:free",
        "messages": [
          { "role": "user", "content": prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`Ошибка от API: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    console.log('[БЭКЕНД] Ответ от ИИ успешно получен!');
    // ---------------------------------------------

    const text = aiData.choices[0].message.content;
    
    if (!text) {
      throw new Error('ИИ вернул пустой ответ.');
    }
    
  return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    // Теперь, если сервер не упадет, мы ГАРАНТИРОВАННО увидим ошибку здесь
    console.error('!!! ОШИБКА НА БЭКЕНДЕ:', error);
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}