import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, SkipForward, X, Camera, ShieldAlert, ArrowLeft } from 'lucide-react'
import { roles, candidates, type ScoreMap } from '../lib/interview'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`

export interface AnswerRecord {
  q: string
  text: string
  feedback: string
  scores: ScoreMap
  kw: string[]
}

const ROLE0 = roles[0]

// ----- in-browser person detection (YOLO-style, COCO "person" class) -----
// TensorFlow.js + COCO-SSD are loaded from a CDN at runtime, so the app stays
// a lean static bundle that deploys straight to GitHub Pages.
const TFJS_SCRIPT = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
const COCO_SSD_SCRIPT = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
const PERSON_MIN_SCORE = 0.5
const DETECT_INTERVAL_MS = 1000
const DETECT_SETTLE_MS = 2000
// A violation must be seen on this many consecutive scans before we stop the
// interview — one blurry/occluded frame never terminates a real candidate.
const CONFIRM_SCANS = 2

interface DetectionBox {
  class: string
  score: number
  bbox: [number, number, number, number]
}

interface PersonDetector {
  detect(video: HTMLVideoElement): Promise<DetectionBox[]>
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => {
      el.dataset.loaded = 'true'
      resolve()
    }
    el.onerror = () => {
      el.remove()
      reject(new Error(`Failed to load ${src}`))
    }
    document.head.appendChild(el)
  })
}

async function loadPersonDetector(): Promise<PersonDetector> {
  await loadScript(TFJS_SCRIPT)
  await loadScript(COCO_SSD_SCRIPT)
  const cocoSsd = (window as unknown as { cocoSsd?: { load: (opts: { base: string }) => Promise<PersonDetector> } }).cocoSsd
  if (!cocoSsd) throw new Error('COCO-SSD unavailable')
  return cocoSsd.load({ base: 'lite_mobilenet_v2' })
}

export default function InterviewRoom({
  roleIdx,
  candIdx,
  onExit,
  onFinish,
  onHome,
}: {
  roleIdx: number
  candIdx: number
  onExit: () => void
  onFinish: (answers: AnswerRecord[]) => void
  onHome: () => void
}) {
  const role = roles[roleIdx]
  const cand = candidates[candIdx]

  const [phase, setPhase] = useState<'ask' | 'typing' | 'answer' | 'feedback'>('ask')
  const [qi, setQi] = useState(0)
  const [scores, setScores] = useState<ScoreMap>({ structure: 0, vocab: 0, fluency: 0, confidence: 0 })
  const [history, setHistory] = useState<AnswerRecord[]>([])
  const [wave, setWave] = useState<number[]>(() => Array.from({ length: 24 }, () => 8))
  const [camStatus, setCamStatus] = useState<'starting' | 'live' | 'denied'>('starting')
  const [peopleCount, setPeopleCount] = useState<number | null>(null)
  const [visionStatus, setVisionStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [violation, setViolation] = useState<string | null>(null)
  const [violationAt, setViolationAt] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const doneRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const camRunRef = useRef(0)
  const stoppedRef = useRef(false)
  const detectorPromiseRef = useRef<Promise<PersonDetector> | null>(null)

  const question = role.questions[qi]

  // ----- camera helpers -------------------------------------------------
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  // Grab a still frame from the live camera as violation evidence.
  const captureFrame = (): string | null => {
    const v = videoRef.current
    if (!v || !v.videoWidth || !v.videoHeight) return null
    try {
      const c = document.createElement('canvas')
      c.width = v.videoWidth
      c.height = v.videoHeight
      const ctx = c.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(v, 0, 0, c.width, c.height)
      return c.toDataURL('image/jpeg', 0.75)
    } catch {
      return null
    }
  }

  // Stop the interview on the spot for a proctoring violation.
  const terminate = (reason: string) => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    setEvidence(captureFrame())
    stopCamera()
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setViolationAt(new Date().toLocaleTimeString())
    setViolation(reason)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const acquireCamera = async () => {
    const run = ++camRunRef.current
    streamRef.current?.getTracks().forEach((t) => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      if (run !== camRunRef.current || stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (!stoppedRef.current) terminate('Camera was turned off or blocked')
        })
      })
      setCamStatus('live')
    } catch {
      if (run === camRunRef.current && !stoppedRef.current) setCamStatus('denied')
    }
  }

  // Manual retry from the "camera required" screen (event handler, not an effect).
  const startCamera = () => {
    setCamStatus('starting')
    void acquireCamera()
  }

  // Camera must be on for the whole interview — start it on mount.
  useEffect(() => {
    const kickoff = window.setTimeout(() => { void acquireCamera() }, 0)
    return () => {
      window.clearTimeout(kickoff)
      // Invalidate any in-flight camera request so it can't attach after unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      camRunRef.current++
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-attach the stream if the <video> element re-renders.
  useEffect(() => {
    if (camStatus === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [camStatus])

  // ----- proctoring ------------------------------------------------------
  // The candidate must not leave the interview: switching to a new tab/window,
  // losing focus (alt-tab, snipping tool) or capturing the screen (photo /
  // screenshot) automatically stops the interview on the spot.
  useEffect(() => {
    if (camStatus !== 'live') return
    let armed = false
    // Grace period so the camera-permission prompt itself never counts.
    const armTimer = window.setTimeout(() => {
      armed = true
    }, 900)

    const hit = (reason: string) => {
      if (armed) terminate(reason)
    }

    const isCaptureKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (e.code === 'PrintScreen' || k === 'printscreen') return true
      // Snipping tool (Win+Shift+S) and macOS screenshots (Cmd+Shift+3/4/5/6)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', '3', '4', '5', '6'].includes(k)) return true
      return false
    }

    const onVisibility = () => {
      if (document.hidden) hit('New tab / window switch detected')
    }
    const onBlur = () => {
      // Only meaningful when the app owns the window (not inside a preview iframe).
      if (window.self === window.top) hit('Focus left the interview (app switch or screen capture)')
    }
    const onKey = (e: KeyboardEvent) => {
      if (!isCaptureKey(e)) return
      e.preventDefault()
      e.stopPropagation()
      hit('Photo / screenshot capture detected')
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camStatus])

  // ----- AI vision: live person counting (YOLO-style detection) ----------
  // Scans the camera about once per second. If the candidate leaves the frame
  // (0 people) or a second person shows up (2+ people) on several consecutive
  // scans, the interview is terminated on the spot. If the detector cannot be
  // loaded (offline / blocked CDN) the interview continues with the rest of
  // the proctoring (tab switch, screenshot, camera-off).
  useEffect(() => {
    if (camStatus !== 'live' || violation) return
    let cancelled = false
    let busy = false
    let failed = false
    let readyAt = 0
    let zeroStreak = 0
    let manyStreak = 0

    const getDetector = () => {
      if (!detectorPromiseRef.current) detectorPromiseRef.current = loadPersonDetector()
      return detectorPromiseRef.current
    }

    const scan = async () => {
      if (cancelled || failed || stoppedRef.current || busy) return
      const video = videoRef.current
      if (!video || !video.videoWidth) return
      busy = true
      try {
        const detector = await getDetector()
        const predictions = await detector.detect(video)
        if (cancelled || stoppedRef.current) return

        const people = predictions.filter((p) => p.class === 'person' && p.score >= PERSON_MIN_SCORE).length
        if (!readyAt) {
          readyAt = Date.now()
          setVisionStatus('ready')
        }
        setPeopleCount(people)

        // Settle time while the model warms up — never a violation.
        if (Date.now() - readyAt < DETECT_SETTLE_MS) return

        if (people === 0) zeroStreak += 1
        else zeroStreak = 0
        if (people >= 2) manyStreak += 1
        else manyStreak = 0

        if (zeroStreak >= CONFIRM_SCANS) terminate('No person visible in the camera')
        if (manyStreak >= CONFIRM_SCANS) terminate('More than one person detected in the camera')
      } catch {
        if (cancelled || stoppedRef.current) return
        failed = true
        setVisionStatus('unavailable')
        setPeopleCount(null)
      } finally {
        busy = false
      }
    }

    void scan()
    const id = window.setInterval(() => void scan(), DETECT_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camStatus, violation])

  // Live waveform animation (frozen once the interview is terminated)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (stoppedRef.current) return
      setWave((w) => w.map(() => 6 + Math.random() * 26))
    }, 140)
    return () => window.clearInterval(id)
  }, [])

  // Advance ask -> answer phase (model asks question shortly after).
  // Waits until the camera is live — the interview only runs while proctored.
  useEffect(() => {
    if (phase !== 'ask' || camStatus !== 'live' || violation) return
    timer.current = window.setTimeout(() => setPhase('answer'), 900)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [phase, qi, camStatus, violation])

  const beginFeedback = (ansIdx: number) => {
    if (stoppedRef.current) return
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
    doneRef.current = false
  }

  const next = () => {
    if (stoppedRef.current) return
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
            <button
              type="button"
              onClick={onHome}
              className="flex shrink-0 cursor-pointer items-center gap-2"
              aria-label="Go to home page"
              title="Home"
            >
              <img src={brandLogo} alt="Indicasoftware The TechHub Platform" className="brand-logo-small" />
              <span className="text-xl font-black tracking-tight text-zara">ZARA</span>
            </button>
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
          {/* Proctored camera feed */}
          <div className="border border-white/12 bg-[#121216] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-zara" />
                <h3 className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/70">Camera</h3>
              </div>
              <span className="flex items-center gap-1.5 font-mono2 text-[9px] uppercase tracking-[0.16em] text-emerald-400">
                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${camStatus === 'live' ? 'animate-pulse' : 'opacity-40'}`} />
                {camStatus === 'live' ? 'Live' : 'Starting'}
              </span>
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="mt-3 aspect-video w-full -scale-x-100 rounded border border-white/10 bg-black object-cover"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="border border-white/15 px-2 py-1 font-mono2 text-[9px] uppercase tracking-[0.14em] text-white/70">
                People:{' '}
                <span className="font-bold text-zara">{peopleCount === null ? '—' : peopleCount}</span>
              </span>
              <span
                className={`font-mono2 text-[9px] uppercase tracking-[0.14em] ${
                  visionStatus === 'ready'
                    ? 'text-emerald-400'
                    : visionStatus === 'unavailable'
                      ? 'text-amber-400'
                      : 'text-white/45'
                }`}
              >
                {visionStatus === 'ready'
                  ? 'AI vision: scanning'
                  : visionStatus === 'unavailable'
                    ? 'AI vision: unavailable'
                    : 'AI vision: loading…'}
              </span>
            </div>
            <p className="mt-2 font-mono2 text-[9px] leading-relaxed uppercase tracking-[0.12em] text-white/40">
              Proctored session — switching tabs, capturing the screen, or 0 / 2+ people on camera stops the interview instantly.
            </p>
          </div>

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

      {/* Camera required — the interview will not run without a live feed */}
      {camStatus !== 'live' && !violation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md border border-white/15 bg-[#121216] p-6 text-center">
            <Camera className="mx-auto h-9 w-9 text-zara" />
            <h2 className="mt-4 text-xl font-black tracking-tight">
              {camStatus === 'starting' ? 'Starting your camera…' : 'Camera access required'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {camStatus === 'starting'
                ? 'Please allow camera access in your browser to continue the interview.'
                : 'This interview is proctored — the camera must stay on for the whole session. Allow camera access to continue.'}
            </p>
            {camStatus === 'denied' && (
              <button
                type="button"
                onClick={startCamera}
                className="mt-5 inline-flex items-center gap-2 bg-zara px-5 py-2.5 font-mono2 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-white hover:text-ink transition-colors"
              >
                <Camera className="h-4 w-4" /> Grant camera access
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interview stopped on the spot after a proctoring violation */}
      {violation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg border border-red-500/40 bg-[#121216] p-6 text-center"
          >
            <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="mt-4 text-2xl font-black tracking-tight text-red-400">INTERVIEW TERMINATED</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              The interview was stopped automatically because a proctoring violation was detected:
            </p>
            <div className="mt-3 border border-red-500/40 bg-red-500/10 px-4 py-3 font-mono2 text-[11px] uppercase tracking-[0.16em] text-red-300">
              {violation}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              {evidence && (
                <img src={evidence} alt="Violation evidence" className="h-24 rounded border border-white/15 object-cover" />
              )}
              <div className="text-left font-mono2 text-[10px] uppercase leading-relaxed tracking-[0.14em] text-white/45">
                <div>Camera feed: stopped</div>
                <div>Recorded at: {violationAt}</div>
                <div>Session: {cand.name} · {role.title}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onHome}
              className="mt-6 inline-flex items-center gap-2 bg-white px-5 py-2.5 font-mono2 text-[11px] uppercase tracking-[0.2em] text-ink hover:bg-zara hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Return to home page
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export { ROLE0 }
