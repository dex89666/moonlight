import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
import { TAROT_RESPONSES, pickStructured } from '../../data/responses.js';
import { kv } from '../db.js';
// ⭐️ ИСПРАВЛЕНО: Путь стал ../../data/
import { getUser } from '../../data/store.js';

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export async function'
export async function handleTarot(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { userId = 'guest' } = req.body as { userId?: string }
    const u = getUser(userId)
    // derive PRO from KV
    try{
      const raw = await kv.get(`sub:${userId}`)
      if (raw) { try{ const obj = typeof raw === 'string' ? JSON.parse(raw) : raw; if (obj?.expiry) u.isPro = new Date(obj.expiry) > new Date() } catch { if (typeof raw === 'string') u.isPro = new Date(raw) > new Date() } }
    } catch(e){ console.warn('[tarot] kv read failed', e) }

    const cacheKey = `${userId}::tarot:today`;
    // use cache
    const { getCachedResult, setCachedResult, incrementQuota, getQuota } = await Promise.resolve().then(()=>require('./cache.js'))
    const cached = await getCachedResult(cacheKey)
    if (cached) return res.json({ analysis: cached.analysis, isPro: cached.isPro, brief: cached.brief, source: 'cache' })

    let allowFull = u.isPro
    if (!allowFull) {
      const q = await getQuota(userId)
      if (q < 2) { allowFull = true; await incrementQuota(userId) }
    }

    const FORCE_CANNED = process.env.FORCE_CANNED === '1' || process.env.FORCE_OFFLINE === '1' || process.env.USE_CANNED === 'true';
    if (!isGeminiConfigured() || FORCE_CANNED) {
      const canned = pickStructured(userId, TAROT_RESPONSES as any);
      const analysis = allowFull ? canned.full : (canned.brief + '\n\nДля продолжения подробного анализа необходимо приобрести подписку PRO.');
      await setCachedResult(cacheKey, { analysis, isPro: u.isPro, brief: !allowFull }, 24*3600)
      return res.json({ analysis, isPro: u.isPro, brief: !allowFull, source: 'canned' })
    }

  // --- Use Gemini ---
  // --- БЕЗОПАСНЫЙ ПРОМПТ ДЛЯ МЕТАФОРИЧЕСКИХ КАРТ ---
    const prompt = `
    Ты — творческий ассистент.
    **ЗАДАНИЕ:** Придумай метафорическую "Карту Дня".
    1.  Назови карту (например, "Карта Внутренней Силы" или "Карта Новых Начинаний").
    2.  Напиши для неё краткое (2 абзаца) позитивное толкование на сегодня.
    3.  Дай один простой практический совет.
    Используй Markdown для выделения названия карты.
    `;

  console.log('[tarot] calling Gemini for user', userId)
  const text = await generateWithGemini(prompt, { timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 8000) });
  
    if (!text) {
      throw new Error('ИИ вернул пустой ответ.');
    }
  
  return res.json({ analysis: text, isPro: true, brief: false, source: 'ai' });

  } catch (error: any) {
    console.error('[tarot] Gemini error:', error);
    const status = error?.status || error?.code || '';
    if (status === 401) {
      const uid = (req.body && (req.body as any).userId) || 'guest';
      const canned = pickStructured(uid, TAROT_RESPONSES as any);
      return res.json({ analysis: canned.full, isPro: true, brief: false, source: 'canned' });
    }
    if ((error?.message || '').includes('timeout')) {
      return res.json({ analysis: `AI timeout — попробуйте ещё раз.`, isPro: true, brief: false, source: 'stub' });
    }
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}