import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { isValidSign } from '../guard.js';
import { getUser } from '../../data/store.js';

// ⭐️ 1. Добавляем карту перевода (Транслит -> Английский)
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

  // ⭐️ 2. Переводим знак, если он пришел на транслите
  if (SIGN_MAP[sign]) {
    console.log(`[Zodiac] Перевод: ${sign} -> ${SIGN_MAP[sign]}`);
    sign = SIGN_MAP[sign];
  }

  // 3. Проверяем уже правильный английский знак
  if (!sign || !isValidSign(sign)) {
    console.error('[Zodiac] ❌ Неверный знак:', sign);
    return res.status(400).send('bad sign');
  }

  try {
    const u = getUser(userId);

    // Freemium логика
    if (!u.isPro) {
      const brief = `Краткий астрологический обзор для знака ${sign}: сегодня обратите внимание на настроение и небольшие возможности для развития.`;
      return res.json({ analysis: brief, isPro: false, brief: true, briefReason: 'free_quota' });
    }

    // Инициализация OpenAI
    if (!process.env.OPENAI_API_KEY) {
      const stub = `Локальный тестовый астрологический отчёт для знака ${sign}.`;
      return res.json({ analysis: stub, isPro: true, brief: false });
    }

    console.log('[Zodiac] 🤖 Отправляем запрос в OpenAI...');
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
    Сгенерируй позитивный и обобщённый астрологический анализ на сегодня по знаку ${sign} (Zodiac Sign).
    Твой ответ должен быть текстом из 2-3 абзацев на русском языке.
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || "mistralai/mistral-7b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error('Empty response from AI');

    console.log('[Zodiac] ✅ Ответ от AI получен!');
    return res.json({ analysis: text, isPro: true, brief: false });

  } catch (error: any) {
    console.error('[Zodiac] ❌ Ошибка:', error);
    return res.status(500).send(error.message || 'Error');
  }
}