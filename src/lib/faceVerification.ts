// In-browser person/face presence check used before a Zoom round.
//
// The project's offline analyzer uses YOLOv8. On the static site we use the
// same COCO "person" class through TensorFlow.js COCO-SSD, loaded from a CDN at
// runtime. A candidate passes only when exactly one person is visible in the
// frame and the face area has enough visual detail (not a blank wall/photo).

const TFJS_SCRIPT = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
const COCO_SSD_SCRIPT = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
export const PERSON_MIN_SCORE = 0.5

export interface DetectionBox {
  class: string
  score: number
  bbox: [number, number, number, number]
}

export interface PersonDetector {
  detect(video: HTMLVideoElement): Promise<DetectionBox[]>
}

let detectorPromise: Promise<PersonDetector> | null = null

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

export function loadPersonDetector(): Promise<PersonDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await loadScript(TFJS_SCRIPT)
      await loadScript(COCO_SSD_SCRIPT)
      const cocoSsd = (window as unknown as {
        cocoSsd?: { load: (opts: { base: string }) => Promise<PersonDetector> }
      }).cocoSsd
      if (!cocoSsd) throw new Error('COCO-SSD unavailable')
      return cocoSsd.load({ base: 'lite_mobilenet_v2' })
    })().catch((error) => {
      detectorPromise = null
      throw error
    })
  }
  return detectorPromise
}

export async function detectPeople(
  detector: PersonDetector,
  video: HTMLVideoElement,
): Promise<DetectionBox[]> {
  if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return []
  try {
    const boxes = await detector.detect(video)
    return boxes.filter((box) => box.class === 'person' && box.score >= PERSON_MIN_SCORE)
  } catch {
    return []
  }
}

/**
 * Returns true when the top part of the person's bounding box contains enough
 * luminance variation to look like a face/head rather than a flat surface.
 */
export function faceAreaHasDetail(video: HTMLVideoElement, box: DetectionBox): boolean {
  try {
    const [x, y, width, height] = box.bbox
    if (width < 90 || height < 120) return false
    const canvas = document.createElement('canvas')
    const cropW = Math.max(32, Math.round(width * 0.7))
    const cropH = Math.max(32, Math.round(height * 0.35))
    canvas.width = cropW
    canvas.height = cropH
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return true
    context.drawImage(
      video,
      Math.max(0, x + width * 0.15),
      Math.max(0, y),
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    )
    const data = context.getImageData(0, 0, cropW, cropH).data
    let sum = 0
    let sumSq = 0
    let count = 0
    for (let i = 0; i < data.length; i += 16) {
      const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      sum += luminance
      sumSq += luminance * luminance
      count += 1
    }
    if (!count) return true
    const mean = sum / count
    const variance = sumSq / count - mean * mean
    return variance > 18 && mean > 18
  } catch {
    return true
  }
}

export function captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    if (!video.videoWidth || !video.videoHeight) return null
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(640, video.videoWidth)
    canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth))
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  }
}
