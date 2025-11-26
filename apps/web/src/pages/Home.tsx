import { Button, Section } from '../components/UI';
import { useState, useRef } from 'react'
import AdminPage from './admin'
import { api } from '../api/client'
import { Link } from 'react-router-dom';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false)
  const timerRef = useRef<number | null>(null)

  function handleMouseDown(){
    timerRef.current = window.setTimeout(()=> setShowAdmin(true), 5000)
  }
  function handleMouseUp(){
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  async function handleTelegramLogin() {
    // if Telegram WebApp present, get initData and send to server
    const tg = (window as any).Telegram?.WebApp
    if (!tg) return alert('Telegram WebApp not available')
    const initData = tg.initData || tg.initDataUnsafe || null
    if (!initData) return alert('No init data')
    try {
      const res = await api.post<any>('/api/telegram-auth', initData)
      if (res && (res as any).ok) alert('Вход выполнен')
    } catch (e:any){ alert('Ошибка входа: '+(e.message||e)) }
  }
  return (
    <>
    <div onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
    <Section>
      <h1>Добро пожаловать</h1>
      <div style={{display:'flex',gap:10,marginBottom:12}}>
        <Button onClick={handleTelegramLogin}>Войти через Telegram</Button>
      </div>
      <p>Выберите инструмент для анализа:</p>
      
      <div className="grid">
        <Link to="/matrix" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>🔢 Матрица Судьбы</h3>
            <p>Психологический портрет по дате рождения.</p>
          </div>
        </Link>

        <Link to="/compat" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>💞 Совместимость</h3>
            <p>Анализ отношений по датам партнеров.</p>
          </div>
        </Link>

        <Link to="/tarot" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>🃏 Карты Таро</h3>
            <p>Метафорическая карта дня и совет.</p>
          </div>
        </Link>
        
        <Link to="/zodiac" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>♈ Зодиак</h3>
            <p>Астрологический прогноз.</p>
          </div>
        </Link>
      </div>
  </Section>
  </div>
  {showAdmin && <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)'}}>
      <div style={{width:800,margin:'60px auto',background:'#fff',padding:20}}>
        <button onClick={()=>setShowAdmin(false)}>Close</button>
        <AdminPage/>
      </div>
    </div>}
  </>
  );
}