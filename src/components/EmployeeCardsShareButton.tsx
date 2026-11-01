import { useEffect, useState } from 'react'
import { Loader2, MessageCircle, Share2 } from 'lucide-react'
import { employeeCode, type Application } from '../lib/applications'
import { loadApplicationPhoto } from '../lib/candidateStorage'
import {
  downloadBlob,
  generateEmployeeCards,
  idCardFilename,
  logCardFilename,
} from '../lib/employeeCards'

type ShareFiles = {
  files: File[]
  code: string
}

export default function EmployeeCardsShareButton({
  application,
  recipientNumber,
}: {
  application: Application
  recipientNumber: string
}) {
  const [shareFiles, setShareFiles] = useState<ShareFiles | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [manualAttach, setManualAttach] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const photo = await loadApplicationPhoto(application.id)
        const cards = await generateEmployeeCards(application, photo)
        if (!active) return
        setShareFiles({
          code: employeeCode(application),
          files: [
            new File([cards.idCard], idCardFilename(application), { type: 'application/pdf' }),
            new File([cards.logCard], logCardFilename(application), { type: 'application/pdf' }),
          ],
        })
      } catch {
        if (active) setError('The sample reference PDFs could not be prepared for sharing.')
      } finally {
        if (active) setBusy(false)
      }
    })()
    return () => { active = false }
  }, [application])

  const share = async () => {
    if (!shareFiles) return
    const message = `Hello, I am ${application.name} (${shareFiles.code}). I have received my Employee ID Card and Employee Office Log-in / Log-out Card for the ${application.role} role. This is my confirmation message. The two attached PDFs are sample references only, not official credentials. Please send this to the company WhatsApp number +${recipientNumber}.`
    const data: ShareData = {
      title: 'Employee card request',
      text: message,
      files: shareFiles.files,
    }

    if (!navigator.share || !navigator.canShare?.(data)) {
      setManualAttach(true)
      setError('This browser cannot attach files through its share sheet. Download both PDFs below, then open the company WhatsApp chat and attach them manually.')
      return
    }

    try {
      await navigator.share(data)
      setNotice(`The share sheet closed. In WhatsApp, select +${recipientNumber}, verify both PDF attachments are present, and press Send. Nothing is sent until you confirm.`)
      setError('')
      setManualAttach(false)
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') {
        setNotice('Sharing was canceled; nothing was sent.')
        return
      }
      setError('The share sheet could not be opened. No message was sent.')
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy || !shareFiles}
        onClick={() => void share()}
        className="inline-flex items-center gap-2 border border-emerald-300 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:border-emerald-600 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
        {busy ? 'Preparing both PDFs…' : 'Attach both PDFs and confirm on WhatsApp'}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-ink/55">
        Shares both PDF files with the confirmation text. The device share sheet cannot lock a WhatsApp recipient:
        choose +{recipientNumber}, verify both attachments, then press Send. No message is sent automatically.
      </p>
      {manualAttach && shareFiles && (
        <div className="mt-3 flex flex-wrap gap-2">
          {shareFiles.files.map((file) => (
            <button
              key={file.name}
              type="button"
              onClick={() => downloadBlob(file, file.name)}
              className="border border-ink/20 bg-white px-3 py-2 text-xs text-ink/75 hover:border-zara"
            >
              Download {file.name.includes('Employee-ID') ? 'ID card PDF' : 'Log-in / Log-out card PDF'}
            </button>
          ))}
          <a
            href={`https://wa.me/${recipientNumber}?text=${encodeURIComponent(`Hello, I am ${application.name} (${shareFiles.code}). I have received my Employee ID Card and Employee Office Log-in / Log-out Card for the ${application.role} role. This is my confirmation message. The two PDFs are sample references only, not official credentials.`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Open company WhatsApp
          </a>
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-xs text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-amber-800">{error}</p>}
    </div>
  )
}
