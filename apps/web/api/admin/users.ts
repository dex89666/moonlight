import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../../core/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

  // simple Basic auth: ADMIN_USER / ADMIN_PASS from env. If not set, allow access (dev convenience)
  const ADMIN_USER = process.env.ADMIN_USER || ''
  const ADMIN_PASS = process.env.ADMIN_PASS || ''
  if (ADMIN_USER && ADMIN_PASS) {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Basic ')) return res.status(401).setHeader('WWW-Authenticate', 'Basic realm="Admin"').send('Unauthorized')
    const b = auth.slice('Basic '.length)
    let decoded = ''
    try { decoded = Buffer.from(b, 'base64').toString('utf8') } catch { decoded = '' }
    const [u, p] = decoded.split(':')
    if (u !== ADMIN_USER || p !== ADMIN_PASS) return res.status(401).setHeader('WWW-Authenticate', 'Basic realm="Admin"').send('Unauthorized')
  }

  try {
    const raw = await kv.get('users:list')
    const list: string[] = raw ? JSON.parse(String(raw)) : []
    const users = [] as any[]
    for (const id of list) {
      const uRaw = await kv.get(`user:${id}`)
      const subRaw = await kv.get(`sub:${id}`)
      let u = null
      try { u = uRaw ? JSON.parse(String(uRaw)) : null } catch { u = null }
      let s = null
      try { s = subRaw ? JSON.parse(String(subRaw)) : null } catch { s = null }
      users.push({ id, profile: u, subscription: s })
    }
    return res.status(200).json({ ok: true, users })
  } catch (e: any) {
    console.error('[admin/users] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
