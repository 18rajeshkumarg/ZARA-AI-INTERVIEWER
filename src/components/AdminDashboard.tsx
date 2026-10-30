import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  FolderCheck,
  FolderX,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  formatIST,
  readAllApplications,
  statusLabel,
  updateApplicationById,
  withEvent,
  type Application,
} from '../lib/applications'
import {
  connectProjectDirectory,
  disconnectProjectDirectory,
  loadApplicationPhoto,
  projectFolderName,
  restoreCandidateDirectory,
  writeCandidateRecord,
} from '../lib/candidateStorage'

const adminCode = import.meta.env.VITE_ADMIN_CODE || 'ZARA-BOSS-2026'
const unlockKey = 'zara_admin_unlocked'

export default function AdminDashboard() {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(unlockKey) === '1')
  const [applications, setApplications] = useState<Application[]>([])
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [folder, setFolder] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = () => setApplications(readAllApplications())

  useEffect(() => {
    void restoreCandidateDirectory().then(async () => {
      setFolder(await projectFolderName())
      refresh()
    })
    const handler = () => refresh()
    window.addEventListener('zara:applications-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('zara:applications-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  useEffect(() => {
    let active = true
    const created: string[] = []
    void (async () => {
      const next: Record<string, string> = {}
      for (const application of applications) {
        const blob = await loadApplicationPhoto(application.id)
        if (!blob || !active) continue
        const url = URL.createObjectURL(blob)
        created.push(url)
        next[application.id] = url
      }
      if (active) setPhotos(next)
    })()
    return () => {
      active = false
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [applications])

  const login = (event: FormEvent) => {
    event.preventDefault()
    if (code.trim() === adminCode) {
      sessionStorage.setItem(unlockKey, '1')
      setUnlocked(true)
      setError('')
      refresh()
      return
    }
    setError('That Boss review passcode is not correct.')
  }

  const signOut = () => {
    sessionStorage.removeItem(unlockKey)
    setUnlocked(false)
    setCode('')
  }

  const applyUpdate = (id: string, updater: (application: Application) => Application) => {
    setBusy(true)
    setError('')
    const updated = updateApplicationById(id, updater)
    if (!updated) {
      setError('That application could not be found in this browser.')
      setBusy(false)
      return
    }
    void writeCandidateRecord(updated)
    refresh()
    setBusy(false)
  }

  const markRound = (application: Application, round: 1 | 2) => {
    const key = round === 1 ? 'round1' : 'round2'
    applyUpdate(application.id, (current) => withEvent(
      {
        ...current,
        [key]: {
          ...current[key],
          state: 'completed',
          completedAt: new Date().toISOString(),
        },
      },
      `Round ${round} marked complete by hiring review`,
    ))
  }

  const requestBoss = (application: Application) => {
    applyUpdate(application.id, (current) => withEvent(
      { ...current, bossRequestedAt: current.bossRequestedAt || new Date().toISOString() },
      'Boss Round invitation recorded by hiring review',
    ))
  }

  const completeBoss = (application: Application) => {
    applyUpdate(application.id, (current) => withEvent(
      { ...current, bossCompletedAt: new Date().toISOString() },
      'Boss Round marked complete by hiring review',
    ))
  }

  const approve = (application: Application) => {
    if (!(application.round1.state === 'completed' && application.round2.state === 'completed' && application.bossCompletedAt)) {
      setError('Both virtual rounds and the Boss Round must be completed before approval.')
      return
    }
    applyUpdate(application.id, (current) => withEvent(
      { ...current, status: 'approved', approvedAt: new Date().toISOString() },
      'Candidate approved by the Boss',
      'HIRED EMPLOYEE access unlocked.',
    ))
  }

  const reject = (application: Application) => {
    applyUpdate(application.id, (current) => withEvent(
      { ...current, status: 'rejected' },
      'Candidate not selected after review',
    ))
  }

  const connectFolder = async () => {
    setBusy(true)
    const name = await connectProjectDirectory()
    setFolder(name || '')
    if (name) {
      await Promise.all(applications.map((application) => writeCandidateRecord(application)))
    }
    setBusy(false)
  }

  const disconnectFolder = async () => {
    await disconnectProjectDirectory()
    setFolder('')
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <b className="text-xl">ZARA · Hiring review</b>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="underline">Candidate site</Link>
            {unlocked && <button type="button" onClick={signOut} className="underline">Sign out</button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl font-black">Application review</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink/60">
          Boss-only review for the applications saved in this browser. Approve a candidate only after both virtual
          rounds and the in-person Boss Round are complete. The HIRED EMPLOYEE button appears on the candidate screen
          only after approval.
        </p>

        {!unlocked && (
          <form onSubmit={login} className="mt-6 grid max-w-lg gap-4 border border-ink/15 bg-white p-6">
            <label className="text-sm font-semibold">
              Boss review passcode
              <input
                type="password"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-1 block w-full border border-ink/20 px-3 py-2 font-normal"
                placeholder="Enter the passcode configured for this deployment"
              />
            </label>
            <button disabled={busy} className="w-fit bg-zara px-5 py-3 font-mono2 text-xs uppercase tracking-widest text-white disabled:opacity-50">
              Open review
            </button>
          </form>
        )}

        {error && <p role="alert" className="mt-4 border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        {unlocked && (
          <>
            <section className="mt-6 grid gap-4 border border-ink/15 bg-white p-5 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-ink/45">Project folder</p>
                <p className="mt-1 text-sm">
                  {folder ? (
                    <span className="inline-flex items-center gap-2 text-emerald-700"><FolderCheck className="h-4 w-4" /> Connected: {folder}</span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-ink/55"><FolderX className="h-4 w-4" /> Not connected on this device</span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink/50">
                  Connect the <span className="font-mono2">Candidate Applications</span> folder once. Every new
                  application and status change is then written automatically as a numbered text file and photo.
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <button type="button" disabled={busy} onClick={() => void connectFolder()} className="border border-ink/20 bg-white px-3 py-2 text-xs hover:border-zara">
                  {folder ? 'Reconnect folder' : 'Connect folder'}
                </button>
                {folder && (
                  <button type="button" onClick={() => void disconnectFolder()} className="border border-ink/20 bg-white px-3 py-2 text-xs hover:border-zara">
                    Disconnect
                  </button>
                )}
                <button type="button" onClick={refresh} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-zara">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </section>

            {applications.length === 0 && (
              <p className="mt-6 border border-ink/15 bg-white p-6 text-sm text-ink/60">
                No applications are saved in this browser yet. Candidate submissions appear here automatically.
              </p>
            )}

            <div className="mt-6 space-y-5">
              {applications.map((application) => (
                <article key={application.id} className="grid gap-5 border border-ink/15 bg-white p-5 md:grid-cols-[180px_1fr]">
                  <div>
                    {photos[application.id] ? (
                      <img src={photos[application.id]} alt={`Face photo for ${application.name}`} className="aspect-square w-full border border-ink/10 object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center border border-ink/10 bg-gray-100 text-sm text-ink/45">No photo</div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono2 text-xs text-zara">{application.id} · {statusLabel(application.status).toUpperCase()}</p>
                        <h2 className="mt-1 text-xl font-black">{application.name}</h2>
                        <p className="text-sm text-ink/65">{application.role}</p>
                      </div>
                      <p className="text-xs text-ink/50">{formatIST(application.createdAt)}</p>
                    </div>
                    <p className="mt-3 text-sm">{application.email} · {application.phone}</p>
                    <p className="mt-1 text-sm">{application.experience} · {application.location}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{application.about}</p>
                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                      <span className={`border px-2 py-1 ${application.round1.state === 'completed' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-ink/15 bg-paper'}`}>Round 1: {application.round1.state}</span>
                      <span className={`border px-2 py-1 ${application.round2.state === 'completed' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-ink/15 bg-paper'}`}>Round 2: {application.round2.state}</span>
                      <span className={`border px-2 py-1 ${application.bossCompletedAt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-ink/15 bg-paper'}`}>Boss: {application.bossCompletedAt ? 'completed' : application.bossRequestedAt ? 'requested' : 'not yet'}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {application.round1.state !== 'completed' && (
                        <button disabled={busy} onClick={() => markRound(application, 1)} className="border border-ink/20 px-3 py-2 text-xs hover:border-zara">
                          Mark Round 1 complete
                        </button>
                      )}
                      {application.round1.state === 'completed' && application.round2.state !== 'completed' && (
                        <button disabled={busy} onClick={() => markRound(application, 2)} className="border border-ink/20 px-3 py-2 text-xs hover:border-zara">
                          Mark Round 2 complete
                        </button>
                      )}
                      {application.round1.state === 'completed' && application.round2.state === 'completed' && !application.bossRequestedAt && (
                        <button disabled={busy} onClick={() => requestBoss(application)} className="bg-ink px-3 py-2 text-xs text-white hover:bg-zara">
                          Record Boss Round request
                        </button>
                      )}
                      {application.bossRequestedAt && !application.bossCompletedAt && (
                        <button disabled={busy} onClick={() => completeBoss(application)} className="border border-ink/25 px-3 py-2 text-xs hover:border-zara">
                          Mark Boss Round complete
                        </button>
                      )}
                      {application.bossCompletedAt && application.status !== 'approved' && application.status !== 'rejected' && (
                        <button disabled={busy} onClick={() => approve(application)} className="inline-flex items-center gap-1 bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-800">
                          <ShieldCheck className="h-3.5 w-3.5" /> Approve & unlock HIRED EMPLOYEE
                        </button>
                      )}
                      {application.status === 'pending' && (
                        <button disabled={busy} onClick={() => reject(application)} className="inline-flex items-center gap-1 border border-red-300 px-3 py-2 text-xs text-red-700 hover:bg-red-50">
                          <XCircle className="h-3.5 w-3.5" /> Not selected
                        </button>
                      )}
                      {application.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" /> HIRED EMPLOYEE unlocked
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] text-ink/40">
                      Round 1 Zoom: {application.round1.zoomLink} · Round 2 Zoom: {application.round2.zoomLink}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
