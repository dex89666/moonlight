import { useEffect, useState } from 'react'

type Intensity = 'low' | 'med' | 'high'

export default function Header() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('cosmos:enabled') !== '0' } catch { return true }
  })

  const [intensity, setIntensity] = useState<Intensity>(() => {
    try { return (localStorage.getItem('cosmos:intensity') as Intensity) || 'med' } catch { return 'med' }
  })

  useEffect(() => {
    try { localStorage.setItem('cosmos:enabled', enabled ? '1' : '0') } catch {}
  }, [enabled])

  useEffect(() => {
    try { localStorage.setItem('cosmos:intensity', intensity) } catch {}
    try { window.dispatchEvent(new CustomEvent('cosmos:intensity', { detail: intensity })) } catch {}
  }, [intensity])

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
        // reset and navigate to admin
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn--ghost" onClick={() => setEnabled(v => !v)} aria-label="Toggle background effects">
              <span className="icon" aria-hidden="true">{enabled ? '👁️' : '🚫'}</span>
            </button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} aria-hidden>
              <button
                className={`btn btn--soft ${intensity === 'low' ? 'btn--pulse' : ''}`}
                onClick={() => setIntensity('low')}
                aria-pressed={intensity === 'low'}
                title="Low intensity"
              >Low</button>
              <button
                className={`btn btn--soft ${intensity === 'med' ? 'btn--pulse' : ''}`}
                onClick={() => setIntensity('med')}
                aria-pressed={intensity === 'med'}
                title="Medium intensity"
              >Med</button>
              <button
                className={`btn btn--soft ${intensity === 'high' ? 'btn--pulse' : ''}`}
                onClick={() => setIntensity('high')}
                aria-pressed={intensity === 'high'}
                title="High intensity"
              >High</button>
            </div>
          </div>

          <a className="btn btn--ghost" href="/pro" aria-label="Перейти на страницу PRO">
            <span className="icon" aria-hidden="true">🔮</span>
            <span className="status">PRO</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
