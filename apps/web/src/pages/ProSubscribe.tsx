import { useEffect, useState } from 'react'
import { Button, Section } from '../components/UI'
import { api } from '../api/client'
import { initTelegram } from '../lib/telegram'

export default function ProSubscribe() {
  const [userId, setUserId] = useState<string>('guest')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // попытка получить userId из Telegram WebApp, если доступно
    const id: string | undefined = initTelegram()
    if (id) setUserId(id)
  }, [])

  const handlePay = async () => {
    setErr('')
    setSuccessMsg(null)
    setLoading(true)
    try {
      const r = await api.post<{ success?: boolean; expiry?: string; message?: string }>('/api/pro', { userId })
      if (r?.success) {
        setSuccessMsg(r.expiry ? `Подписка оформлена до ${r.expiry}` : 'Подписка оформлена (30 дней)')
      } else {
        setErr(r?.message || 'Не удалось оформить подписку')
      }
    } catch (e: any) {
      setErr(e?.message || 'Ошибка оплаты')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section>
      <h2>PRO-подписка</h2>
      <p>Оформите PRO-подписку на расширенную аналитику и получите приоритетную обработку и дополнительные возможности.</p>

      <Button disabled={loading} onClick={() => setShowModal(true)}>
        {loading ? 'Открываем оплату…' : 'Оформить PRO'}
      </Button>

      {/* Demo payment modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Демо оплата</h3>
            <p>Это демонстрация: нажмите «Оплатить» чтобы симулировать успешную покупку (KV обновится).</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={async () => {
                // simulate actual payment then call server
                await handlePay()
                setShowModal(false)
              }}>
                Оплатить (демо)
              </Button>
              <Button onClick={() => setShowModal(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      {err && <p className="error">{err}</p>}
      {successMsg && <p className="success">{successMsg}</p>}
    </Section>
  )
}
