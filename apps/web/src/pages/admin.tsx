import { useEffect, useState } from 'react'

interface User {
  odid: string
  odname?: string
  username?: string
  isPro: boolean
  proExpiresAt?: string
  messagesUsedToday?: number
  lastActive?: string
  createdAt?: string
}

interface Payment {
  odid: string
  amount?: number
  stars?: number
  status: string
  createdAt: string
}

interface Stats {
  totalUsers: number
  proUsers: number
  totalPayments: number
  totalRevenue: number
}

// Получение сохранённых креденшиалов или запрос у пользователя
function getAdminAuth(): string | null {
  try {
    const saved = localStorage.getItem('admin:basic')
    if (saved) return saved
  } catch {}
  return null
}

function setAdminAuth(login: string, password: string) {
  const token = btoa(`${login}:${password}`)
  try { localStorage.setItem('admin:basic', token) } catch {}
  return token
}

async function adminFetch(action: string, params: Record<string, any> = {}): Promise<any> {
  const auth = getAdminAuth()
  if (!auth) throw new Error('Not authenticated')
  
  const queryParams = new URLSearchParams({ action, ...params }).toString()
  const response = await fetch(`/api/admin/analytics?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (response.status === 401) {
    localStorage.removeItem('admin:basic')
    throw new Error('Unauthorized')
  }
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Error: ${response.status}`)
  }
  
  return response.json()
}

async function adminPost(action: string, body: Record<string, any> = {}): Promise<any> {
  const auth = getAdminAuth()
  if (!auth) throw new Error('Not authenticated')
  
  const response = await fetch('/api/admin/analytics', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...body })
  })
  
  if (response.status === 401) {
    localStorage.removeItem('admin:basic')
    throw new Error('Unauthorized')
  }
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Error: ${response.status}`)
  }
  
  return response.json()
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminAuth())
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  const [tab, setTab] = useState<'stats' | 'users' | 'payments'>('stats')
  const [stats, setStats] = useState<Stats | null>(null)
  const [proUsers, setProUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const token = setAdminAuth(login, password)
    
    try {
      await adminFetch('stats')
      setIsAuthenticated(true)
    } catch (err: any) {
      setAuthError('Неверный логин или пароль')
      localStorage.removeItem('admin:basic')
      setIsAuthenticated(false)
    }
  }

  // Load data based on tab
  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      if (tab === 'stats') {
        const result = await adminFetch('stats')
        setStats(result.data.stats)
        setProUsers(result.data.proUsers || [])
      } else if (tab === 'users') {
        const result = await adminFetch('users', { limit: '200' })
        setAllUsers(result.data.users || [])
      } else if (tab === 'payments') {
        const result = await adminFetch('payments', { limit: '100' })
        setPayments(result.data.payments || [])
      }
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        setIsAuthenticated(false)
      } else {
        setError(err.message || 'Ошибка загрузки данных')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, tab])

  // Grant PRO
  const handleGrantPro = async (telegramId: string) => {
    try {
      await adminPost('grant-pro', { telegramId, days: 30 })
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Revoke PRO
  const handleRevokePro = async (telegramId: string) => {
    try {
      await adminPost('revoke-pro', { telegramId })
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('admin:basic')
    setIsAuthenticated(false)
    setLogin('')
    setPassword('')
  }

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('ru-RU')
  }

  // Check if subscription expired
  const isExpired = (dateStr?: string) => {
    if (!dateStr) return true
    return new Date(dateStr) < new Date()
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}>
        <form onSubmit={handleLogin} style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '40px',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          width: '100%',
          maxWidth: '360px'
        }}>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '24px' }}>
            🔐 Вход в админку
          </h2>
          
          {authError && (
            <div style={{ color: '#ff6b6b', marginBottom: '16px', textAlign: 'center' }}>
              {authError}
            </div>
          )}
          
          <input
            type="text"
            placeholder="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '16px'
            }}
          />
          
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '20px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '16px'
            }}
          />
          
          <button type="submit" style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Войти
          </button>
        </form>
      </div>
    )
  }

  // Main admin panel
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '20px',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ margin: 0 }}>📊 Админ-панель</h1>
        <button onClick={handleLogout} style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          cursor: 'pointer'
        }}>
          Выйти
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['stats', 'users', 'payments'] as const).map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: tab === t ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: tab === t ? 'bold' : 'normal'
            }}
          >
            {t === 'stats' && '📈 Статистика'}
            {t === 'users' && '👥 Пользователи'}
            {t === 'payments' && '💳 Платежи'}
          </button>
        ))}
        <button onClick={loadData} style={{
          marginLeft: 'auto',
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          cursor: 'pointer'
        }}>
          🔄 Обновить
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ 
          background: 'rgba(255,100,100,0.2)', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#ff6b6b'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Загрузка...
        </div>
      )}

      {/* Stats Tab */}
      {!loading && tab === 'stats' && stats && (
        <div>
          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalUsers}</div>
              <div style={{ opacity: 0.7 }}>Всего пользователей</div>
            </div>
            <div style={{ background: 'rgba(102,126,234,0.3)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.proUsers}</div>
              <div style={{ opacity: 0.7 }}>PRO подписчиков</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalPayments}</div>
              <div style={{ opacity: 0.7 }}>Всего платежей</div>
            </div>
            <div style={{ background: 'rgba(118,75,162,0.3)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>⭐ {stats.totalRevenue}</div>
              <div style={{ opacity: 0.7 }}>Звёзд заработано</div>
            </div>
          </div>

          {/* PRO Users */}
          <h3>⭐ PRO пользователи</h3>
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '12px', 
            overflow: 'hidden' 
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Username</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Подписка до</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Статус</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {proUsers.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                    Нет PRO пользователей
                  </td></tr>
                )}
                {proUsers.map(u => (
                  <tr key={u.odid} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px' }}>{u.odid}</td>
                    <td style={{ padding: '12px' }}>@{u.username || u.odname || 'Unknown'}</td>
                    <td style={{ padding: '12px' }}>{formatDate(u.proExpiresAt)}</td>
                    <td style={{ padding: '12px' }}>
                      {isExpired(u.proExpiresAt) 
                        ? <span style={{ color: '#ff6b6b' }}>Истекла</span>
                        : <span style={{ color: '#4ecdc4' }}>Активна</span>
                      }
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button 
                        onClick={() => handleRevokePro(u.odid)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(255,100,100,0.3)',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Отозвать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {!loading && tab === 'users' && (
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '12px', 
          overflow: 'auto' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Username</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>PRO</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Сообщений сегодня</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Последняя активность</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                  Нет пользователей
                </td></tr>
              )}
              {allUsers.map(u => (
                <tr key={u.odid} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '12px' }}>{u.odid}</td>
                  <td style={{ padding: '12px' }}>@{u.odname || 'Unknown'}</td>
                  <td style={{ padding: '12px' }}>
                    {u.isPro 
                      ? <span style={{ color: '#ffd700' }}>⭐ PRO</span>
                      : <span style={{ opacity: 0.5 }}>Free</span>
                    }
                  </td>
                  <td style={{ padding: '12px' }}>{u.messagesUsedToday || 0} / 2</td>
                  <td style={{ padding: '12px' }}>{formatDate(u.lastActive)}</td>
                  <td style={{ padding: '12px' }}>
                    {u.isPro ? (
                      <button 
                        onClick={() => handleRevokePro(u.odid)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(255,100,100,0.3)',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Отозвать PRO
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleGrantPro(u.odid)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(100,255,100,0.3)',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Выдать PRO
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments Tab */}
      {!loading && tab === 'payments' && (
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '12px', 
          overflow: 'auto' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>ID пользователя</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Звёзды</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Статус</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                  Нет платежей
                </td></tr>
              )}
              {payments.map((p, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '12px' }}>{p.odid}</td>
                  <td style={{ padding: '12px' }}>⭐ {p.stars || 0}</td>
                  <td style={{ padding: '12px' }}>
                    {p.status === 'completed' 
                      ? <span style={{ color: '#4ecdc4' }}>✓ Оплачен</span>
                      : <span style={{ color: '#ff6b6b' }}>{p.status}</span>
                    }
                  </td>
                  <td style={{ padding: '12px' }}>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
