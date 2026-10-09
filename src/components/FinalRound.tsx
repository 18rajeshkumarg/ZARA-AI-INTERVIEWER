import { motion } from 'framer-motion'
import { CheckCircle2, Users, MapPin, ArrowRight, ArrowLeft, CalendarClock } from 'lucide-react'
import { roles } from '../lib/interview'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`

/**
 * Shown after the candidate has completed BOTH online rounds (screening +
 * real interview with ZARA AI). The FINAL round is conducted one-on-one,
 * offline (in person with the hiring panel) — this screen communicates that
 * and links through to the online report.
 */
export default function FinalRound({
  roleIdx,
  onContinue,
  onHome,
}: {
  roleIdx: number
  onContinue: () => void
  onHome: () => void
}) {
  const role = roles[roleIdx]

  return (
    <div className="min-h-screen bg-[#0d0d10] text-paper bg-grid-dark">
      <div className="pointer-events-none fixed inset-0 aurora-dark" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0d10]/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={onHome}
            className="flex cursor-pointer items-center gap-3"
            aria-label="Go to home page"
            title="Home"
          >
            <img src={brandLogo} alt="Indicasoftware The TechHub Platform" className="brand-logo-small" />
            <span className="text-2xl font-black tracking-tight text-zara">ZARA</span>
            <span className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-white/55">Final round</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border border-zara/40 bg-[#121216] p-6 sm:p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 160, damping: 14 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10"
          >
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </motion.div>

          <div className="mt-5 font-mono2 text-[11px] uppercase tracking-[0.3em] text-emerald-400">
            Screening round complete · Real interview complete
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl font-black leading-[0.95] tracking-tight">
            YOU ARE ADVANCED TO THE
            <br />
            <span className="text-zara">FINAL ROUND</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70">
            The final round for <strong className="text-white">{role.title} ({role.level})</strong> is conducted
            <strong className="text-white"> one-on-one, offline</strong> — in person with the hiring panel.
            Both online rounds with ZARA AI (screening + real interview) are complete, recorded and scored.
          </p>

          <div className="mx-auto mt-8 grid max-w-xl gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-3 text-left">
            {[
              { icon: Users, title: 'Format', body: 'One-on-one, in person with the hiring panel' },
              { icon: MapPin, title: 'Location', body: 'On-site at the office — address shared by email' },
              { icon: CalendarClock, title: 'Scheduling', body: 'A recruiter will contact you to fix a slot' },
            ].map((d) => (
              <div key={d.title} className="bg-[#121216] p-4">
                <d.icon className="h-5 w-5 text-zara" />
                <div className="mt-3 font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/70">{d.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{d.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 font-mono2 text-[10px] uppercase leading-relaxed tracking-[0.18em] text-white/45">
            Session data saved to Human_Detection — the camera recording clip lands in
            Human_Detection/video/ automatically, with the voice, transcript and metadata alongside.
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onContinue}
              className="group inline-flex items-center gap-2 bg-zara px-6 py-3 font-mono2 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-white hover:text-ink transition-colors"
            >
              View interview report
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onHome}
              className="inline-flex items-center gap-2 border border-white/25 px-6 py-3 font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-zara hover:text-zara transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Return home
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
