import type { VercelRequest, VercelResponse } from '@vercel/node';
// ⭐️ ИСПРАВЛЕНО: Путь стал короче
import { isValidDateStr } from '../guard.js';
// ⭐️ ИСПРАВЛЕНО: Путь стал короче
import { pathNumber } from '../numerology.js';
import OpenAI from 'openai';
// ⭐️ ИСПРАВЛЕНО: Путь стал ../../data/
import { getUser } from '../../data/store.js';

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export async function'
export async function handleCompat(
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

    // (Этот блок кода мы уже добавляли, он остается)
    const p1 = pathNumber(birthDate1);
    const p2 = pathNumber(birthDate2);
    const matrixData = {
      energies: [p1, p2] 
    };

    // If not PRO - return a short basic compatibility note
    if (!u.isPro) {
      const brief = `Краткая совместимость: энергия ${p1} и ${p2} в основном дополняют друг друга. Совет: обращайте внимание на коммуникацию.`
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota', matrixData })
    }

    // Local dev fallback (for PRO)
    if (!process.env.OPENAI_API_KEY) {
      const stub = `Локальный тестовый отчёт по совместимости для дат ${birthDate1} и ${birthDate2}.`
      return res.json({ analysis: stub, isPro: true, brief: false, matrixData })
    }
    
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

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
      const stub = 'ИИ вернул пустой ответ, попробуйте еще раз.'
      console.error('ОШИБКА в api/compat: ИИ вернул пустой ответ.');
      return res.json({ analysis: stub, isPro: true, brief: false, source: 'stub', matrixData });
    }
    
    return res.json({ analysis: text, isPro: true, brief: false, matrixData });

  } catch (error: any) {
    console.error('ОШИБКА в api/compat:', error);
    
    // (Этот блок кода мы уже добавляли, он остается)
    const p1 = pathNumber(birthDate1);
    const p2 = pathNumber(birthDate2);
    const matrixData = { energies: [p1, p2] };

    const stub = `Произошла ошибка сервера: ${error.message || 'Произошла ошибка.'}`
    return res.json({ analysis: stub, isPro: true, brief: false, source: 'stub', matrixData });
  }
}