import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function AdminPage(){
  const [users, setUsers] = useState<any[]>([])
  const [err, setErr] = useState('')

  useEffect(()=>{
    let mounted = true
    api.get<any>('/api/admin/users').then(r=>{ if(mounted) setUsers(r.users || []) }).catch(e=> setErr(e.message||String(e)))
    return ()=>{ mounted=false }
  },[])

  return (
    <div>
      <h2>Admin — подписчики</h2>
      {err && <p style={{color:'red'}}>{err}</p>}
      <ul>
        {users.map(u=> <li key={u.id}>{u.id} — {u.expiry}</li>)}
      </ul>
    </div>
  )
}
