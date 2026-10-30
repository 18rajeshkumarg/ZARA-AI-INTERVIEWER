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

/** Extra copy used by the role cards on the home page. */
export const ROLE_DETAILS = {
  'Full Stack Developer + Integrations': {
    department: 'Engineering',
    blurb: 'Build web applications, connect APIs and ship reliable third-party integrations.',
    tags: ['React', 'Node.js', 'APIs', 'Integrations'],
  },
  'Admin/Audit Manager': {
    department: 'Operations',
    blurb: 'Own audits, compliance checks, documentation and day-to-day administrative control.',
    tags: ['Audit', 'Compliance', 'Operations'],
  },
  'AI Automations': {
    department: 'Automation',
    blurb: 'Design AI-powered workflows that remove manual work across business teams.',
    tags: ['Workflows', 'AI tools', 'Automation'],
  },
  'AI Developer': {
    department: 'Engineering',
    blurb: 'Build AI features, agents and model-powered products from prototype to production.',
    tags: ['Python', 'LLMs', 'Agents', 'ML'],
  },
  'Android/IOS Developer': {
    department: 'Engineering',
    blurb: 'Ship polished mobile experiences for Android and iOS users.',
    tags: ['Android', 'iOS', 'React Native', 'Flutter'],
  },
  'Voice/Non-Voice Process': {
    department: 'Process',
    blurb: 'Handle voice and non-voice customer processes with accuracy and empathy.',
    tags: ['Voice', 'Chat', 'Back office'],
  },
  'Sales & Marketing': {
    department: 'Growth',
    blurb: 'Drive pipeline, campaigns and customer acquisition for a growing software company.',
    tags: ['Sales', 'Marketing', 'Growth'],
  },
  HR: {
    department: 'People',
    blurb: 'Support people operations, policy, culture and the employee experience.',
    tags: ['People ops', 'Policy', 'Culture'],
  },
  'Recruiter & Consulting Team': {
    department: 'Talent',
    blurb: 'Source, screen and advise candidates and clients throughout the hiring journey.',
    tags: ['Recruiting', 'Consulting', 'Screening'],
  },
  'Onboarding Process Team': {
    department: 'Customer success',
    blurb: 'Guide new hires and customers through a smooth, well-documented onboarding.',
    tags: ['Onboarding', 'Training', 'Documentation'],
  },
  'Customer Support Representative': {
    department: 'Support',
    blurb: 'Resolve customer questions across channels with clear, friendly communication.',
    tags: ['Support', 'Communication', 'Troubleshooting'],
  },
}

/** URL-safe form of a role title, e.g. "AI Developer" → "ai-developer". */
export function roleSlug(role) {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/** Resolve a `:roleId` route parameter back to the role title, if it exists. */
export function roleFromSlug(id) {
  if (!id) return undefined
  return ROLES.find((role) => roleSlug(role) === id)
}

/** Resolve extra role copy, with a safe fallback. */
export function roleDetails(role) {
  return ROLE_DETAILS[role] || { department: 'Hiring', blurb: 'Join the Indica Software team.', tags: [] }
}
