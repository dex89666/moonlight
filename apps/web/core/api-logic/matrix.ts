import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
import { MATRIX_RESPONSES, pickDeterministic } from '../../data/responses.js';
import { isValidDateStr } from '../guard.js';
import { pathNumber, summaryForPath } from '../numerology.js';
import { getUser } from '../../data/store.js';
import { kv } from '../db.js';

export async function handleMatrix(req: VercelRequest, res: VercelResponse) {
  console.log('[Matrix] 🚀 Начало обработки...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body || {};
  let { birthDate, userId = 'guest' } = body;

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

    if (!isGeminiConfigured()) {
      // deterministic pick based on userId+birthDate
      const key = `${userId}::${birthDate}`;
      const canned = pickDeterministic(key, MATRIX_RESPONSES);
      return res.json({ analysis: canned, isPro, brief: !isPro, matrixData, source: 'canned' });
    }

    let text = await generateWithGemini(prompt, { timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 8000) });

    if (!text) throw new Error('Empty response from AI');

    console.log('[Matrix] ✅ Успех');
    return res.json({ analysis: text, isPro, brief: !isPro, source: 'ai', matrixData });

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
    const canned = pickDeterministic(key, MATRIX_RESPONSES);
    return res.json({ analysis: canned, isPro, brief: !isPro, matrixData, source: 'canned' });
    }

    if ((error?.message || '').includes('getaddrinfo') || error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
  const key = `${userId}::${birthDate}`;
  const canned = pickDeterministic(key, MATRIX_RESPONSES);
  return res.json({ analysis: canned, isPro, brief: !isPro, matrixData, source: 'canned' });
    }

    return res.status(500).send(error.message || 'Internal Error');
  }
}