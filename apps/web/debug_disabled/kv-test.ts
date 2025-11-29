import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../../core/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).send('Method Not Allowed')

  const key = '__diag_manual_test__'
  const value = String(Date.now())
  const out: any = { set: null, get: null }

  try {
    const setRes = await kv.set(key, value)
    out.set = { ok: !!setRes }
  } catch (e: any) {
    out.set = { ok: false, error: String(e?.message || e).slice(0, 300) }
  }

  try {
    const got = await kv.get(key)
    out.get = { value: got }
  } catch (e: any) {
    out.get = { error: String(e?.message || e).slice(0, 300) }
  }

  return res.status(200).json({ ok: true, probe: out })
}
