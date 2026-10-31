// Project-folder storage for candidate applications.
//
// The browser remembers the folder that was selected once (a File System
// Access directory handle is persisted in IndexedDB). Every later submission
// silently reuses it, so candidates never see a folder picker or an
// "AbortError". If the folder is unavailable (new device, revoked permission,
// unsupported browser), the application is still saved safely in this browser
// and no error is shown to the candidate.

import type { Application } from './applications'

type WritableFile = {
  write(data: Blob | string): Promise<void>
  close(): Promise<void>
}
type FileHandle = {
  createWritable(): Promise<WritableFile>
  getFile(): Promise<File>
}
export type DirectoryHandle = {
  name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
  entries(): AsyncIterable<[string, unknown]>
  removeEntry(name: string): Promise<void>
  queryPermission?(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(options: { mode: 'readwrite' }): Promise<PermissionState>
}

export type SaveResult = {
  savedToFolder: boolean
  photoName: string
}

const databaseName = 'zara_candidate_folder'
const directoryKey = 'project_directory'
const localDataName = 'zara_candidate_local_data'

let currentPageDirectory: DirectoryHandle | null = null

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('handles')) {
        request.result.createObjectStore('handles')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function openLocalData(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(localDataName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('photos')) {
        request.result.createObjectStore('photos')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function restoreCandidateDirectory(): Promise<void> {
  try {
    const db = await openDatabase()
    const handle = await new Promise<DirectoryHandle | null>((resolve, reject) => {
      const request = db.transaction('handles', 'readonly').objectStore('handles').get(directoryKey)
      request.onsuccess = () => resolve((request.result as DirectoryHandle | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    currentPageDirectory = handle
  } catch {
    currentPageDirectory = null
  }
}

async function rememberDirectory(handle: DirectoryHandle): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('handles', 'readwrite')
    transaction.objectStore('handles').put(handle, directoryKey)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

async function forgetDirectory(): Promise<void> {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve) => {
      const transaction = db.transaction('handles', 'readwrite')
      transaction.objectStore('handles').delete(directoryKey)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
    })
    db.close()
  } catch {
    /* ignore */
  }
  currentPageDirectory = null
}

/**
 * Returns the remembered folder when its write permission is already granted.
 * When `request` is true (inside a click/submit gesture) the browser may show
 * its normal permission prompt, but never the folder picker.
 */
export async function getProjectDirectory(request = false): Promise<DirectoryHandle | null> {
  if (!currentPageDirectory) return null
  const handle = currentPageDirectory
  try {
    const current = handle.queryPermission
      ? await handle.queryPermission({ mode: 'readwrite' })
      : 'granted'
    if (current === 'granted') return handle
    if (request && handle.requestPermission) {
      const result = await handle.requestPermission({ mode: 'readwrite' })
      if (result === 'granted') return handle
    }
  } catch {
    /* fall through to null */
  }
  return null
}

/** One-time setup used by the hiring review page. Candidates never see it. */
export async function connectProjectDirectory(): Promise<string | null> {
  const showPicker = (window as Window & {
    showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<DirectoryHandle>
  }).showDirectoryPicker
  if (!showPicker) return null
  try {
    const selected = await showPicker({ mode: 'readwrite' })
    currentPageDirectory = selected
    await rememberDirectory(selected)
    return selected.name
  } catch {
    return null
  }
}

export async function disconnectProjectDirectory(): Promise<void> {
  await forgetDirectory()
}

export async function projectFolderName(): Promise<string> {
  try {
    return currentPageDirectory?.name || ''
  } catch {
    return ''
  }
}

async function applicationRoot(root: DirectoryHandle): Promise<DirectoryHandle> {
  if (root.name === 'Candidate Applications') return root
  return root.getDirectoryHandle('Candidate Applications', { create: true })
}

// Counts every numbered file (txt and photo), so a candidate whose record was
// only partly written still reserves its number and is never overwritten.
async function nextCandidateNumber(directory: DirectoryHandle): Promise<number> {
  const seen = new Set<string>()
  const scan = async (handle: DirectoryHandle) => {
    try {
      for await (const [filename] of handle.entries()) {
        const match = /^candidate-(\d+)\b/i.exec(filename)
        if (match) seen.add(match[1])
      }
    } catch {
      /* unreadable folder — start from the local sequence */
    }
  }
  await scan(directory)
  return [...seen].reduce((max, digits) => Math.max(max, Number(digits)), 0)
}

/** Highest candidate number already present in the remembered folder. */
export async function folderCandidateMax(): Promise<number> {
  // Called from the submit gesture, so a stored handle can re-confirm write
  // permission here. If it is denied we return 0 and saveCandidateApplication
  // will also skip the folder, so an existing file can never be overwritten.
  const root = await getProjectDirectory(true)
  if (!root) return 0
  try {
    const appRoot = await applicationRoot(root)
    const candidates = await appRoot.getDirectoryHandle('Candidates', { create: true })
    const uploads = await appRoot.getDirectoryHandle('Uploads', { create: true })
    return Math.max(await nextCandidateNumber(candidates), await nextCandidateNumber(uploads))
  } catch {
    return 0
  }
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

export function photoFilename(id: string, type: string): string {
  return `${id}.${extensionFor(type)}`
}

export type CandidateApplicationFile = {
  application: Application
  photo: File
}

/** Rewrites the candidate's text file (details, schedule, Zoom links, activity). */
export async function writeCandidateRecord(application: Application): Promise<boolean> {
  const root = await getProjectDirectory(true)
  if (!root) return false
  try {
    const appRoot = await applicationRoot(root)
    const candidates = await appRoot.getDirectoryHandle('Candidates', { create: true })
    const text = [
      `Candidate ID: ${application.id}`,
      `Role: ${application.role}`,
      `Name: ${application.name}`,
      `Email: ${application.email}`,
      `Phone: ${application.phone}`,
      `Work experience: ${application.experience}`,
      `Location: ${application.location}`,
      `About: ${application.about}`,
      `Photo: ${application.photoName ? `../Uploads/${application.photoName}` : 'not uploaded (earlier build)'}`,
      `Submitted: ${application.createdAt}`,
      `Interview date: ${application.interviewDate}`,
      `Virtual Round 1: 11:30 AM - 11:55 AM IST`,
      `Round 1 Zoom: ${application.round1.zoomLink}`,
      `Round 1 status: ${application.round1.state}`,
      `Virtual Round 2: 12:40 PM - 1:10 PM IST`,
      `Round 2 Zoom: ${application.round2.zoomLink}`,
      `Round 2 status: ${application.round2.state}`,
      `Boss Round requested: ${application.bossRequestedAt || 'not yet'}`,
      `Boss Round completed: ${application.bossCompletedAt || 'not yet'}`,
      `Hiring status: ${application.status}`,
      '',
      'Activity:',
      ...(application.events || []).map((event) => `[${event.at}] ${event.event}${event.detail ? ` - ${event.detail}` : ''}`),
    ].join('\n') + '\n'

    const textHandle = await candidates.getFileHandle(`${application.id}.txt`, { create: true })
    const stream = await textHandle.createWritable()
    await stream.write(text)
    await stream.close()

    const activityHandle = await appRoot.getFileHandle('activity.txt', { create: true })
    let existing = ''
    try {
      existing = await (await activityHandle.getFile()).text()
    } catch {
      existing = ''
    }
    const line = `[${new Date().toISOString()}] ${application.id} | ${application.name} | ${application.email} | ${application.role} | ${application.status} | round1=${application.round1.state} | round2=${application.round2.state}\n`
    const activityStream = await activityHandle.createWritable()
    await activityStream.write(existing + line)
    await activityStream.close()
    return true
  } catch {
    return false
  }
}

export async function saveCandidateApplication({
  application,
  photo,
}: CandidateApplicationFile): Promise<SaveResult> {
  const photoName = application.photoName || photoFilename(application.id, photo.type)
  let savedToFolder = false

  const root = await getProjectDirectory(true)
  if (root) {
    try {
      const appRoot = await applicationRoot(root)
      const uploads = await appRoot.getDirectoryHandle('Uploads', { create: true })
      const photoHandle = await uploads.getFileHandle(photoName, { create: true })
      const stream = await photoHandle.createWritable()
      await stream.write(photo)
      await stream.close()
      savedToFolder = true
    } catch {
      savedToFolder = false
    }
  }

  // Always keep a copy in this browser so the dashboard and review page work
  // even on a new device or when folder permission is not available.
  try {
    await saveApplicationPhotoLocally(application.id, photo)
  } catch {
    /* private mode / storage full — the application record is still saved */
  }
  if (savedToFolder) await writeCandidateRecord({ ...application, photoName })

  return { savedToFolder, photoName }
}

export function saveApplicationPhotoLocally(id: string, photo: File): Promise<void> {
  return new Promise((resolve, reject) => {
    openLocalData().then((db) => {
      const transaction = db.transaction('photos', 'readwrite')
      transaction.objectStore('photos').put(photo, id)
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }).catch(reject)
  })
}

export function loadApplicationPhoto(id: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    openLocalData().then((db) => {
      const transaction = db.transaction('photos', 'readonly')
      const request = transaction.objectStore('photos').get(id)
      request.onsuccess = () => {
        db.close()
        resolve((request.result as Blob | undefined) ?? null)
      }
      request.onerror = () => { db.close(); resolve(null) }
    }).catch(() => resolve(null))
  })
}
