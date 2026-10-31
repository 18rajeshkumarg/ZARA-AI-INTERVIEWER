import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  Video,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  formatIST,
  formatISTTime,
  formatInterviewDate,
  statusLabel,
  updateApplicationById,
  withEvent,
  type Application,
  type InterviewRound,
} from '../lib/applications'
import { loadApplicationPhoto, writeCandidateRecord } from '../lib/candidateStorage'
import { whatsappNumber } from './Shell'
import FaceVerification from './FaceVerification'

function RoundCard({
  number,
  round,
  unlocked,
  onJoin,
  onComplete,
}: {
  number: 1 | 2
  round: InterviewRound
  unlocked: boolean
  onJoin: () => void
  onComplete: () => void
}) {
  const completed = round.state === 'completed'
  const verified = round.state === 'verified'
  return (
    <div className={`border p-5 ${completed ? 'border-emerald-300 bg-emerald-50/40' : 'border-ink/15 bg-paper'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Virtual · Zoom</p>
          <h3 className="mt-1 text-xl font-black">Round {number}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {formatISTTime(round.scheduledAt)} – {formatISTTime(round.endsAt)} IST
          </p>
        </div>
        <span className={`border px-2 py-1 font-mono2 text-[9px] uppercase tracking-[0.14em] ${completed ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : verified ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-ink/15 bg-white text-ink/55'}`}>
          {completed ? 'Completed' : verified ? 'Face verified' : unlocked ? 'Scheduled' : 'Locked'}
        </span>
      </div>

      {!unlocked && !completed ? (
        <div className="mt-4 flex items-start gap-2 border border-ink/10 bg-white p-3 text-sm text-ink/55">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          Complete Round 1 to unlock Round 2. Both rounds are on the same interview day.
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {!completed && (
            <button
              type="button"
              onClick={onJoin}
              className="inline-flex items-center gap-2 bg-zara px-4 py-2.5 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-ink"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {verified ? `Re-open Round ${number} Zoom` : `Verify face & join Round ${number}`}
            </button>
          )}
          {verified && (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-2 border border-ink/20 bg-white px-4 py-2.5 font-mono2 text-[10px] uppercase tracking-[0.18em] hover:border-emerald-600 hover:text-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Round {number} completed
            </button>
          )}
        </div>
      )}

      {verified && (
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          Face verification passed at {round.verifiedAt ? formatIST(round.verifiedAt) : 'this session'}. After the Zoom
          call, mark the round completed so the next step unlocks.
        </p>
      )}
      {completed && (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Completed {round.completedAt ? formatIST(round.completedAt) : ''}
        </p>
      )}
    </div>
  )
}

export default function CandidateDashboard({
  application,
  onUpdate,
  onSignOut,
}: {
  application: Application
  onUpdate: (application: Application) => void
  onSignOut: () => void
}) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [verifyRound, setVerifyRound] = useState<1 | 2 | null>(null)
  const [hiredOpen, setHiredOpen] = useState(false)
  const pendingTabRef = useRef<Window | null>(null)

  useEffect(() => {
    let active = true
    let objectUrl = ''
    void loadApplicationPhoto(application.id).then((blob) => {
      if (!blob || !active) return
      objectUrl = URL.createObjectURL(blob)
      setPhotoUrl(objectUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [application.id])

  const update = (updater: (current: Application) => Application) => {
    const updated = updateApplicationById(application.id, updater)
    if (!updated) return null
    onUpdate(updated)
    void writeCandidateRecord(updated)
    return updated
  }

  const joinRound = (round: 1 | 2) => {
    // Open a blank tab while we still have the click gesture. Some browsers
    // block window.open after the async camera check, so we fill this tab in
    // once verification succeeds.
    const tab = window.open('', '_blank')
    pendingTabRef.current = tab
    setVerifyRound(round)
  }

  const handleVerified = () => {
    const round = verifyRound
    if (!round) return
    const key = round === 1 ? 'round1' : 'round2'
    const updated = update((current) => withEvent(
      {
        ...current,
        [key]: {
          ...current[key],
          state: 'verified',
          verifiedAt: new Date().toISOString(),
        },
      },
      `Round ${round} face verification passed`,
      'YOLO check: exactly one candidate in frame',
    ))
    setVerifyRound(null)
    const link = updated
      ? (round === 1 ? updated.round1.zoomLink : updated.round2.zoomLink)
      : (round === 1 ? application.round1.zoomLink : application.round2.zoomLink)
    const tab = pendingTabRef.current
    pendingTabRef.current = null
    if (tab && !tab.closed) tab.location.href = link
    else window.location.href = link
  }

  const handleCloseVerification = () => {
    const tab = pendingTabRef.current
    pendingTabRef.current = null
    if (tab && !tab.closed) tab.close()
    setVerifyRound(null)
  }

  const completeRound = (round: 1 | 2) => {
    const key = round === 1 ? 'round1' : 'round2'
    update((current) => withEvent(
      {
        ...current,
        [key]: {
          ...current[key],
          state: 'completed',
          completedAt: new Date().toISOString(),
        },
      },
      `Round ${round} completed`,
      `Candidate completed the ${round === 1 ? 'first' : 'second'} virtual interview.`,
    ))
  }

  const requestBossRound = () => {
    update((current) => withEvent(
      {
        ...current,
        bossRequestedAt: current.bossRequestedAt || new Date().toISOString(),
      },
      'Boss Round requested on WhatsApp',
      'Candidate sent the 3rd Interview message to the Boss.',
    ))
  }

  const round1Done = application.round1.state === 'completed'
  const round2Done = application.round2.state === 'completed'
  const showBossRound = round1Done && round2Done
  const approved = application.status === 'approved'
  const rejected = application.status === 'rejected'
  const whatsappMessage = `Hello, I am ${application.name}. I have completed Virtual Round 1 and Virtual Round 2 for the ${application.role} role. I am selected for the 3rd Interview (Boss Round). Please share the in-person Boss location and time. Candidate ID: ${application.id}. Email: ${application.email}. Phone: ${application.phone}.`
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-zara">
            <ArrowLeft className="h-4 w-4" /> All roles
          </Link>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-zara">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <section className="mt-5 border border-ink/15 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 p-6">
            <div className="flex items-start gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt={`Face photo for ${application.name}`} className="h-20 w-20 border border-ink/10 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center border border-ink/10 bg-gray-100 text-ink/35">
                  <UserRound className="h-8 w-8" />
                </div>
              )}
              <div>
                <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">{application.id} · {statusLabel(application.status)}</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">{application.name}</h1>
                <p className="text-sm text-ink/60">{application.role}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {application.email}</span>
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {application.phone}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-ink/40">Interview date</p>
              <p className="mt-1 font-bold">{formatInterviewDate(application.interviewDate)}</p>
              <p className="text-sm text-ink/55">Round 1 · Round 2 · Boss Round</p>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <div>
              <p className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">Experience</p>
              <p className="mt-1 text-sm">{application.experience}</p>
            </div>
            <div>
              <p className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">Location</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5 text-zara" /> {application.location}</p>
            </div>
            <div>
              <p className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">Applied</p>
              <p className="mt-1 text-sm">{formatIST(application.createdAt)}</p>
            </div>
            <div className="sm:col-span-3">
              <p className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">About</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{application.about}</p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono2 text-xs uppercase tracking-[0.24em] text-zara">Your schedule</p>
              <h2 className="mt-1 text-2xl font-black">VIRTUAL INTERVIEWS</h2>
            </div>
            <p className="text-xs text-ink/45">Face verification is required before every Zoom round.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <RoundCard
              number={1}
              round={application.round1}
              unlocked
              onJoin={() => joinRound(1)}
              onComplete={() => completeRound(1)}
            />
            <RoundCard
              number={2}
              round={application.round2}
              unlocked={round1Done}
              onJoin={() => joinRound(2)}
              onComplete={() => completeRound(2)}
            />
          </div>
        </section>

        {showBossRound && (
          <section className="mt-6">
            <div className="border border-zara/30 bg-red-50/40 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Final round · In person</p>
                  <h2 className="mt-1 text-2xl font-black">BOSS ROUND INTERVIEW</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
                    Both virtual rounds are complete. The Boss Round is conducted in person at the Boss location only.
                    Send the pre-written WhatsApp message to request your 3rd Interview slot.
                  </p>
                </div>
                <MapPin className="h-7 w-7 text-zara" />
              </div>

              {approved ? (
                <div className="mt-5 border border-emerald-300 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <b>You are hired.</b>
                  </div>
                  <p className="mt-1 text-sm text-emerald-900/70">
                    The Boss approved your application. Your HIRED EMPLOYEE confirmation is ready.
                  </p>
                  <button
                    type="button"
                    onClick={() => setHiredOpen(true)}
                    aria-expanded={hiredOpen}
                    className="mt-4 inline-flex items-center gap-2 bg-emerald-700 px-5 py-3 font-mono2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-emerald-800"
                  >
                    HIRED EMPLOYEE <ArrowRight className="h-4 w-4" />
                  </button>

                  {hiredOpen && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-5 border border-emerald-400 bg-white p-5"
                    >
                      <p className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                        Indica Software · Hiring confirmation
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-emerald-900">You are hired!</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/70">
                        Congratulations, {application.name}. The Boss approved your application for the{' '}
                        <b>{application.role}</b> role. Your HIRED EMPLOYEE status is now confirmed on this screen.
                      </p>
                      <dl className="mt-4 grid gap-3 border-t border-ink/10 pt-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">Candidate ID</dt>
                          <dd className="mt-1 font-mono2 text-xs">{application.id}</dd>
                        </div>
                        <div>
                          <dt className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">Role</dt>
                          <dd className="mt-1">{application.role}</dd>
                        </div>
                        <div>
                          <dt className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/40">Approved</dt>
                          <dd className="mt-1">{formatIST(application.bossCompletedAt || new Date().toISOString())}</dd>
                        </div>
                      </dl>
                      <p className="mt-4 flex items-center gap-2 text-xs text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5" /> Confirmed locally for {application.email}
                      </p>
                      <button
                        type="button"
                        onClick={() => setHiredOpen(false)}
                        className="mt-4 inline-flex items-center gap-2 border border-ink/15 px-4 py-2 font-mono2 text-[10px] uppercase tracking-[0.16em] text-ink/60 hover:border-zara hover:text-zara"
                      >
                        Back to my interview
                      </button>
                    </div>
                  )}
                </div>
              ) : rejected ? (
                <div className="mt-5 border border-ink/15 bg-white p-5 text-sm text-ink/65">
                  Your application was not selected after the Boss Round. Thank you for interviewing with Indica Software.
                </div>
              ) : application.bossRequestedAt ? (
                <div className="mt-5 border border-amber-300 bg-amber-50 p-5">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Clock className="h-5 w-5" />
                    <b>Boss Round requested.</b>
                  </div>
                  <p className="mt-1 text-sm text-amber-900/70">
                    Sent on {formatIST(application.bossRequestedAt)}. Awaiting Boss approval. The HIRED EMPLOYEE button
                    will appear only after approval.
                  </p>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-zara underline"
                  >
                    <MessageCircle className="h-4 w-4" /> Message the Boss again
                  </a>
                </div>
              ) : (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={requestBossRound}
                  className="mt-5 inline-flex items-center gap-2 bg-zara px-5 py-3 font-mono2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-ink"
                >
                  <MessageCircle className="h-4 w-4" /> Request Boss Round on WhatsApp
                </a>
              )}
            </div>
          </section>
        )}

        {!showBossRound && (
          <section className="mt-6 border border-ink/10 bg-white p-5 text-sm text-ink/55">
            <div className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The Boss Round is hidden until both Virtual Round 1 and Virtual Round 2 are marked completed. Your
                progress is saved on this screen.
              </p>
            </div>
          </section>
        )}

        <section className="mt-6 border border-ink/15 bg-white p-5">
          <div className="flex items-start gap-2 text-sm text-ink/60">
            <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-zara" />
            <p>
              Your details, interview schedule and both Zoom links are written to{' '}
              <span className="font-mono2 text-xs">Candidate Applications/Candidates/{application.id}.txt</span> when the
              project folder is connected.
              {application.photoName ? (
                <>
                  {' '}Your face photo is written to{' '}
                  <span className="font-mono2 text-xs">Candidate Applications/Uploads/{application.photoName}</span>.
                </>
              ) : null}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink/45">
            <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Zoom Round 1: {formatISTTime(application.round1.scheduledAt)} IST</span>
            <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Zoom Round 2: {formatISTTime(application.round2.scheduledAt)} IST</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatInterviewDate(application.interviewDate)}</span>
          </div>
        </section>
      </main>

      <FaceVerification
        key={verifyRound ?? 'closed'}
        open={verifyRound !== null}
        roundLabel={verifyRound === 1 ? 'Virtual Round 1' : 'Virtual Round 2'}
        candidateName={application.name}
        onVerified={handleVerified}
        onClose={handleCloseVerification}
      />
    </>
  )
}
