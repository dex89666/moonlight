import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPayments } from './payments'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try {
    const { userId = 'guest' } = (req.body || {}) as { userId?: string }
    const payments = await createPayments()
    const result = await payments.createPro(userId)
    return res.json(result)
  } catch (e: any) {
    return res.status(500).send(e?.message || 'payments error')
  }
}
