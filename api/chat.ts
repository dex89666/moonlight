import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SYSTEM_PROMPT, MODEL } from '../config/ai'
import { isAllowedTopic } from '../core/guard'
import { getUser, incFree } from '../data/store'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  const { userId = 'guest', prompt, category = 'matrix' } = req.body as {
    userId?: string
    prompt?: string
    category?: 'matrix' | 'compat' | 'tarot' | 'zodiac'
  }
  if (!prompt) return res.status(400).send('no prompt')
  if (!isAllowedTopic(category)) return res.status(400).send('bad category')

  const u = getUser(userId)
  if (!u.isPro && u.freeUsedToday >= Number(process.env.FREE_MESSAGES_PER_DAY || 2)) {
    return res.status(402).json({ reason: 'paywall', plan: 'PRO', used: { freeLeft: 0, isPro: u.isPro } })
  }

  // Тематический guard (упрощённо, без внешнего вызова, для демо)
  const offTopic = !new RegExp(`${category}|дата|знак|карта`, 'i').test(prompt)
  if (offTopic) {
    incFree(userId)
    return res.json({
      output:
  'Пожалуйста, сформулируйте вопрос в рамках тем: нумерология, метафорические карты, совместимость, астрологический анализ.',
      used: { freeLeft: Math.max(0, Number(process.env.FREE_MESSAGES_PER_DAY || 2) - getUser(userId).freeUsedToday), isPro: u.isPro },
      isPro: u.isPro,
      brief: !u.isPro,
      briefReason: !u.isPro ? 'free_quota' : undefined,
    })
  }

  // Stub OpenAI call (реальную интеграцию можно добавить позже)
  incFree(userId)
  const answer = `(${category}) ${prompt.slice(0, 120)} — краткий разбор с уважительным тоном.`
  return res.json({
    output: answer,
    used: { freeLeft: Math.max(0, Number(process.env.FREE_MESSAGES_PER_DAY || 2) - getUser(userId).freeUsedToday), isPro: u.isPro },
    isPro: u.isPro,
    brief: !u.isPro,
    briefReason: !u.isPro ? 'free_quota' : undefined,
  })
}
