import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  CheckCircle2,
  FolderCheck,
  FolderX,
  Link2,
  RefreshCw,
  Save,
  Undo2,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react'
import {
  addMonths,
  canReapply,
  decisionLabel,
  formatIST,
  formatISTTime,
  formatInterviewDate,
  readAllApplications,
  reapplyDateLabel,
  round2DecisionLabel,
  updateApplicationById,
  withEvent,
  type AppStatus,
  type Application,
  type RoundState,
} from '../lib/applications'
import {
  connectProjectDirectory,
  disconnectProjectDirectory,
  loadApplicationPhoto,
  projectFolderName,
  restoreCandidateDirectory,
  writeCandidateRecord,
} from '../lib/candidateStorage'
import { readSiteActivity, type SiteActivity } from '../lib/activity'

const adminCode = import.meta.env.VITE_ADMIN_CODE || 'ZARA-BOSS-2026'
const unlockKey = 'zara_admin_unlocked'

function ZoomLinkEditor({
  round,
  link,
  disabled,
  onSave,
}: {
  round: 1 | 2
  link: string
  disabled: boolean
  onSave: (link: string) => void
}) {
  const [value, setValue] = useState(link)
  const [error, setError] = useState('')

  // The parent passes a `key` based on the saved link, so this editor remounts
  // with fresh state whenever another tab saves a new link.
  const trimmed = value.trim()
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const valid = /^https?:\/\/[^\s/]+\.[^\s]+/i.test(normalized)
  const dirty = trimmed !== link

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid) {
          setError('Enter a full Zoom URL, for example https://zoom.us/j/1234567890?pwd=abcd1234')
          return
        }
        setError('')
        onSave(normalized)
      }}
      className="mt-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70">
          <Link2 className="h-3.5 w-3.5 text-zara" /> Round {round} Zoom link
        </label>
        <div className="flex items-center gap-2">
          {/^https?:\/\//i.test(link) && (
            <a href={link} target="_blank" rel="noreferrer" className="text-xs underline hover:text-zara">
              Open
            </a>
          )}
          <button
            type="submit"
            disabled={disabled || !dirty}
            className="inline-flex items-center gap-1 border border-ink/20 bg-white px-2.5 py-1.5 text-xs hover:border-zara disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" /> Save link
          </button>
        </div>
      </div>
      <input
        type="url"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (error) setError('')
        }}
        placeholder="https://zoom.us/j/1234567890?pwd=abcd1234"
        className="mt-1.5 block w-full border border-ink/20 bg-white px-2.5 py-1.5 font-mono2 text-xs"
      />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      {!error && dirty && valid && <p className="mt-1 text-xs text-amber-700">Unsaved change — press Save link.</p>}
    </form>
  )
}

function ProcessTracker({ application }: { application: Application }) {
  const steps = [
    {
      label: 'Application',
      value: 'Submitted',
      done: true,
      bad: false,
    },
    {
      label: 'Round 1',
      value: application.round1.state === 'completed'
        ? 'Completed'
        : application.round1.state === 'verified'
          ? 'Face verified · not completed'
          : 'Not completed',
      done: application.round1.state === 'completed',
      bad: false,
    },
    {
      label: 'Round 2 access',
      value: application.round2Decision === 'rejected'
        ? 'Closed after Round 1'
        : application.round1.state === 'completed'
          ? 'Unlocked automatically'
          : application.selectedAt
            ? 'Granted by selection'
            : 'Locked until Round 1 passes',
      done: application.round2Decision !== 'rejected'
        && (application.round1.state === 'completed' || Boolean(application.selectedAt)),
      bad: application.round2Decision === 'rejected',
    },
    {
      label: 'Round 2',
      value: application.round2.state === 'completed'
        ? 'Completed'
        : application.round2.state === 'verified'
          ? 'Face verified · not completed'
          : 'Not completed',
      done: application.round2.state === 'completed',
      bad: false,
    },
    {
      label: 'Boss Round',
      value: application.bossCompletedAt ? 'Completed' : application.bossRequestedAt ? 'Requested' : 'Not started',
      done: Boolean(application.bossCompletedAt),
      bad: false,
    },
    {
      label: 'Outcome',
      value: decisionLabel(application),
      done: application.status !== 'pending' || Boolean(application.selectedAt),
      bad: application.status === 'rejected',
    },
  ]

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.label}
          className={`border p-2 ${step.bad ? 'border-red-200 bg-red-50 text-red-800' : step.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-ink/15 bg-paper text-ink/65'}`}
        >
          <p className="font-mono2 text-[9px] uppercase tracking-[0.14em] text-ink/40">{step.label}</p>
          <p className="mt-1 text-xs font-semibold">{step.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(unlockKey) === '1')
  const [applications, setApplications] = useState<Application[]>([])
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [siteActivity, setSiteActivity] = useState<SiteActivity[]>(() => readSiteActivity())
  const [folder, setFolder] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = () => {
    setApplications(readAllApplications())
    setSiteActivity(readSiteActivity())
  }

  useEffect(() => {
    void restoreCandidateDirectory().then(async () => {
      setFolder(await projectFolderName())
      refresh()
    })
    const handler = () => refresh()
    window.addEventListener('zara:applications-updated', handler)
    window.addEventListener('zara:site-activity-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('zara:applications-updated', handler)
      window.removeEventListener('zara:site-activity-updated', handler)
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

  const setRoundLink = (application: Application, round: 1 | 2, link: string) => {
    const key = round === 1 ? 'round1' : 'round2'
    applyUpdate(application.id, (current) => {
      if (current[key].zoomLink === link) return current
      return withEvent(
        { ...current, [key]: { ...current[key], zoomLink: link } },
        `Round ${round} Zoom link updated by hiring review`,
        link,
      )
    })
  }

  const setRoundCompleted = (application: Application, round: 1 | 2, completed: boolean) => {
    const key = round === 1 ? 'round1' : 'round2'
    applyUpdate(application.id, (current) => {
      const roundData = current[key]
      const nextState: RoundState = completed
        ? 'completed'
        : roundData.verifiedAt
          ? 'verified'
          : 'scheduled'
      const nextRound = { ...roundData, state: nextState }
      if (completed) nextRound.completedAt = new Date().toISOString()
      else delete nextRound.completedAt

      // Passing Round 1 grants Round 2 access automatically — there is no
      // separate "select for Round 2" step. Un-completing Round 1 locks it
      // again unless Round 2 was already completed.
      const next: Application = { ...current, [key]: nextRound }
      if (round === 1) {
        if (completed) {
          next.round2Decision = 'selected'
          if (next.status === 'rejected' && !next.bossCompletedAt) {
            next.status = 'pending'
            next.reapplyAfter = undefined
          }
        } else if (next.round2.state !== 'completed') {
          next.round2Decision = 'pending'
        }
      }

      return withEvent(
        next,
        completed
          ? `Round ${round} marked complete by hiring review`
          : `Round ${round} marked not complete by hiring review`,
        completed
          ? round === 1
            ? 'Round 1 passed — Round 2 Zoom access unlocked automatically.'
            : 'Interview confirmed completed by the hiring team.'
          : 'Interview reopened; completion removed by the hiring team.',
      )
    })
  }

  /**
   * The hiring team's only decision is Selected or Rejected. The stage decides
   * the effect: before Round 2 it grants Round 2 access, after the Boss Round it
   * hires the candidate, and a rejection starts the 2-month reapply wait.
   */
  const decide = (application: Application, decision: 'selected' | 'rejected') => {
    applyUpdate(application.id, (current) => {
      const now = new Date().toISOString()
      const round2Done = current.round2.state === 'completed'
      const bossDone = Boolean(current.bossCompletedAt)

      if (decision === 'selected') {
        if (bossDone) {
          return withEvent(
            {
              ...current,
              status: 'approved',
              approvedAt: now,
              selectedAt: current.selectedAt || now,
              round2Decision: 'selected',
              reapplyAfter: undefined,
            },
            'Candidate selected by the Boss',
            'HIRED EMPLOYEE access unlocked.',
          )
        }
        return withEvent(
          {
            ...current,
            status: 'pending',
            selectedAt: now,
            approvedAt: undefined,
            round2Decision: 'selected',
            reapplyAfter: undefined,
          },
          round2Done ? 'Candidate selected by hiring review' : 'Candidate selected for Round 2 by hiring review',
          round2Done
            ? 'Waiting for the in-person Boss Round.'
            : 'Round 2 Zoom access unlocked automatically.',
        )
      }

      const reapplyAfter = addMonths(now, 2)
      return withEvent(
        {
          ...current,
          status: 'rejected' as AppStatus,
          selectedAt: undefined,
          approvedAt: undefined,
          round2Decision: round2Done ? current.round2Decision : 'rejected',
          reapplyAfter,
        },
        round2Done ? 'Candidate rejected by hiring review' : 'Candidate rejected for Round 2 by hiring review',
        `The candidate can reapply after ${formatIST(reapplyAfter)}.`,
      )
    })
  }

  /** Reverses a "Selected" decision so the hiring team can change its mind. */
  const undoSelection = (application: Application) => {
    applyUpdate(application.id, (current) => withEvent(
      {
        ...current,
        status: current.status === 'approved' ? 'pending' : current.status,
        selectedAt: undefined,
        approvedAt: undefined,
      },
      'Selection withdrawn by hiring review',
      'The candidate is back in review.',
    ))
  }

  const requestBoss = (application: Application) => {
    applyUpdate(application.id, (current) => withEvent(
      { ...current, bossRequestedAt: current.bossRequestedAt || new Date().toISOString() },
      'Boss Round invitation recorded by hiring review',
    ))
  }

  const setBossCompleted = (application: Application, completed: boolean) => {
    applyUpdate(application.id, (current) => withEvent(
      {
        ...current,
        bossRequestedAt: completed
          ? current.bossRequestedAt || new Date().toISOString()
          : current.bossRequestedAt,
        bossCompletedAt: completed ? new Date().toISOString() : undefined,
      },
      completed
        ? 'Boss Round marked complete by hiring review'
        : 'Boss Round marked not complete by hiring review',
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
          Boss-only review for the applications saved in this browser. The hiring team owns the interview process:
          update the Zoom links, mark each round completed or not completed, and confirm every candidate with the
          Selected or Rejected buttons. Round 2 unlocks automatically when Round 1 is passed, and the candidate screen
          updates automatically after every confirmed change.
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

            <details className="mt-4 border border-ink/15 bg-white p-5 text-sm" open>
              <summary className="cursor-pointer font-semibold">
                Site activity · {siteActivity.length} tracked events
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink/50">
                Every candidate click and page view is recorded automatically in this browser and in the connected
                project folder. Newest events appear first.
              </p>
              <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-xs text-ink/60">
                {siteActivity.length === 0 && <li>No activity recorded yet.</li>}
                {[...siteActivity].reverse().slice(0, 100).map((event, index) => (
                  <li key={`${event.at}-${index}`} className="border-l-2 border-ink/10 pl-2">
                    <span className="font-mono2 text-[10px] text-ink/40">{formatIST(event.at)}</span> · {event.event}
                    {event.detail ? <span className="text-ink/45"> — {event.detail}</span> : null}
                    {event.email ? <span className="text-ink/40"> · {event.email}</span> : null}
                  </li>
                ))}
              </ul>
            </details>

            {applications.length === 0 && (
              <p className="mt-6 border border-ink/15 bg-white p-6 text-sm text-ink/60">
                No applications are saved in this browser yet. Candidate submissions appear here automatically.
              </p>
            )}

            <div className="mt-6 space-y-5">
              {applications.map((application) => {
                const round1Done = application.round1.state === 'completed'
                const round2Done = application.round2.state === 'completed'
                const selected = Boolean(application.selectedAt)
                const round2Unlocked = application.round2Decision !== 'rejected' && (round1Done || selected)
                const bothRoundsDone = round1Done && round2Done && round2Unlocked
                const rejected = application.status === 'rejected'
                const approved = application.status === 'approved'
                const canApplyAgain = canReapply(application)
                return (
                  <article key={application.id} className="grid gap-5 border border-ink/15 bg-white p-5 md:grid-cols-[180px_1fr]">
                    <div>
                      {photos[application.id] ? (
                        <img src={photos[application.id]} alt={`Face photo for ${application.name}`} className="aspect-square w-full border border-ink/10 object-cover" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center border border-ink/10 bg-gray-100 text-sm text-ink/45">No photo</div>
                      )}
                      <p className="mt-2 font-mono2 text-[10px] uppercase tracking-[0.14em] text-ink/40">{application.id}</p>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono2 text-xs text-zara">{application.id} · {decisionLabel(application).toUpperCase()}</p>
                          <h2 className="mt-1 text-xl font-black">{application.name}</h2>
                          <p className="text-sm text-ink/65">{application.role}</p>
                        </div>
                        <p className="text-xs text-ink/50">Applied {formatIST(application.createdAt)}</p>
                      </div>

                      <p className="mt-3 text-sm">{application.email} · {application.phone}</p>
                      <p className="mt-1 text-sm">{application.experience} · {application.location}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{application.about}</p>

                      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/55">
                        <CalendarClock className="h-3.5 w-3.5 text-zara" />
                        <span>{formatInterviewDate(application.interviewDate)}</span>
                        <span>· Round 1 {formatISTTime(application.round1.scheduledAt)}–{formatISTTime(application.round1.endsAt)} IST</span>
                        <span>· Round 2 {formatISTTime(application.round2.scheduledAt)}–{formatISTTime(application.round2.endsAt)} IST</span>
                      </p>

                      <ProcessTracker application={application} />

                      <div className="mt-4 border border-ink/10 bg-paper p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Round 1 · {application.round1.state}</p>
                          <div className="flex flex-wrap gap-2">
                            {application.round1.state !== 'completed' ? (
                              <button disabled={busy} onClick={() => setRoundCompleted(application, 1, true)} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-emerald-600 hover:text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Round 1 completed
                              </button>
                            ) : (
                              <button disabled={busy} onClick={() => setRoundCompleted(application, 1, false)} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-amber-600 hover:text-amber-700">
                                <Undo2 className="h-3.5 w-3.5" /> Mark Round 1 not completed
                              </button>
                            )}
                          </div>
                        </div>
                        <ZoomLinkEditor key={application.round1.zoomLink} round={1} link={application.round1.zoomLink} disabled={busy} onSave={(link) => setRoundLink(application, 1, link)} />
                      </div>

                      <div className="mt-3 border border-ink/10 bg-paper p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            Round 2 · {round2DecisionLabel(application.round2Decision)} · {application.round2.state}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {round2Unlocked && application.round2.state !== 'completed' && (
                              <button disabled={busy} onClick={() => setRoundCompleted(application, 2, true)} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-emerald-600 hover:text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Round 2 completed
                              </button>
                            )}
                            {application.round2.state === 'completed' && (
                              <button disabled={busy} onClick={() => setRoundCompleted(application, 2, false)} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-amber-600 hover:text-amber-700">
                                <Undo2 className="h-3.5 w-3.5" /> Mark Round 2 not completed
                              </button>
                            )}
                          </div>
                        </div>
                        {!round1Done && !selected && (
                          <p className="mt-2 text-xs text-ink/45">
                            Round 2 access is granted automatically when you mark Round 1 completed (passed), or when
                            you press Selected.
                          </p>
                        )}
                        {selected && !round1Done && (
                          <p className="mt-2 text-xs text-emerald-700">
                            Round 2 access was granted by the Selected decision.
                          </p>
                        )}
                        {round1Done && !round2Unlocked && (
                          <p className="mt-2 text-xs text-red-700">
                            Round 2 is closed for this candidate after a rejection.
                          </p>
                        )}
                        {round1Done && round2Unlocked && (
                          <p className="mt-2 text-xs text-emerald-700">
                            Round 1 is passed. The candidate already has Round 2 Zoom access.
                          </p>
                        )}
                        <ZoomLinkEditor key={application.round2.zoomLink} round={2} link={application.round2.zoomLink} disabled={busy} onSave={(link) => setRoundLink(application, 2, link)} />
                      </div>

                      <div className="mt-3 border border-ink/10 bg-paper p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            Boss Round · {application.bossCompletedAt ? 'completed' : application.bossRequestedAt ? 'requested' : 'not started'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {bothRoundsDone && !application.bossRequestedAt && !application.bossCompletedAt && (
                              <button disabled={busy} onClick={() => requestBoss(application)} className="bg-ink px-3 py-2 text-xs text-white hover:bg-zara">
                                Record Boss Round request
                              </button>
                            )}
                            {bothRoundsDone && !application.bossCompletedAt && (
                              <button disabled={busy} onClick={() => setBossCompleted(application, true)} className="inline-flex items-center gap-1 border border-ink/25 bg-white px-3 py-2 text-xs hover:border-emerald-600 hover:text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Boss Round completed
                              </button>
                            )}
                            {application.bossCompletedAt && application.status !== 'approved' && (
                              <button disabled={busy} onClick={() => setBossCompleted(application, false)} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-amber-600 hover:text-amber-700">
                                <Undo2 className="h-3.5 w-3.5" /> Mark Boss Round not completed
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border border-ink/15 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            Hiring decision · {decisionLabel(application)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {!rejected && !approved && (
                              <button disabled={busy} onClick={() => decide(application, 'selected')} className="inline-flex items-center gap-1 bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-800">
                                <UserCheck className="h-3.5 w-3.5" /> Selected
                              </button>
                            )}
                            {selected && !approved && !rejected && (
                              <button disabled={busy} onClick={() => undoSelection(application)} className="inline-flex items-center gap-1 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-amber-600 hover:text-amber-700">
                                <Undo2 className="h-3.5 w-3.5" /> Undo selection
                              </button>
                            )}
                            {!rejected && !approved && (
                              <button disabled={busy} onClick={() => decide(application, 'rejected')} className="inline-flex items-center gap-1 border border-red-300 bg-white px-3 py-2 text-xs text-red-700 hover:bg-red-50">
                                <UserX className="h-3.5 w-3.5" /> Rejected
                              </button>
                            )}
                            {approved && (
                              <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5" /> HIRED EMPLOYEE unlocked
                              </span>
                            )}
                            {rejected && (
                              <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                                <XCircle className="h-3.5 w-3.5" /> Application closed
                              </span>
                            )}
                          </div>
                        </div>

                        {selected && !approved && !rejected && (
                          <p className="mt-2 border border-emerald-200 bg-emerald-50 p-2 text-xs leading-relaxed text-emerald-900">
                            <b>Selected.</b>{' '}
                            {bothRoundsDone
                              ? 'Waiting for the in-person Boss Round. Mark the Boss Round completed, then press Selected again to unlock HIRED EMPLOYEE.'
                              : 'The candidate has been selected for Round 2, so Round 2 Zoom access is granted automatically. The Boss Round stays hidden until both virtual rounds are completed.'}
                          </p>
                        )}
                        {!selected && !approved && !rejected && (
                          <p className="mt-2 text-xs leading-relaxed text-ink/50">
                            Press <b>Selected</b> to confirm this candidate. Before Round 2 it grants Round 2 access;
                            after the Boss Round it unlocks HIRED EMPLOYEE. <b>Rejected</b> starts the candidate's
                            2-month upskilling and reapply period.
                          </p>
                        )}
                        {rejected && application.reapplyAfter && (
                          <p className="mt-2 text-xs text-red-700">
                            Reapply eligible from <b>{reapplyDateLabel(application)}</b>
                            {canApplyAgain ? ' · the candidate can reapply now.' : ' · the candidate cannot reapply yet.'}
                          </p>
                        )}
                      </div>

                      <details className="mt-3 text-xs text-ink/50">
                        <summary className="cursor-pointer">Process updates · {application.events.length} entries</summary>
                        <ul className="mt-2 space-y-1">
                          {application.events.map((event, index) => (
                            <li key={`${event.at}-${index}`} className="border-l-2 border-ink/10 pl-2">
                              <span className="font-mono2 text-[10px] text-ink/40">{formatIST(event.at)}</span> · {event.event}
                              {event.detail ? <span className="text-ink/45"> — {event.detail}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </details>

                      <details className="mt-2 text-xs text-ink/50">
                        <summary className="cursor-pointer">Candidate activity · {application.activity.length} entries</summary>
                        <ul className="mt-2 space-y-1">
                          {application.activity.length === 0 && <li>No activity recorded yet.</li>}
                          {application.activity.map((event, index) => (
                            <li key={`${event.at}-${index}`} className="border-l-2 border-ink/10 pl-2">
                              <span className="font-mono2 text-[10px] text-ink/40">{formatIST(event.at)}</span> · {event.event}
                              {event.detail ? <span className="text-ink/45"> — {event.detail}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
