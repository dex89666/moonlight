// Do not import @vercel/kv at top-level to avoid module side-effects in some Vercel environments.
// We will import it dynamically during initialization.

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
    'KV_REST_API_URL',
    // Upstash integration env names
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]
  return keys.some(k => typeof process.env[k] === 'string' && process.env[k]!.trim() !== '')
}

let kv: any
// Normalize common alternative env names to the names expected by @vercel/kv
function normalizeKvEnv() {
  const pick = (a?: string, b?: string) => {
    if (a && a.trim() !== '') return a.trim()
    if (b && b.trim() !== '') return b.trim()
    return undefined
  }

  const url = pick(process.env.VERCEL_KV_REST_URL, process.env.KV_REST_API_URL || process.env.KV_REST_URL)
  if (url) process.env.VERCEL_KV_REST_URL = url

  const token = pick(process.env.VERCEL_KV_REST_TOKEN, process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_TOKEN)
  if (token) process.env.VERCEL_KV_REST_TOKEN = token

  const ns = pick(process.env.VERCEL_KV_NAMESPACE, process.env.KV_REST_API_NAMESPACE || process.env.KV_NAMESPACE)
  if (ns) process.env.VERCEL_KV_NAMESPACE = ns
}

if (hasKvEnv()) {
  normalizeKvEnv()
  // Non-secret runtime info for diagnostics: report which KV env vars are present.
  // This logs presence and token length only (no token value).
  try {
    console.log('[DB] KV env presence', {
      VERCEL_KV_REST_URL: !!process.env.VERCEL_KV_REST_URL,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      VERCEL_KV_NAMESPACE: !!process.env.VERCEL_KV_NAMESPACE,
      KV_REST_API_NAMESPACE: !!process.env.KV_REST_API_NAMESPACE,
      VERCEL_KV_REST_TOKEN_len: process.env.VERCEL_KV_REST_TOKEN ? process.env.VERCEL_KV_REST_TOKEN.length : 0,
      KV_REST_API_TOKEN_len: process.env.KV_REST_API_TOKEN ? process.env.KV_REST_API_TOKEN.length : 0
    })
  } catch (e) {
    // never throw during initialization logging
  }
  try {
    // If a REST URL is explicitly provided, prefer REST-only fallback to avoid @vercel/kv auto-initialization issues
    const explicitRestUrl = process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || ''
    const explicitRestToken = process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || ''
    if (explicitRestUrl && explicitRestToken) {
      console.log('[DB] explicit REST URL + token detected — using REST-only KV client')
      // proceed to REST fallback block below by throwing a controlled signal
      throw new Error('USE_REST_FALLBACK')
    }
    // Some environments / versions may require passing explicit url/token/namespace.
    // Try dynamic import of @vercel/kv and then try default no-arg first, then try with explicit options.
    try {
      const mod = await import('@vercel/kv') as any
      const createClient = mod.createClient as any
      try {
        kv = createClient()
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
          kv = createClient(Object.keys(cfg).length ? cfg : undefined)
        } catch (inner2) {
          throw inner2 || innerErr
        }
      }
    } catch (e) {
      throw e
    }
  } catch (e) {
    const em = (e as any)?.message || ''
    if (String(em).includes('USE_REST_FALLBACK')) {
      console.log('[DB] forcing REST fallback due to explicit REST url/token')
    } else {
      console.error('[DB] createClient() failed, attempting REST-fallback or in-memory KV', e)
    }
    // Try REST fallback using explicit REST URL + token if available
  const restUrl = process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
  const restToken = process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
    const restNamespace = process.env.VERCEL_KV_NAMESPACE || process.env.KV_REST_API_NAMESPACE || undefined
    const isRestOk = !!restUrl && !!restToken
    if (isRestOk) {
      // minimal fetch-based KV client for Upstash-like REST API
      const base = restUrl.replace(/\/$/, '')
      const DEFAULT_FETCH_TIMEOUT = 3000

      async function fetchWithTimeout(input: string, init?: any, timeout = DEFAULT_FETCH_TIMEOUT) {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeout)
        try {
          const r = await fetch(input, { signal: controller.signal, ...init })
          return r
        } finally {
          clearTimeout(id)
        }
      }
      kv = {
        async get(key: string) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${restToken}` } }, DEFAULT_FETCH_TIMEOUT)
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
            const r = await fetchWithTimeout(url, { method: 'PUT', body: String(value), headers: { Authorization: `Bearer ${restToken}` } }, DEFAULT_FETCH_TIMEOUT)
            return r.ok
          } catch (e) {
            console.warn('[DB][REST] set failed', String(e))
            return false
          }
        },
        async del(key: string) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetchWithTimeout(url, { method: 'DELETE', headers: { Authorization: `Bearer ${restToken}` } }, DEFAULT_FETCH_TIMEOUT)
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

// Wrap kv with proxy that falls back to REST calls for individual ops when underlying client fails
function makeProxy(client: any, restBase?: string, restToken?: string) {
  const base = restBase ? restBase.replace(/\/$/, '') : undefined
  const token = restToken
  return {
    async get(key: string) {
      try {
        return await client.get(key)
      } catch (e: any) {
        const msg = String(e?.message || e)
        if (base && token && (msg.includes('/pipeline') || msg.includes('Invalid URL') || msg.includes('ERR_INVALID_URL'))) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } }, DEFAULT_FETCH_TIMEOUT)
            if (!r.ok) return null
            const txt = await r.text()
            return txt === '' ? null : txt
          } catch (er) {
            console.warn('[DB] REST fallback get failed', String(er))
            return null
          }
        }
        throw e
      }
    },
    async set(key: string, value: string) {
      try {
        return await client.set(key, value)
      } catch (e: any) {
        const msg = String(e?.message || e)
        if (base && token && (msg.includes('/pipeline') || msg.includes('Invalid URL') || msg.includes('ERR_INVALID_URL'))) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetchWithTimeout(url, { method: 'PUT', body: String(value), headers: { Authorization: `Bearer ${token}` } }, DEFAULT_FETCH_TIMEOUT)
            return r.ok
          } catch (er) {
            console.warn('[DB] REST fallback set failed', String(er))
            return false
          }
        }
        throw e
      }
    },
    async del(key: string) {
      try {
        return await client.del(key)
      } catch (e: any) {
        const msg = String(e?.message || e)
        if (base && token && (msg.includes('/pipeline') || msg.includes('Invalid URL') || msg.includes('ERR_INVALID_URL'))) {
          try {
            const url = `${base}/v1/kv/${encodeURIComponent(String(key))}`
            const r = await fetchWithTimeout(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }, DEFAULT_FETCH_TIMEOUT)
            return r.ok
          } catch (er) {
            console.warn('[DB] REST fallback del failed', String(er))
            return false
          }
        }
        throw e
      }
    }
  }
}

// If we built a REST-only client earlier, wrap it as-is. If we built an upstash client, wrap it and pass REST creds for fallback.
const restBase = process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || ''
const restToken = process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || ''
kv = makeProxy(kv, restBase || undefined, restToken || undefined)

export { kv }

export async function setSubscription(userId: string, expiryIso: string) {
  return kv.set(userId, expiryIso)
}

export async function getSubscription(userId: string) {
  return kv.get(userId)
}

// Helper: fetch with timeout (used by REST fallback and proxy)
const DEFAULT_FETCH_TIMEOUT = 3000
async function fetchWithTimeout(input: string, init?: any, timeout = DEFAULT_FETCH_TIMEOUT) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const r = await fetch(input, { signal: controller.signal, ...init })
    return r
  } finally {
    clearTimeout(id)
  }
}