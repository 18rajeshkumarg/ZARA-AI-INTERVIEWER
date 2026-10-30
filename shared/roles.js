// Single source of truth for the hiring roles shown on the application site
// and accepted by the optional API prototype in `server/`.
//
// Keep this file plain JavaScript so both the Vite frontend and Node can
// import it without a build step.

export const ROLES = [
  'Full Stack Developer + Integrations',
  'Admin/Audit Manager',
  'AI Automations',
  'AI Developer',
  'Android/IOS Developer',
  'Voice/Non-Voice Process',
  'Sales & Marketing',
  'HR',
  'Recruiter & Consulting Team',
  'Onboarding Process Team',
  'Customer Support Representative',
]

/** URL-safe form of a role title, e.g. "AI Developer" → "ai-developer". */
export function roleSlug(role) {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/** Resolve a `:roleId` route parameter back to the role title, if it exists. */
export function roleFromSlug(id) {
  if (!id) return undefined
  return ROLES.find((role) => roleSlug(role) === id)
}
