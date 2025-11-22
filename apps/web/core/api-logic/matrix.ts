import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai'; // ⭐️ Используем SDK
import { isValidDateStr } from '../guard.js';
import { pathNumber, summaryForPath } from '../numerology.js';
import { getUser } from '../../data/store.js';
import { kv } from '../db.js'; 

export async function handleMatrix(req: VercelRequest, res: VercelResponse) {
  console.log('[Matrix] 🚀 Начало обработки...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body || {};
  const { birthDate, userId = 'guest' } = body;
  
  console.log(`[Matrix] Data: date=${birthDate}, user=${userId}`);

  if (!birthDate || !isValidDateStr(birthDate)) {
    return res.status(400).send('bad date');
  }

  try {
    const u = getUser(userId);

    // Проверка подписки через KV
    let isPro = false;
    try {
      const subExpiryIso = await kv.get(userId);
      if (typeof subExpiryIso === 'string' && subExpiryIso) {
        isPro = new Date(subExpiryIso) > new Date();
      }
    } catch (kvErr) {
      console.error('[Matrix] KV error:', kvErr);
    }

    const p = pathNumber(birthDate);
    const s = summaryForPath(p);

    const matrixData = {
      keyNumber: p,
      summary: s.summary,
      traits: s.traits
    };

    const PRO_PROMPT = `
    Подробный PRO-отчёт.
    Входные данные:
    - Ключевое число: ${p}
    - Основная тема: "${s.summary}"
    - Связанные качества: ${s.traits.join(', ')}

    Сгенерируй детальный, структурированный отчёт из 3-5 абзацев, раскрывающий сильные стороны, слабости и рекомендации.`;

    const FREE_PROMPT = `Короткий психологический портрет — ключевое число ${p}. ${s.summary}. Кратко: ${s.traits.slice(0,3).join(', ')}.`;

    const prompt = isPro ? PRO_PROMPT : FREE_PROMPT;

    if (!process.env.OPENAI_API_KEY) {
       const stub = isPro ? `Локальный тест PRO: ${birthDate}` : FREE_PROMPT;
       return res.json({ analysis: stub, isPro, brief: !isPro, matrixData });
    }
    
    console.log('[Matrix] 🤖 Запрос в OpenAI...');
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || "mistralai/mistral-7b-instruct:free",
      messages: [{ role: "user", content: prompt }]
    });

    const text = completion.choices[0].message.content || '';

    if (!text) throw new Error('Empty response from AI');

    console.log('[Matrix] ✅ Успех');
    return res.json({ analysis: text, isPro, brief: !isPro, source: 'ai', matrixData });

  } catch (error: any) {
    console.error('[Matrix] ❌ Ошибка:', error);
    return res.status(500).send(error.message || 'Internal Error');
  }
}