import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
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

    // Local dev fallback: если нет ключа, возвращаем stub-ответ для быстрой разработки (для PRO)
    if (!process.env.OPENAI_API_KEY) {
      const stub = `# Карта дня: Теплый Ветер\n\n**Толкование:** Сегодня вы можете почувствовать легкое движение в сторону новых идей.\n\n**Совет:** Сделайте маленький шаг в новом направлении.`
    return res.json({ analysis: stub, isPro: true, brief: false, source: 'stub' })
    }

    // Instantiate OpenAI lazily so tests and local dev without API key don't error on import
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    // --- БЕЗОПАСНЫЙ ПРОМПТ ДЛЯ МЕТАФОРИЧЕСКИХ КАРТ ---
    const prompt = `
    Ты — творческий ассистент.
    **ЗАДАНИЕ:** Придумай метафорическую "Карту Дня".
    1.  Назови карту (например, "Карта Внутренней Силы" или "Карта Новых Начинаний").
    2.  Напиши для неё краткое (2 абзаца) позитивное толкование на сегодня.
    3.  Дай один простой практический совет.
    Используй Markdown для выделения названия карты.
    `;

    console.log('[tarot] calling OpenAI for user', userId)

    // Safety: wrap OpenAI call in a timeout so it doesn't hang indefinitely
    const aiPromise = openai.chat.completions.create({
      model: process.env.MODEL || 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: "user", content: prompt }],
    });

    const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 8000)
    const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), timeoutMs))

    const completion = await Promise.race([aiPromise, timeoutPromise])

    const text = (completion as any)?.choices?.[0]?.message?.content || (completion as any)?.choices?.[0]?.text || '';
  
    if (!text) {
      throw new Error('ИИ вернул пустой ответ.');
    }
  
  return res.json({ analysis: text, isPro: true, brief: false, source: 'ai' });

  } catch (error: any) {
    console.error('ОШИБКА в api/tarot:', error);
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}