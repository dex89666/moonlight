export type PaymentsProvider = 'telegram' | 'stripe' | 'none'

export interface Payments {
  createPro(userId: string): Promise<{ redirectUrl?: string }>
}

export async function createPayments(): Promise<Payments> {
  const p = (process.env.PAYMENTS_PROVIDER || 'none') as PaymentsProvider
  if (p === 'telegram') return (await import('./telegram')).telegramPayments
  if (p === 'stripe') return (await import('./stripe')).stripePayments
  return { createPro: async () => ({}) }
}
