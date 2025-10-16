declare global {
  interface Window {
    Telegram?: any
  }
}

export function initTelegram() {
  const tg = window.Telegram?.WebApp
  if (!tg) return undefined
  try {
    tg.ready()
    tg.expand()
  } catch {}
  return tg?.initDataUnsafe?.user?.id as string | undefined
}
