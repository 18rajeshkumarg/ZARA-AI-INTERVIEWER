import { useState, type FormEvent } from 'react'
import { BadgeCheck, Download, FileSignature, Loader2 } from 'lucide-react'
import {
  formatIST,
  type Application,
  type EmployeeOfferLetter as OfferDetails,
} from '../lib/applications'
import { downloadEmployeeOfferLetter } from '../lib/employeeOfferLetter'
import FaceVerification from './FaceVerification'

const requiredFields = [
  ['employerName', 'Legal employer name', 'text'],
  ['employerAddress', 'Employer address', 'textarea'],
  ['compensation', 'Compensation (include currency and pay basis)', 'text'],
  ['joiningDate', 'Joining date or approved wording', 'text'],
  ['workLocation', 'Work location', 'text'],
  ['employmentType', 'Employment type', 'text'],
  ['probation', 'Probation terms', 'text'],
  ['workingHours', 'Working hours', 'text'],
  ['benefitsAndConditions', 'Benefits and other conditions', 'textarea'],
  ['signatoryName', 'Authorized signatory full name', 'text'],
  ['signatoryTitle', 'Authorized signatory title', 'text'],
] as const

function readSignature(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The signature image could not be read.'))
    }
    reader.onerror = () => reject(new Error('The signature image could not be read.'))
    reader.readAsDataURL(file)
  })
}

function fieldValue(offer: OfferDetails | undefined, name: string): string {
  if (!offer) return ''
  return offer[name as keyof OfferDetails] as string
}

export default function EmployeeOfferLetter({
  application,
  admin = false,
  onIssue,
}: {
  application: Application
  admin?: boolean
  onIssue?: (offer: OfferDetails) => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [verificationOpen, setVerificationOpen] = useState(false)
  const offer = application.employeeOfferLetter

  const issueOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onIssue) return
    const form = event.currentTarget
    const data = new FormData(form)
    const values = Object.fromEntries(requiredFields.map(([name]) => [
      name,
      String(data.get(name) || '').trim(),
    ])) as Record<(typeof requiredFields)[number][0], string>
    const signatureFile = data.get('signature')
    let signatureDataUrl = offer?.signatureDataUrl || ''

    if (signatureFile instanceof File && signatureFile.size > 0) {
      if (!['image/png', 'image/jpeg'].includes(signatureFile.type)) {
        setError('Upload the authorized signatory signature as a PNG or JPEG image.')
        return
      }
      if (signatureFile.size > 512_000) {
        setError('The signature image must be 500 KB or smaller.')
        return
      }
      try {
        signatureDataUrl = await readSignature(signatureFile)
      } catch {
        setError('The signature image could not be read. Please choose another PNG or JPEG file.')
        return
      }
    }

    if (!signatureDataUrl) {
      setError('Upload the authentic, authorized signatory signature before issuing the offer.')
      return
    }
    if (Object.values(values).some((value) => !value)) {
      setError('Complete every offer term with the company-approved information before issuing.')
      return
    }

    setError('')
    onIssue({
      ...values,
      signatureDataUrl,
      issuedAt: new Date().toISOString(),
    })
  }

  const download = async () => {
    if (!offer) return
    setBusy(true)
    setError('')
    try {
      await downloadEmployeeOfferLetter(application, offer)
    } catch {
      setError('The offer letter PDF could not be generated. Check that the company logo and signature are available.')
    } finally {
      setBusy(false)
    }
  }

  const verifyAndDownload = () => {
    setError('')
    setVerificationOpen(true)
  }

  const completePresenceCheck = () => {
    setVerificationOpen(false)
    void download()
  }

  if (!admin && !offer) {
    return (
      <section className="mt-4 border border-sky-200 bg-white p-4">
        <p className="text-sm font-semibold">Employment offer letter</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          Your offer letter will appear here after the hiring team enters the approved employment terms and issues it.
          No offer has been issued yet.
        </p>
      </section>
    )
  }

  if (offer && !admin) {
    return (
      <section className="mt-4 border border-emerald-300 bg-emerald-50/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <BadgeCheck className="h-4 w-4" /> Offer letter issued
        </p>
        <p className="mt-1 text-xs text-ink/60">Issued {formatIST(offer.issuedAt)} · {application.role}</p>
        <button
          type="button"
          disabled={busy}
          onClick={verifyAndDownload}
          className="mt-3 inline-flex items-center gap-2 bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Verify camera presence & download PDF
        </button>
        <p className="mt-2 text-[11px] text-ink/55">
          A one-person camera check is required before download. It does not verify your identity. Print in color. This
          PDF is available in this browser-local candidate portal; no email is sent.
        </p>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
        <FaceVerification
          key={`${application.id}-offer-letter`}
          open={verificationOpen}
          roundLabel="Offer letter"
          candidateName={application.name}
          zoomLink=""
          requireDetector
          mode="presence-check"
          onVerified={completePresenceCheck}
          onClose={() => setVerificationOpen(false)}
        />
      </section>
    )
  }

  return (
    <section className="mt-4 border border-sky-200 bg-sky-50/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <FileSignature className="h-4 w-4 text-sky-800" />
        {offer ? 'Issued offer letter' : 'Prepare offer letter'}
      </h3>
      {offer ? (
        <div className="mt-2">
          <p className="text-xs leading-relaxed text-ink/65">
            Issued {formatIST(offer.issuedAt)}. Reissue only after confirming the approved terms below.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="mt-2 inline-flex items-center gap-2 border border-ink/20 bg-white px-3 py-2 text-xs hover:border-sky-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Preview / download issued PDF
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          Fill in the company-approved terms and upload the authentic authorized signatory signature. The PDF will
          become available in this browser-local candidate portal after you issue it.
        </p>
      )}

      <form key={`${application.id}-${offer?.issuedAt || 'draft'}`} onSubmit={(event) => void issueOffer(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
        {requiredFields.map(([name, label, kind]) => (
          <label key={name} className={`text-xs font-semibold text-ink/70 ${kind === 'textarea' ? 'sm:col-span-2' : ''}`}>
            {label}
            {kind === 'textarea' ? (
              <textarea
                name={name}
                required
                rows={3}
                defaultValue={fieldValue(offer, name)}
                className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-normal"
              />
            ) : (
              <input
                name={name}
                type="text"
                required
                defaultValue={fieldValue(offer, name)}
                className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-normal"
              />
            )}
          </label>
        ))}
        <label className="text-xs font-semibold text-ink/70 sm:col-span-2">
          Authorized signatory signature (PNG/JPEG, max 500 KB)
          <input
            name="signature"
            type="file"
            accept="image/png,image/jpeg"
            required={!offer?.signatureDataUrl}
            className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-normal"
          />
          {offer?.signatureDataUrl && (
            <img src={offer.signatureDataUrl} alt="Saved authorized signatory signature" className="mt-2 h-12 max-w-48 bg-white object-contain p-1" />
          )}
        </label>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-ink/70 sm:col-span-2">
          <input type="checkbox" name="authorization" required className="mt-0.5" />
          I confirm these terms are approved by the employer and I am authorized to issue this offer letter with the
          uploaded authentic signature.
        </label>
        <button
          type="submit"
          className="w-fit bg-sky-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink sm:col-span-2"
        >
          {offer ? 'Confirm terms and reissue offer' : 'Issue offer letter to candidate portal'}
        </button>
        {error && <p role="alert" className="text-xs text-red-700 sm:col-span-2">{error}</p>}
      </form>
      <p className="mt-3 border-t border-sky-200 pt-2 text-[11px] leading-relaxed text-ink/55">
        Browser-local flow only: this does not email the PDF or synchronize it across devices. The admin passcode is a
        client-side gate, not server-enforced access.
      </p>
    </section>
  )
}
