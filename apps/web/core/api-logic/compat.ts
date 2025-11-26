import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
import { COMPAT_RESPONSES, pickStructured } from '../../data/responses.js';
import { kv } from '../db.js';
import { isValidDateStr } from '../guard.js';
import { normalizeDateInput } from './utils.js';
import { pathNumber } from '../numerology.js';
import { getUser } from '../../data/store.js';
import { getCachedResult, setCachedResult, incrementQuota, getQuota } from './cache.js';

export async function handleCompat(req: VercelRequest, res: VercelResponse) {
  console.log('[Compat] 🚀 Начало обработки...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body || {};
  let { birthDate1, birthDate2, userId = 'guest' } = body;
  birthDate1 = normalizeDateInput(birthDate1);
  birthDate2 = normalizeDateInput(birthDate2);

  if (!birthDate1 || !isValidDateStr(birthDate1) || !birthDate2 || !isValidDateStr(birthDate2)) {
    return res.status(400).send('bad dates');
  }

  try {
    const u = getUser(userId);
    // determine PRO from KV
    try{
      const raw = await kv.get(`sub:${userId}`)
      if (raw) {
        try{ const obj = typeof raw === 'string' ? JSON.parse(raw) : raw; if (obj?.expiry) u.isPro = new Date(obj.expiry) > new Date() } catch { if (typeof raw === 'string') u.isPro = new Date(raw) > new Date() }
      }
    } catch(e){ console.warn('[Compat] KV read failed', e) }
    const p1 = pathNumber(birthDate1);
    const p2 = pathNumber(birthDate2);
    
    const matrixData = { energies: [p1, p2] };

    const cacheKey = `${userId}::${birthDate1}::${birthDate2}`;
    const cached = await getCachedResult(cacheKey)
    if (cached) return res.json({ analysis: cached.analysis, isPro: cached.isPro, brief: cached.brief, matrixData, source: 'cache' })

    // decide full vs brief for free users
    let allowFull = u.isPro
    if (!allowFull) {
      const q = await getQuota(userId)
      if (q < 2) { allowFull = true; await incrementQuota(userId) }
    }

    const FORCE_CANNED = process.env.FORCE_CANNED === '1' || process.env.FORCE_OFFLINE === '1' || process.env.USE_CANNED === 'true';
    if (!isGeminiConfigured() || FORCE_CANNED) {
      const canned = pickStructured(cacheKey, COMPAT_RESPONSES as any);
      const analysis = allowFull ? canned.full : (canned.brief + '\n\nДля продолжения подробного анализа необходимо приобрести подписку PRO.');
      await setCachedResult(cacheKey, { analysis, isPro: u.isPro, brief: !allowFull }, 24*3600)
      return res.json({ analysis, isPro: u.isPro, brief: !allowFull, matrixData, source: 'canned' });
    }

    const prompt = `
    Проанализируй взаимодействие двух числовых энергий: ${p1} и ${p2}.
    Дай краткую характеристику союза, сильные стороны и возможные зоны напряжения.
    `;

    const text = await generateWithGemini(prompt, { timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 8000) });
    if (!text) throw new Error('Empty response from AI');

    const final = allowFull ? text : (text.split('\n')[0] + '\n\nДля продолжения подробного анализа необходимо приобрести подписку PRO.');
    await setCachedResult(cacheKey, { analysis: final, isPro: u.isPro, brief: !allowFull }, 24*3600)
    return res.json({ analysis: final, isPro: u.isPro, brief: !allowFull, matrixData });

  } catch (error: any) {
    console.error('[Compat] ❌ Ошибка:', error);
    
    // Возвращаем хотя бы цифры, если ИИ упал
    const p1 = pathNumber(birthDate1);
    const p2 = pathNumber(birthDate2);
    return res.json({ 
        analysis: `Ошибка AI: ${error.message}`, 
        isPro: true, 
        brief: false, 
        source: 'stub', 
        matrixData: { energies: [p1, p2] } 
    });
  }
}