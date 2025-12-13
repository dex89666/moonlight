// MongoDB-based cache and quota system
import { connectMongo, checkAndUseQuota as mongoCheckQuota, getQuotaStatus as mongoQuotaStatus, findOrCreateUser } from '../mongodb.js'

// In-memory fallback cache (for when MongoDB is unavailable)
const memCache = new Map<string, { value: any, expiry: Date }>()

export async function getCachedResult(key: string) {
  try {
    const { db } = await connectMongo()
    const cacheCol = db.collection('cache')
    const doc = await cacheCol.findOne({ key })
    if (!doc) return null
    if (doc.expiry && new Date(doc.expiry) < new Date()) {
      await cacheCol.deleteOne({ key })
      return null
    }
    return doc.value
  } catch (e) {
    console.warn('[cache] MongoDB error, using memory fallback', e)
    const cached = memCache.get(key)
    if (!cached) return null
    if (cached.expiry < new Date()) {
      memCache.delete(key)
      return null
    }
    return cached.value
  }
}

export async function setCachedResult(key: string, value: any, ttlSeconds = 24*3600) {
  const expiry = new Date(Date.now() + ttlSeconds * 1000)
  try {
    const { db } = await connectMongo()
    const cacheCol = db.collection('cache')
    await cacheCol.updateOne(
      { key },
      { $set: { key, value, expiry, storedAt: new Date() } },
      { upsert: true }
    )
  } catch (e) {
    console.warn('[cache] MongoDB set error, using memory fallback', e)
    memCache.set(key, { value, expiry })
  }
}

// Увеличивает квоту и возвращает текущее значение
export async function incrementQuota(userId: string) {
  try {
    // Ensure user exists in MongoDB
    await findOrCreateUser(userId, undefined)
    const result = await mongoCheckQuota(userId)
    // Return current usage count after increment (if allowed)
    const status = await mongoQuotaStatus(userId)
    return status.used
  } catch (e) {
    console.warn('[quota] inc error', e)
    return null
  }
}

// Возвращает текущую использованную квоту
export async function getQuota(userId: string) {
  try {
    const status = await mongoQuotaStatus(userId)
    return status.used
  } catch (e) {
    console.warn('[quota] get error', e)
    return 0
  }
}

// Проверяет, можно ли использовать квоту (true = можно отправить запрос)
export async function canUseQuota(userId: string): Promise<boolean> {
  try {
    const status = await mongoQuotaStatus(userId)
    const remaining = status.limit - status.used
    return status.isPro || remaining > 0
  } catch (e) {
    console.warn('[quota] canUse error', e)
    return false
  }
}

// Использует квоту и возвращает объект с информацией
export async function useQuota(userId: string): Promise<{ allowed: boolean, isPro: boolean, remaining: number }> {
  try {
    const result = await mongoCheckQuota(userId)
    return result
  } catch (e) {
    console.warn('[quota] use error', e)
    return { allowed: false, isPro: false, remaining: 0 }
  }
}
