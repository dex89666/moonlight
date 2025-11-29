import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../../core/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
  try {
    const hasEnv = !!(process.env.VERCEL_KV_REST_URL || process.env.VERCEL_KV_REST_TOKEN || process.env.VERCEL_KV_NAMESPACE)
    let testKey = null
    try {
      await kv.set('__kv_test__', '1')
      testKey = await kv.get('__kv_test__')
      await kv.del('__kv_test__')
    } catch (e) { testKey = null }
    return res.json({ ok: true, hasEnv, kvWorks: testKey != null })
  } catch (e:any) {
    console.error('[debug/kv-status] error', e)
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
