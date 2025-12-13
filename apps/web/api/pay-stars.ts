// API endpoint for initiating Telegram Stars payment
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createStarsInvoice } from '../core/api-logic/payments/telegram.js'
import { getQuotaStatus, logAnalytics } from '../core/mongodb.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = req.body?.userId || req.query.userId
    const chatId = req.body?.chatId || req.query.chatId

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required',
        hint: 'Pass userId from Telegram WebApp initDataUnsafe.user.id'
      })
    }

    // Check current status
    const status = await getQuotaStatus(String(userId))
    
    if (status.isPro && status.proExpiry && status.proExpiry > new Date()) {
      return res.json({
        success: true,
        alreadyPro: true,
        expiresAt: status.proExpiry,
        message: 'You already have an active PRO subscription'
      })
    }

    // Create invoice link
    const result = await createStarsInvoice(String(userId), Number(chatId) || 0)

    if (result.error) {
      return res.status(500).json({ 
        success: false, 
        error: result.error 
      })
    }

    await logAnalytics(String(userId), 'payment_invoice_created')

    return res.json({
      success: true,
      invoiceLink: result.invoiceLink,
      priceStars: Number(process.env.PRO_PRICE_STARS || 350),
      // Also provide bot link as fallback
      botLink: `https://t.me/${(process.env.TELEGRAM_BOT_USERNAME || 'universal_matrix_bot').replace('@', '')}?start=pay_${encodeURIComponent(userId)}`
    })

  } catch (error: any) {
    console.error('[PayStars] Error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}
