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
    process.env.VERCEL_KV_REST_URL = process.env.KV_REST_API_URL || process.env.KV_REST_API_URL || process.env.KV_REST_API_URL
  }
  if (!process.env.VERCEL_KV_REST_TOKEN) {
    process.env.VERCEL_KV_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN
  }
  if (!process.env.VERCEL_KV_NAMESPACE) {
    process.env.VERCEL_KV_NAMESPACE = process.env.KV_REST_API_NAMESPACE || process.env.KV_REST_API_NAMESPACE
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
        const url = process.env.VERCEL_KV_REST_URL || process.env.KV_REST_API_URL || ''
        const token = process.env.VERCEL_KV_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || ''
        const ns = process.env.VERCEL_KV_NAMESPACE || process.env.KV_REST_API_NAMESPACE || undefined
        console.log('[DB] createClient() fallback with explicit options', { url: !!url, hasToken: !!token, namespace: !!ns })
        kv = (createClient as any)({ url, token, namespace: ns })
      } catch (inner2) {
        throw inner2 || innerErr
      }
    }
  } catch (e) {
    console.error('[DB] createClient() failed, falling back to in-memory KV', e)
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