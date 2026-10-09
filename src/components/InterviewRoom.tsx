import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, SkipForward, X, Camera, ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react'
import { roles, screeningQuestions, type ScoreMap, type Question } from '../lib/interview'
import {
  startCapture,
  speak,
  stopSpeaking,
  saveFiles,
  getSharedDirName,
  formatClock,
  fileStamp,
  speechRecognitionSupported,
  type SessionCapture,
  type TranscriptLine,
  type PickedFile,
} from '../lib/capture'

const brandLogo = `${import.meta.env.BASE_URL}indicasoftware-logo.svg`

export interface AnswerRecord {
  q: string
  text: string
  feedback: string
  scores: ScoreMap
  kw: string[]
}

export type InterviewRound = 'screening' | 'final'

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

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function InterviewRoom({
  roleIdx,
  round,
  onExit,
  onFinish,
  onHome,
}: {
  roleIdx: number
  round: InterviewRound
  onExit: () => void
  onFinish: (answers: AnswerRecord[]) => void
  onHome: () => void
}) {
  const role = roles[roleIdx]
  const questions: Question[] = round === 'screening' ? screeningQuestions : role.questions
  const roundLabel = round === 'screening' ? 'Screening round' : 'Real interview'

  const [phase, setPhase] = useState<'brief' | 'ask' | 'answer' | 'feedback'>('brief')
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
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const [interim, setInterim] = useState('')
  const [recSec, setRecSec] = useState(0)
  const dirLabel = getSharedDirName()
  const [savedTo, setSavedTo] = useState<string | null>(null)

  const doneRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const camRunRef = useRef(0)
  const stoppedRef = useRef(false)
  const detectorPromiseRef = useRef<Promise<PersonDetector> | null>(null)
  const captureRef = useRef<SessionCapture | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const linesRef = useRef<TranscriptLine[]>([])
  const historyRef = useRef<AnswerRecord[]>([])
  const finalizedRef = useRef(false)

  const question = questions[qi]

  /** Append a transcript line (to the live UI and to the saved capture). */
  const note = (kind: TranscriptLine['kind'], text: string) => {
    const cap = captureRef.current
    const line: TranscriptLine = cap
      ? cap.addLine(kind, text)
      : { t: Date.now() - (startedAtRef.current ?? Date.now()), kind, text }
    linesRef.current = [...linesRef.current, line]
    setLines(linesRef.current)
  }

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

  /**
   * Stop recording, flush the camera + voice files, build the transcript and
   * store everything in the Human_Detection folder (never downloaded).
   * Safe to call more than once — only the first call does the work.
   */
  const finalize = async (endReason?: string): Promise<void> => {
    if (finalizedRef.current) return
    finalizedRef.current = true
    stopSpeaking()

    const cap = captureRef.current
    captureRef.current = null
    let result: { video: Blob | null; voice: Blob | null; lines: TranscriptLine[] } | null = null
    if (cap) {
      try {
        result = await cap.stop()
      } catch {
        result = null
      }
    }
    try {
      await audioCtxRef.current?.close()
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null
    analyserRef.current = null

    const finalLines = result?.lines ?? linesRef.current
    const startedAt = startedAtRef.current ?? Date.now()
    const stamp = fileStamp()
    const base = `human_detection_${round}_${role.id}_${stamp}`

    const transcript = [
      'ZARA AI INTERVIEW — SESSION DATA',
      '=================================',
      `Round: ${roundLabel}`,
      `Role: ${role.title} (${role.level})`,
      `Started: ${new Date(startedAt).toLocaleString()}`,
      `Ended: ${new Date().toLocaleString()}`,
      `Status: ${endReason ?? 'Completed normally'}`,
      `Voice transcription: ${
        speechRecognitionSupported()
          ? 'live transcript captured below (both sides)'
          : 'NOT SUPPORTED in this browser — see the interview_audio file'
      }`,
      'Audio: the candidate_voice.webm file records BOTH voices — the candidate',
      'and ZARA AI (heard through the speakers and captured by the microphone).',
      `Storage: Human_Detection/${dirLabel ?? getSharedDirName() ?? ''}/ — saved securely, never downloaded.`,
      '',
      '--- FULL TRANSCRIPT (ZARA + CANDIDATE) ---',
      '',
      ...finalLines.map((l) => `[${formatClock(l.t)}] ${labelFor(l.kind)}: ${l.text}`),
      '',
    ].join('\n')

    const totals = historyRef.current.reduce(
      (acc, a) => ({
        structure: acc.structure + (a.scores.structure ?? 0),
        vocab: acc.vocab + (a.scores.vocab ?? 0),
        fluency: acc.fluency + (a.scores.fluency ?? 0),
        confidence: acc.confidence + (a.scores.confidence ?? 0),
      }),
      { structure: 0, vocab: 0, fluency: 0, confidence: 0 },
    )
    const meta = {
      round,
      roundLabel,
      role: { id: role.id, title: role.title, level: role.level },
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      status: endReason ?? 'completed',
      cameraRecording: Boolean(result?.video?.size),
      voiceRecording: Boolean(result?.voice?.size),
      transcriptLines: finalLines.length,
      totals,
      answers: historyRef.current.map((a) => ({
        question: a.q,
        answer: a.text,
        feedback: a.feedback,
        scores: a.scores,
      })),
    }

    const files: PickedFile[] = []
    if (result?.video && result.video.size > 0)
      files.push({ name: `${base}_camera_recording.webm`, data: result.video, subdir: 'video' })
    if (result?.voice && result.voice.size > 0) files.push({ name: `${base}_candidate_voice.webm`, data: result.voice })
    files.push({ name: `${base}_transcript.txt`, data: transcript })
    files.push({ name: `${base}_session.json`, data: JSON.stringify(meta, null, 2) })

    try {
      const dest = await saveFiles(files)
      if (dest === 'folder') {
        setSavedTo(`Human_Detection/${dirLabel ?? getSharedDirName() ?? ''}/ (video clip → video/)`)
      } else if (dest === 'retained') {
        setSavedTo('Held in secure session storage — folder was unavailable (never downloaded)')
      } else {
        setSavedTo('Could not store session data — please re-select the Human_Detection folder')
      }
    } catch {
      setSavedTo('Could not store session data')
    }
  }

  // Stop the interview on the spot for a proctoring violation.
  const terminate = (reason: string) => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    setEvidence(captureFrame())
    stopSpeaking()
    setViolationAt(new Date().toLocaleTimeString())
    setViolation(reason)
    // Flush recordings + transcript first (sync part stops the recorders),
    // then release the camera.
    void finalize(reason)
    stopCamera()
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const acquireCamera = async () => {
    const run = ++camRunRef.current
    streamRef.current?.getTracks().forEach((t) => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      if (run !== camRunRef.current || stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      const onEnded = (reason: string) => {
        if (run === camRunRef.current && !stoppedRef.current) terminate(reason)
      }
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => onEnded('Camera was turned off or blocked'))
      })
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener('ended', () => onEnded('Microphone was turned off'))
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

  // Camera + mic must be on for the whole interview — start them on mount.
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

  // ----- recording + transcription ---------------------------------------
  // Start the camera recorder, the voice-only recorder, the live transcript,
  // and the mic analyser that drives the waveform as soon as the camera is up.
  useEffect(() => {
    if (camStatus !== 'live' || captureRef.current) return
    const stream = streamRef.current
    if (!stream) return
    startedAtRef.current = Date.now()
    captureRef.current = startCapture(stream, {
      onLine: (line) => {
        linesRef.current = [...linesRef.current, line]
        setLines(linesRef.current)
      },
      onPartial: (text) => setInterim(text),
    })
    try {
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()))
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      src.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
    } catch {
      // Waveform falls back to its idle animation.
    }
  }, [camStatus])

  // Recording timer (REC badge).
  useEffect(() => {
    if (camStatus !== 'live') return
    const id = window.setInterval(() => {
      if (stoppedRef.current) return
      setRecSec(Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
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

  // ----- waveform: real microphone levels --------------------------------
  useEffect(() => {
    const id = window.setInterval(() => {
      if (stoppedRef.current) return
      const analyser = analyserRef.current
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        setWave((w) => w.map((_, i) => 6 + ((data[i % data.length] ?? 0) / 255) * 28))
      } else {
        setWave((w) => w.map(() => 6 + Math.random() * 26))
      }
    }, 140)
    return () => window.clearInterval(id)
  }, [])

  // ----- ZARA speaks: instructions, questions and options ----------------
  // On entry, ZARA reads the instructions (brief) or the question with all of
  // its options (ask) aloud, then the interview proceeds automatically.
  useEffect(() => {
    if (camStatus !== 'live' || violation) return
    if (phase !== 'brief' && phase !== 'ask') return
    let cancelled = false

    const text =
      phase === 'brief'
        ? round === 'screening'
          ? 'Welcome to the ZARA AI interview. This is the screening round. Your camera and microphone are switched on, and everything is being recorded and transcribed. I will read each question aloud, followed by the options. After I finish, take your time to respond in your own voice, or select an option on screen. Please stay in frame, and do not switch tabs or capture the screen. Let us begin.'
          : 'Welcome to the real interview. The same rules apply: your camera and microphone stay on, and everything is recorded and transcribed. I will read each question and its options aloud. Then you can answer in your own voice, or choose an option on screen. Let us begin.'
        : `Question ${qi + 1} of ${questions.length}. ${question.q} ${question.answers
            .map((a, i) => `Option ${LETTERS[i]}. ${a.text}`)
            .join(' ')}`

    // ZARA's own voice must not be transcribed as the candidate's answer.
    captureRef.current?.pauseVoice()
    const speaker = speak(text)
    speaker.done.then(() => {
      if (cancelled || stoppedRef.current) return
      captureRef.current?.resumeVoice()
      // Record ZARA's exact spoken words into the full two-sided transcript.
      if (phase === 'brief') {
        note('question', `Instructions: ${text}`)
        note('note', 'Interview starting.')
        setPhase('ask')
      } else {
        note('question', text)
        setPhase('answer')
      }
    })
    return () => {
      cancelled = true
      speaker.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi, camStatus, violation, round])

  const beginFeedback = (ansIdx: number) => {
    if (stoppedRef.current) return
    const ans = question.answers[ansIdx]
    const rec: AnswerRecord = { q: question.q, text: ans.text, feedback: ans.feedback, scores: ans.scores, kw: ans.kw }
    const nh = [...history, rec]
    historyRef.current = nh
    setHistory(nh)
    note('answer', `Option ${LETTERS[ansIdx]}: ${ans.text}`)
    setInterim('')
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
    if (qi + 1 < questions.length) {
      note('note', `Moving to question ${qi + 2} of ${questions.length}.`)
      setQi(qi + 1)
      setPhase('ask')
    } else {
      if (doneRef.current) return
      doneRef.current = true
      note('note', round === 'screening' ? 'Screening round completed.' : 'Real interview completed.')
      void finalize(
        round === 'screening' ? 'Screening round completed normally' : 'Real interview completed normally',
      ).then(() => onFinish(historyRef.current))
    }
  }

  const endInterview = () => {
    if (!stoppedRef.current && !doneRef.current) void finalize('Interview ended early')
    onExit()
  }

  const goHomeNow = () => {
    if (!stoppedRef.current && !doneRef.current) void finalize('Returned to home')
    onHome()
  }

  const liveScore = (key: keyof ScoreMap) => {
    const total = questions.length * 20
    const v = scores[key] ?? 0
    return Math.round((v / total) * 100)
  }

  const dimVal = liveScore('vocab')
  const isLast = qi + 1 >= questions.length
  const storedDir = dirLabel ?? getSharedDirName()
  const phaseStatus =
    phase === 'brief'
      ? 'Giving instructions'
      : phase === 'ask'
        ? 'ZARA is speaking'
        : phase === 'answer'
          ? 'Listening'
          : 'Scoring'

  return (
    <div className="min-h-screen bg-[#0d0d10] text-paper bg-grid-dark">
      <div className="pointer-events-none fixed inset-0 aurora-dark" aria-hidden="true" />
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0d10]/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={goHomeNow}
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
                {role.title} — {roundLabel}
              </div>
              <div className="font-mono2 text-[10px] uppercase tracking-[0.14em] text-white/45">
                Camera & mic on · Recording · Live transcription
              </div>
            </div>
          </div>
          <button
            onClick={endInterview}
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
              <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/60">{phaseStatus}</span>
            </div>
            <span className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/40">
              Q {Math.min(qi + 1, questions.length)} / {questions.length}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {/* Waveform (driven by the live microphone) */}
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

            {/* Instructions (spoken + shown) before the interview starts */}
            {phase === 'brief' && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded border border-zara/40 bg-zara/[0.07] p-5"
              >
                <div className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-zara">
                  {roundLabel} — before we begin, your instructions
                </div>
                <ol className="mt-3 space-y-2 text-sm leading-relaxed text-white/85">
                  <li>1. Keep your <strong>camera and microphone ON</strong> for the whole interview — everything is recorded.</li>
                  <li>2. Stay in frame — the AI verifies that exactly one person is visible.</li>
                  <li>3. Do not switch tabs or capture the screen — violations end the interview instantly.</li>
                  <li>4. Listen as ZARA reads each question and its options aloud.</li>
                  <li>5. Answer in your own voice — every word is transcribed live — or tap an option on screen.</li>
                </ol>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-mono2 text-[10px] tracking-[0.1em] text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {storedDir ? `Auto-saving to Human_Detection/${storedDir}/ (video clip → video/)` : 'Auto-saving to Human_Detection/'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                  <Volume2 className="h-4 w-4 text-zara" />
                  <span className="animate-pulse">ZARA is reading the instructions aloud…</span>
                </div>
              </motion.div>
            )}

            {/* Question */}
            {phase !== 'brief' && (
              <div className="mt-6">
                <div className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-zara">
                  Question {qi + 1} · {roundLabel}
                </div>
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
                {phase === 'ask' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/65">
                    <Volume2 className="h-4 w-4 text-zara" />
                    <span className="animate-pulse">ZARA is reading the question and all options aloud…</span>
                  </div>
                )}
              </div>
            )}

            {/* Answer options / candidate speech */}
            <div className="mt-6 space-y-3">
              {phase === 'answer' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono2 text-[10px] uppercase tracking-[0.2em] text-white/45">
                      <Mic className="mr-1 inline h-3 w-3 text-emerald-400" />
                      Mic live — speak your answer, or choose an option:
                    </p>
                    <span className="font-mono2 text-[10px] uppercase tracking-[0.16em] text-emerald-400">
                      ● recording
                    </span>
                  </div>
                  {interim && (
                    <p className="border-l-2 border-zara/60 pl-3 text-sm italic text-zara">“{interim}”</p>
                  )}
                  {question.answers.map((a, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.3 }}
                      onClick={() => beginFeedback(i)}
                      className="group block w-full rounded border border-white/15 bg-white/[0.03] p-4 text-left text-sm leading-relaxed text-white/85 transition-colors hover:border-zara hover:bg-zara/10"
                    >
                      <span className="mr-2 font-mono2 text-[10px] text-zara">{LETTERS[i]}</span>
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
                    {isLast
                      ? round === 'screening'
                        ? 'Proceed to real interview'
                        : 'Complete interview'
                      : 'Next question'}
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
              <span className="flex items-center gap-1.5 font-mono2 text-[9px] uppercase tracking-[0.16em] text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                REC {formatClock(recSec * 1000)}
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
            <p className="mt-1 font-mono2 text-[9px] leading-relaxed uppercase tracking-[0.12em] text-white/45">
              Data → {storedDir ? `Human_Detection/${storedDir}/ — video clip → video/` : 'Human_Detection/video/'} · never downloaded
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
            <h3 className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/70">Live transcript</h3>
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1 no-scrollbar">
              {lines.length === 0 && (
                <p className="text-xs text-white/40">
                  <span className="typing-dot inline-block">.</span>
                  <span className="typing-dot inline-block" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="typing-dot inline-block" style={{ animationDelay: '0.4s' }}>.</span>
                  <span className="ml-1">Waiting for the interview to start…</span>
                </p>
              )}
              {lines.map((l, i) => (
                <div
                  key={i}
                  className={`border-l-2 pl-3 ${
                    l.kind === 'speech'
                      ? 'border-emerald-400/60'
                      : l.kind === 'question'
                        ? 'border-zara/60'
                        : l.kind === 'answer'
                          ? 'border-white/30'
                          : 'border-white/15'
                  }`}
                >
                  <div className="font-mono2 text-[9px] uppercase tracking-[0.18em] text-white/40">
                    {formatClock(l.t)} · {labelFor(l.kind)}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-white/75">{l.text}</div>
                </div>
              ))}
              {interim && (
                <div className="border-l-2 border-zara pl-3 text-[11px] italic text-zara">“{interim}”</div>
              )}
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
              {camStatus === 'starting' ? 'Starting your camera and microphone…' : 'Camera & microphone required'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {camStatus === 'starting'
                ? 'Please allow camera AND microphone access to continue the interview.'
                : 'This interview is proctored and recorded — the camera and microphone must stay on for the whole session. Allow access to continue.'}
            </p>
            {camStatus === 'denied' && (
              <button
                type="button"
                onClick={startCamera}
                className="mt-5 inline-flex items-center gap-2 bg-zara px-5 py-2.5 font-mono2 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-white hover:text-ink transition-colors"
              >
                <Camera className="h-4 w-4" /> Grant camera & mic access
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
                <div>Session: {roundLabel} · {role.title}</div>
                {savedTo && <div className="text-emerald-400">Data saved: {savedTo}</div>}
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

function labelFor(kind: TranscriptLine['kind']): string {
  return kind === 'speech'
    ? 'CANDIDATE'
    : kind === 'question'
      ? 'ZARA'
      : kind === 'answer'
        ? 'CANDIDATE (option)'
        : 'SYSTEM'
}

export { ROLE0 }
