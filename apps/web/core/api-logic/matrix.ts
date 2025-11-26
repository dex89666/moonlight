import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
import { MATRIX_RESPONSES, pickStructured } from '../../data/responses.js';
import { isValidDateStr } from '../guard.js';
import { normalizeDateInput } from './utils.js';
import { pathNumber, summaryForPath } from '../numerology.js';
import { getUser } from '../../data/store.js';
import { kv } from '../db.js';
import { getCachedResult, setCachedResult, incrementQuota, getQuota } from './cache.js';

export async function handleMatrix(req: VercelRequest, res: VercelResponse) {
  console.log('[Matrix] 🚀 Начало обработки...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body || {};
  let { birthDate, userId = 'guest' } = body;
  birthDate = normalizeDateInput(birthDate);

  console.log(`[Matrix] Data: date=${birthDate}, user=${userId}`);

  // Try to read birthDate from KV if missing
  try {
    const raw = await kv.get(`sub:${userId}`);
    if (raw) {
      try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!birthDate && obj.birthDate) birthDate = obj.birthDate;
      } catch (e) {
        // ignore parse
      }
    }
  } catch (e) {
    console.warn('[Matrix] KV read for birthDate failed', e);
  }

  if (!birthDate || !isValidDateStr(birthDate)) {
    return res.status(400).send('bad date');
  }

  let isPro = false;
  let matrixData: any = null;

  try {
    const u = getUser(userId);
    // Check subscription from KV
    try {
      const raw = await kv.get(`sub:${userId}`);
      if (raw) {
        try {
          const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (obj && obj.expiry) {
            isPro = new Date(obj.expiry) > new Date();
          }
        } catch (e) {
          if (typeof raw === 'string') {
            const maybeIso = raw;
            isPro = new Date(maybeIso) > new Date();
          }
        }
      }
    } catch (kvErr) {
      console.error('[Matrix] KV error:', kvErr);
    }

    const p = pathNumber(birthDate);
    const s = summaryForPath(p);

    matrixData = {
      keyNumber: p,
      summary: s.summary,
      traits: s.traits,
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

    const FORCE_CANNED = process.env.FORCE_CANNED === '1' || process.env.FORCE_OFFLINE === '1' || process.env.USE_CANNED === 'true';

    const cacheKey = `${userId}::${birthDate}`;
    // return cached if exists
    const cached = await getCachedResult(cacheKey)
    if (cached) {
      return res.json({ analysis: cached.analysis, isPro: cached.isPro, brief: cached.brief, matrixData, source: 'cache' });
    }

    // Decide if non-PRO gets a full result (allow up to 2 free full results per day)
    let allowFull = isPro
    if (!allowFull) {
      const q = await getQuota(userId)
      if (q < 2) {
        allowFull = true
        await incrementQuota(userId)
      }
    }

    if (!isGeminiConfigured() || FORCE_CANNED) {
      const canned = pickStructured(cacheKey, MATRIX_RESPONSES as any);
      const analysis = allowFull ? canned.full : (canned.brief + '\n\nДля продолжения подробного анализа необходимо приобрести подписку PRO.');
      await setCachedResult(cacheKey, { analysis, isPro: isPro, brief: !allowFull }, 24*3600)
      return res.json({ analysis, isPro, brief: !allowFull, matrixData, source: 'canned' });
    }

    // generate with Gemini (or any AI)
    const text = await generateWithGemini(allowFull ? PRO_PROMPT : FREE_PROMPT, { timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 8000) });
    if (!text) throw new Error('Empty response from AI');

    const finalAnalysis = allowFull ? text : (text.split('\n')[0] + '\n\nДля продолжения подробного анализа необходимо приобрести подписку PRO.');
    // cache the result for 24h
    await setCachedResult(cacheKey, { analysis: finalAnalysis, isPro, brief: !allowFull }, 24*3600)

    console.log('[Matrix] ✅ Успех');
    return res.json({ analysis: finalAnalysis, isPro, brief: !allowFull, source: 'ai', matrixData });

  } catch (error: any) {
    console.error('[Matrix] ❌ Ошибка:', error);
    try {
      console.error('[Matrix] error.error =', error?.error);
      console.error('[Matrix] error.code =', error?.code);
      console.error('[Matrix] error.status =', error?.status);
      console.error('[Matrix] error.requestID =', error?.requestID);
      console.error('[Matrix] stack =', error?.stack);
    } catch (logErr) {
      console.error('[Matrix] failed to log error details', logErr);
    }

    const status = error?.status || error?.code || (error?.error && error.error.code);
    if (status === 401) {
      const key = `${userId}::${birthDate}`;
      const canned = pickStructured(key, MATRIX_RESPONSES as any);
      return res.json({ analysis: isPro ? canned.full : canned.brief, isPro, brief: !isPro, matrixData, source: 'canned' });
    }

      if ((error?.message || '').includes('getaddrinfo') || error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
        const key = `${userId}::${birthDate}`;
        const canned = pickStructured(key, MATRIX_RESPONSES as any);
        return res.json({ analysis: isPro ? canned.full : canned.brief, isPro, brief: !isPro, matrixData, source: 'canned' });
      }

    return res.status(500).send(error.message || 'Internal Error');
  }
}