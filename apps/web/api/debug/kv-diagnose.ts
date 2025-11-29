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
  const attempts: Record<string, { ok: boolean; error?: string | null; stack?: string | null }> = {}
  let restFetch: { ok?: boolean; status?: number | null; location?: string | null; error?: string | null; origin?: string; pathname?: string } = {}

  try {
    // dynamic import to avoid import-time errors
    const { createClient } = await import('@vercel/kv') as any
    try {
      // attempt 1: default createClient()
      try {
        const c1 = createClient()
        attempts['default'] = { ok: false }
        try {
          const k = '__diag_1'
          await c1.set(k, '1')
          const g = await c1.get(k)
          await c1.del(k)
          attempts['default'].ok = String(g) === '1'
          if (!attempts['default'].ok) attempts['default'].error = `got:${String(g)}`
        } catch (e:any) {
          attempts['default'].error = String(e?.message || e)
          attempts['default'].stack = String(e?.stack || null)
        }
      } catch (e:any) {
        attempts['default'] = { ok: false, error: String(e?.message || e), stack: String(e?.stack || null) }
      }

      // attempt 2: explicit options from normalized opts
      try {
        const cfg: any = {}
        if (opts.url) cfg.url = opts.url
        if (opts.token) cfg.token = opts.token
        if (opts.namespace) cfg.namespace = opts.namespace
        const c2 = Object.keys(cfg).length ? createClient(cfg) : createClient()
        attempts['explicit_normalized'] = { ok: false }
        try {
          const k = '__diag_2'
          await c2.set(k, '1')
          const g = await c2.get(k)
          await c2.del(k)
          attempts['explicit_normalized'].ok = String(g) === '1'
          if (!attempts['explicit_normalized'].ok) attempts['explicit_normalized'].error = `got:${String(g)}`
        } catch (e:any) {
          attempts['explicit_normalized'].error = String(e?.message || e)
          attempts['explicit_normalized'].stack = String(e?.stack || null)
        }
      } catch (e:any) {
        attempts['explicit_normalized'] = { ok: false, error: String(e?.message || e), stack: String(e?.stack || null) }
      }

      // attempt 3: explicit options from raw env names
      try {
        const rawUrl = process.env.KV_REST_API_URL || process.env.KV_REST_URL || ''
        const rawToken = process.env.KV_REST_API_TOKEN || process.env.KV_REST_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || ''
        const rawNs = process.env.KV_REST_API_NAMESPACE || process.env.KV_NAMESPACE || undefined
        const cfg3: any = {}
        if (rawUrl) cfg3.url = rawUrl
        if (rawToken) cfg3.token = rawToken
        if (rawNs) cfg3.namespace = rawNs
        const c3 = Object.keys(cfg3).length ? createClient(cfg3) : createClient()
        attempts['explicit_raw'] = { ok: false }
        try {
          const k = '__diag_3'
          await c3.set(k, '1')
          const g = await c3.get(k)
          await c3.del(k)
          attempts['explicit_raw'].ok = String(g) === '1'
          if (!attempts['explicit_raw'].ok) attempts['explicit_raw'].error = `got:${String(g)}`
        } catch (e:any) {
          attempts['explicit_raw'].error = String(e?.message || e)
          attempts['explicit_raw'].stack = String(e?.stack || null)
        }
      } catch (e:any) {
        attempts['explicit_raw'] = { ok: false, error: String(e?.message || e), stack: String(e?.stack || null) }
      }

      // summarize
      createClientOk = Object.values(attempts).some(a => a.ok)
      // pick first non-ok error as kvTestError for backward compatibility
      for (const k of Object.keys(attempts)) {
        if (!attempts[k].ok) {
          kvTestError = attempts[k].error || null
          break
        }
      }
    } catch (e:any) {
      createClientError = String(e?.message || e)
    }
  } catch (e:any) {
    // module not available or runtime import failed
    createClientError = String(e?.message || e)
  }

  // If we have an explicit REST URL, try a lightweight fetch to observe possible redirects
  try {
    if (opts.url) {
      try {
        const u = new URL(opts.url)
        // include parsed origin and pathname presence
        restFetch.origin = u.origin
        restFetch.pathname = u.pathname
      } catch (e:any) {
        // if opts.url is not a full URL, record that
        restFetch.error = 'invalid-url'
      }
      // try a lightweight HEAD but ignore failures (some endpoints block HEAD)
      try {
        const resp = await fetch(opts.url, { method: 'HEAD' })
  restFetch.ok = resp.ok
  restFetch.status = resp.status
  restFetch.location = resp.headers.get('location')
      } catch (e:any) {
        // keep earlier parsed info
        if (!restFetch) restFetch = { error: String(e?.message || e) }
      }
    }
  } catch (e:any) {
    restFetch = { error: String(e?.message || e) }
  }

  // sanitize attempts for response: keep ok flag and first 200 chars of error/stack
  const sanitizedAttempts: Record<string, any> = {}
  for (const k of Object.keys(attempts)) {
    sanitizedAttempts[k] = {
      ok: attempts[k].ok,
      error: attempts[k].error ? String(attempts[k].error).slice(0, 200) : undefined,
      stack: attempts[k].stack ? String(attempts[k].stack).split('\n').slice(0, 3).join('\n') : undefined
    }
  }

  return res.json({ ok: true, env, inspected, opts: { url: !!opts.url, token: !!opts.token, namespace: !!opts.namespace }, createClientOk, createClientError, kvTestOk, kvTestError, restFetch, attempts: sanitizedAttempts })
}
