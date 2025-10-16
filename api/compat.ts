import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidDateStr } from '../core/guard.js';
import { pathNumber } from '../core/numerology.js';
import OpenAI from 'openai';
import { getUser } from '../data/store.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  
  const { birthDate1, birthDate2, userId = 'guest' } = req.body as { birthDate1?: string, birthDate2?: string, userId?: string };
  
  if (!birthDate1 || !isValidDateStr(birthDate1) || !birthDate2 || !isValidDateStr(birthDate2)) {
    return res.status(400).send('bad dates');
  }

  try {
    const u = getUser(userId)

    // If not PRO - return a short basic compatibility note
    if (!u.isPro) {
      const p1 = pathNumber(birthDate1);
      const p2 = pathNumber(birthDate2);
      const brief = `Краткая совместимость: энергия ${p1} и ${p2} в основном дополняют друг друга. Совет: обращайте внимание на коммуникацию.`
  return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' })
    }

    // Local dev fallback (for PRO)
    if (!process.env.OPENAI_API_KEY) {
      const stub = `Локальный тестовый отчёт по совместимости для дат ${birthDate1} и ${birthDate2}.`
      return res.json({ analysis: stub, isPro: true, brief: false })
    }
    // instantiate OpenAI lazily (so tests/local without key don't fail on import)
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });
    const p1 = pathNumber(birthDate1);
    const p2 = pathNumber(birthDate2);

    // --- БЕЗОПАСНЫЙ ПРОМПТ ДЛЯ СОВМЕСТИМОСТИ ---
    const prompt = `
    Ты — ассистент-аналитик.
    **ЗАДАНИЕ:** Проанализируй взаимодействие двух числовых энергий: ${p1} и ${p2}.
    1.  Опиши общую атмосферу их взаимодействия (например, "гармония", "динамика", "дополнение").
    2.  Укажи один сильный аспект этого союза.
    3.  Укажи один аспект, требующий внимания ("зона роста").
    Текст должен быть конструктивным и позитивным. Используй Markdown.
    `;
    
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;

    if (!text) {
      throw new Error('ИИ вернул пустой ответ.');
    }
    
  return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    console.error('ОШИБКА в api/compat:', error);
    return res.status(500).send(error.message || 'Произошла ошибка.');
  }
}