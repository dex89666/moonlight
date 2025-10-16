import { useEffect, useState } from 'react'
import { Button, Section } from '../components/UI'
import { api } from '../api/client'
import { initTelegram } from '../lib/telegram'

export default function ProSubscribe() {
  const [userId, setUserId] = useState<string>('guest')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    // Попытаемся получить userId из Telegram WebApp, если доступно
    const id: string | undefined = initTelegram()
    if (id) setUserId(id)
  }, [])

  return (
    <Section>
  <h2>PRO-подписка</h2>
  <p>Оформите PRO-подписку на расширенную аналитику и получите больше бесплатных сообщений.</p>
      <Button
        disabled={loading}
        onClick={async () => {
          setErr('')
          setLoading(true)
          try {
            const r = await api.post<{ redirectUrl?: string }>('/api/pro', { userId })
            if (r?.redirectUrl) {
              window.location.href = r.redirectUrl
            } else {
              setErr('Не удалось получить ссылку оплаты. Проверьте PAYMENTS_PROVIDER.')
            }
          } catch (e: any) {
            setErr(e?.message || 'Ошибка оплаты')
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? 'Открываем оплату…' : 'Оформить PRO'}
      </Button>
      {err && <p className="error">{err}</p>}
    </Section>
  )
}
