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
    obj[k] = decodeURIComponent(v || '')
  }
  return obj
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
    // payload may be a raw initData string (from WebApp.initData) or an object (initDataUnsafe)
    let dataObj: Record<string,string> | null = null
    let verified = false

    if (typeof payload === 'string') {
      dataObj = parseInitDataString(payload)
    } else if (payload && typeof payload === 'object') {
      // if object contains initData as string
      if (typeof (payload as any).initData === 'string') {
        dataObj = parseInitDataString((payload as any).initData)
      } else {
        // convert simple object fields to strings
        dataObj = {}
        for (const k of Object.keys(payload)) {
          dataObj[k] = payload[k] == null ? '' : String((payload as any)[k])
        }
      }
    }

    if (dataObj && botToken) {
      try {
        verified = verifyTelegramAuth(dataObj, botToken)
      } catch (e) {
        console.warn('[telegram-auth] verify failed', e)
      }
    }

    // if dataObj missing, bail
    if (!dataObj) return res.status(400).json({ error: 'No initData provided' })

    const id = String(dataObj.id || dataObj.user_id || '')
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const key = `user:${id}`
    const userObj = {
      id,
      username: dataObj.username || null,
      first_name: dataObj.first_name || dataObj.firstName || null,
      last_name: dataObj.last_name || dataObj.lastName || null,
      auth_date: dataObj.auth_date ? new Date(Number(dataObj.auth_date) * 1000).toISOString() : new Date().toISOString(),
      verified
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
