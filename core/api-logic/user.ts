import type { VercelRequest, VercelResponse } from '@vercel/node'
// ⭐️ ИСПРАВЛЕНО: Путь стал ../../data/ + добавлено .js
import { getUser } from '../../data/store.js'

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export function'
export function handleUser(req: VercelRequest, res: VercelResponse) {
  const userId = (req.query.userId as string) || 'guest'
  const u = getUser(userId)
  const daily = Number(process.env.FREE_MESSAGES_PER_DAY || 2)
  return res.json({ isPro: u.isPro, freeLeft: Math.max(0, daily - u.freeUsedToday), proUntil: u.proUntil })
}