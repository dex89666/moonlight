import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setPro } from '../../data/store.js'
import crypto from 'crypto'

// Пример webhook-обработчика для Payme (узбекский провайдер).
// Ожидает JSON-пост с телом вида:
// {
//   event: 'payment:successful',
//   data: { userId: string, amount: number, until?: string }
// }
// И заголовок X-Payme-Signature: HMAC_SHA256(body, PAYME_SECRET)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const raw = (req as any).rawBody || ''
  const secret = process.env.PAYME_SECRET
  const sig = req.headers['x-payme-signature'] as string | undefined

  if (!secret) {
    console.error('[payme] PAYME_SECRET not set - refusing to accept webhook')
    return res.status(500).send('server misconfigured')
  }

  if (!sig) {
    console.error('[payme] missing signature header')
    return res.status(400).send('missing signature')
  }

  // verify HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  if (hmac !== sig) {
    console.error('[payme] signature mismatch', { expected: hmac, got: sig })
    return res.status(403).send('invalid signature')
  }

  try {
    const body = req.body as any
    const event = body?.event
    const data = body?.data || {}

    if (event !== 'payment:successful') {
      // For simplicity, we only handle successful payments here
      return res.status(200).json({ ok: true, note: 'ignored event' })
    }

    const userId = data.userId as string | undefined
    if (!userId) {
      console.error('[payme] missing userId in webhook data')
      return res.status(400).send('missing userId')
    }

    // until: ISO string or undefined -> default to 30 days
    let until: string | undefined = undefined
    if (data.until) {
      until = String(data.until)
    } else {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      until = d.toISOString()
    }

    // Set pro flag in our in-memory store (or DB in production)
    setPro(userId, until)

    console.log('[payme] set user as PRO', { userId, until })
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('[payme] handler error:', err)
    return res.status(500).send('internal error')
  }
}
