// ⭐️ ИСПРАВЛЕНО: Добавлен .js
import type { Payments } from './index.js' 

export const stripePayments: Payments = {
  async createPro(userId: string) {
    // Заглушка: здесь могла бы быть сессия оплаты и /api/stripe/webhook
    return { redirectUrl: 'https://stripe.com/pay' }
  },
}