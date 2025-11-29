import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../../core/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
  try {
    const raw = await kv.get('users:list')
    const list = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
    const details: any[] = []
    for (const id of (list || [])) {
      const uRaw = await kv.get(`user:${id}`)
      const sRaw = await kv.get(`sub:${id}`)
      let u = null
      try { u = uRaw ? JSON.parse(String(uRaw)) : null } catch { u = uRaw }
      let s = null
      try { s = sRaw ? JSON.parse(String(sRaw)) : null } catch { s = sRaw }
      details.push({ id, user: u, sub: s })
    }
    return res.json({ ok: true, raw, list: list || [], details })
  } catch (e: any) {
    console.error('[debug/users] error', e)
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
