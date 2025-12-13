import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import Layout from './components/Layout'
import AdminPage from './pages/admin'

function App() {
  const loc = useLocation()
  const navigate = useNavigate()
  const [showAdmin, setShowAdmin] = useState(false)
  
  // 5 тапов для входа/выхода из админки
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<number | null>(null)

  function handleHomeTap(e: React.MouseEvent) {
    e.preventDefault()
    tapCountRef.current++
    
    // Сбрасываем счётчик через 2 секунды
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0
    }, 2000)
    
    // 5 тапов — переключаем админку
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      if (showAdmin) {
        setShowAdmin(false)
      } else {
        attemptAdminLogin()
      }
    } else if (tapCountRef.current === 1) {
      // Первый тап — переход на главную (с задержкой чтобы можно было продолжить тапать)
      const firstTapTimer = setTimeout(() => {
        if (tapCountRef.current === 1) {
          navigate('/')
          tapCountRef.current = 0
        }
      }, 300)
      // Очистка при втором тапе
      if (tapTimerRef.current) {
        clearTimeout(firstTapTimer)
      }
    }
  }

  function attemptAdminLogin() {
    const login = window.prompt('Admin login') || ''
    const pass = window.prompt('Admin password') || ''
    if (login === 'mavkoj' && pass === '372915') {
      try {
        localStorage.setItem('admin:basic', btoa(`${login}:${pass}`))
      } catch {}
      setShowAdmin(true)
    } else if (login || pass) {
      alert('Неверные учетные данные')
    }
  }
  
  return (
    <Layout>
      <nav className="nav">
        <a href="/" onClick={handleHomeTap} className={loc.pathname === '/' ? 'active' : ''}>Домой</a>
        <Link to="/matrix" className={loc.pathname === '/matrix' ? 'active' : ''}>Матрица</Link>
        <Link to="/compat" className={loc.pathname === '/compat' ? 'active' : ''}>Совместимость</Link>
        <Link to="/tarot" className={loc.pathname === '/tarot' ? 'active' : ''}>Таро</Link>
        <Link to="/zodiac" className={loc.pathname === '/zodiac' ? 'active' : ''}>Зодиак</Link>
        <Link to="/pro" className={loc.pathname === '/pro' ? 'active' : ''}>PRO</Link>
      </nav>
      <Outlet />
      
      {showAdmin && (
        <div style={{
          position:'fixed',
          left:0,
          top:0,
          right:0,
          bottom:0,
          background:'#0a0a1a',
          zIndex:1000,
          overflow:'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <AdminPage />
          <div style={{
            position:'fixed',
            top: 'max(12px, env(safe-area-inset-top))',
            right:16,
            zIndex:1001,
            display:'flex',
            gap:10,
            alignItems:'center'
          }}>
            <span style={{color:'#666',fontSize:11,background:'rgba(0,0,0,0.5)',padding:'4px 8px',borderRadius:4}}>
              5 тапов на "Домой" = выход
            </span>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default App