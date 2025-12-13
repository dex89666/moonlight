// Telegram Bot Webhook Endpoint
// Set this URL in Telegram: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_DOMAIN/api/telegram-webhook
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleTelegramWebhook } from '../core/api-logic/telegram/webhook.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleTelegramWebhook(req, res)
}
