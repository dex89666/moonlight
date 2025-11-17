import { Link, useNavigate } from 'react-router-dom'
import { useRef } from 'react'

export default function Home() {
  const nav = useNavigate()
  const timer = useRef<number | null>(null)

  function startLongPress() {
    timer.current = window.setTimeout(() => nav('/admin'), 4000)
  }
  function cancelLongPress() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }

  return (
    <div className="grid">
      <Link to="/matrix" className="card">Психологический портрет по дате</Link>
      <Link to="/tarot" className="card">Метафорические карты (3 карты)</Link>
      <Link to="/zodiac" className="card">Астрологический анализ</Link>
      <Link to="/compat" className="card">Совместимость</Link>
      <Link to="/pro" className="card pro">PRO</Link>

      {/* Hidden admin trigger: hold for 4s on this element */}
      <div
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        style={{ position: 'absolute', left: 12, top: 12, width: 32, height: 32, opacity: 0 }}
        aria-hidden
      />
    </div>
  )
}
