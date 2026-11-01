import { type FormEvent } from 'react'
import { CalendarDays, FileText, Save } from 'lucide-react'
import {
  employeeOnboardingWindow,
  formatIST,
  type Application,
} from '../lib/applications'

export default function EmployeeVisitCard({
  application,
  editable = false,
  onSaveDocuments,
}: {
  application: Application
  editable?: boolean
  onSaveDocuments?: (documents: string) => void
}) {
  const window = employeeOnboardingWindow(application)
  const documents = application.employeeOriginalDocuments?.trim() || ''
  const documentItems = documents.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)

  if (!window) return null

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSaveDocuments?.(String(form.get('documents') || '').trim())
  }

  return (
    <section className="mt-4 border border-sky-200 bg-white p-4 shadow-sm" aria-label="Employee onboarding visit card">
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
          <h3 className="mt-1 text-lg font-bold text-ink">Original documents visit</h3>
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
        {documentItems.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/75">
            {documentItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
          </ul>
        ) : (
          <p role="status" className="mt-2 text-sm leading-relaxed text-amber-800">
            The document checklist from the reference image has not been provided. Please confirm the required original
            documents with the hiring team before travelling.
          </p>
        )}
      </div>

      {editable && onSaveDocuments && (
        <form key={documents} onSubmit={save} className="mt-4 border-t border-ink/10 pt-3">
          <label className="block text-xs font-semibold text-ink/70">
            Admin: original-document checklist (one item per line)
            <textarea
              name="documents"
              defaultValue={documents}
              rows={4}
              placeholder="Paste the exact checklist from Image 2"
              className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-normal"
            />
          </label>
          <button
            type="submit"
            className="mt-2 inline-flex items-center gap-1.5 bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-zara"
          >
            <Save className="h-3.5 w-3.5" /> Save checklist
          </button>
        </form>
      )}
    </section>
  )
}
