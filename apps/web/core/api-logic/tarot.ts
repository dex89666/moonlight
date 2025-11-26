import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithGemini, isGeminiConfigured } from './genai.js';
import { TAROT_RESPONSES, pickDeterministic } from '../../data/responses.js';
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

    // If not PRO - provide a short/basic card (freemium)
    if (!u.isPro) {
      const brief = `Карточка дня: Тёплый ветер — сегодня подходящее время для небольших экспериментов. Совет: попробуй сделать маленький шаг в новом направлении.`
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' })
    }

  // Use Gemini only: require GEMINI API key
  const FORCE_CANNED = process.env.FORCE_CANNED === '1' || process.env.FORCE_OFFLINE === '1' || process.env.USE_CANNED === 'true';
  if (!isGeminiConfigured() || FORCE_CANNED) {
      const canned = pickDeterministic(userId, TAROT_RESPONSES);
      return res.json({ analysis: canned, isPro: true, brief: false, source: 'canned' })
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
      const canned = pickDeterministic(uid, TAROT_RESPONSES);
      return res.json({ analysis: canned, isPro: true, brief: false, source: 'canned' });
    }
    if ((error?.message || '').includes('timeout')) {
      return res.json({ analysis: `AI timeout — попробуйте ещё раз.`, isPro: true, brief: false, source: 'stub' });
    }
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}