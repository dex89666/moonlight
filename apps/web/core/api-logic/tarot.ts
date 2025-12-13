import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithAI, isAIConfigured } from './genai.js';
import { TAROT_RESPONSES, pickStructured } from '../../data/responses.js';

export async function handleTarot(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { userId = 'guest' } = req.body as { userId?: string }
    
    console.log('[tarot] Request for user:', userId);
    console.log('[tarot] AI configured:', isAIConfigured());
    console.log('[tarot] OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);

    // Всегда пытаемся использовать AI
    if (isAIConfigured()) {
      const prompt = `Ты — творческий ассистент по метафорическим картам.

ЗАДАНИЕ: Придумай уникальную метафорическую "Карту Дня" для пользователя.

1. Придумай название карты (например: "Карта Внутренней Силы", "Карта Новых Горизонтов", "Карта Мудрости Сердца")
2. Напиши позитивное толкование на сегодня (2-3 абзаца)
3. Дай один практический совет на день

Отвечай на русском языке. Используй эмодзи для оформления.`;

      console.log('[tarot] Calling AI...');
      const text = await generateWithAI(prompt, { timeoutMs: 20000, analysisType: 'detailed' });
      
      if (text) {
        console.log('[tarot] AI response received, length:', text.length);
        return res.json({ analysis: text, isPro: true, brief: false, source: 'ai' });
      }
      console.log('[tarot] AI returned empty, falling back to canned');
    }

    // Fallback на заготовки
    console.log('[tarot] Using canned response');
    const canned = pickStructured(userId, TAROT_RESPONSES as any);
    return res.json({ analysis: canned.full, isPro: true, brief: false, source: 'canned' });

  } catch (error: any) {
    console.error('[tarot] Error:', error);
    // Fallback при ошибке
    const uid = (req.body as any)?.userId || 'guest';
    const canned = pickStructured(uid, TAROT_RESPONSES as any);
    return res.json({ analysis: canned.full, isPro: true, brief: false, source: 'canned', error: error.message });
  }
}