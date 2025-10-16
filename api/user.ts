import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUser } from '../data/store'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const userId = (req.query.userId as string) || 'guest'
  const u = getUser(userId)
  const daily = Number(process.env.FREE_MESSAGES_PER_DAY || 2)
  return res.json({ isPro: u.isPro, freeLeft: Math.max(0, daily - u.freeUsedToday), proUntil: u.proUntil })
}
