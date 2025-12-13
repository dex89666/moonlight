import { useEffect, useState } from 'react'

export default function Header() {
  // track quick taps on brand to open admin
  const [tapCount, setTapCount] = useState(0)
  useEffect(() => {
    if (tapCount <= 0) return
    const t = setTimeout(() => setTapCount(0), 3000)
    return () => clearTimeout(t)
  }, [tapCount])

  const onBrandClick = () => {
    setTapCount(c => {
      const next = c + 1
      try { localStorage.setItem('brand:tap', String(next)) } catch {}
      if (next >= 5) {
        try { localStorage.setItem('brand:tap', '0') } catch {}
        window.location.href = '/admin'
      }
      return next >= 5 ? 0 : next
    })
  }

  return (
    <header className="header">
      <div className="container row">
        <div className="brand" role="button" tabIndex={0} onClick={onBrandClick} onKeyDown={(e) => { if (e.key === 'Enter') onBrandClick() }}>Илона</div>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <a className="btn btn--ghost" href="/pro" aria-label="Перейти на страницу PRO">
            <span className="icon" aria-hidden="true">🔮</span>
            <span className="status">PRO</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
