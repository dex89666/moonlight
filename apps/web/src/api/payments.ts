import type { VercelRequest, VercelResponse } from '@vercel/node';
// ⭐️ НОВОЕ: Импортируем твою KV-базу, как в других файлах
import { kv } from '../../core/db';
// (getUser нам здесь не нужен, только kv)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // 1. Получаем userId из тела (как мы и исправили в ProCTA)
  const { userId } = req.body as { userId?: string };

  if (!userId || userId === 'guest') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // 2. Рассчитываем дату окончания подписки (+1 месяц)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiryDateISO = expiryDate.toISOString();

    // 3. Записываем в KV-базу
    // Это та же самая база, которую читает api/matrix.ts
    // Ключ = userId, Значение = '2025-12-16T17:30:00.000Z'
    await kv.set(userId, expiryDateISO);

    console.log(`[БЭКЕНД] PRO-доступ активирован для ${userId} до ${expiryDateISO}`);

    // 4. Отправляем успешный ответ
    return res.status(200).json({ success: true, expiry: expiryDateISO });

  } catch (error: any) {
    console.error(`[БЭКЕНД] Ошибка при активации PRO для ${userId}:`, error);
    return res.status(500).json({ error: 'Server error while activating subscription' });
  }
}