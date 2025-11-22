// @ts-ignore
import { createClient } from '@vercel/kv'

// If Vercel KV envs are not present in local dev, the @upstash/redis client
// used by @vercel/kv will try to build an invalid URL and throw ERR_INVALID_URL.
// Provide a lightweight in-memory fallback to avoid 500s during local testing.

function hasKvEnv() {
  // Vercel sets VERCEL_KV_REST_URL and VERCEL_KV_REST_TOKEN (or similar).
  return !!(process.env.VERCEL_KV_REST_URL || process.env.VERCEL_KV_REST_TOKEN || process.env.VERCEL_KV_NAMESPACE)
}

let kv: any

if (hasKvEnv()) {
  try {
    // some versions of @vercel/kv expose createClient that requires args in TS types;
    // cast to any to allow runtime call without arguments in local dev.
    kv = (createClient as any)()
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