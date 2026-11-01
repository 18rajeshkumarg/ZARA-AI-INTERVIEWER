import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Video, X } from 'lucide-react'
import {
  captureVideoFrame,
  detectPeople,
  faceAreaHasDetail,
  loadPersonDetector,
  type PersonDetector,
} from '../lib/faceVerification'

type Phase = 'starting' | 'scanning' | 'verified' | 'error'

export default function FaceVerification({
  open,
  roundLabel,
  candidateName,
  zoomLink,
  requireDetector = false,
  mode = 'interview',
  onVerified,
  onClose,
}: {
  open: boolean
  roundLabel: string
  candidateName: string
  zoomLink: string
  requireDetector?: boolean
  mode?: 'interview' | 'presence-check'
  onVerified: (snapshot: string | null, zoomOpened: boolean) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<PersonDetector | null>(null)
  const consecutiveRef = useRef(0)
  const verifiedRef = useRef(false)
  const stoppedRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const modelTimerRef = useRef<number | null>(null)

  const [phase, setPhase] = useState<Phase>('starting')
  const [message, setMessage] = useState('Starting your camera…')
  const [people, setPeople] = useState(0)
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [autoOpened, setAutoOpened] = useState<boolean | null>(null)

  const stopCamera = useCallback(() => {
    stoppedRef.current = true
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    if (modelTimerRef.current) window.clearTimeout(modelTimerRef.current)
    closeTimerRef.current = null
    modelTimerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const finishVerification = useCallback((frame: string | null) => {
    if (verifiedRef.current) return
    verifiedRef.current = true
    setSnapshot(frame)
    setPhase('verified')
    setMessage(mode === 'presence-check'
      ? 'One-person camera check passed. This does not verify your identity.'
      : 'One person detected. Opening your Zoom interview…')
    closeTimerRef.current = window.setTimeout(() => {
      // Open the real Zoom URL only after person detection passes. Never open an
      // about:blank window up front: if the browser blocks this tab, the
      // candidate gets a visible "Open Zoom" button instead.
      let opened = false
      if (mode === 'interview' && zoomLink) {
        try {
          opened = Boolean(window.open(zoomLink, '_blank'))
        } catch {
          opened = false
        }
      }
      setAutoOpened(opened)
      if (mode === 'interview') {
        setMessage(opened ? 'One person detected. Opening your Zoom interview…' : 'One person detected. Click below to open your Zoom interview.')
      }
      onVerified(frame, opened)
    }, 1200)
  }, [mode, onVerified, zoomLink])

  // Start the camera and load the person detector whenever the modal opens.
  useEffect(() => {
    if (!open) {
      stopCamera()
      return
    }

    stoppedRef.current = false
    verifiedRef.current = false
    consecutiveRef.current = 0
    detectorRef.current = null

    let cancelled = false

    const start = async () => {
      if (!window.isSecureContext) {
        setPhase('error')
        setMessage('The camera needs a secure (https) page. Open the site over https and try again.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase('error')
        setMessage('This browser cannot access the camera. Use Chrome or Edge and allow camera access.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        setPhase('scanning')
        setMessage('Look at the camera. Exactly one person must be visible.')
      } catch (error) {
        const name = error instanceof DOMException ? error.name : ''
        setPhase('error')
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setMessage('Camera access was blocked. Click the camera icon in the address bar, choose Allow, then press Try again.')
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setMessage('No camera was found. Connect a camera, then press Try again.')
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setMessage('The camera is being used by another app. Close that app, then press Try again.')
        } else if (name === 'OverconstrainedError') {
          setMessage('This camera does not support the requested video size. Press Try again.')
        } else {
          setMessage('The camera could not start. Check the connection and permissions, then press Try again.')
        }
      }
    }

    void start()

    modelTimerRef.current = window.setTimeout(() => {
      if (!detectorRef.current) {
        setModelStatus('unavailable')
        if (requireDetector) {
          setMessage('The required person-detection model is taking too long to load. Retry when online; the offer letter remains locked.')
        }
      }
    }, 9000)

    loadPersonDetector()
      .then((detector) => {
        if (cancelled || stoppedRef.current) return
        detectorRef.current = detector
        setModelStatus('ready')
        if (modelTimerRef.current) window.clearTimeout(modelTimerRef.current)
      })
      .catch(() => {
        if (cancelled || stoppedRef.current) return
        setModelStatus('unavailable')
        setMessage(requireDetector
          ? 'The required person-detection model could not load. Retry when online; the offer letter will remain locked.'
          : 'The person-detection model could not load. You can still complete the camera check below.')
      })

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open, attempt, requireDetector, stopCamera])

  // Scan the live video until exactly one person is confirmed.
  useEffect(() => {
    if (!open || phase !== 'scanning') return
    const timer = window.setInterval(() => {
      if (verifiedRef.current || stoppedRef.current) return
      const video = videoRef.current
      const detector = detectorRef.current
      if (!video || !detector) return

      void detectPeople(detector, video).then((boxes) => {
        if (verifiedRef.current || stoppedRef.current) return
        setPeople(boxes.length)
        if (boxes.length === 1 && faceAreaHasDetail(video, boxes[0])) {
          consecutiveRef.current += 1
          setMessage('Face detected. Hold still for a moment…')
          if (consecutiveRef.current >= 2) {
            finishVerification(captureVideoFrame(video))
          }
        } else {
          consecutiveRef.current = 0
          if (boxes.length === 0) {
            setMessage('No person detected. Sit in front of the camera and improve the lighting.')
          } else if (boxes.length > 1) {
            setMessage('Only the candidate should be visible. Ask anyone else to leave the frame.')
          } else {
            setMessage('Move closer and keep your face clearly visible.')
          }
        }
      })
    }, 900)
    return () => window.clearInterval(timer)
  }, [open, phase, finishVerification])

  const retry = () => {
    stopCamera()
    stoppedRef.current = false
    verifiedRef.current = false
    consecutiveRef.current = 0
    setPhase('starting')
    setMessage('Starting your camera…')
    setPeople(0)
    setModelStatus('loading')
    setSnapshot(null)
    setAutoOpened(null)
    setAttempt((value) => value + 1)
  }

  const fallbackVerify = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      setMessage('Wait for the camera preview, then try again.')
      return
    }
    finishVerification(captureVideoFrame(video))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Camera presence check">
      <div className="w-full max-w-xl border border-white/15 bg-[#101014] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zara/15 text-zara">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono2 text-[10px] uppercase tracking-[0.22em] text-white/50">
                {mode === 'presence-check' ? 'Camera presence check' : 'Person detection check'}
              </p>
              <h2 className="text-lg font-black">{roundLabel}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close face verification">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative aspect-video overflow-hidden border border-white/15 bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            {phase === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-sm text-white/70">
                <Loader2 className="h-7 w-7 animate-spin text-zara" />
                Starting camera…
              </div>
            )}
            {phase === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-sm text-white/75">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
                {message}
              </div>
            )}
            {phase === 'verified' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-950/80 px-6 text-center">
                {snapshot ? (
                  <img src={snapshot} alt="Verified candidate frame" className="absolute inset-0 h-full w-full object-cover opacity-25" />
                ) : null}
                <CheckCircle2 className="relative h-12 w-12 text-emerald-400" />
                <p className="relative font-mono2 text-xs uppercase tracking-[0.2em] text-emerald-300">
                  {mode === 'presence-check' ? 'One-person check passed' : 'Person detected'}
                </p>
                <p className="relative text-sm text-white/75">
                  {mode === 'presence-check'
                    ? 'This camera check does not verify identity.'
                    : autoOpened === false
                    ? 'Your browser blocked the automatic tab. Click below to open Zoom.'
                    : `Opening ${roundLabel} Zoom…`}
                </p>
                {zoomLink && (
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noreferrer"
                    className="relative inline-flex items-center gap-2 bg-zara px-4 py-2 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-white hover:text-ink"
                  >
                    <Video className="h-3.5 w-3.5" /> Open {roundLabel} on Zoom
                  </a>
                )}
              </div>
            )}
            {phase === 'scanning' && (
              <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-white/25">
                <span className="absolute -top-3 left-3 bg-[#101014] px-2 font-mono2 text-[9px] uppercase tracking-[0.2em] text-white/55">
                  {candidateName}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 text-sm text-white/70">
            {phase === 'verified' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : phase === 'error' ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-zara" />
            )}
            <p>{message}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono2 text-[10px] uppercase tracking-[0.16em] text-white/40">
            <span>People detected: {people}</span>
            <span>
              Person model: {modelStatus === 'ready' ? 'ready' : modelStatus === 'loading' ? 'loading…' : 'unavailable'}
            </span>
            <span>Camera check runs locally</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {modelStatus === 'unavailable' && !requireDetector && phase !== 'verified' && phase !== 'error' && (
              <button type="button" onClick={fallbackVerify} className="inline-flex items-center gap-2 bg-zara px-4 py-2 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-white hover:text-ink">
                <Camera className="h-3.5 w-3.5" /> Verify with camera
              </button>
            )}
            <button type="button" onClick={retry} className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white/75 hover:border-zara hover:text-zara">
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 font-mono2 text-[10px] uppercase tracking-[0.18em] text-white/75 hover:border-white/40">
              Cancel
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-white/40">
            The browser's COCO-SSD person detector checks that exactly one person is in frame; it does not match the
            person to an identity or verify that the viewer is the named candidate. The frame is not recorded or uploaded.
          </p>
        </div>
      </div>
    </div>
  )
}
