import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv, setSubscription, getSubscription } from '../core/db.js'

// Verify Telegram login: compute hash per Telegram docs
import crypto from 'crypto'

function verifyTelegramAuth(data: Record<string,string>, botToken: string) {
  const checkObj: string[] = []
  for (const k of Object.keys(data).sort()) {
    if (k === 'hash') continue
    checkObj.push(`${k}=${data[k]}`)
  }
  const dataCheckString = checkObj.join('\n')
  const secret = crypto.createHash('sha256').update(botToken).digest()
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  return hmac === data.hash
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const payload = req.body || {}
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
  if (!botToken) return res.status(500).json({ error: 'Bot token not configured' })

  try {
    // Telegram passes fields like id, first_name, username, auth_date, hash
    const ok = verifyTelegramAuth(payload as any, botToken)
    if (!ok) return res.status(401).json({ error: 'Invalid auth data' })

    const id = String(payload.id)
    const key = `user:${id}`
    const userObj = {
      id,
      username: payload.username || null,
      first_name: payload.first_name || null,
      last_name: payload.last_name || null,
      auth_date: payload.auth_date ? new Date(Number(payload.auth_date) * 1000).toISOString() : new Date().toISOString()
    }

    await kv.set(key, JSON.stringify(userObj))

    // maintain users index
    const listKey = 'users:list'
    const raw = await kv.get(listKey)
    let list: string[] = []
    try { list = raw ? JSON.parse(String(raw)) : [] } catch { list = [] }
    if (!list.includes(id)) {
      list.push(id)
      await kv.set(listKey, JSON.stringify(list))
    }

    // return subscription status if any
    const subRaw = await kv.get(`sub:${id}`)
    let sub = null
    try { sub = subRaw ? JSON.parse(String(subRaw)) : null } catch { sub = null }

    return res.status(200).json({ ok: true, user: userObj, subscription: sub })
  } catch (e: any) {
    console.error('[telegram-auth] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
