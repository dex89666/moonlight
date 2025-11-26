import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function AdminPage(){
  const [users, setUsers] = useState<any[]>([])
  const [err, setErr] = useState('')

  async function refresh(){
    try{
      const r = await api.get<any>('/api/admin/users')
      setUsers(r.users || [])
    }catch(e:any){ setErr(e.message||String(e)) }
  }

  useEffect(()=>{ refresh() },[])

  return (
    <div>
      <h2>Admin — подписчики</h2>
      {err && <p style={{color:'red'}}>{err}</p>}
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th>UserId</th><th>Name</th><th>Subscribed Until</th><th>Actions</th></tr></thead>
        <tbody>
        {users.map(u=> (
          <tr key={u.id} style={{borderTop:'1px solid #ddd'}}>
            <td>{u.id}</td>
            <td>{u.profile?.username || u.profile?.first_name || '-'}</td>
            <td>{u.subscription?.expiry ? new Date(u.subscription.expiry).toLocaleString() : '-'}</td>
            <td>
              <button onClick={async()=>{ await api.post('/api/payments',{ userId: u.id, action:'grant' }); refresh() }}>Grant 30d</button>
              <button onClick={async()=>{ await api.post('/api/payments',{ userId: u.id, action:'clear' }); refresh() }}>Clear</button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  )
}
