import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { roleDetails, roleFromSlug } from '../../shared/roles.js'
import {
  createAccount,
  currentSessionEmail,
  normalizeEmail,
  readRememberedEmail,
  signIn,
  signOut,
  validEmail,
} from '../lib/auth'
import {
  buildApplication,
  formatInterviewDate,
  nextCandidateId,
  readAllApplications,
  readApplications,
  upsertApplication,
  type Application,
} from '../lib/applications'
import {
  folderCandidateMax,
  photoFilename,
  restoreCandidateDirectory,
  saveCandidateApplication,
} from '../lib/candidateStorage'
import CandidateDashboard from './CandidateDashboard'
import Shell from './Shell'

type Profile = { name: string; phone: string; experience: string; location: string; about: string }
const blankProfile: Profile = { name: '', phone: '', experience: '', location: '', about: '' }

export default function RoleApplication() {
  const { roleId } = useParams()
  const role = roleFromSlug(roleId)
  const navigate = useNavigate()
  const details = role ? roleDetails(role) : null

  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState(() => currentSessionEmail() || readRememberedEmail())
  const [password, setPassword] = useState('')
  const [sessionEmail, setSessionEmail] = useState(() => currentSessionEmail())
  const [applications, setApplications] = useState<Application[]>(() => readApplications(currentSessionEmail()))
  const [profile, setProfile] = useState<Profile>(blankProfile)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!role) navigate('/', { replace: true })
  }, [role, navigate])

  useEffect(() => {
    void restoreCandidateDirectory()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [roleId])

  useEffect(() => {
    if (!sessionEmail) return
    const refresh = () => setApplications(readApplications(sessionEmail))
    window.addEventListener('zara:applications-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('zara:applications-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [sessionEmail])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  if (!role || !details) return null

  const selectedApplication = applications.find((item) => item.role === role) || null

  const updateProfile = (key: keyof Profile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const sendAuth = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const normalized = normalizeEmail(email)
      if (!validEmail(normalized)) {
        setError('Enter a valid email address.')
        return
      }
      if (mode === 'register') {
        const result = await createAccount(normalized, password)
        if (!result.ok) {
          if (result.error.toLowerCase().includes('already exists')) {
            setMode('signin')
            setMessage(result.error)
          } else {
            setError(result.error)
          }
          return
        }
        setEmail(normalized)
        setPassword('')
        setMode('signin')
        setMessage('Account created. Please sign in to continue.')
        return
      }

      const result = await signIn(normalized, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const nextApplications = readApplications(normalized)
      setSessionEmail(normalized)
      setApplications(nextApplications)
      setPassword('')
      setMessage('Signed in successfully.')
    } finally {
      setBusy(false)
    }
  }

  const handlePhoto = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : '')
  }

  const submitApplication = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!sessionEmail) throw new Error('Sign in to apply for this role.')
      if (!photo) throw new Error('Upload a face photo to continue.')
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
        throw new Error('Upload a JPEG, PNG or WebP face photo.')
      }
      if (photo.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller.')
      if (!profile.name.trim() || !profile.phone.trim() || !profile.experience.trim() || !profile.location.trim() || !profile.about.trim()) {
        throw new Error('Complete every field before submitting.')
      }
      if (!/^\+?[0-9 ()-]{7,20}$/.test(profile.phone.trim())) {
        throw new Error('Enter a valid phone number.')
      }

      const existingIds = readAllApplications().map((item) => item.id)
      const folderMax = await folderCandidateMax()
      const id = nextCandidateId(existingIds, folderMax)
      const photoName = photoFilename(id, photo.type)
      const application = buildApplication({
        id,
        role,
        name: profile.name.trim(),
        email: sessionEmail,
        phone: profile.phone.trim(),
        experience: profile.experience.trim(),
        location: profile.location.trim(),
        about: profile.about.trim(),
        photoName,
        photoType: photo.type,
      })

      await saveCandidateApplication({ application, photo })
      upsertApplication(application)
      setApplications(readApplications(sessionEmail))
      setMessage(
        `Application submitted. Your interviews are scheduled for ${formatInterviewDate(application.interviewDate)}: Virtual Round 1 at 11:30 AM and Virtual Round 2 at 12:40 PM IST.`,
      )
      setProfile(blankProfile)
      handlePhoto(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit the application.')
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = () => {
    signOut()
    setSessionEmail('')
    setApplications([])
    setMode('signin')
    setPassword('')
    setMessage('You have signed out.')
    setError('')
  }

  if (sessionEmail && selectedApplication) {
    return (
      <Shell>
        <CandidateDashboard
          application={selectedApplication}
          onUpdate={() => {
            setApplications(readApplications(sessionEmail))
          }}
          onSignOut={handleSignOut}
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-zara">
          <ArrowLeft className="h-4 w-4" /> All roles
        </Link>

        <section className="mt-5 border border-ink/15 bg-white p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-zara">{details.department} · Role application</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{role}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/60">{details.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {details.tags.map((tag: string) => (
                  <span key={tag} className="border border-ink/10 bg-paper px-2 py-1 font-mono2 text-[9px] uppercase tracking-[0.12em] text-ink/55">{tag}</span>
                ))}
              </div>
            </div>
            <BriefcaseBusiness className="h-8 w-8 text-zara" />
          </div>

          <div className="mt-6 grid gap-3 border-t border-ink/10 pt-5 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-zara" />
              <span>Next day · Round 1<br /><b>11:30–11:55 AM IST</b></span>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-zara" />
              <span>Next day · Round 2<br /><b>12:40–1:10 PM IST</b></span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zara" />
              <span>Final round<br /><b>Boss Round in person</b></span>
            </div>
          </div>

          {!sessionEmail && (
            <>
              <div className="mt-7 border border-ink/10 bg-paper p-4">
                <p className="text-sm font-semibold">Sign in or create an account to apply.</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/55">
                  Email and password are used to authenticate your account. Accounts are stored securely in this
                  browser — no external API is used.
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setMessage(''); setError('') }}
                  className={`border px-4 py-2 text-sm ${mode === 'signin' ? 'border-zara bg-zara text-white' : 'border-ink/20 hover:border-zara'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setMessage(''); setError('') }}
                  className={`border px-4 py-2 text-sm ${mode === 'register' ? 'border-zara bg-zara text-white' : 'border-ink/20 hover:border-zara'}`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={sendAuth} className="mt-5 grid gap-4">
                <label className="text-sm font-semibold">
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Password
                  <input
                    type="password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    minLength={mode === 'register' ? 10 : 1}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"
                  />
                  {mode === 'register' && <small className="font-normal text-ink/55">At least 10 characters.</small>}
                </label>
                <button
                  disabled={busy}
                  className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
                </button>
              </form>
            </>
          )}

          {sessionEmail && (
            <>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-5">
                <p className="inline-flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Signed in as {sessionEmail}
                </p>
                <button type="button" onClick={handleSignOut} className="text-sm text-ink/60 underline hover:text-zara">
                  Sign out
                </button>
              </div>

              <form onSubmit={submitApplication} className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Full name *
                  <input required maxLength={120} value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-semibold">
                  Email address *
                  <input readOnly value={sessionEmail} className="mt-1 block w-full border border-ink/20 bg-gray-100 px-3 py-2 font-normal" />
                  <small className="font-normal text-ink/55">Your account email.</small>
                </label>
                <label className="text-sm font-semibold">
                  Phone number *
                  <input type="tel" autoComplete="tel" required value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} placeholder="+91 98765 43210" className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-semibold">
                  Work experience *
                  <input required value={profile.experience} onChange={(event) => updateProfile('experience', event.target.value)} placeholder="e.g. 3 years" className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-semibold">
                  Location *
                  <input required value={profile.location} onChange={(event) => updateProfile('location', event.target.value)} placeholder="City, State" className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-semibold">
                  Face photo *
                  <input type="file" required accept="image/jpeg,image/png,image/webp" onChange={(event) => handlePhoto(event.target.files?.[0] || null)} className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal" />
                  <small className="font-normal text-ink/55">JPEG, PNG or WebP · up to 5 MB</small>
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  About yourself *
                  <textarea required rows={5} maxLength={4000} value={profile.about} onChange={(event) => updateProfile('about', event.target.value)} placeholder="Tell us about your experience, skills and why this role fits you." className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal" />
                </label>

                {photoPreview && (
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Photo preview</p>
                    <img src={photoPreview} alt="Selected face photo preview" className="h-28 w-28 border border-ink/10 object-cover" />
                  </div>
                )}

                <div className="sm:col-span-2 flex items-start gap-2 border border-ink/10 bg-paper p-3 text-xs leading-relaxed text-ink/55">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zara" />
                  <p>
                    On submit, your details and both interview Zoom links are written automatically to{' '}
                    <span className="font-mono2">Candidate Applications/Candidates/</span> and your photo to{' '}
                    <span className="font-mono2">Candidate Applications/Uploads/</span> when the project folder is
                    connected. There is no download button.
                  </p>
                </div>

                <button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50">
                  {busy ? 'Submitting…' : 'Submit Application'}
                </button>
              </form>
            </>
          )}

          {message && <p role="status" className="mt-5 border border-ink/15 bg-gray-50 p-3 text-sm">{message}</p>}
          {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          <div className="mt-7 grid gap-3 border-t border-ink/10 pt-5 text-sm text-ink/65 sm:grid-cols-2">
            <div>
              <ShieldCheck className="mb-2 h-5 w-5 text-zara" />
              <b>YOLO face verification</b>
              <p className="text-sm text-ink/55">Required before both Zoom rounds. Exactly one candidate must be visible.</p>
            </div>
            <div>
              <UserRound className="mb-2 h-5 w-5 text-zara" />
              <b>Account authentication</b>
              <p className="text-sm text-ink/55">Your password is stored only as a salted PBKDF2 hash in this browser.</p>
            </div>
          </div>
        </section>

        {applications.length > 0 && (
          <section className="mt-6 border border-ink/15 bg-white p-5">
            <h2 className="text-lg font-black">Your applications</h2>
            <div className="mt-3 space-y-3">
              {applications.map((item) => (
                <Link key={item.id} to={`/apply/${item.role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="flex flex-wrap items-center justify-between gap-2 border border-ink/10 bg-paper p-3 text-sm hover:border-zara">
                  <span><b>{item.role}</b> · {item.id}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-ink/55">Round 1: {item.round1.state} · Round 2: {item.round2.state} <ArrowRight className="h-3 w-3" /></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </Shell>
  )
}
