import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const flags = {
    provider: process.env.PAYMENTS_PROVIDER || 'none',
    hasTelegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasTelegramSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    hasBotUsername: Boolean(process.env.TELEGRAM_BOT_USERNAME),
    freeDaily: Number(process.env.FREE_MESSAGES_PER_DAY || 2),
  }
  return res.status(200).json({ ok: true, ...flags })
}
