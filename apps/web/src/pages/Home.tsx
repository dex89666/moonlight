import { Button, Section } from '../components/UI';
import { useState, useRef, useEffect } from 'react'
import AdminPage from './admin'
import { api } from '../api/client'
import { Link } from 'react-router-dom';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('currentUser')||'null') } catch { return null } })
  const timerRef = useRef<number | null>(null)

    function attemptAdminLogin() {
      const login = window.prompt('Admin login') || ''
      const pass = window.prompt('Admin password') || ''
      // Логин: mavkoj (6 букв), пароль: 372915 (6 цифр)
      if (login === 'mavkoj' && pass === '372915') {
        // Сохраняем креденшиалы для API запросов
        try {
          localStorage.setItem('admin:basic', btoa(`${login}:${pass}`))
        } catch {}
        setShowAdmin(true)
      } else {
        alert('Неверные учетные данные')
      }
    }

  // Долгое нажатие 5 секунд на "Илона" для открытия админки
  function startAdminTimer(){
    if (timerRef.current) return
    timerRef.current = window.setTimeout(()=>{
      attemptAdminLogin()
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
  // send plain JSON-friendly payload: initData string + explicit user object (extracted from initDataUnsafe)
  const unsafe = tg.initDataUnsafe || {}
  const u = unsafe?.user || null
  const payload: any = {
    initData: tg.initData || null,
    user: u ? {
      id: u.id,
      username: u.username,
      first_name: u.first_name || u.firstName || null,
      last_name: u.last_name || u.lastName || null,
      auth_date: unsafe?.auth_date || u?.auth_date || null
    } : null
  }
    try {
      const res = await api.post<any>('/api/telegram-auth', payload)
      if (res && (res as any).ok) {
        try { localStorage.setItem('currentUser', JSON.stringify(res.user || null)) } catch {}
        setCurrentUser(res.user || null)
        alert('Вход выполнен')
      } else alert('Ошибка входа: ' + JSON.stringify(res))
    } catch (e:any){ alert('Ошибка входа: '+(e.message||e)) }
  }
  return (
    <>
    <Section>
      <h1>Добро пожаловать</h1>
      <p style={{ marginBottom: '16px', color: '#888', fontSize: '14px' }}>
        Астрологический помощник от{' '}
        <span 
          onMouseDown={startAdminTimer} 
          onMouseUp={clearAdminTimer} 
          onMouseLeave={clearAdminTimer} 
          onTouchStart={startAdminTimer} 
          onTouchEnd={clearAdminTimer}
          style={{ cursor: 'text', userSelect: 'none' }}
        >
          Илона
        </span>
      </p>
      <div style={{display:'flex',gap:10,marginBottom:12}}>
        {!currentUser ? (
          <Button onClick={handleTelegramLogin}>Войти через Telegram</Button>
        ) : (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div>Вход как <strong>{currentUser.username || currentUser.id}</strong></div>
            <Button onClick={()=>{ try { localStorage.removeItem('currentUser') } catch{}; setCurrentUser(null) }}>Выйти</Button>
          </div>
        )}
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
  {showAdmin && <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.9)',zIndex:1000,overflow:'auto'}}>
      <AdminPage/>
      <button 
        onClick={()=>setShowAdmin(false)} 
        style={{
          position:'fixed',
          top:20,
          right:20,
          padding:'10px 20px',
          borderRadius:'8px',
          border:'none',
          background:'rgba(255,255,255,0.2)',
          color:'#fff',
          cursor:'pointer',
          zIndex:1001
        }}
      >
        ✕ Закрыть
      </button>
    </div>}
  </>
  );
}