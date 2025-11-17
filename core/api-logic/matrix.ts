import type { VercelRequest, VercelResponse } from '@vercel/node';
// ⭐️ ИСПРАВЛЕНО: Путь стал короче (из ../core/guard.js -> ../guard.js)
import { isValidDateStr } from '../guard.js';
// ⭐️ ИСПРАВЛЕНО: Путь стал короче
import { pathNumber, summaryForPath } from '../numerology.js';
// ⭐️ ИСПРАВЛЕНО: Путь стал короче + добавлено .js
import { getUser } from '../../data/store.js';
// ⭐️ ИСПРАВЛЕНО: Путь стал короче + добавлено .js
import { kv } from '../db.js'
// import OpenAI from 'openai'; // Мы больше не используем библиотеку

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export async function'
export async function handleMatrix(
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

    // Check KV subscription expiry for this userId (resilient): if KV fails, log and continue as free user
    let isPro = false
    try {
      const subExpiryIso = await kv.get(userId)
      if (typeof subExpiryIso === 'string' && subExpiryIso) {
        isPro = new Date(subExpiryIso) > new Date()
      } else {
        isPro = false
      }
    } catch (kvErr) {
      console.error('[BЭКЕНД] KV error when reading subscription for', userId, kvErr)
      // proceed as non-PRO user to avoid 500 on frontend
      isPro = false
    }

    // Simple prompts
    const p = pathNumber(birthDate);
    const s = summaryForPath(p);

    // (Этот блок кода мы уже добавляли, он остается)
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

    Сгенерируй детальный, структурированный отчёт из 3-5 абзацев, раскрывающий сильные стороны, слабости и рекомендации.`

    const FREE_PROMPT = `Короткий психологический портрет — ключевое число ${p}. ${s.summary}. Кратко: ${s.traits.slice(0,3).join(', ')}.`

    const prompt = isPro ? PRO_PROMPT : FREE_PROMPT

    // Local dev fallback: if no API key provided, return a stubbed analysis for PRO testing
    if (!process.env.OPENAI_API_KEY) {
      const stub = isPro
        ? `Локальный тестовый PRO-отчёт по дате ${birthDate}. Детализированная демонстрация.`
        : FREE_PROMPT
      return res.json({ analysis: stub, isPro, brief: !isPro, matrixData })
    }
    
    console.log('[БЭКЕНД] Отправляю запрос к ИИ напрямую через fetch...');

    // Use AbortController to bound the external AI request time and avoid hangs
    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 10000);
    const to = setTimeout(() => controller.abort(), timeoutMs);

    let aiData: any = null;
    try {
      const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          "model": process.env.MODEL || "mistralai/mistral-7b-instruct:free",
          "messages": [
            { "role": "user", "content": prompt }
          ]
        })
      });

      if (!aiResponse.ok) {
        const txt = await aiResponse.text().catch(() => '<no-body>');
        console.error('[БЭКЕНД] Error from AI provider:', aiResponse.status, txt);
        const stub = isPro
          ? `Локальный PRO-ответ по дате ${birthDate}. Проверьте настройки OPENAI_API_KEY.`
          : FREE_PROMPT;
        return res.json({ analysis: stub, isPro, brief: !isPro, source: 'stub', matrixData });
      }

      aiData = await aiResponse.json();
      console.log('[БЭКЕНД] Ответ от ИИ успешно получен!');
    } catch (err: any) {
      console.error('!!! ОШИБКА НА БЭКЕНДЕ: Error calling AI provider:', err && err.message ? err.message : err);
      const stub = isPro
        ? `Локальный PRO-ответ по дате ${birthDate}. Проверьте настройки OPENAI_API_KEY.`
        : FREE_PROMPT;
      return res.json({ analysis: stub, isPro, brief: !isPro, source: 'stub', matrixData });
    } finally {
      clearTimeout(to);
    }

    const text = aiData.choices?.[0]?.message?.content || aiData.choices?.[0]?.text || '';

    if (!text) {
    const stub = isPro
      ? `Локальный PRO-ответ по дате ${birthDate}. (AI вернул пустой ответ)`
      : FREE_PROMPT;
    return res.json({ analysis: stub, isPro, brief: !isPro, source: 'stub', matrixData });
    }

  return res.json({ analysis: text, isPro, brief: !isPro, source: 'ai', matrixData });

  } catch (error: any) {
    console.error('!!! ОШИБКА НА БЭКЕНДЕ:', error);
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}