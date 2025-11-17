import type { VercelRequest, VercelResponse } from '@vercel/node'
// ⭐️ ИСПРАВЛЕНО: Путь стал короче + добавлено .js
import { kv } from '../db.js'

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export async function'
export async function handlePro(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try {
    const { userId } = (req.body || {}) as { userId?: string }
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' })

    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
  const iso = expiry.toISOString()
  await kv.set(userId, iso)

  return res.json({ success: true, expiry: iso })
  } catch (e: any) {
    return res.status(500).send(e?.message || 'kv error')
  }
}