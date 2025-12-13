import { Button, Section } from '../components/UI';
import { useState } from 'react'
import { api } from '../api/client'
import { Link } from 'react-router-dom';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('currentUser')||'null') } catch { return null } })

  async function handleTelegramLogin() {
    const tg = (window as any).Telegram?.WebApp
    if (!tg) return alert('Telegram WebApp not available')
    
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
    <Section>
      <h1>Добро пожаловать</h1>
      <p style={{ marginBottom: '16px', color: '#888', fontSize: '14px' }}>
        Астрологический помощник от Илона
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
  );
}