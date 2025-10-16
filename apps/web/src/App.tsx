import { Outlet, Link, useLocation } from 'react-router-dom'
import Layout from './components/Layout'

export default function App() {
  const loc = useLocation()
  return (
    <Layout>
      <nav className="nav">
        <Link to="/" className={loc.pathname === '/' ? 'active' : ''}>
          Домой
        </Link>
        <Link to="/matrix" className={loc.pathname === '/matrix' ? 'active' : ''}>
          Психологический портрет
        </Link>
        <Link to="/tarot" className={loc.pathname === '/tarot' ? 'active' : ''}>
          Метафорические карты
        </Link>
        <Link to="/zodiac" className={loc.pathname === '/zodiac' ? 'active' : ''}>
          Астрологический анализ
        </Link>
        <Link to="/compat" className={loc.pathname === '/compat' ? 'active' : ''}>
          Совместимость
        </Link>
        <Link to="/pro" className={loc.pathname === '/pro' ? 'active' : ''}>
          PRO
        </Link>
      </nav>
      <Outlet />
    </Layout>
  )
}
