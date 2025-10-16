import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setPro } from '../../data/store'

function addDays(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  // Verify secret token if provided (Telegram supports X-Telegram-Bot-Api-Secret-Token)
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const got = (req.headers['x-telegram-bot-api-secret-token'] || req.query.secret_token) as
    | string
    | undefined
  if (expected && got !== expected) return res.status(401).send('bad token')

  const update = req.body as any
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return res.status(500).send('no bot token')

  const msg = update?.message
  const chatId = msg?.chat?.id
  const text: string = msg?.text || ''

  if (typeof chatId !== 'number') return res.status(200).json({ ok: true })

  // Expect "/start pro_<userId>"
  let activated = false
  const startMatch = text.startsWith('/start')
    ? (text.split(' ').slice(1).join(' ') || '').trim()
    : ''
  if (startMatch && startMatch.startsWith('pro_')) {
    const userId = decodeURIComponent(startMatch.slice(4))
    const until = addDays(30)
    setPro(userId, until)
    activated = true
    // Notify user in Telegram
    const message = `PRO активирован до ${until.substring(0, 10)}. Спасибо!`
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
  }

  return res.status(200).json({ ok: true, activated })
}
