import { CalendarDays, FileText } from 'lucide-react'
import { employeeOnboardingWindow, formatIST, type Application } from '../lib/applications'

const documentChecklist = [
  {
    title: 'Copy of Educational Certificates',
    items: ['10th', '10+2', 'Graduation', 'Post-Graduation', 'Course Certifications (if applicable)'],
  },
  {
    title: 'Pay Slip',
    items: ['Pay slips for the last 3 months of employment from the previous employer.'],
  },
  {
    title: 'Service and Relieving Letters',
    items: ['From all previous employers.'],
  },
  {
    title: 'Proof of Identity – 3 Copies Each',
    items: [
      'PAN Card',
      'Aadhaar Card (Without Aadhaar card, credentials cannot be created)',
      'Passport (if international employee)',
    ],
  },
  {
    title: '6 Passport Size Photographs',
    items: ['With white background.'],
  },
  {
    title: 'Cancelled Cheque or Bank Account Passbook Copy',
    items: ['Not required if a new bank account is created.'],
  },
  {
    title: 'INDICA SOFTWARE Offer Letter',
    items: ['Signed copy from the candidate.'],
  },
]

export default function EmployeeVisitCard({ application }: {
  application: Application
}) {
  const window = employeeOnboardingWindow(application)

  if (!window) return null

  return (
    <section className="mt-4 border border-sky-200 bg-white p-4 shadow-sm" aria-label="Employee onboarding document card">
      <div className="flex items-start gap-3">
        <img
          src={`${import.meta.env.BASE_URL}indicasoftware-logo.svg`}
          alt="Indica Software logo"
          className="h-14 w-14 shrink-0 object-contain"
        />
        <div>
          <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-sky-800">
            Indica Software · Onboarding visit
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">Onboarding · Original Documents</h3>
          <p className="mt-1 text-sm font-semibold text-ink/75">
            {application.name} · {application.role}
          </p>
          <p className="mt-0.5 font-mono2 text-[10px] text-ink/50">{application.id}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/75">
            <CalendarDays className="h-4 w-4 text-sky-700" />
            {formatIST(window.start)} – {formatIST(window.end)} IST
          </p>
          <p className="mt-1 text-xs text-ink/55">
            Scheduled for the day after both hiring approval and Boss Round completion.
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-ink/10 pt-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/65">
          <FileText className="h-3.5 w-3.5" /> Original documents to bring
        </p>
        <ol className="mt-3 space-y-2.5 text-sm text-ink/75">
          {documentChecklist.map((group) => (
            <li key={group.title}>
              <p className="font-semibold">{group.title}</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs leading-relaxed">
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Important Note: Candidates with incomplete documents would not be onboarded.
        </p>
      </div>
    </section>
  )
}
