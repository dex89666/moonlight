import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../../core/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
  const id = String(req.query.userId || req.headers['x-user-id'] || '')
  if (!id) return res.status(400).json({ error: 'userId required' })

  try {
    const subRaw = await kv.get(`sub:${id}`)
    const sub = subRaw ? JSON.parse(String(subRaw)) : null
    return res.status(200).json({ ok: true, subscription: sub })
  } catch (e: any) {
    console.error('[user/subscription] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
