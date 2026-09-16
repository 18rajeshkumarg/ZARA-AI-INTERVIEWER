import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Globe2, Mic, BrainCircuit, LineChart, ChevronDown } from 'lucide-react'
import { candidates, roles } from '../lib/interview'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`

const faqs = [
  {
    q: 'How does the AI interviewer work?',
    a: 'It conducts a structured conversation — asking a calibrated question, adapting follow-ups to each candidate, and probing for evidence. Speech is transcribed live, scored against your role, and every score links back to the exact answer that produced it.',
  },
  {
    q: 'Which candidates can I interview?',
    a: 'Anyone, anywhere. Each candidate runs in their own localised session (language and timezone aware), so you can interview a candidate in Lagos, Tokyo or Buenos Aires while your team works in New York — without timezone maths or language barriers.',
  },
  {
    q: 'What does the AI actually measure?',
    a: 'Four live dimensions: structure (logical flow of an answer), technical vocabulary (domain keyword coverage), vocal fluency (pace and filler detection), and confidence (certainty and hedging language). The final report combines them into a comparable score with per-answer feedback.',
  },
  {
    q: 'How is my hiring data handled?',
    a: 'Demo data is generated on the fly and nothing is stored. In a production deployment, answers are processed per-session, encrypted in transit and at rest, and retained only for the interviews your organisation explicitly keeps.',
  },
  {
    q: 'Can I interview for multiple roles?',
    a: 'Yes — each role ships with its own calibrated question bank, keyword tracker and scorecard rubric. Pick a role, interview in parallel, and compare candidates on the same dimensions.',
  },
]

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-ink/20 bg-paper">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold leading-snug">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zara transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-4 text-sm leading-relaxed text-ink/70">{a}</p>
      </motion.div>
    </div>
  )
}

export default function Landing({ onStart, onPick }: { onStart: (role: number, cand: number) => void; onPick?: (role: number, cand: number) => void }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 aurora-light" aria-hidden="true" />
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Indicasoftware The TechHub Platform" className="brand-logo-small brand-logo" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-zara">ZARA</span>
              <span className="font-mono2 text-[11px] uppercase tracking-[0.28em] text-ink/60">AI Interview</span>
            </div>
          </div>
          <a href="#roles" className="font-mono2 text-[11px] uppercase tracking-[0.22em] text-ink/70 hover:text-zara transition-colors">Roles</a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-grid-light border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono2 text-[11px] uppercase tracking-[0.34em] text-zara"
          >
            Interview any candidate, anywhere
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-4 text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight"
          >
            HIRE AT
            <br />
            <span className="text-zara">SPEED</span> WITH WIT<span className="align-top text-zara">.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-ink/70"
          >
            A live AI interviewer conducts structured interviews, tracks technical depth, fluency and confidence in real time — so your team can interview one candidate while the rest keep moving.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={() => onStart(0, 0)}
              className="group inline-flex items-center gap-2 bg-ink px-6 py-3 font-mono2 text-[12px] uppercase tracking-[0.2em] text-paper hover:bg-zara transition-colors"
            >
              Start a demo interview
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a href="#how" className="inline-flex items-center gap-2 border border-ink/25 px-6 py-3 font-mono2 text-[12px] uppercase tracking-[0.2em] hover:border-ink transition-colors">
              How it works
            </a>
          </motion.div>

          {/* Live ticker of sample scores */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-px overflow-hidden border border-ink/15 bg-ink/15"
          >
            {[
              { label: 'Technical depth', val: '87', delta: '+12' },
              { label: 'Vocal fluency', val: '74', delta: '+8' },
              { label: 'Composure', val: '91', delta: '+5' },
            ].map((s) => (
              <div key={s.label} className="bg-paper px-3 py-4">
                <div className="text-2xl sm:text-3xl font-black text-ink">
                  {s.val}
                  <span className="text-zara">.</span>
                </div>
                <div className="mt-1 font-mono2 text-[10px] uppercase tracking-[0.14em] text-ink/55">{s.label}</div>
                <div className="font-mono2 text-[10px] text-emerald-600">{s.delta}% vs last</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Candidate marquee */}
      <section className="overflow-hidden border-b border-ink/10 bg-ink text-paper">
        <div className="animate-marquee flex w-max gap-10 py-4 pl-10">
          {[...candidates, ...candidates].map((c, i) => (
            <div key={i} className="flex items-center gap-3 whitespace-nowrap">
              <Globe2 className="h-4 w-4 text-zara" />
              <span className="font-mono2 text-[12px] uppercase tracking-[0.18em]">
                {c.name} · {c.city}, {c.country}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">FROM FIRST CALL TO STRUCTURED SIGNAL</h2>
          <div className="mt-10 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
            {[
              { icon: Mic, title: '01 · Conduct', body: 'The AI interviewer asks calibrated questions, adapts follow-ups to each candidate, and probes for evidence — in any candidate\u2019s native language and timezone.' },
              { icon: BrainCircuit, title: '02 · Assess', body: 'Speech-to-text feeds our scorers: structure, technical vocabulary, fluency and confidence are scored live, with every claim traceable back to a moment in the interview.' },
              { icon: LineChart, title: '03 · Decide', body: 'A full report lands in seconds — dimension scores, keyword coverage, per-answer feedback and a comparable verdict across your global pipeline.' },
            ].map((s) => (
              <div key={s.title} className="bg-paper p-6">
                <s.icon className="h-6 w-6 text-zara" />
                <h3 className="mt-4 font-mono2 text-[12px] uppercase tracking-[0.2em]">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="border-b border-ink/10 bg-grid-light">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">PICK A ROLE & A CANDIDATE</h2>
          <div className="mt-8 space-y-6">
            {roles.map((role, ri) => (
              <div key={role.id} className="border border-ink/20 bg-paper">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-5 py-4">
                  <div>
                    <div className="text-xl font-black tracking-tight">{role.title}</div>
                    <div className="font-mono2 text-[11px] uppercase tracking-[0.18em] text-ink/55">{role.level} · {role.duration}</div>
                  </div>
                  <button
                    onClick={() => onStart(ri, 0)}
                    className="group inline-flex items-center gap-2 bg-zara px-5 py-2.5 font-mono2 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-ink transition-colors"
                  >
                    Interview
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 px-5 py-3">
                  {role.keywords.map((k) => (
                    <span key={k} className="border border-ink/20 px-2.5 py-1 font-mono2 text-[10px] uppercase tracking-[0.14em] text-ink/60">{k}</span>
                  ))}
                </div>
                {onPick && (
                  <div className="flex flex-wrap gap-2 border-t border-ink/15 px-5 py-3">
                    {candidates.map((c, ci) => (
                      <button
                        key={c.id}
                        onClick={() => onPick(ri, ci)}
                        className="border border-ink/25 px-3 py-1.5 font-mono2 text-[10px] uppercase tracking-[0.12em] hover:border-zara hover:text-zara transition-colors"
                      >
                        {c.name} · {c.countryCode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">FREQUENTLY ASKED</h2>
          <p className="mt-2 text-sm text-ink/60">Everything you need to know about AI-conducted interviews.</p>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Indicasoftware The TechHub Platform" className="brand-logo-small" />
            <span className="text-2xl font-black tracking-tight text-zara">ZARA</span>
          </div>
          <p className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-paper/50">© 2025 Indica Software All rights reserved. Indica Software AI structured interviews · GLOBAL ENVIRONMENT</p>
        </div>
      </footer>
    </div>
  )
}
