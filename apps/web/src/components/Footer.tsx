import { useEffect, useState } from 'react'

export default function Footer() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <footer className="footer">
      <div className="container">
        <small>
          Развлекательный сервис. Без медицинских/финансовых/юридических рекомендаций.
        </small>
        <div style={{ float: 'right' }}>
          <button aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="btn btn--float">
            <span className="icon" aria-hidden>📜</span> Публичная оферта
          </button>
        </div>

        {open && (
          <div className="legal-modal" role="dialog" aria-modal="true">
            <div className="legal-overlay" onClick={() => setOpen(false)} />
            <div className="legal-content">
              <div className="legal-header">
                <strong>Публичная оферта</strong>
                <button className="legal-close" aria-label="Закрыть" onClick={() => setOpen(false)}>✕</button>
              </div>
              <iframe title="Публичная оферта" src="/LEGAL_OFFER.html" style={{ width: '100%', height: '70vh', border: 'none' }} />
            </div>
            <style>{`
              .legal-modal { position: fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; }
              .legal-overlay { position:absolute; inset:0; background:rgba(4,6,10,0.6); }
              .legal-content { position:relative; width:min(960px,96%); background:#fff; border-radius:8px; box-shadow:0 20px 60px rgba(2,6,23,0.6); overflow:hidden; z-index:10001 }
              .legal-header{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#fafafa; border-bottom:1px solid #eee }
              .legal-close{ background:transparent; border:0; font-size:18px; cursor:pointer }
              .btn--float{ display:inline-flex; align-items:center; gap:8px }
            `}</style>
          </div>
        )}
      </div>
    </footer>
  )
}
