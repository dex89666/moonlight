import { Button, Section } from '../components/UI';
import { useState, useRef, useEffect } from 'react'
import AdminPage from './admin'
import { api } from '../api/client'
import { Link } from 'react-router-dom';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('currentUser')||'null') } catch { return null } })
  const timerRef = useRef<number | null>(null)
    const [tapCount, setTapCount] = useState(0)

    function attemptAdminLogin() {
      const login = window.prompt('Admin login') || ''
      const pass = window.prompt('Admin password') || ''
      if (login === 'mavkoj' && pass === '372915') {
        setShowAdmin(true)
      } else {
        alert('Неверные учетные данные')
      }
    }

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

    // taps logic: 5 taps within 3s -> prompt login
    useEffect(() => {
      if (tapCount <= 0) return
      const t = window.setTimeout(() => setTapCount(0), 3000)
      return () => clearTimeout(t)
    }, [tapCount])

    function onTap() {
      setTapCount(c => {
        const next = c + 1
        if (next >= 5) {
          setTapCount(0)
          attemptAdminLogin()
          return 0
        }
        return next
      })
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
  <div onClick={onTap} onMouseDown={startAdminTimer} onMouseUp={clearAdminTimer} onMouseLeave={clearAdminTimer} onTouchStart={startAdminTimer} onTouchEnd={clearAdminTimer}>
    <Section>
      <h1>Добро пожаловать</h1>
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