// ⭐️ ИСПРАВЛЕНО: Добавлен .js
import type { Payments } from './index.js' 

export const telegramPayments: Payments = {
  async createPro(userId: string) {
    const bot = process.env.TELEGRAM_BOT_USERNAME || '@your_bot'
    const startParam = `pro_${encodeURIComponent(userId)}`
    const redirectUrl = `https://t.me/${bot.replace(/^@/, '')}?start=${startParam}`
    return { redirectUrl }
  },
}