import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Download } from 'lucide-react'
import { roles, candidates } from '../lib/interview'
import type { AnswerRecord } from './InterviewRoom'

export default function Report({
  roleIdx,
  candIdx,
  answers,
  onRestart,
}: {
  roleIdx: number
  candIdx: number
  answers: AnswerRecord[]
  onRestart: () => void
}) {
  const role = roles[roleIdx]
  const cand = candidates[candIdx]

  const total = role.questions.length * 20
  const overall = useMemo(() => {
    const s = answers.reduce(
      (acc, a) => ({
        structure: acc.structure + (a.scores.structure ?? 0),
        vocab: acc.vocab + (a.scores.vocab ?? 0),
        fluency: acc.fluency + (a.scores.fluency ?? 0),
        confidence: acc.confidence + (a.scores.confidence ?? 0),
      }),
      { structure: 0, vocab: 0, fluency: 0, confidence: 0 },
    )
    return {
      structure: Math.round((s.structure / total) * 100),
      vocab: Math.round((s.vocab / total) * 100),
      fluency: Math.round((s.fluency / total) * 100),
      confidence: Math.round((s.confidence / total) * 100),
    }
  }, [answers, total])

  const dims = [
    ['Structure', overall.structure],
    ['Technical vocabulary', overall.vocab],
    ['Vocal fluency', overall.fluency],
    ['Confidence', overall.confidence],
  ] as const
  const avg = Math.round((overall.structure + overall.vocab + overall.fluency + overall.confidence) / 4)
  const kwHits = useMemo(() => {
    const set = new Set<string>()
    answers.forEach((a) => a.kw.forEach((k) => set.add(k)))
    return role.keywords.filter((k) => set.has(k))
  }, [answers, role])

  const verdict =
    avg >= 85 ? 'Strong hire' : avg >= 70 ? 'Hire' : avg >= 55 ? 'Lean hire' : 'No hire'

  const download = () => {
    const lines = [
      `ZARA AI INTERVIEW — ${cand.name} — ${role.title}`,
      `Date: ${new Date().toLocaleString()}`,
      ``,
      `Overall: ${avg} · Verdict: ${verdict}`,
      ...dims.map(([l, v]) => `  ${l}: ${v}`),
      `Keyword coverage: ${kwHits.length}/${role.keywords.length} (${kwHits.join(', ') || 'n/a'})`,
      ``,
      ...answers.map((a, i) => `Q${i + 1}: ${a.q}\nA: ${a.text}\nFeedback: ${a.feedback}`),
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zara-interview-${cand.name.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 aurora-light" aria-hidden="true" />
      <header className="border-b border-ink/10 bg-paper/85 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-baseline gap-2">
            <img src="/indicasoftware-logo.svg" alt="Indicasoftware The TechHub Platform" className="brand-logo-small" />
            <span className="text-2xl font-black tracking-tight text-zara">ZARA</span>
            <span className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-ink/55">Interview report</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={download}
              className="inline-flex items-center gap-1.5 border border-ink/25 px-3.5 py-2 font-mono2 text-[10px] uppercase tracking-[0.16em] hover:border-ink transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-1.5 bg-ink px-3.5 py-2 font-mono2 text-[10px] uppercase tracking-[0.16em] text-paper hover:bg-zara transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New interview
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border border-ink/15 bg-ink text-paper p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-zara">{role.title} · {role.level}</div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">{cand.name}</h1>
              <div className="mt-1.5 text-sm text-paper/60">
                {cand.title} · {cand.years} yrs · {cand.city}, {cand.country}
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl sm:text-6xl font-black text-zara">{avg}<span className="text-paper text-2xl">/100</span></div>
              <div className="mt-1 inline-block border border-zara/50 px-3 py-1 font-mono2 text-[11px] uppercase tracking-[0.2em] text-zara">
                {verdict}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-4">
            {dims.map(([l, v]) => (
              <div key={l} className="bg-ink p-4">
                <div className="text-2xl font-black">{v}</div>
                <div className="mt-1 font-mono2 text-[9px] uppercase tracking-[0.16em] text-paper/50">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-paper/50">Keyword coverage:</span>
            {kwHits.map((k) => (
              <span key={k} className="border border-emerald-400/40 px-2 py-0.5 font-mono2 text-[10px] uppercase tracking-[0.12em] text-emerald-300">{k}</span>
            ))}
            {kwHits.length === 0 && <span className="text-sm text-paper/40">no tracked keywords surfaced</span>}
          </div>
        </motion.div>

        <div className="mt-8 space-y-4">
          {answers.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="border border-ink/15 bg-white"
            >
              <div className="border-b border-ink/10 px-5 py-3">
                <div className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-zara">Question {i + 1}</div>
                <div className="mt-1 text-base font-bold leading-snug">{a.q}</div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-ink/80">{a.text}</p>
                <p className="mt-3 border-l-2 border-zara pl-3 text-sm leading-relaxed text-ink/70">{a.feedback}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
