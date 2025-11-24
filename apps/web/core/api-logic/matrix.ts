import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai'; // ⭐️ Используем SDK
import { isValidDateStr } from '../guard.js';
import { pathNumber, summaryForPath } from '../numerology.js';
import { getUser } from '../../data/store.js';
import { kv } from '../db.js'; 

export async function handleMatrix(req: VercelRequest, res: VercelResponse) {
  console.log('[Matrix] 🚀 Начало обработки...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body || {}
  let { birthDate, userId = 'guest' } = body

  console.log(`[Matrix] Data: date=${birthDate}, user=${userId}`)

  // If birthDate not provided, try to read from subscription storage
  try {
    const raw = await kv.get(`sub:${userId}`)
    if (raw) {
      try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!birthDate && obj.birthDate) birthDate = obj.birthDate
      } catch (e) {
        // ignore parse
      }
    }
  } catch (e) {
    console.warn('[Matrix] KV read for birthDate failed', e)
  }

  if (!birthDate || !isValidDateStr(birthDate)) {
    return res.status(400).send('bad date')
  }

  let isPro = false
  let matrixData: any = null

  try {
    const u = getUser(userId);
    // Проверка подписки через KV
    try {
      const raw = await kv.get(`sub:${userId}`)
      if (raw) {
        try {
          const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (obj && obj.expiry) {
            isPro = new Date(obj.expiry) > new Date()
          }
        } catch (e) {
          // legacy single-string expiry support
          if (typeof raw === 'string') {
            const maybeIso = raw
            isPro = new Date(maybeIso) > new Date()
          }
        }
      }
    } catch (kvErr) {
      console.error('[Matrix] KV error:', kvErr)
    }

    const p = pathNumber(birthDate);
    const s = summaryForPath(p);

  matrixData = {
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
     return res.json({ analysis: stub, isPro, brief: !isPro, matrixData, source: 'stub' });
   }
    
  console.log('[Matrix] 🤖 Подготовка запроса в OpenAI...');
  try {
    const model = process.env.MODEL || 'mistralai/mistral-7b-instruct:free'
    const baseURL = 'https://openrouter.ai/api/v1'
    const rawKey = process.env.OPENAI_API_KEY || ''
    const masked = rawKey ? `${rawKey.slice(0,4)}...${rawKey.slice(-4)}` : '(none)'
    console.log('[Matrix] DEBUG: model=', model, ' baseURL=', baseURL, ' OPENAI_KEY_MASK=', masked)
  } catch(e){}

    // Auto-detect provider: if key looks like OpenAI secret (sk-...) use official OpenAI API,
    // otherwise use OpenRouter baseURL. This helps when Vercel env contains an OpenAI key.
    const rawKey = process.env.OPENAI_API_KEY || ''
    // OpenRouter keys often start with 'sk-or-' (or similar). Official OpenAI keys start with 'sk-'
    // but OpenRouter may use a key that also begins with 'sk-or-'. Detect that case explicitly.
    const looksLikeOpenRouterKey = rawKey.startsWith('sk-or-') || rawKey.includes('openrouter')
    const looksLikeOpenAIKey = !looksLikeOpenRouterKey && rawKey.startsWith('sk-')
    const openaiConfig: any = { apiKey: rawKey }
    if (looksLikeOpenRouterKey) {
      openaiConfig.baseURL = 'https://openrouter.ai/api/v1'
    }
    console.log('[Matrix] Using provider:', looksLikeOpenAIKey ? 'OpenAI (api.openai.com)' : looksLikeOpenRouterKey ? 'OpenRouter (openrouter.ai)' : 'Unknown (default to OpenRouter)')
    const openai = new OpenAI(openaiConfig)

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
    // extra debugging fields from OpenAI SDK
    try {
      console.error('[Matrix] error.error =', error?.error);
      console.error('[Matrix] error.code =', error?.code);
      console.error('[Matrix] error.status =', error?.status);
      console.error('[Matrix] error.requestID =', error?.requestID);
      console.error('[Matrix] stack =', error?.stack);
    } catch (logErr) {
      console.error('[Matrix] failed to log error details', logErr);
    }

    // Если провайдер вернул 401 (AuthenticationError), вернём аккуратный локальный stub
    const status = error?.status || error?.code || (error?.error && error.error.code);
    if (status === 401) {
      const fallback = matrixData ? `Короткий портрет: ${matrixData.summary}` : 'Короткий портрет (нет данных)';
      const stub = isPro ? `Локальный PRO-ответ по дате ${birthDate}. Проверьте OPENAI_API_KEY.` : fallback;
      return res.json({ analysis: stub, isPro, brief: !isPro, matrixData, source: 'stub' });
    }

    return res.status(500).send(error.message || 'Internal Error');
  }
}