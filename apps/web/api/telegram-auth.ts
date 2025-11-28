import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../core/db.js'

// Verify Telegram login: compute hash per Telegram docs
import crypto from 'crypto'

function parseInitDataString(s: string) {
  const obj: Record<string,string> = {}
  const parts = s.split('&')
  for (const p of parts) {
    const [k, v] = p.split('=')
    if (!k) continue
    // replace plus with space then decode
    obj[k] = decodeURIComponent((v || '').replace(/\+/g, ' '))
  }
  return obj
}

function tryParseField(maybeJson: string, field: string) {
  try {
    const obj = typeof maybeJson === 'string' ? JSON.parse(maybeJson) : maybeJson
    return obj && obj[field] != null ? String(obj[field]) : null
  } catch { return null }
}

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

  let payload = req.body || {}
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
  if (!botToken) {
    // still try to accept but warn
    console.warn('[telegram-auth] no bot token configured; accepting without verification')
  }

  try {
    // payload may be:
    // - a raw initData string
    // - an object with { initData: string }
    // - an object with { initDataUnsafe: { user: { ... } } }
    // - an object with { user: { ... } }
    let verified = false

    // parse initData string if present
    let parsedFromString: Record<string,string> | null = null
    if (typeof payload === 'string') {
      parsedFromString = parseInitDataString(payload)
    } else if (payload && typeof payload === 'object' && typeof (payload as any).initData === 'string') {
      parsedFromString = parseInitDataString((payload as any).initData)
    }

    // extract unsafe and user objects if present
    const unsafeObj = payload && typeof payload === 'object' && (payload as any).initDataUnsafe ? (payload as any).initDataUnsafe : null
    const userObjFromPayload = payload && typeof payload === 'object' && (payload as any).user ? (payload as any).user : null

    // combined object: start from parsedFromString, overlay unsafe, then overlay userObjFromPayload, then top-level simple fields
    const combined: Record<string, any> = {}
    if (parsedFromString) Object.assign(combined, parsedFromString)
    if (unsafeObj && typeof unsafeObj === 'object') Object.assign(combined, unsafeObj)
    if (userObjFromPayload && typeof userObjFromPayload === 'object') Object.assign(combined, userObjFromPayload)
    if (payload && typeof payload === 'object') {
      for (const k of Object.keys(payload)) {
        if (k === 'initData' || k === 'initDataUnsafe' || k === 'user') continue
        const v = (payload as any)[k]
        if (v == null) continue
        if (combined[k] == null) combined[k] = v
      }
    }

    // run verification using parsedFromString if available and botToken
    if (parsedFromString && botToken) {
      try { verified = verifyTelegramAuth(parsedFromString, botToken) } catch (e) { console.warn('[telegram-auth] verify failed', e) }
    }

    // extract id
    let id = ''
    if (combined.id) id = String(combined.id)
    else if (combined.user_id) id = String(combined.user_id)
    else if (combined.user && (combined.user.id || combined.user.user_id)) id = String(combined.user.id || combined.user.user_id)
    else if ((payload as any).id) id = String((payload as any).id)

    if (!id) return res.status(400).json({ error: 'Missing id' })

    const key = `user:${id}`
    const username = combined.username || null
    const first_name = combined.first_name || combined.firstName || null
    const last_name = combined.last_name || combined.lastName || null
    const auth_date_raw = combined.auth_date || null
    const userObj = {
      id,
      username,
      first_name,
      last_name,
      auth_date: auth_date_raw ? new Date(Number(auth_date_raw) * 1000).toISOString() : new Date().toISOString(),
      verified
    }

  // debug: log received user and id
  console.log('[telegram-auth] saving user', { id, username, first_name, last_name })
  await kv.set(key, JSON.stringify(userObj))
  console.log('[telegram-auth] kv.set user done', key)

    // maintain users index
    const listKey = 'users:list'
    const raw = await kv.get(listKey)
    let list: string[] = []
    try { list = raw ? JSON.parse(String(raw)) : [] } catch { list = [] }
    if (!list.includes(id)) {
      list.push(id)
      await kv.set(listKey, JSON.stringify(list))
      console.log('[telegram-auth] users:list updated', listKey, list.length)
    } else {
      console.log('[telegram-auth] users:list already contains id')
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
