export type User = {
  userId: string
  freeUsedToday: number
  isPro: boolean
  proUntil?: string
  updatedAt: string
}

const inMemory = new Map<string, User>()

function todayKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`
}

export function getUser(userId: string): User {
  const key = `${userId}:${todayKey()}`
  let u = inMemory.get(key)
  if (!u) {
    u = { userId, freeUsedToday: 0, isPro: false, updatedAt: new Date().toISOString() }
    inMemory.set(key, u)
  }
  return u
}

export function incFree(userId: string) {
  const u = getUser(userId)
  u.freeUsedToday += 1
  u.updatedAt = new Date().toISOString()
}

export function setPro(userId: string, until?: string) {
  const u = getUser(userId)
  u.isPro = true
  u.proUntil = until
  u.updatedAt = new Date().toISOString()
}
