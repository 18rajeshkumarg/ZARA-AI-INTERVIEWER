import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const api = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8787/api' : `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`)).replace(/\/$/, '')
type Row = { id: string; role: string; name: string; email: string; phone: string; experience: string; location: string; about: string; status: string; round1_completed: boolean; round2_completed: boolean; boss_round_invited: boolean; boss_round_completed: boolean; created_at: string; photoUrl: string }

export default function AdminDashboard() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem('zara_admin_token') || '')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  const load = async (auth: string) => {
    const response = await fetch(`${api}/admin/applications`, { headers: { Authorization: `Bearer ${auth}` } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Could not load applications.')
    setRows(data.applications)
    const urls: Record<string, string> = {}
    await Promise.all(data.applications.map(async (item: Row) => {
      const image = await fetch(`${api}${item.photoUrl}`, { headers: { Authorization: `Bearer ${auth}` } })
      if (image.ok) urls[item.id] = URL.createObjectURL(await image.blob())
    }))
    setPhotoUrls((old) => { Object.values(old).forEach(URL.revokeObjectURL); return urls })
  }
  useEffect(() => {
    if (!token) return
    const timer = window.setTimeout(() => { void load(token).catch((e) => { setError(e.message); setToken(''); sessionStorage.removeItem('zara_admin_token') }) }, 0)
    return () => window.clearTimeout(timer)
  }, [token])
  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`${api}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email,password }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Sign-in failed.')
      sessionStorage.setItem('zara_admin_token', data.token); setToken(data.token)
    } catch (e) { setError(e instanceof TypeError ? 'We could not connect to account services. Please try again.' : e instanceof Error ? e.message : 'Sign-in failed.') }
    finally { setBusy(false) }
  }
  const action = async (item: Row, status: string) => {
    setBusy(true); setError('')
    try {
      const response = await fetch(`${api}/admin/applications/${item.id}/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Review update failed.')
      await load(token)
    } catch (e) { setError(e instanceof TypeError ? 'We could not connect to account services. Please try again.' : e instanceof Error ? e.message : 'Review update failed.') }
    finally { setBusy(false) }
  }
  const logout = () => { Object.values(photoUrls).forEach(URL.revokeObjectURL); setPhotoUrls({}); sessionStorage.removeItem('zara_admin_token'); setToken(''); setRows([]) }

  return <div className="min-h-screen bg-paper text-ink"><header className="border-b border-ink/10 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><b className="text-xl">ZARA · Hiring review</b><Link to="/" className="text-sm underline">Candidate site</Link></div></header><main className="mx-auto max-w-6xl px-5 py-10"><h1 className="text-3xl font-black">Application review</h1>
    {!token && <form onSubmit={login} className="mt-6 grid max-w-lg gap-4 border border-ink/15 bg-white p-6"><label className="text-sm font-semibold">Administrator email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label><label className="text-sm font-semibold">Administrator password<input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label><button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase text-white">Sign in</button></form>}
    {token && <div className="mt-4 flex items-center justify-between"><p className="text-sm text-ink/60">Applicant details are visible to authenticated administrators.</p><button onClick={logout} className="text-sm underline">Sign out</button></div>}
    {error&&<p role="alert" className="mt-4 border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
    {token&&<div className="mt-6 space-y-4">{rows.map((item)=><article key={item.id} className="grid gap-5 border border-ink/15 bg-white p-5 md:grid-cols-[180px_1fr]"><div>{photoUrls[item.id]?<img src={photoUrls[item.id]} alt={`Face photo for ${item.name}`} className="aspect-square w-full object-cover"/>:<div className="flex aspect-square items-center justify-center bg-gray-100 text-sm text-ink/50">Loading photo…</div>}</div><div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono2 text-xs text-zara">{item.id} · {item.status.toUpperCase()}</p><h2 className="mt-1 text-xl font-black">{item.name}</h2><p className="text-sm text-ink/65">{item.role}</p></div><p className="text-xs text-ink/50">{new Date(item.created_at).toLocaleString()}</p></div><p className="mt-3 text-sm">{item.email} · {item.phone}</p><p className="mt-1 text-sm">{item.experience} · {item.location}</p><p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{item.about}</p><div className="mt-4 flex flex-wrap gap-2">{!item.round1_completed&&<button disabled={busy} onClick={()=>action(item,'round1_completed')} className="border border-ink/20 px-3 py-2 text-xs">Mark Round 1 complete</button>}{item.round1_completed&&!item.round2_completed&&<button disabled={busy} onClick={()=>action(item,'round2_completed')} className="border border-ink/20 px-3 py-2 text-xs">Mark Round 2 complete</button>}{item.round1_completed&&item.round2_completed&&!item.boss_round_invited&&<button disabled={busy} onClick={()=>action(item,'boss_round_invited')} className="bg-ink px-3 py-2 text-xs text-white">Invite to Boss Round</button>}{item.boss_round_invited&&!item.boss_round_completed&&<button disabled={busy} onClick={()=>action(item,'boss_round_completed')} className="border border-ink/25 px-3 py-2 text-xs">Mark Boss Round complete</button>}{item.boss_round_completed&&item.status!=='approved'&&<button disabled={busy} onClick={()=>action(item,'approved')} className="bg-emerald-700 px-3 py-2 text-xs text-white">Approve · enable Hired Employees</button>}{item.status!=='rejected'&&item.status!=='approved'&&<button disabled={busy} onClick={()=>action(item,'rejected')} className="border border-red-300 px-3 py-2 text-xs text-red-700">Reject</button>}</div></div></article>)}</div>}
  </main></div>
}
