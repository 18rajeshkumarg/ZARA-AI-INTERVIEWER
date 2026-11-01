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
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  canReapply,
  decisionLabel,
  employeePortalUrl,
  formatIST,
  formatISTTime,
  formatInterviewDate,
  reapplyDateLabel,
  statusLabel,
  updateApplicationById,
  withEvent,
  type Application,
  type InterviewRound,
} from '../lib/applications'
import { loadApplicationPhoto, writeCandidateRecord } from '../lib/candidateStorage'
import { trackCandidateActivity } from '../lib/activity'
import { whatsappNumber } from './Shell'
import EmployeeCardsShareButton from './EmployeeCardsShareButton'
import EmployeeVisitCard from './EmployeeVisitCard'
import EmployeeOfferLetter from './EmployeeOfferLetter'
import FaceVerification from './FaceVerification'

function RoundCard({
  number,
  round,
  unlocked,
  rejected,
  blockedMessage,
  onJoin,
}: {
  number: 1 | 2
  round: InterviewRound
  unlocked: boolean
  rejected?: boolean
  blockedMessage?: string
  onJoin: () => void
}) {
  const completed = round.state === 'completed'
  const verified = round.state === 'verified'
  const badge = rejected
    ? 'Not selected'
    : completed
      ? 'Completed'
      : verified
        ? 'Face verified'
        : unlocked
          ? 'Scheduled'
          : 'Locked'
  const badgeClass = rejected
    ? 'border-red-300 bg-red-50 text-red-800'
    : completed
      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
      : verified
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-ink/15 bg-white text-ink/55'

  return (
    <div className={`border p-5 ${completed ? 'border-emerald-300 bg-emerald-50/40' : rejected ? 'border-red-200 bg-red-50/30' : 'border-ink/15 bg-paper'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Virtual · Zoom</p>
          <h3 className="mt-1 text-xl font-black">Round {number}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {formatISTTime(round.scheduledAt)} – {formatISTTime(round.endsAt)} IST
          </p>
        </div>
        <span className={`border px-2 py-1 font-mono2 text-[9px] uppercase tracking-[0.14em] ${badgeClass}`}>
          {badge}
        </span>
      </div>

      {rejected ? (
        <div className="mt-4 flex items-start gap-2 border border-red-200 bg-white p-3 text-sm text-red-800">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          You were not selected for Round 2. The hiring team ended the process after Round 1.
        </div>
      ) : !unlocked && !completed ? (
        <div className="mt-4 flex items-start gap-2 border border-ink/10 bg-white p-3 text-sm text-ink/55">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          {blockedMessage || `Round ${number} unlocks after the hiring team confirms the previous step.`}
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
              {verified ? `Verify face & rejoin Round ${number}` : `Verify face & join Round ${number}`}
            </button>
          )}
        </div>
      )}

      {verified && !completed && (
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          Face verified at {round.verifiedAt ? formatIST(round.verifiedAt) : 'this session'}. Waiting for the hiring team
          to confirm this round is completed.
        </p>
      )}
      {completed && (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Completed {round.completedAt ? formatIST(round.completedAt) : ''} ·
          confirmed by the hiring team
        </p>
      )}
      {!completed && !verified && !rejected && unlocked && (
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          Join when you are ready. YOLO face verification runs first, then the Zoom link opens.
        </p>
      )}
    </div>
  )
}

function ReapplyNotice({
  application,
  eligible,
  onReapply,
}: {
  application: Application
  eligible: boolean
  onReapply: () => void
}) {
  return (
    <div className="mt-4 border-t border-red-200 pt-4">
      <p className="text-sm text-red-900/80">
        You can reattend the same interview after the 2-month waiting period ends on{' '}
        <b>{reapplyDateLabel(application)}</b>. Use this time to upskill the skills required to crack the interview.
      </p>
      {eligible ? (
        <button
          type="button"
          onClick={onReapply}
          className="mt-3 inline-flex items-center gap-2 bg-zara px-4 py-2.5 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reapply for this role
        </button>
      ) : (
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-red-900/60">
          <Clock className="h-3.5 w-3.5" /> The reapply button unlocks automatically on that date.
        </p>
      )}
    </div>
  )
}

export default function CandidateDashboard({
  application,
  onUpdate,
  onSignOut,
  onReapply,
}: {
  application: Application
  onUpdate: (application: Application) => void
  onSignOut: () => void
  onReapply: () => void
}) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [verifyRound, setVerifyRound] = useState<1 | 2 | null>(null)
  const [hiredOpen, setHiredOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const lastUpdateRef = useRef(application.updatedAt)
  const loggedViewRef = useRef('')

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

  // Record that the candidate opened the dashboard (once per mount) so the
  // hiring team can see activity in the review page and the project folder.
  useEffect(() => {
    if (loggedViewRef.current === application.id) return
    loggedViewRef.current = application.id
    const timer = window.setTimeout(() => {
      trackCandidateActivity(application, 'Candidate dashboard viewed', `Status: ${statusLabel(application.status)}`)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [application])

  // The hiring team works from the admin portal. When they confirm a round,
  // change a Zoom link or update the outcome, this screen refreshes and shows
  // the latest update without the candidate reloading the page.
  useEffect(() => {
    if (application.updatedAt === lastUpdateRef.current) return
    lastUpdateRef.current = application.updatedAt
    const latest = application.events[application.events.length - 1]
    if (!latest) return
    const text = latest.detail ? `${latest.event} — ${latest.detail}` : latest.event
    const timer = window.setTimeout(() => setNotice(text), 0)
    return () => window.clearTimeout(timer)
  }, [application.updatedAt, application.events])

  const update = (updater: (current: Application) => Application) => {
    const updated = updateApplicationById(application.id, updater)
    if (!updated) return null
    onUpdate(updated)
    void writeCandidateRecord(updated)
    return updated
  }

  const joinRound = (round: 1 | 2) => {
    // Never open about:blank. The real Zoom link is opened only after the YOLO
    // check passes; FaceVerification handles that and falls back to a visible
    // button if the browser blocks the automatic tab.
    trackCandidateActivity(application, `Clicked "Verify face & join Round ${round}"`)
    setVerifyRound(round)
  }

  const handleVerified = (_snapshot: string | null, zoomOpened: boolean) => {
    const round = verifyRound
    if (!round) return
    const key = round === 1 ? 'round1' : 'round2'
    update((current) => withEvent(
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
    trackCandidateActivity(
      application,
      `Round ${round} YOLO face verification passed`,
      zoomOpened ? 'Zoom interview opened in a new tab.' : 'Zoom tab blocked; manual Zoom button shown.',
    )
    // If the Zoom tab opened, close the modal. Otherwise keep it open so the
    // candidate can use the manual "Open Zoom" button.
    if (zoomOpened) setVerifyRound(null)
  }

  const handleCloseVerification = () => setVerifyRound(null)

  const requestBossRound = () => {
    trackCandidateActivity(application, 'Clicked "Request Boss Round on WhatsApp"')
    update((current) => withEvent(
      {
        ...current,
        bossRequestedAt: current.bossRequestedAt || new Date().toISOString(),
      },
      'Boss Round requested on WhatsApp',
      'Candidate sent the 3rd Interview message to the Boss.',
    ))
  }

  const sendEmployeeDetails = () => {
    if (application.status !== 'approved' || application.employeeDetailsSentAt) return
    const sentAt = new Date().toISOString()
    update((current) => withEvent(
      { ...current, employeeDetailsSentAt: current.employeeDetailsSentAt || sentAt },
      'Hired employee details sent to hiring review',
      'Premium Employee ID and Office Log-in / Log-out cards are ready for review.',
    ))
    trackCandidateActivity(application, 'Clicked "Send EMPLOYEE Details"')
  }

  const round1Done = application.round1.state === 'completed'
  const round2Done = application.round2.state === 'completed'
  const round2Decision = application.round2Decision
  const selected = Boolean(application.selectedAt)
  // Passing Round 1 (confirmed by the hiring team) unlocks Round 2 automatically.
  // A direct "Selected" decision from the hiring team grants the same access.
  const round2Unlocked = round2Decision !== 'rejected' && (round1Done || selected)
  const round2Rejected = round2Decision === 'rejected'
  const showBossRound = round1Done && round2Done && !round2Rejected
  const approved = application.status === 'approved'
  const rejected = application.status === 'rejected'
  const eligibleToReapply = canReapply(application)
  const whatsappMessage = `Hello, I am ${application.name}. I have completed Virtual Round 1 and Virtual Round 2 for the ${application.role} role. I am selected for the 3rd Interview (Boss Round). Please share the in-person Boss location and time. Candidate ID: ${application.id}. Email: ${application.email}. Phone: ${application.phone}.`
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
  const verificationLink = verifyRound === 1
    ? application.round1.zoomLink
    : verifyRound === 2
      ? application.round2.zoomLink
      : ''

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

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex items-start justify-between gap-3 border border-zara/30 bg-red-50/60 p-4 text-sm"
          >
            <p><b>Latest update:</b> {notice}</p>
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss update" className="text-ink/45 hover:text-zara">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
                <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">{application.id} · {decisionLabel(application)}</p>
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
            <p className="max-w-md text-right text-xs text-ink/45">
              Face verification is required before every Zoom round. Round status is confirmed by the hiring team and
              appears here automatically.
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <RoundCard
              number={1}
              round={application.round1}
              unlocked
              onJoin={() => joinRound(1)}
            />
            <RoundCard
              number={2}
              round={application.round2}
              unlocked={round2Unlocked}
              rejected={round2Rejected}
              blockedMessage={
                !round1Done
                  ? 'Waiting for the hiring team to confirm Round 1. Round 2 unlocks automatically when Round 1 is passed.'
                  : 'Round 1 is passed, but Round 2 is not available for this application.'
              }
              onJoin={() => joinRound(2)}
            />
          </div>
        </section>

        {selected && !approved && !rejected && (
          <section className="mt-6 border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <b>You have been selected.</b>
            </div>
            <p className="mt-1 text-emerald-900/75">
              {round2Done
                ? 'The hiring team selected you. The in-person Boss Round is the next step.'
                : round1Done
                  ? 'The hiring team selected you for Round 2. Your Round 2 Zoom access is ready.'
                  : 'The hiring team selected you. Your interview schedule is confirmed.'}
            </p>
          </section>
        )}

        {round2Rejected && (
          <section className="mt-6 border border-red-300 bg-red-50 p-5 text-sm text-red-900">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5" />
              <b>Not selected for Round 2.</b>
            </div>
            <p className="mt-1 text-red-900/75">
              The hiring team reviewed your Round 1 interview and did not move you to Round 2. Your application is
              closed at this stage. Thank you for interviewing with Indica Software.
            </p>
            <ReapplyNotice application={application} eligible={eligibleToReapply} onReapply={onReapply} />
          </section>
        )}

        {showBossRound && (
          <section className="mt-6">
            <div className="border border-zara/30 bg-red-50/40 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Final round · In person</p>
                  <h2 className="mt-1 text-2xl font-black">BOSS ROUND INTERVIEW</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
                    Both virtual rounds are confirmed complete by the hiring team. The Boss Round is conducted in person
                    at the Boss location only. Send the pre-written WhatsApp message to request your 3rd Interview slot.
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
                    onClick={() => {
                      trackCandidateActivity(application, 'Clicked "HIRED EMPLOYEE"')
                      setHiredOpen(true)
                    }}
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
                      <div className="mt-5 border-t border-ink/10 pt-4">
                        <p className="text-sm font-semibold text-ink">Employee card PDF attachments</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink/60">
                          After the admin confirms receipt, share both sample PDF references with your confirmation.
                          Each is card-sized (85.6 × 54 mm); print at 100% / Actual size, not fit-to-page.
                        </p>
                        {!application.employeeDetailsSentAt ? (
                          <button
                            type="button"
                            onClick={sendEmployeeDetails}
                            className="mt-3 inline-flex items-center gap-2 bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            <Send className="h-3.5 w-3.5" /> Send EMPLOYEE Details
                          </button>
                        ) : (
                          <p role="status" className="mt-3 text-xs text-emerald-800">
                            Employee details sent {formatIST(application.employeeDetailsSentAt)}. The hiring review
                            can now view the cards.
                          </p>
                        )}
                        {application.employeeWhatsappConfirmedAt
                          && application.employeeCardsIssuedAt
                          && application.employeeWhatsappNumber && (
                          <EmployeeCardsShareButton
                            application={application}
                            recipientNumber={application.employeeWhatsappNumber}
                          />
                        )}
                        {application.bossCompletedAt && (
                          <EmployeeVisitCard application={application} />
                        )}
                        {application.bossCompletedAt && (
                          <EmployeeOfferLetter application={application} />
                        )}
                        {application.employeeCardsIssuedAt && (
                          <a
                            href={employeePortalUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackCandidateActivity(application, 'Clicked employee portal button')}
                            className="mt-3 inline-flex items-center gap-2 bg-zara px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink"
                          >
                            Continue to employee portal <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
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
                  <p>Your application was not selected after the Boss Round. Thank you for interviewing with Indica Software.</p>
                  <ReapplyNotice application={application} eligible={eligibleToReapply} onReapply={onReapply} />
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

        {!showBossRound && !round2Rejected && (
          <section className="mt-6 border border-ink/10 bg-white p-5 text-sm text-ink/55">
            <div className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                The Boss Round is hidden until the hiring team confirms both Virtual Round 1 and Virtual Round 2 as
                completed. Status changes appear on this screen automatically.
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
        zoomLink={verificationLink}
        onVerified={handleVerified}
        onClose={handleCloseVerification}
      />
    </>
  )
}
