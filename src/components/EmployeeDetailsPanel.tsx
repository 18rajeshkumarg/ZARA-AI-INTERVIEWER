import { useState, type FormEvent } from 'react'
import { BadgeCheck, Download, Eye, MessageCircle, ShieldCheck } from 'lucide-react'
import {
  formatIST,
  whatsappNumberValid,
  type Application,
} from '../lib/applications'

/**
 * Local admin view of the hired employee's sample reference cards. The admin can view and
 * download the official PDFs, publish the WhatsApp confirmation number, and
 * confirm that the employee physically received the cards. Card content itself
 * is never editable here.
 */
export default function EmployeeDetailsPanel({
  application,
  onViewCards,
  onConfirmCardsReviewed,
  onSaveWhatsapp,
  onSetCardsIssued,
}: {
  application: Application
  onViewCards: () => void
  onConfirmCardsReviewed: () => void
  onSaveWhatsapp: (raw: string) => void
  onSetCardsIssued: (issued: boolean) => void
}) {
  const [error, setError] = useState('')
  const sent = application.employeeDetailsSentAt
  const reviewed = application.employeeCardsReviewedAt
  const confirmed = application.employeeWhatsappConfirmedAt
  const issued = application.employeeCardsIssuedAt
  const number = application.employeeWhatsappNumber

  const stage = issued
    ? 'Cards issued'
    : confirmed
      ? 'WhatsApp live'
      : reviewed
        ? 'Cards reviewed'
        : sent
          ? 'Details received'
          : 'Waiting for employee'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const raw = String(new FormData(event.currentTarget).get('whatsapp') || '')
    if (!whatsappNumberValid(raw)) {
      setError('Enter a valid WhatsApp number with country code, for example +91 98765 43210.')
      return
    }
    setError('')
    onSaveWhatsapp(raw)
  }

  return (
    <div className="mt-3 border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Employee onboarding · sample cards</p>
        <span className="border border-emerald-300 bg-white px-2 py-0.5 font-mono2 text-[9px] uppercase tracking-[0.14em] text-emerald-800">
          {stage}
        </span>
      </div>

      {!sent ? (
        <p className="mt-2 text-xs leading-relaxed text-ink/60">
          Waiting for the hired employee to press <b>Send EMPLOYEE Details</b> on their dashboard. Sample reference
          PDFs appear here after that.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-ink/60">
            Employee details received {formatIST(sent)}. View or download the sample reference PDFs. Each page is exactly
            85.6 × 54 mm, so print or xerox at <b>100% / Actual size</b> to get a card — never fit-to-A4.
          </p>
          <button
            type="button"
            onClick={onViewCards}
            className="mt-2 inline-flex items-center gap-1.5 border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:border-emerald-600"
          >
            <Download className="h-3.5 w-3.5" /> View / download sample cards (PDF)
          </button>

          {!reviewed ? (
            <div className="mt-3 border-t border-emerald-200 pt-3">
              <p className="text-xs text-ink/60">
                Review both PDF cards, then confirm the review before publishing the employee WhatsApp button.
              </p>
              <button
                type="button"
                onClick={onConfirmCardsReviewed}
                className="mt-2 inline-flex items-center gap-1.5 border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:border-emerald-600"
              >
                <Eye className="h-3.5 w-3.5" /> Confirm cards reviewed
              </button>
            </div>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-1.5 border-t border-emerald-200 pt-3 text-xs text-emerald-800">
                <BadgeCheck className="h-3.5 w-3.5" /> Cards reviewed {formatIST(reviewed)}
              </p>
              <form onSubmit={submit} className="mt-3">
                <label className="text-xs font-semibold text-ink/70">
                  WhatsApp number for the hired employee's confirmation message
                  <input
                    name="whatsapp"
                    type="tel"
                    defaultValue={number ? `+${number}` : ''}
                    placeholder="+91 98765 43210"
                    className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-1.5 font-normal"
                  />
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {confirmed ? 'Update WhatsApp number' : 'Confirm & publish WhatsApp button'}
                  </button>
                  {confirmed && number && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800">
                      <BadgeCheck className="h-3.5 w-3.5" /> Live for +{number}
                    </span>
                  )}
                </div>
                {confirmed && number && (
                  <p className="mt-2 text-[11px] text-ink/50">
                    The employee share action includes both PDF files. They must select +{number} in the device
                    share flow and confirm Send; WhatsApp does not let this page lock a recipient.
                  </p>
                )}
                {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
              </form>

              <div className="mt-3 border-t border-emerald-200 pt-3">
                {!confirmed ? (
                  <p className="text-xs text-ink/60">
                    Publish the employee WhatsApp number before confirming physical card receipt.
                  </p>
                ) : !issued ? (
                  <>
                    <p className="text-xs leading-relaxed text-ink/60">
                      After the employee physically receives both Premium cards, confirm it here. The employee portal
                      button then appears automatically on their dashboard.
                    </p>
                    <button
                      type="button"
                      onClick={() => onSetCardsIssued(true)}
                      className="mt-2 inline-flex items-center gap-1.5 border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:border-emerald-600"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Confirm employee received the cards
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-emerald-900">
                      Cards confirmed received {formatIST(issued)}. The employee portal button is live for this employee.
                    </p>
                    <button
                      type="button"
                      onClick={() => onSetCardsIssued(false)}
                      className="mt-2 border border-ink/20 bg-white px-3 py-2 text-xs text-ink/70 hover:border-amber-600 hover:text-amber-700"
                    >
                      Undo cards received
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
