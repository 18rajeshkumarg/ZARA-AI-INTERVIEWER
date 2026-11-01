// Candidate activity tracking.
//
// The hiring team asked to see what a candidate does on the site, including
// every click on a feature. Each application keeps its own activity trail and
// the events are mirrored into `Candidate Applications/Candidates/<id>.txt`
// whenever the project folder is connected. A small site-wide log is kept in
// localStorage so the review page can also show activity that happens before
// an application exists (role pages, sign-in, form validation, …).

import { logActivity, type ActivityEvent, type Application } from './applications'
import { writeCandidateRecord } from './candidateStorage'

const siteKey = 'zara_site_activity'
const siteLimit = 300

export type SiteActivity = ActivityEvent & { email?: string }

function readSiteLog(): SiteActivity[] {
  try {
    const value = JSON.parse(localStorage.getItem(siteKey) || '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SiteActivity => Boolean(item && typeof item.at === 'string' && typeof item.event === 'string'))
  } catch {
    return []
  }
}

/** Most recent site events first, newest last. */
export function readSiteActivity(): SiteActivity[] {
  return readSiteLog()
}

export function trackSiteActivity(event: string, detail?: string, email?: string): void {
  try {
    const entry: SiteActivity = {
      at: new Date().toISOString(),
      event,
      ...(detail ? { detail } : {}),
      ...(email ? { email } : {}),
    }
    localStorage.setItem(siteKey, JSON.stringify([...readSiteLog(), entry].slice(-siteLimit)))
    window.dispatchEvent(new CustomEvent('zara:site-activity-updated'))
  } catch {
    /* private mode / quota — tracking must never break the flow */
  }
}

/**
 * Records an activity for one candidate (and mirrors it into the project
 * folder) or, when there is no application yet, only in the site-wide log.
 */
export function trackCandidateActivity(
  application: Application | null | undefined,
  event: string,
  detail?: string,
): void {
  if (!application) {
    trackSiteActivity(event, detail)
    return
  }
  const updated = logActivity(application.id, event, detail)
  if (updated) void writeCandidateRecord(updated)
  trackSiteActivity(event, detail, application.email)
}
