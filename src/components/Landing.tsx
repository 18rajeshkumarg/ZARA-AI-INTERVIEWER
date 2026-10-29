import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`
const companyUrl = 'https://18rajeshkumarg.github.io/indicasoftware/'
const api = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8787/api' : 'https://zara-ai-interviewer-api.onrender.com/api')).replace(/\/$/, '')
const roles = [
  'Full Stack Developer + Integrations', 'Admin/Audit Manager', 'AI Automations', 'AI Developer',
  'Android/IOS Developer', 'Voice/Non-Voice Process', 'Sales & Marketing', 'HR',
  'Recruiter & Consulting Team', 'Onboarding Process Team', 'Customer Support Representative',
]
const slug = (role: string) => role.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const titleFor = (id: string | undefined) => roles.find((role) => slug(role) === id)
const faqs = [
  ['Which roles are open?', 'Applications are open for the 11 roles listed above. Each role has a separate application page.'],
  ['How do I apply?', 'Create an account with your email and password, verify your email with a one-time code, then complete the role-specific form and upload a face photo. Email verification is required before your application is accepted.'],
  ['What happens to my application files?', 'The application API writes a numbered candidate text file and photo into its server data directory and records application activity in the database. These are on the backend host, not the GitHub Pages visitor’s local project folder.'],
  ['How is my email verified?', 'A one-time code is sent to your email and expires after 10 minutes. The backend must be configured with SMTP before account registration can be used.'],
  ['When can I access Hired Employees?', 'The Hired Employees link appears in your application screen only after an administrator approves your application. The backend administrator reviews candidates through the protected API.'],
  ['Are virtual interview links ready?', 'This site does not create Zoom meetings. The hiring team must configure the meeting and share its link separately.'],
]
type Profile = { name: string; phone: string; experience: string; location: string; about: string }
const blankProfile: Profile = { name: '', phone: '', experience: '', location: '', about: '' }
type AppItem = { id: string; role: string; status: string; createdAt: string; round1Completed: boolean; round2Completed: boolean; bossRoundInvited: boolean }

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper text-ink">
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <a href={companyUrl} className="flex items-center gap-3" aria-label="Visit Indica Software"><img src={brandLogo} alt="Indica Software" className="brand-logo-small brand-logo"/><span className="text-2xl font-black text-zara">ZARA</span><span className="font-mono2 text-[11px] uppercase tracking-[.2em]">AI Interview</span></a>
      <Link to="/" className="font-mono2 text-xs uppercase tracking-widest hover:text-zara">All roles</Link>
    </div></header>
    {children}
    <footer className="bg-ink px-5 py-8 text-center text-sm text-white/60"><a href={companyUrl} className="text-white hover:text-zara">Indica Software</a> · Careers and interview information</footer>
  </div>
}

function Home() {
  return <Shell><main>
    <section className="bg-grid-light border-b border-ink/10"><div className="mx-auto max-w-5xl px-5 py-20 text-center"><p className="font-mono2 text-xs uppercase tracking-[.3em] text-zara">Careers · Indica Software</p><h1 className="mt-5 text-5xl font-black leading-none sm:text-7xl">YOUR NEXT ROLE<br/><span className="text-zara">STARTS HERE.</span></h1><p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">Explore open positions and apply through a dedicated page for each role.</p><button type="button" onClick={()=>document.getElementById('roles')?.scrollIntoView({behavior:'smooth'})} className="mt-8 inline-flex items-center gap-2 bg-zara px-6 py-3 font-mono2 text-xs uppercase tracking-widest text-white hover:bg-ink">Apply for a job <ArrowRight className="h-4 w-4"/></button><div className="mx-auto mt-12 grid max-w-2xl gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2"><div className="bg-paper p-4"><b>Virtual Round 1</b><p className="text-sm text-ink/60">11:30 AM–11:55 AM IST</p></div><div className="bg-paper p-4"><b>Virtual Round 2</b><p className="text-sm text-ink/60">12:40 PM–1:10 PM IST</p></div></div></div></section>
    <section id="roles" className="bg-grid-light border-b border-ink/10"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black sm:text-4xl">PICK A ROLE</h2><p className="mt-2 text-ink/60">Each position opens its own application page.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{roles.map((role) => <Link key={role} to={`/apply/${slug(role)}`} className="flex items-center justify-between border border-ink/15 bg-paper p-5 font-bold transition-colors hover:border-zara"><span>{role}</span><ArrowRight className="h-4 w-4 shrink-0 text-zara"/></Link>)}</div></div></section>
    <section><div className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">FREQUENTLY ASKED QUESTIONS</h2><div className="mt-7 space-y-3">{faqs.map(([q,a])=><details key={q} className="border border-ink/15 bg-paper p-4"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 text-sm leading-relaxed text-ink/70">{a}</p></details>)}</div></div></section>
  </main></Shell>
}

function RoleApplication() {
  const { roleId } = useParams()
  const role = titleFor(roleId)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'signin'|'register'|'verify'|'apply'>('signin')
  const [token, setToken] = useState(() => localStorage.getItem('zara_candidate_token') || '')
  const [profile, setProfile] = useState(blankProfile)
  const [photo, setPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [applications, setApplications] = useState<AppItem[]>([])

  useEffect(() => { if (!role) navigate('/', { replace: true }) }, [role, navigate])
  useEffect(() => {
    if (!token) return
    let active = true
    const refresh = async () => {
      try {
        const response = await fetch(`${api}/applications/mine`, { headers: { Authorization: `Bearer ${token}` } })
        if (response.status === 401) { localStorage.removeItem('zara_candidate_token'); if(active) setToken(''); return }
        if (!response.ok) return
        const data = await response.json()
        if (active) { setApplications(data.applications); setMode('apply') }
      } catch { /* Keep the active session and retry on the next refresh. */ }
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [token])
  if (!role) return null
  const update = (key: keyof Profile, value: string) => setProfile((prev) => ({ ...prev, [key]: value }))
  const request = async (path: string, body: unknown) => {
    const response = await fetch(`${api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Request could not be completed.')
    return data
  }
  const sendAuth = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (mode === 'register') { await request('/auth/register', { email, password }); setMode('verify'); setMessage('A verification code was sent to your email.') }
      else if (mode === 'verify') { const data = await request('/auth/verify-email', { email, code }); localStorage.setItem('zara_candidate_token', data.token); setToken(data.token); setMode('apply') }
      else { const data = await request('/auth/login', { email, password }); localStorage.setItem('zara_candidate_token', data.token); setToken(data.token); setMode('apply') }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Request failed.') }
    finally { setBusy(false) }
  }
  const resendCode = async () => {
    setBusy(true); setMessage('')
    try { const data = await request('/auth/resend-code', { email }); setMessage(data.message) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not resend code.') }
    finally { setBusy(false) }
  }
  const submitApplication = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const form = new FormData()
      Object.entries(profile).forEach(([key,value]) => form.append(key, value))
      form.append('role', role)
      if (photo) form.append('photo', photo)
      const response = await fetch(`${api}/applications`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Application could not be submitted.')
      const list = await fetch(`${api}/applications/mine`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
      setApplications(list.applications); setProfile(blankProfile); setPhoto(null); setMessage(`Application ${data.id} submitted successfully.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Application failed.') }
    finally { setBusy(false) }
  }
  const signOut = () => { localStorage.removeItem('zara_candidate_token'); setToken(''); setApplications([]); setMode('signin') }
  const selectedApproved = applications.some((item) => item.role === role && item.status === 'approved')

  return <Shell><main className="mx-auto max-w-3xl px-5 py-12"><Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-zara"><ArrowLeft className="h-4 w-4"/>All roles</Link>
    <section className="mt-5 border border-ink/15 bg-white p-6 sm:p-9"><p className="font-mono2 text-xs uppercase tracking-[.2em] text-zara">Role application</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{role}</h1>
      {!token && mode !== 'verify' && <><p className="mt-3 text-sm text-ink/65">Sign in or create a verified account to apply. Email and password are used to authenticate your account.</p><div className="mt-6 flex gap-2"><button onClick={()=>{setMode('signin');setMessage('')}} className={`border px-4 py-2 text-sm ${mode==='signin'?'border-zara':'border-ink/20'}`}>Sign in</button><button onClick={()=>{setMode('register');setMessage('')}} className={`border px-4 py-2 text-sm ${mode==='register'?'border-zara':'border-ink/20'}`}>Create account</button></div></>}
      {!token && <form onSubmit={sendAuth} className="mt-5 grid gap-4">{mode==='verify' && <p className="text-sm text-ink/70">Enter the one-time code sent to <b>{email}</b>.</p>}
        {mode!=='verify' && <label className="text-sm font-semibold">Email address<input type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>}
        {mode!=='verify' && <label className="text-sm font-semibold">Password<input type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?10:1} required value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/>{mode==='register'&&<small className="font-normal text-ink/55">At least 10 characters.</small>}</label>}
        {mode==='verify' && <label className="text-sm font-semibold">Email verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e)=>setCode(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>}
        <div className="flex flex-wrap items-center gap-4"><button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50">{busy?'Please wait…':mode==='verify'?'Verify email':mode==='register'?'Create account':'Sign in'}</button>{mode==='verify'&&<button type="button" disabled={busy} onClick={resendCode} className="text-sm underline">Resend code</button>}</div>
      </form>}
      {token && <><div className="mt-4 flex items-center justify-between"><p className="text-sm text-emerald-700">Signed in as {email || 'candidate'}</p><button onClick={signOut} className="text-sm underline">Sign out</button></div>
        {applications.length>0 && <div className="mt-5 border border-ink/15 p-4"><h2 className="font-bold">Your applications</h2><div className="mt-3 space-y-4">{applications.map((item)=><div key={item.id} className="border-t border-ink/10 pt-3 text-sm"><p className="font-semibold">{item.id} · {item.role} · <span className="capitalize">{item.status}</span></p><p className="mt-1 text-ink/60">Round 1: {item.round1Completed?'Complete':'Pending'} · Round 2: {item.round2Completed?'Complete':'Pending'}</p>{item.round1Completed&&item.round2Completed&&<div className="mt-3 border border-zara/25 bg-red-50/40 p-3"><b>Boss Round Interview</b><p className="mt-1 text-ink/65">In person at the boss location. The hiring team will share the meeting details.</p>{item.bossRoundInvited&&<a target="_blank" rel="noreferrer" href={`https://wa.me/917975044149?text=${encodeURIComponent(`Hi, I am ${email}. I have completed both virtual rounds and received the Boss Round invitation for ${item.role}. Please share the in-person location and timing.`)}`} className="mt-2 inline-block font-semibold text-zara underline">Contact the hiring team on WhatsApp</a>}</div>}{item.status==='approved'&&<a href="https://roles-backend.onrender.com" target="_blank" rel="noreferrer" className="mt-3 inline-block bg-emerald-700 px-4 py-2 font-bold text-white">HIRED EMPLOYEE</a>}</div>)}</div></div>}
        {!selectedApproved && <form onSubmit={submitApplication} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Full name<input required maxLength={120} value={profile.name} onChange={(e)=>update('name',e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>
          <label className="text-sm font-semibold">Email address<input readOnly value={email} className="mt-1 block w-full border border-ink/20 bg-gray-100 px-3 py-2 font-normal"/></label>
          <label className="text-sm font-semibold">Phone number<input type="tel" autoComplete="tel" required value={profile.phone} onChange={(e)=>update('phone',e.target.value)} placeholder="+91 98765 43210" className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>
          <label className="text-sm font-semibold">Work experience<input required value={profile.experience} onChange={(e)=>update('experience',e.target.value)} placeholder="e.g. 3 years" className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>
          <label className="text-sm font-semibold">Location<input required value={profile.location} onChange={(e)=>update('location',e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>
          <label className="text-sm font-semibold">Face photo<input type="file" required accept="image/jpeg,image/png,image/webp" onChange={(e)=>setPhoto(e.target.files?.[0]||null)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/><small className="font-normal text-ink/55">JPEG, PNG, or WebP · up to 5 MB</small></label>
          <label className="text-sm font-semibold sm:col-span-2">About yourself<textarea required rows={5} maxLength={4000} value={profile.about} onChange={(e)=>update('about',e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>
          <p className="text-xs leading-relaxed text-ink/55 sm:col-span-2">The photo is collected as an application attachment. This service does not perform facial recognition or identity matching. Application records and activity are stored on the configured backend server.</p>
          <button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50">{busy?'Submitting…':'Submit application'}</button>
        </form>}</>}
      {message&&<p role="status" className="mt-5 border border-ink/15 bg-gray-50 p-3 text-sm">{message}</p>}
      <div className="mt-6 grid gap-3 border-t border-ink/10 pt-5 text-sm text-ink/65 sm:grid-cols-2"><div><CalendarDays className="mb-2 h-5 w-5 text-zara"/><b>Virtual Round 1</b><p>11:30 AM–11:55 AM IST</p></div><div><CalendarDays className="mb-2 h-5 w-5 text-zara"/><b>Virtual Round 2</b><p>12:40 PM–1:10 PM IST</p></div></div>
    </section>
  </main></Shell>
}

export default function Landing() {
  const { roleId } = useParams()
  return roleId ? <RoleApplication/> : <Home/>
}
