import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { restoreCandidateDirectory, saveCandidateApplication } from '../lib/candidateStorage'
import { ROLES, roleFromSlug, roleSlug } from '../../shared/roles.js'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`
const companyUrl = 'https://18rajeshkumarg.github.io/indicasoftware/'
const faqs = [
  ['Which roles are open?', `Applications are open for the ${ROLES.length} roles listed above. Each role has a separate application page.`],
  ['How do I apply?', 'Create an account in this browser, sign in, then complete the role-specific form and upload a face photo.'],
  ['Where is my application saved?', 'The candidate text file and photo are saved in the project folder you choose on this computer. The account itself stays in this browser.'],
  ['Can I use my account on another device?', 'No. Preview accounts are stored only in the browser where they were created.'],
  ['When can I access Hired Employees?', 'Hiring status updates are not connected in this browser-only preview.'],
  ['Are virtual interview links ready?', 'This site does not create Zoom meetings. The hiring team must configure the meeting and share its link separately.'],
]
type Profile = { name: string; phone: string; experience: string; location: string; about: string }
const blankProfile: Profile = { name: '', phone: '', experience: '', location: '', about: '' }
type AppItem = { id: string; role: string; status: string; createdAt: string; round1Completed: boolean; round2Completed: boolean; bossRoundInvited: boolean; name: string; email: string; phone: string; experience: string; location: string; about: string }
type LocalAccount = { salt: string; passwordHash: string }
const accountsKey = 'zara_candidate_accounts'
const accountStorageKey = (email: string) => `zara_candidate_applications:${email.toLowerCase()}`
function readAccounts(): Record<string, LocalAccount> {
  try { return JSON.parse(localStorage.getItem(accountsKey) || '{}') as Record<string, LocalAccount> }
  catch { return {} }
}
function readApplications(email: string): AppItem[] {
  try { return JSON.parse(localStorage.getItem(accountStorageKey(email)) || '[]') as AppItem[] }
  catch { return [] }
}
function toHex(bytes: Uint8Array) { return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') }
async function passwordHash(password: string, saltHex: string) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) || [], (x) => Number.parseInt(x, 16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210000 }, key, 256)
  return toHex(new Uint8Array(bits))
}
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
    <section id="roles" className="bg-grid-light border-b border-ink/10"><div className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-black sm:text-4xl">PICK A ROLE</h2><p className="mt-2 text-ink/60">Each position opens its own application page.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{ROLES.map((role) => <Link key={role} to={`/apply/${roleSlug(role)}`} className="flex items-center justify-between border border-ink/15 bg-paper p-5 font-bold transition-colors hover:border-zara"><span>{role}</span><ArrowRight className="h-4 w-4 shrink-0 text-zara"/></Link>)}</div></div></section>
    <section><div className="mx-auto max-w-4xl px-5 py-16"><h2 className="text-3xl font-black">FREQUENTLY ASKED QUESTIONS</h2><div className="mt-7 space-y-3">{faqs.map(([q,a])=><details key={q} className="border border-ink/15 bg-paper p-4"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 text-sm leading-relaxed text-ink/70">{a}</p></details>)}</div></div></section>
  </main></Shell>
}

function RoleApplication() {
  const { roleId } = useParams()
  const role = roleFromSlug(roleId)
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem('zara_candidate_email') || '')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin'|'register'|'apply'>('signin')
  const [token, setToken] = useState(() => localStorage.getItem('zara_candidate_session') || '')
  const [profile, setProfile] = useState(blankProfile)
  const [photo, setPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [applications, setApplications] = useState<AppItem[]>(() => readApplications(localStorage.getItem('zara_candidate_session') || ''))

  useEffect(() => { if (!role) navigate('/', { replace: true }) }, [role, navigate])
  useEffect(() => { void restoreCandidateDirectory() }, [])
  if (!role) return null
  const update = (key: keyof Profile, value: string) => setProfile((prev) => ({ ...prev, [key]: value }))
  const sendAuth = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!globalThis.crypto?.subtle) throw new Error('Secure account storage is not available in this browser.')
      if (mode === 'register') {
        const accounts = readAccounts()
        if (accounts[normalizedEmail]) { setMode('signin'); setMessage('An account already exists. Please sign in.'); return }
        const saltBytes = crypto.getRandomValues(new Uint8Array(16))
        const salt = toHex(saltBytes)
        accounts[normalizedEmail] = { salt, passwordHash: await passwordHash(password, salt) }
        localStorage.setItem(accountsKey, JSON.stringify(accounts))
        localStorage.setItem('zara_candidate_email', normalizedEmail)
        setEmail(normalizedEmail); setPassword(''); setMode('signin')
        setMessage('Account created. Please sign in to continue.')
      } else {
        const account = readAccounts()[normalizedEmail]
        if (!account) throw new Error('No account found for this email. Choose Create account first.')
        if (await passwordHash(password, account.salt) !== account.passwordHash) throw new Error('Incorrect email or password.')
        localStorage.setItem('zara_candidate_session', normalizedEmail)
        localStorage.setItem('zara_candidate_email', normalizedEmail)
        setEmail(normalizedEmail); setToken(normalizedEmail); setApplications(readApplications(normalizedEmail)); setMode('apply'); setPassword('')
        setMessage('Signed in successfully.')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not complete this action.') }
    finally { setBusy(false) }
  }
  const submitApplication = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (!photo) throw new Error('Choose a face photo to continue.')
      if (photo.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller.')
      const id = await saveCandidateApplication({ ...profile, email, role, photo })
      const item: AppItem = { id, role, ...profile, email, status: 'pending', createdAt: new Date().toISOString(), round1Completed: false, round2Completed: false, bossRoundInvited: false }
      const updated = [item, ...readApplications(email)]
      localStorage.setItem(accountStorageKey(email), JSON.stringify(updated))
      setApplications(updated); setMessage('Application submitted successfully.')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      setMessage(name === 'AbortError' ? 'Select the ZARA AI Interview project folder to save this application.' : error instanceof Error ? error.message : 'Could not save the application to the selected project folder.')
    }
    finally { setBusy(false) }
  }
  const signOut = () => { localStorage.removeItem('zara_candidate_session'); setToken(''); setApplications([]); setMode('signin'); setMessage('You have signed out.') }
  const selectedApproved = applications.some((item) => item.role === role && item.status === 'approved')

  return <Shell><main className="mx-auto max-w-3xl px-5 py-12"><Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-zara"><ArrowLeft className="h-4 w-4"/>All roles</Link>
    <section className="mt-5 border border-ink/15 bg-white p-6 sm:p-9"><p className="font-mono2 text-xs uppercase tracking-[.2em] text-zara">Role application</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{role}</h1>
      {!token && <><p className="mt-3 text-sm text-ink/65">Create an account or sign in to apply. This preview saves your account in this browser on this device.</p><div className="mt-6 flex gap-2"><button type="button" onClick={()=>{setMode('signin');setMessage('')}} className={`border px-4 py-2 text-sm ${mode==='signin'?'border-zara':'border-ink/20'}`}>Sign in</button><button type="button" onClick={()=>{setMode('register');setMessage('')}} className={`border px-4 py-2 text-sm ${mode==='register'?'border-zara':'border-ink/20'}`}>Create account</button></div></>}
      {!token && <form onSubmit={sendAuth} className="mt-5 grid gap-4">
        <label className="text-sm font-semibold">Email address<input type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/></label>
        <label className="text-sm font-semibold">Password<input type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?10:1} required value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"/>{mode==='register'&&<small className="font-normal text-ink/55">At least 10 characters.</small>}</label>
        <button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50">{busy?'Please wait…':mode==='register'?'Create account':'Sign in'}</button>
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
          <p className="text-xs leading-relaxed text-ink/55 sm:col-span-2">On first submission, choose the ZARA AI Interview project folder when your browser asks. The application text is saved in Candidate Applications/Candidates/ and the photo in Candidate Applications/Uploads/. This preview does not verify identity.</p>
          <button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50">{busy?'Submitting…':'Submit application'}</button>
        </form>}</>}
      {message&&<p role="status" className="mt-5 border border-ink/15 bg-gray-50 p-3 text-sm">{message}</p>}
      <div className="mt-6 grid gap-3 border-t border-ink/10 pt-5 text-sm text-ink/65 sm:grid-cols-2"><div><CalendarDays className="mb-2 h-5 w-5 text-zara"/><b>Virtual Round 1</b><p>11:30 AM–11:55 AM IST</p></div><div><CalendarDays className="mb-2 h-5 w-5 text-zara"/><b>Virtual Round 2</b><p>12:40 PM–1:10 PM IST</p></div></div>
    </section>
  </main></Shell>
}

export default function Landing() {
  const { roleId } = useParams()
  const location = useLocation()
  useEffect(() => {
    if (location.pathname !== '/roles') return
    const timer = window.setTimeout(() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' }), 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname])
  return roleId ? <RoleApplication/> : <Home/>
}
