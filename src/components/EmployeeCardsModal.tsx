import { useEffect, useState } from 'react'
import { Download, ExternalLink, Loader2, X } from 'lucide-react'
import type { Application } from '../lib/applications'
import { loadApplicationPhoto } from '../lib/candidateStorage'
import {
  downloadBlob,
  generateEmployeeCards,
  idCardFilename,
  logCardFilename,
} from '../lib/employeeCards'

type Tab = 'id' | 'log'

/**
 * Shows the two Premium cards as real PDFs. The PDFs are generated on demand
 * from the saved application, so the admin and the hired employee always see the
 * same official document. Each page is exactly 85.6 x 54 mm (CR80 card size).
 */
export default function EmployeeCardsModal({
  application,
  open,
  onClose,
}: {
  application: Application | null
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('id')
  const [urls, setUrls] = useState<Record<Tab, string> | null>(null)
  const [blobs, setBlobs] = useState<Record<Tab, Blob> | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !application) return
    let active = true
    const created: string[] = []
    void (async () => {
      try {
        const photo = await loadApplicationPhoto(application.id)
        const cards = await generateEmployeeCards(application, photo)
        if (!active) return
        const idUrl = URL.createObjectURL(cards.idCard)
        const logUrl = URL.createObjectURL(cards.logCard)
        created.push(idUrl, logUrl)
        setBlobs({ id: cards.idCard, log: cards.logCard })
        setUrls({ id: idUrl, log: logUrl })
      } catch {
        if (active) setError('The PDF cards could not be generated in this browser.')
      } finally {
        if (active) setBusy(false)
      }
    })()

    return () => {
      active = false
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [open, application])

  if (!open || !application) return null

  const currentUrl = urls ? urls[tab] : ''
  const currentBlob = blobs ? blobs[tab] : null
  const filename = tab === 'id' ? idCardFilename(application) : logCardFilename(application)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Premium employee cards"
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto border border-ink/15 bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-zara">Premium employee cards</p>
            <h2 className="mt-0.5 text-lg font-black">{application.name}</h2>
            <p className="mt-0.5 text-xs text-ink/55">
              Card size 85.6 × 54 mm. Print or xerox at <b>100% / Actual size</b> — never fit-to-A4.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close employee cards"
            className="border border-ink/15 p-1.5 text-ink/60 hover:border-zara hover:text-zara"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('id')}
            aria-pressed={tab === 'id'}
            className={`px-3 py-2 text-xs font-semibold ${tab === 'id' ? 'bg-ink text-white' : 'border border-ink/20 bg-white text-ink/70 hover:border-zara'}`}
          >
            Premium Employee ID Card
          </button>
          <button
            type="button"
            onClick={() => setTab('log')}
            aria-pressed={tab === 'log'}
            className={`px-3 py-2 text-xs font-semibold ${tab === 'log' ? 'bg-ink text-white' : 'border border-ink/20 bg-white text-ink/70 hover:border-zara'}`}
          >
            Office Log-in / Log-out Card
          </button>
        </div>

        <div className="mt-3 flex min-h-[360px] items-center justify-center border border-ink/10 bg-gray-100">
          {busy && (
            <p className="inline-flex items-center gap-2 text-sm text-ink/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating the official PDF…
            </p>
          )}
          {!busy && error && (
            <p role="alert" className="p-4 text-sm text-red-700">{error}</p>
          )}
          {!busy && !error && currentUrl && (
            <iframe
              key={`${tab}-${currentUrl}`}
              src={`${currentUrl}#toolbar=1&navpanes=0&view=FitH`}
              title={tab === 'id' ? 'Premium Employee ID Card PDF' : 'Office Log-in Log-out Card PDF'}
              className="h-[420px] w-full"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!currentBlob}
            onClick={() => { if (currentBlob) downloadBlob(currentBlob, filename) }}
            className="inline-flex items-center gap-1.5 bg-zara px-3 py-2 text-xs font-semibold text-white hover:bg-ink disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download {tab === 'id' ? 'ID card' : 'log card'} PDF
          </button>
          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 border border-ink/20 px-3 py-2 text-xs text-ink/70 hover:border-zara hover:text-zara"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open PDF in a new tab
            </a>
          )}
          <span className="text-[11px] text-ink/45">Vector PDF · exact card size · no A4 scaling</span>
        </div>
      </div>
    </div>
  )
}
