import type { VercelRequest, VercelResponse } from '@vercel/node'
// Do not import createClient at top-level to avoid side-effects in environments without @vercel/kv

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

  const env = {
    hasVERCEL: !!process.env.VERCEL_KV_REST_URL || !!process.env.VERCEL_KV_REST_TOKEN || !!process.env.VERCEL_KV_NAMESPACE,
    hasKV_REST_API_URL: !!process.env.KV_REST_API_URL || !!process.env.KV_REST_API_TOKEN || !!process.env.KV_REST_API_NAMESPACE || !!process.env.KV_REST_API_READ_ONLY_TOKEN
  }

  // Inspect candidate env keys for suspicious values (e.g. a path like '/pipeline')
  const candidates = [
    'VERCEL_KV_REST_URL',
    'VERCEL_KV_REST_TOKEN',
    'VERCEL_KV_NAMESPACE',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'KV_REST_API_NAMESPACE',
    'KV_REST_API_READ_ONLY_TOKEN',
    'KV_REST_URL',
    'KV_REST_TOKEN',
    'KV_NAMESPACE'
  ]
  const inspected: Record<string, { present: boolean; startsWithSlash?: boolean; preview?: string }> = {}
  for (const k of candidates) {
    const v = process.env[k]
    inspected[k] = { present: !!v }
    if (v && typeof v === 'string') {
      inspected[k].startsWithSlash = v.trim().startsWith('/')
      inspected[k].preview = v.trim().slice(0, 6)
    }
  }

  const opts = {
    url: process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || null,
    token: process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || null,
    namespace: process.env.VERCEL_KV_NAMESPACE || process.env.KV_REST_API_NAMESPACE || null
  }

  let createClientOk = false
  let createClientError: string | null = null
  let kvTestOk = false
  let kvTestError: string | null = null

  try {
    // dynamic import to avoid import-time errors
    const { createClient } = await import('@vercel/kv') as any
    try {
      // try default constructor first
      let client: any = null
      try { client = createClient() } catch (e) {
        // try with explicit options
        const cfg: any = {}
        if (opts.url) cfg.url = opts.url
        if (opts.token) cfg.token = opts.token
        if (opts.namespace) cfg.namespace = opts.namespace
        client = createClient(cfg)
      }
      createClientOk = true

      // perform small KV roundtrip
      try {
        const key = '__diag_kv_test__'
        await client.set(key, '1')
        const got = await client.get(key)
        await client.del(key)
        kvTestOk = String(got) === '1'
        if (!kvTestOk) kvTestError = `unexpected get result: ${String(got)}`
      } catch (e:any) {
        kvTestError = String(e?.message || e)
      }
    } catch (e:any) {
      createClientError = String(e?.message || e)
    }
  } catch (e:any) {
    // module not available or runtime import failed
    createClientError = String(e?.message || e)
  }

  return res.json({ ok: true, env, inspected, opts: { url: !!opts.url, token: !!opts.token, namespace: !!opts.namespace }, createClientOk, createClientError, kvTestOk, kvTestError })
}
