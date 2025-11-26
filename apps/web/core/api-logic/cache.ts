import { kv } from '../db.js'

export async function getCachedResult(key: string) {
  try {
    const raw = await kv.get(`cache:${key}`)
    if (!raw) return null
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (obj.expiry && new Date(obj.expiry) < new Date()) {
      // expired
      await kv.del(`cache:${key}`)
      return null
    }
    return obj.value
  } catch (e) {
    console.warn('[cache] get error', e)
    return null
  }
}

export async function setCachedResult(key: string, value: any, ttlSeconds = 24*3600) {
  try {
    const obj = { value, expiry: new Date(Date.now() + ttlSeconds*1000).toISOString(), storedAt: new Date().toISOString() }
    await kv.set(`cache:${key}`, JSON.stringify(obj))
  } catch (e) {
    console.warn('[cache] set error', e)
  }
}

export async function incrementQuota(userId: string) {
  try {
    const day = new Date().toISOString().slice(0,10)
    const key = `quota:${userId}:${day}`
    const raw = await kv.get(key)
    let n = 0
    try { n = raw ? parseInt(String(raw),10)||0 : 0 } catch { n = 0 }
    n += 1
    await kv.set(key, String(n))
    return n
  } catch (e) {
    console.warn('[quota] inc error', e)
    return null
  }
}

export async function getQuota(userId: string) {
  try {
    const day = new Date().toISOString().slice(0,10)
    const key = `quota:${userId}:${day}`
    const raw = await kv.get(key)
    const n = raw ? parseInt(String(raw),10)||0 : 0
    return n
  } catch (e) {
    console.warn('[quota] get error', e)
    return 0
  }
}
