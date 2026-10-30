// Candidate applications, interview scheduling and status transitions.
//
// Everything is stored in localStorage so the static GitHub Pages build works
// on every device without an API. Each application also carries a complete
// activity trail that is mirrored into the project folder when folder access
// is available (see candidateStorage.ts).

export type RoundState = 'scheduled' | 'verified' | 'completed'
export type AppStatus = 'pending' | 'approved' | 'rejected'

export type ActivityEvent = {
  at: string
  event: string
  detail?: string
}

export type InterviewRound = {
  scheduledAt: string
  endsAt: string
  zoomLink: string
  state: RoundState
  verifiedAt?: string
  completedAt?: string
}

export type Application = {
  id: string
  role: string
  name: string
  email: string
  phone: string
  experience: string
  location: string
  about: string
  photoName: string
  photoType: string
  status: AppStatus
  createdAt: string
  updatedAt: string
  interviewDate: string
  round1: InterviewRound
  round2: InterviewRound
  bossRequestedAt?: string
  bossCompletedAt?: string
  approvedAt?: string
  events: ActivityEvent[]
  accountEmail: string
}

const allKey = 'zara_all_applications'
const perAccountPrefix = 'zara_candidate_applications:'

function parseList(raw: string | null): Application[] {
  try {
    const value = JSON.parse(raw || '[]')
    return Array.isArray(value) ? (value as Application[]) : []
  } catch {
    return []
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function istParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** The next calendar day in IST, with the two fixed virtual-round windows. */
export function scheduleNextDay(): {
  interviewDate: string
  round1: { scheduledAt: string; endsAt: string }
  round2: { scheduledAt: string; endsAt: string }
} {
  const today = istParts()
  const base = new Date(Date.UTC(today.year, today.month - 1, today.day + 1, 0, 0, 0))
  const y = base.getUTCFullYear()
  const m = base.getUTCMonth() + 1
  const d = base.getUTCDate()
  const interviewDate = `${y}-${pad2(m)}-${pad2(d)}`
  // IST is UTC+05:30. 11:30 IST = 06:00 UTC, 12:40 IST = 07:10 UTC.
  return {
    interviewDate,
    round1: {
      scheduledAt: new Date(Date.UTC(y, m - 1, d, 6, 0, 0)).toISOString(),
      endsAt: new Date(Date.UTC(y, m - 1, d, 6, 25, 0)).toISOString(),
    },
    round2: {
      scheduledAt: new Date(Date.UTC(y, m - 1, d, 7, 10, 0)).toISOString(),
      endsAt: new Date(Date.UTC(y, m - 1, d, 7, 40, 0)).toISOString(),
    },
  }
}

function hashDigits(input: string, length: number): string {
  let state = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    state ^= input.charCodeAt(i)
    state = Math.imul(state, 16777619)
  }
  let out = ''
  let seed = Math.abs(state)
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    out += String(seed % 10)
  }
  return out
}

/** A deterministic, candidate-specific Zoom join URL for each round. */
export function makeZoomLink(id: string, round: 1 | 2): string {
  const meeting = hashDigits(`${id}-round-${round}-zoom`, 10)
  const pwd = hashDigits(`${id}-round-${round}-pwd`, 8)
  return `https://zoom.us/j/${meeting}?pwd=${pwd}`
}

function upperMeridiem(value: string): string {
  return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase())
}

export function formatIST(iso: string): string {
  try {
    return upperMeridiem(new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso)))
  } catch {
    return iso
  }
}

export function formatISTTime(iso: string): string {
  try {
    return upperMeridiem(new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso)))
  } catch {
    return iso
  }
}

export function formatInterviewDate(interviewDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${interviewDate}T06:00:00.000Z`))
  } catch {
    return interviewDate
  }
}

export function applicationsKey(email: string): string {
  return `${perAccountPrefix}${email.trim().toLowerCase()}`
}

export function readApplications(email: string): Application[] {
  if (!email) return []
  try {
    return parseList(localStorage.getItem(applicationsKey(email)))
  } catch {
    return []
  }
}

export function writeApplications(email: string, applications: Application[]): void {
  try {
    localStorage.setItem(applicationsKey(email), JSON.stringify(applications))
  } catch {
    /* ignore quota errors — the all-applications copy is still attempted */
  }
}

export function readAllApplications(): Application[] {
  const byId = new Map<string, Application>()
  try {
    for (const app of parseList(localStorage.getItem(allKey))) byId.set(app.id, app)
  } catch {
    /* ignore */
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(perAccountPrefix)) continue
      for (const app of parseList(localStorage.getItem(key))) {
        const existing = byId.get(app.id)
        if (!existing || (app.updatedAt || app.createdAt) > (existing.updatedAt || existing.createdAt)) {
          byId.set(app.id, app)
        }
      }
    }
  } catch {
    /* ignore */
  }
  return [...byId.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function writeAllApplications(applications: Application[]): void {
  try {
    localStorage.setItem(allKey, JSON.stringify(applications))
  } catch {
    /* ignore */
  }
}

function notify(id: string): void {
  try {
    window.dispatchEvent(new CustomEvent('zara:applications-updated', { detail: { id } }))
  } catch {
    /* ignore */
  }
}

export function upsertApplication(application: Application): void {
  const all = readAllApplications()
  const allIndex = all.findIndex((item) => item.id === application.id)
  if (allIndex >= 0) all[allIndex] = application
  else all.unshift(application)
  writeAllApplications(all)

  const accountApps = readApplications(application.accountEmail)
  const accountIndex = accountApps.findIndex((item) => item.id === application.id)
  if (accountIndex >= 0) accountApps[accountIndex] = application
  else accountApps.unshift(application)
  writeApplications(application.accountEmail, accountApps)
  notify(application.id)
}

export function updateApplicationById(
  id: string,
  updater: (application: Application) => Application,
): Application | null {
  const current = readAllApplications().find((item) => item.id === id)
  if (!current) return null
  const updated = { ...updater(current), updatedAt: new Date().toISOString() }
  upsertApplication(updated)
  return updated
}

export function withEvent(application: Application, event: string, detail?: string): Application {
  return {
    ...application,
    updatedAt: new Date().toISOString(),
    events: [...(application.events || []), { at: new Date().toISOString(), event, detail }],
  }
}

export type NewApplicationInput = {
  id: string
  role: string
  name: string
  email: string
  phone: string
  experience: string
  location: string
  about: string
  photoName: string
  photoType: string
}

export function buildApplication(input: NewApplicationInput): Application {
  const schedule = scheduleNextDay()
  const now = new Date().toISOString()
  const round1: InterviewRound = {
    ...schedule.round1,
    zoomLink: makeZoomLink(input.id, 1),
    state: 'scheduled',
  }
  const round2: InterviewRound = {
    ...schedule.round2,
    zoomLink: makeZoomLink(input.id, 2),
    state: 'scheduled',
  }
  return {
    ...input,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    interviewDate: schedule.interviewDate,
    round1,
    round2,
    events: [
      {
        at: now,
        event: 'Application submitted',
        detail: `Applied for ${input.role}. Virtual Round 1 scheduled for ${formatIST(round1.scheduledAt)}.`,
      },
    ],
    accountEmail: input.email,
  }
}

export function nextCandidateId(existingIds: string[], folderMax = 0): string {
  let max = folderMax
  for (const id of existingIds) {
    const match = /^candidate-(\d+)$/i.exec(id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `candidate-${String(max + 1).padStart(6, '0')}`
}

export function statusLabel(status: AppStatus): string {
  if (status === 'approved') return 'Hired'
  if (status === 'rejected') return 'Not selected'
  return 'In progress'
}
