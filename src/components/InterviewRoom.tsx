import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, SkipForward, X } from 'lucide-react'
import { roles, candidates, type ScoreMap } from '../lib/interview'

export interface AnswerRecord {
  q: string
  text: string
  feedback: string
  scores: ScoreMap
  kw: string[]
}

const ROLE0 = roles[0]

export default function InterviewRoom({
  roleIdx,
  candIdx,
  onExit,
  onFinish,
}: {
  roleIdx: number
  candIdx: number
  onExit: () => void
  onFinish: (answers: AnswerRecord[]) => void
}) {
  const role = roles[roleIdx]
  const cand = candidates[candIdx]

  const [phase, setPhase] = useState<'ask' | 'typing' | 'answer' | 'feedback'>('ask')
  const [qi, setQi] = useState(0)
  const [scores, setScores] = useState<ScoreMap>({ structure: 0, vocab: 0, fluency: 0, confidence: 0 })
  const [history, setHistory] = useState<AnswerRecord[]>([])
  const [pick, setPick] = useState<number | null>(null)
  const [wave, setWave] = useState<number[]>(() => Array.from({ length: 24 }, () => 8))
  const timer = useRef<number | null>(null)
  const doneRef = useRef(false)

  const question = role.questions[qi]

  // Live waveform animation
  useEffect(() => {
    const id = window.setInterval(() => {
      setWave((w) => w.map(() => 6 + Math.random() * 26))
    }, 140)
    return () => window.clearInterval(id)
  }, [])

  // Advance ask -> answer phase (model asks question shortly after)
  useEffect(() => {
    if (phase !== 'ask') return
    setPick(null)
    timer.current = window.setTimeout(() => setPhase('answer'), 900)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [phase, qi])

  const beginFeedback = (ansIdx: number) => {
    const ans = question.answers[ansIdx]
    const rec: AnswerRecord = { q: question.q, text: ans.text, feedback: ans.feedback, scores: ans.scores, kw: ans.kw }
    const nh = [...history, rec]
    setHistory(nh)
    setScores((s) => ({
      structure: (s.structure ?? 0) + (ans.scores.structure ?? 0),
      vocab: (s.vocab ?? 0) + (ans.scores.vocab ?? 0),
      fluency: (s.fluency ?? 0) + (ans.scores.fluency ?? 0),
      confidence: (s.confidence ?? 0) + (ans.scores.confidence ?? 0),
    }))
    setPhase('feedback')
    setPick(ansIdx)
    doneRef.current = false
  }

  const next = () => {
    const rec = history[history.length - 1]
    if (qi + 1 < role.questions.length) {
      setQi(qi + 1)
      setPhase('ask')
    } else {
      if (doneRef.current) return
      doneRef.current = true
      onFinish(history)
    }
    void rec
  }

  const liveScore = (key: keyof ScoreMap) => {
    const total = role.questions.length * 20
    const v = scores[key] ?? 0
    return Math.round((v / total) * 100)
  }

  const dimVal = liveScore('vocab')
  const isLast = qi + 1 >= role.questions.length

  return (
    <div className="min-h-screen bg-[#0d0d10] text-paper bg-grid-dark">
      <div className="pointer-events-none fixed inset-0 aurora-dark" aria-hidden="true" />
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0d10]/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl font-black tracking-tight text-zara">ZARA</span>
            <div className="h-5 w-px bg-white/15" />
            <div className="min-w-0">
              <div className="truncate font-mono2 text-[11px] uppercase tracking-[0.16em] text-white/80">
                {role.title} — {cand.name}
              </div>
              <div className="font-mono2 text-[10px] uppercase tracking-[0.14em] text-white/45">
                {cand.city}, {cand.country} · {cand.tz.split('/').pop()}
              </div>
            </div>
          </div>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 font-mono2 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-zara hover:text-zara transition-colors"
          >
            <X className="h-3.5 w-3.5" /> End
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        {/* Interview stage */}
        <section className="border border-white/12 bg-[#121216]">
          {/* Stage bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-zara ping-slow" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-zara" />
              </span>
              <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/60">
                {phase === 'answer' ? 'Listening' : phase === 'feedback' ? 'Scoring' : 'Calibrating question'}
              </span>
            </div>
            <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/40">
              Q {Math.min(qi + 1, role.questions.length)} / {role.questions.length}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {/* Waveform */}
            <div className="flex h-14 items-center gap-1 rounded border border-white/10 bg-black/40 px-3">
              <Volume2 className="mr-2 h-4 w-4 text-zara" />
              {wave.map((h, i) => (
                <div
                  key={i}
                  className="wave-bar w-[5px] rounded-sm bg-gradient-to-t from-zara/50 to-zara"
                  style={{ height: `${h}%`, animationDelay: `${i * 45}ms`, animationDuration: `${900 + (i % 5) * 130}ms` }}
                />
              ))}
            </div>

            {/* Question */}
            <div className="mt-6">
              <div className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-zara">Question {qi + 1}</div>
              <AnimatePresence mode="wait">
                <motion.h2
                  key={qi}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 text-2xl sm:text-[28px] font-black leading-tight tracking-tight"
                >
                  {question.q}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* Answer options / candidate speech */}
            <div className="mt-6 space-y-3">
              {phase === 'answer' && (
                <>
                  <p className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/45">
                    Simulating {cand.name.split(' ')[0]} typing a response…
                  </p>
                  {question.answers.map((a, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.35 }}
                      onClick={() => beginFeedback(i)}
                      className="group block w-full rounded border border-white/15 bg-white/[0.03] p-4 text-left text-sm leading-relaxed text-white/85 transition-colors hover:border-zara hover:bg-zara/10"
                    >
                      <span className="mr-2 font-mono2 text-[10px] text-zara">{String.fromCharCode(65 + i)}</span>
                      {a.text}
                    </motion.button>
                  ))}
                </>
              )}

              {phase === 'feedback' && history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="rounded border border-zara/40 bg-zara/[0.07] p-4">
                    <div className="text-sm leading-relaxed text-white/90">
                      <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-zara">Candidate said → </span>
                      {history[history.length - 1].text}
                    </div>
                    <div className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-white/75">
                      <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-emerald-400">AI feedback → </span>
                      {history[history.length - 1].feedback}
                    </div>
                    {history[history.length - 1].kw.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {history[history.length - 1].kw.map((k) => (
                          <span key={k} className="border border-emerald-400/40 px-2 py-0.5 font-mono2 text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                            kw: {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={next}
                    className="group inline-flex items-center gap-2 bg-zara px-5 py-2.5 font-mono2 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-white hover:text-ink transition-colors"
                  >
                    {isLast ? 'Generate report' : 'Next question'}
                    <SkipForward className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Live scoring panel */}
        <aside className="space-y-4">
          <div className="border border-white/12 bg-[#121216] p-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-zara" />
              <h3 className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/70">Live dimensions</h3>
            </div>
            {([
              ['structure', 'Structure'],
              ['vocab', 'Technical vocabulary'],
              ['fluency', 'Vocal fluency'],
              ['confidence', 'Confidence'],
            ] as const).map(([key, label]) => {
              const v = key === 'vocab' ? dimVal : liveScore(key)
              return (
                <div key={key} className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-white/70">{label}</span>
                    <span className="font-mono2 text-sm font-bold text-white">{v}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-white/10">
                    <motion.div
                      className="h-full rounded bg-gradient-to-r from-zara/60 to-zara"
                      animate={{ width: `${v}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border border-white/12 bg-[#121216] p-4">
            <h3 className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/70">Transcript</h3>
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1 no-scrollbar">
              {history.length === 0 && (
                <p className="text-xs text-white/40">
                  <span className="typing-dot inline-block">.</span>
                  <span className="typing-dot inline-block" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="typing-dot inline-block" style={{ animationDelay: '0.4s' }}>.</span>
                  <span className="ml-1">Waiting for first answer…</span>
                </p>
              )}
              {history.map((h, i) => (
                <div key={i} className="border-l-2 border-zara/60 pl-3">
                  <div className="font-mono2 text-[9px] uppercase tracking-[0.18em] text-white/40">Q{i + 1}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-white/75">{h.text}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

export { ROLE0 }
