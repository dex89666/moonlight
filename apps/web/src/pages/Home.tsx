import { Button, Section } from '../components/UI';
import { useState, useRef } from 'react'
import AdminPage from './admin'
import { api } from '../api/client'
import { Link } from 'react-router-dom';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false)
  const timerRef = useRef<number | null>(null)

  function startAdminTimer(){
    if (timerRef.current) return
    timerRef.current = window.setTimeout(async ()=>{
      // require login simple prompt
      const login = window.prompt('Admin login') || ''
      const pass = window.prompt('Admin password') || ''
      if (login === 'mavkoj' && pass === '372915') {
        setShowAdmin(true)
      } else {
        alert('Неверные учетные данные')
      }
      timerRef.current = null
    }, 5000)
  }
  function clearAdminTimer(){
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  async function handleTelegramLogin() {
    // if Telegram WebApp present, get initData and send to server
    const tg = (window as any).Telegram?.WebApp
    if (!tg) return alert('Telegram WebApp not available')
    // build minimal user payload to avoid sending whole WebApp object
    const user = tg.initDataUnsafe?.user || null
    const initDataStr = tg.initData || null
    const payload: any = {}
    if (initDataStr) payload.initData = initDataStr
    if (user) {
      payload.id = user.id
      payload.username = user.username
      payload.first_name = user.first_name
      payload.last_name = user.last_name
      payload.auth_date = tg.initDataUnsafe?.auth_date || null
    }
    try {
      const res = await api.post<any>('/api/telegram-auth', payload)
      if (res && (res as any).ok) alert('Вход выполнен')
      else alert('Ошибка входа: ' + JSON.stringify(res))
    } catch (e:any){ alert('Ошибка входа: '+(e.message||e)) }
  }
  return (
    <>
  <div onMouseDown={startAdminTimer} onMouseUp={clearAdminTimer} onMouseLeave={clearAdminTimer} onTouchStart={startAdminTimer} onTouchEnd={clearAdminTimer}>
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