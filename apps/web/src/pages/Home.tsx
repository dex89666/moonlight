import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="grid">
  <Link to="/matrix" className="card">Психологический портрет по дате</Link>
  <Link to="/tarot" className="card">Метафорические карты (3 карты)</Link>
  <Link to="/zodiac" className="card">Астрологический анализ</Link>
      <Link to="/compat" className="card">Совместимость</Link>
      <Link to="/pro" className="card pro">PRO</Link>
    </div>
  )
}
