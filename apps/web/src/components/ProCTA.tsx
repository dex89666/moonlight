import React from 'react'

export default function ProCTA({ reason }: { reason?: string }) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ marginBottom: '0.5rem', color: '#666' }}>{reason === 'free_quota' ? 'Вы исчерпали дневной лимит бесплатных сообщений.' : 'Доступ ограничен.'}</div>
  <a className="btn btn--float" href="/pro"><span className="icon" aria-hidden>✨</span> Оформить PRO</a>
    </div>
  )
}
