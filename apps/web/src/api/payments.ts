import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../../core/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const { userId, birthDate, action } = req.body as { userId?: string; birthDate?: string; action?: string }

  if (!userId || userId === 'guest') {
    return res.status(400).json({ error: 'Invalid user ID' })
  }

  const key = `sub:${userId}`

  try {
    if (action === 'clearDate') {
      // remove birthDate from stored subscription if present
      const raw = await kv.get(key)
      if (raw) {
        try {
          const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
          delete obj.birthDate
          await kv.set(key, JSON.stringify(obj))
        } catch (e) {
          // if parsing failed, just delete the whole key
          await kv.del(key)
        }
      }
      return res.status(200).json({ success: true })
    }

    // activate subscription: set expiry + optional birthDate
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 1)
    const expiryDateISO = expiryDate.toISOString()

    const payload: any = { expiry: expiryDateISO }
    if (birthDate) payload.birthDate = birthDate

    await kv.set(key, JSON.stringify(payload))

    console.log(`[БЭКЕНД] PRO-доступ активирован для ${userId} до ${expiryDateISO} (birthDate=${birthDate || 'none'})`)

    return res.status(200).json({ success: true, expiry: expiryDateISO })
  } catch (error: any) {
    console.error(`[БЭКЕНД] Ошибка при активации PRO для ${userId}:`, error)
    return res.status(500).json({ error: 'Server error while activating subscription' })
  }
}