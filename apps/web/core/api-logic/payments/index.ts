export type PaymentsProvider = 'telegram' | 'stripe' | 'none'

export interface Payments {
  createPro(userId: string): Promise<{ redirectUrl?: string }>
}

export async function createPayments(): Promise<Payments> {
  const p = (process.env.PAYMENTS_PROVIDER || 'none') as PaymentsProvider
  
  // ⭐️ ИСПРАВЛЕНО: Добавлен .js
  if (p === 'telegram') return (await import('./telegram.js')).telegramPayments
  
  // ⭐️ ИСПРАВЛЕНО: Добавлен .js
  if (p === 'stripe') return (await import('./stripe.js')).stripePayments
  
  return { createPro: async () => ({}) }
}