// @ts-ignore
import { createClient } from '@vercel/kv'

// If Vercel KV envs are not present in local dev, the @upstash/redis client
// used by @vercel/kv will try to build an invalid URL and throw ERR_INVALID_URL.
// Provide a lightweight in-memory fallback to avoid 500s during local testing.

function hasKvEnv() {
  // Vercel/other setups may expose a few different env names. Check common variants.
  const keys = [
    'VERCEL_KV_REST_URL',
    'VERCEL_KV_REST_TOKEN',
    'VERCEL_KV_NAMESPACE',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'KV_REST_API_READ_ONLY_TOKEN',
    'KV_REST_API_NAMESPACE',
    'KV_REST_API_URL'
  ]
  return keys.some(k => !!process.env[k])
}

let kv: any
// Normalize common alternative env names to the names expected by @vercel/kv
function normalizeKvEnv() {
  if (!process.env.VERCEL_KV_REST_URL) {
    process.env.VERCEL_KV_REST_URL = process.env.KV_REST_API_URL || process.env.KV_REST_URL || ''
  }
  if (!process.env.VERCEL_KV_REST_TOKEN) {
    process.env.VERCEL_KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_TOKEN || ''
  }
  if (!process.env.VERCEL_KV_NAMESPACE) {
    process.env.VERCEL_KV_NAMESPACE = process.env.KV_REST_API_NAMESPACE || process.env.KV_NAMESPACE || ''
  }
}

if (hasKvEnv()) {
  normalizeKvEnv()
  try {
    // Some environments / versions may require passing explicit url/token/namespace.
    // Try default no-arg first, then try with explicit options.
    try {
      kv = (createClient as any)()
    } catch (innerErr) {
      try {
        let rawUrl = process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || ''
        // sanitize: if the value looks like a path (starts with '/') or lacks a scheme, do not pass it
        let url: string | undefined = undefined
        if (rawUrl && typeof rawUrl === 'string') {
          const trimmed = rawUrl.trim()
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            url = trimmed
          } else {
            console.warn('[DB] KV REST URL looks like a relative path or missing scheme; skipping explicit url to allow platform defaults')
          }
        }
        const token = process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || ''
        const ns = process.env.VERCEL_KV_NAMESPACE || process.env.KV_REST_API_NAMESPACE || undefined
        console.log('[DB] createClient() fallback with explicit options', { url: !!url, hasToken: !!token, namespace: !!ns })
        const cfg: any = {}
        if (url) cfg.url = url
        if (token) cfg.token = token
        if (ns) cfg.namespace = ns
        kv = (createClient as any)(Object.keys(cfg).length ? cfg : undefined)
      } catch (inner2) {
        throw inner2 || innerErr
      }
    }
  } catch (e) {
    console.error('[DB] createClient() failed, attempting REST-fallback or in-memory KV', e)
    // Try REST fallback using explicit REST URL + token if available
    const restUrl = process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || ''
    const restToken = process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || ''
    const restNamespace = process.env.VERCEL_KV_NAMESPACE || process.env.KV_REST_API_NAMESPACE || undefined
    const isRestOk = !!restUrl && !!restToken
    if (isRestOk) {
      // minimal fetch-based KV client for Upstash-like REST API
      const base = restUrl.replace(/\/$/, '')
      kv = {
        async get(key: string) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetch(url, { headers: { Authorization: `Bearer ${restToken}` } })
            if (!r.ok) return null
            const txt = await r.text()
            return txt === '' ? null : txt
          } catch (e) {
            console.warn('[DB][REST] get failed', String(e))
            return null
          }
        },
        async set(key: string, value: string) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetch(url, { method: 'PUT', body: String(value), headers: { Authorization: `Bearer ${restToken}` } })
            return r.ok
          } catch (e) {
            console.warn('[DB][REST] set failed', String(e))
            return false
          }
        },
        async del(key: string) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${restToken}` } })
            return r.ok
          } catch (e) {
            console.warn('[DB][REST] del failed', String(e))
            return false
          }
        }
      }
      console.log('[DB] using REST KV fallback', { base: !!base, namespace: !!restNamespace })
    } else {
      const store = new Map<string, string>()
      kv = {
        async get(key: string) {
          return store.has(key) ? store.get(key) : null
        },
        async set(key: string, value: string) {
          store.set(key, value)
          return true
        },
        async del(key: string) {
          return store.delete(key)
        }
      }
      console.log('[DB] REST credentials not present, using in-memory fallback')
    }
  }
} else {
  const store = new Map<string, string>()
  kv = {
    async get(key: string) {
      return store.has(key) ? store.get(key) : null
    },
    async set(key: string, value: string) {
      store.set(key, value)
      return true
    },
    // keep compatibility if code uses delete/keys/scan in future
    async del(key: string) {
      return store.delete(key)
    }
  }
}

export { kv }

export async function setSubscription(userId: string, expiryIso: string) {
  return kv.set(userId, expiryIso)
}

export async function getSubscription(userId: string) {
  return kv.get(userId)
}