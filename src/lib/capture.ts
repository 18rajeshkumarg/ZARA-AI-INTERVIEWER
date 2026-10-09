// Session capture: camera recording, interview audio (candidate + ZARA), a full
// two-sided live transcript, and storage of all data into the Human_Detection
// folder (via the File System Access API). Nothing is ever downloaded — if the
// folder is unavailable, data is retained safely in the browser (IndexedDB).

export interface TranscriptLine {
  /** ms since capture start */
  t: number
  kind: 'speech' | 'question' | 'answer' | 'note'
  text: string
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatTranscriptLine(l: TranscriptLine): string {
  const tag =
    l.kind === 'speech' ? 'CANDIDATE (voice)' :
    l.kind === 'question' ? 'ZARA (question)' :
    l.kind === 'answer' ? 'CANDIDATE (selected option)' :
    'SYSTEM'
  return `[${formatClock(l.t)}] ${tag}: ${l.text}`
}

// ---------------------------------------------------------------------------
// Text-to-speech — ZARA reads instructions, questions and options aloud
// ---------------------------------------------------------------------------
export interface Speaker {
  done: Promise<void>
  cancel: () => void
}

export function stopSpeaking(): void {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* not supported */
  }
}

export function speak(text: string): Speaker {
  let settled = false
  let resolveDone: () => void = () => {}
  const done = new Promise<void>((res) => {
    resolveDone = res
  })
  const finish = () => {
    if (!settled) {
      settled = true
      resolveDone()
    }
  }

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') {
    // No speech synthesis available — estimate the time so flow still works.
    const est = Math.min(45000, 1500 + text.length * 70)
    const t = window.setTimeout(finish, est)
    return { done, cancel: () => { window.clearTimeout(t); finish() } }
  }

  try {
    synth.cancel()
  } catch { /* ignore */ }

  const utter = new SpeechSynthesisUtterance(text)
  const voices = synth.getVoices()
  const preferred =
    voices.find((v) => /^en/i.test(v.lang) && /google|natural|neural|samantha|zira/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    voices[0]
  if (preferred) utter.voice = preferred
  utter.rate = 1
  utter.pitch = 1
  utter.onend = finish
  utter.onerror = finish

  // Safety net: some browsers never fire onend for long utterances.
  const guard = window.setTimeout(finish, Math.min(60000, 5000 + text.length * 95))
  try {
    synth.speak(utter)
  } catch {
    window.clearTimeout(guard)
    finish()
  }
  return {
    done,
    cancel: () => {
      window.clearTimeout(guard)
      try {
        synth.cancel()
      } catch { /* ignore */ }
      finish()
    },
  }
}

// ---------------------------------------------------------------------------
// Microphone transcription (Web Speech API) — automatic, continuous
// ---------------------------------------------------------------------------
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((e: SpeechRecognitionResultEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechRecognitionSupported = (): boolean => getSpeechRecognitionCtor() !== null

// ---------------------------------------------------------------------------
// File System Access — write straight into the Human_Detection folder
// ---------------------------------------------------------------------------
interface WritableStreamLike {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
}
export interface FileHandleLike {
  createWritable: () => Promise<WritableStreamLike>
}
export interface DirHandleLike {
  getName: () => Promise<string>
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileHandleLike>
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirHandleLike>
  requestPermission?: (desc?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

/** True when the browser can write into a real folder (Chrome / Edge). */
export function storageSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  )
}

let sharedDir: DirHandleLike | null = null
let sharedDirName: string | null = null

export function getSharedDir(): DirHandleLike | null {
  return sharedDir
}

export function getSharedDirName(): string | null {
  return sharedDirName
}

export async function pickDirectory(): Promise<DirHandleLike | null> {
  const fn = (window as unknown as {
    showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<DirHandleLike>
  }).showDirectoryPicker
  if (!fn) return null
  try {
    const handle = await fn({ mode: 'readwrite' })
    sharedDir = handle
    try {
      sharedDirName = await handle.getName()
    } catch {
      sharedDirName = 'Human_Detection'
    }
    return handle
  } catch {
    // user cancelled or unsupported
    return null
  }
}

export interface PickedFile {
  name: string
  data: Blob | string
  /** Optional subfolder inside the chosen directory (e.g. 'video'). */
  subdir?: string
}

// ---------------------------------------------------------------------------
// Safe retention — if the folder is unavailable, keep the session data in the
// browser's secure storage (IndexedDB). Recordings are NEVER downloaded.
// ---------------------------------------------------------------------------
const DB_NAME = 'zara_session_store'
const STORE = 'sessions'

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function retainSession(files: PickedFile[]): Promise<boolean> {
  try {
    const db = await openStore()
    const stamp = Date.now()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      files.forEach((f, i) => {
        store.put(
          { name: f.name, data: f.data, savedAt: new Date().toISOString() },
          `${stamp}_${i}_${f.name}`,
        )
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

/**
 * Writes session files straight into the chosen Human_Detection folder
 * (video clips land in the video/ subfolder, created automatically).
 * Nothing is ever downloaded. If the folder is unavailable (permission
 * revoked / folder removed), the data is kept safely in the browser's
 * secure storage instead so a candidate can never download it.
 */
export async function saveFiles(files: PickedFile[]): Promise<'folder' | 'retained' | 'failed'> {
  const dir = sharedDir
  if (dir) {
    try {
      // Chrome may require the write permission to be re-confirmed on a later
      // visit — ask politely, then attempt the write regardless.
      if (dir.requestPermission) {
        try {
          await dir.requestPermission({ mode: 'readwrite' })
        } catch {
          /* no gesture available — try the write anyway */
        }
      }
      for (const f of files) {
        let target: DirHandleLike = dir
        if (f.subdir) {
          target = await dir.getDirectoryHandle(f.subdir, { create: true })
        }
        const fh = await target.getFileHandle(f.name, { create: true })
        const w = await fh.createWritable()
        await w.write(typeof f.data === 'string' ? new Blob([f.data], { type: 'text/plain;charset=utf-8' }) : f.data)
        await w.close()
      }
      return 'folder'
    } catch {
      // fall through to safe in-browser retention — never a download
    }
  }
  return (await retainSession(files)) ? 'retained' : 'failed'
}

export function fileStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

// ---------------------------------------------------------------------------
// The recorder: camera + voice + transcript in one session
// ---------------------------------------------------------------------------
export interface CaptureHandlers {
  onLine?: (line: TranscriptLine) => void
  onPartial?: (text: string) => void
}

export interface SessionCapture {
  startedAt: number
  addLine: (kind: TranscriptLine['kind'], text: string) => TranscriptLine
  getLines: () => TranscriptLine[]
  /** Pause/resume mic transcription while ZARA is speaking. */
  pauseVoice: () => void
  resumeVoice: () => void
  stop: () => Promise<{ video: Blob | null; voice: Blob | null; lines: TranscriptLine[] }>
}

export function startCapture(stream: MediaStream, handlers: CaptureHandlers = {}): SessionCapture {
  const startedAt = Date.now()
  const lines: TranscriptLine[] = []
  const videoChunks: Blob[] = []
  const voiceChunks: Blob[] = []

  const addLine: SessionCapture['addLine'] = (kind, text) => {
    const line: TranscriptLine = { t: Date.now() - startedAt, kind, text }
    lines.push(line)
    handlers.onLine?.(line)
    return line
  }

  // --- MediaRecorder: full camera+voice and voice-only tracks ---
  let videoRec: MediaRecorder | null = null
  let voiceRec: MediaRecorder | null = null
  if (typeof MediaRecorder !== 'undefined') {
    const pickMime = (opts: string[]) => opts.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
    try {
      const mime = pickMime(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'])
      videoRec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      videoRec.ondataavailable = (e) => { if (e.data && e.data.size > 0) videoChunks.push(e.data) }
      videoRec.start(1000)
    } catch {
      videoRec = null
    }
    try {
      const audioOnly = new MediaStream(stream.getAudioTracks())
      const mime = pickMime(['audio/webm;codecs=opus', 'audio/webm'])
      voiceRec = new MediaRecorder(audioOnly, mime ? { mimeType: mime } : undefined)
      voiceRec.ondataavailable = (e) => { if (e.data && e.data.size > 0) voiceChunks.push(e.data) }
      voiceRec.start(1000)
    } catch {
      voiceRec = null
    }
  }

  // --- Continuous speech-to-text of the candidate's voice ---
  const Ctor = getSpeechRecognitionCtor()
  let rec: SpeechRecognitionLike | null = null
  let listening = true
  let restartTimer = 0
  if (Ctor) {
    try {
      rec = new Ctor()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = navigator.language || 'en-US'
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          const text = r[0]?.transcript ?? ''
          if (!text) continue
          if (r.isFinal) {
            addLine('speech', text.trim())
            handlers.onPartial?.('')
          } else {
            handlers.onPartial?.(text)
          }
        }
      }
      rec.onend = () => {
        if (listening) {
          restartTimer = window.setTimeout(() => {
            try { rec?.start() } catch { /* already started */ }
          }, 250)
        }
      }
      rec.onerror = () => { /* ignore transient errors, onend will retry */ }
      try { rec.start() } catch { /* ignore */ }
    } catch {
      rec = null
    }
  }

  const stopRecognition = () => {
    listening = false
    window.clearTimeout(restartTimer)
    try { rec?.stop() } catch { /* ignore */ }
  }

  const stopRecorder = (r: MediaRecorder | null): Promise<void> =>
    new Promise((resolve) => {
      if (!r || r.state === 'inactive') {
        resolve()
        return
      }
      const done = () => resolve()
      r.onstop = done
      try {
        r.stop()
      } catch {
        resolve()
      }
      // Safety timeout in case onstop never fires
      window.setTimeout(done, 2000)
    })

  return {
    startedAt,
    addLine,
    getLines: () => [...lines],
    pauseVoice: () => {
      listening = false
      window.clearTimeout(restartTimer)
      try { rec?.stop() } catch { /* ignore */ }
    },
    resumeVoice: () => {
      if (listening) return
      listening = true
      try { rec?.start() } catch { /* ignore */ }
    },
    stop: async () => {
      stopRecognition()
      await Promise.all([stopRecorder(videoRec), stopRecorder(voiceRec)])
      handlers.onPartial?.('')
      const video = videoChunks.length ? new Blob(videoChunks, { type: videoChunks[0].type || 'video/webm' }) : null
      const voice = voiceChunks.length ? new Blob(voiceChunks, { type: voiceChunks[0].type || 'audio/webm' }) : null
      return { video, voice, lines: [...lines] }
    },
  }
}
