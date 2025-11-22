import type { VercelRequest, VercelResponse } from '@vercel/node'
// ⭐️ ИСПРАВЛЕНО: Путь стал на 2 уровня вверх + добавлено .js
import { kv } from '../../db.js' 

const ADMIN_ID = process.env.ADMIN_USER_ID ?? '123456'

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export async function'
export async function handleAdminUsers(req: VercelRequest, res: VercelResponse) {
G   if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || (req.body && (req.body.userId as string))
    if (!userId) return res.status(400).json({ error: 'userId required' })
    if (userId !== ADMIN_ID) return res.status(403).json({ error: 'forbidden' })

    const out: Array<{ id: string; expiry: string | null }> = []
    for await (const k of kv.scanIterator()) {
      const expiry = await kv.get(k)
      out.push({ id: String(k), expiry: expiry ? String(expiry) : null })
    }

    return res.json({ users: out })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) })
  }
}