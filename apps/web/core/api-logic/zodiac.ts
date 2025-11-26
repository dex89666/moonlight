import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
import { isValidSign } from '../guard.js';
import { getUser } from '../../data/store.js';
import { ZODIAC_RESPONSES, pickStructured } from '../../data/responses.js';
import { kv } from '../db.js';

const SIGN_MAP: Record<string, string> = {
  'oven': 'aries',
  'telets': 'taurus',
  'bliznetsy': 'gemini',
  'rak': 'cancer',
  'lev': 'leo',
  'deva': 'virgo',
  'vesy': 'libra',
  'scorpion': 'scorpio',
  'strelets': 'sagittarius',
  'kozerog': 'capricorn',
  'vodoley': 'aquarius',
  'ryby': 'pisces'
};

export async function handleZodiac(req: VercelRequest, res: VercelResponse) {
  console.log('[Zodiac] 🚀 Начало обработки...');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body as any;
  let sign = (body.sign || '').toLowerCase();
  const userId = String(body.userId || 'guest');

  console.log(`[Zodiac] Получен знак: "${sign}"`);

  if (SIGN_MAP[sign]) {
    console.log(`[Zodiac] Перевод: ${sign} -> ${SIGN_MAP[sign]}`);
    sign = SIGN_MAP[sign];
  }

  if (!sign || !isValidSign(sign)) {
    console.error('[Zodiac] ❌ Неверный знак:', sign);
    return res.status(400).send('bad sign');
  }

  try {
    const u = getUser(userId);
    try{
      const raw = await kv.get(`sub:${userId}`)
      if (raw) { try{ const obj = typeof raw === 'string' ? JSON.parse(raw) : raw; if (obj?.expiry) u.isPro = new Date(obj.expiry) > new Date() } catch { if (typeof raw === 'string') u.isPro = new Date(raw) > new Date() } }
    } catch(e){ console.warn('[Zodiac] kv read failed', e) }

    if (!u.isPro) {
      let brief = `Краткий астрологический обзор для знака ${sign}: сегодня обратите внимание на настроение и новые возможности.`;
      brief += '\n\nДля продолжения подробного анализа необходимо приобрести подписку PRO.'
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' });
    }

    // Use Gemini only
    if (!isGeminiConfigured()) {
      const canned = pickStructured(`${userId}::${sign}`, ZODIAC_RESPONSES as any);
      return res.json({ analysis: canned.full, isPro: true, brief: false, source: 'canned' });
    }

    console.log('[Zodiac] 🛰️ Отправляем запрос в Gemini...');
    const prompt = `
    Сгенерируй позитивный и обобщённый астрологический анализ на сегодня по знаку ${sign} (Zodiac Sign).
    Твой ответ должен быть текстом из 2-3 абзацев на русском языке.
    `;

    const text = await generateWithGemini(prompt, { timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 8000) });
    if (!text) throw new Error('Empty response from AI');

    console.log('[Zodiac] ✅ Ответ от AI получен!');
    return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    console.error('[Zodiac] ❌ Ошибка:', error);
    const status = error?.status || error?.code || '';
    if (status === 401) {
      const canned = pickStructured(`${userId}::${sign}`, ZODIAC_RESPONSES as any);
      return res.json({ analysis: canned.full, isPro: true, brief: false, source: 'canned' });
    }
    if ((error?.message || '').includes('timeout')) {
      return res.json({ analysis: `AI timeout — попробуйте ещё раз.`, isPro: true, brief: false, source: 'stub' });
    }
    return res.status(500).send(error.message || 'Error');
  }
}