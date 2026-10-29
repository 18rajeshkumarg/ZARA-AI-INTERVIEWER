type WritableFile = {
  write(data: Blob | string): Promise<void>
  close(): Promise<void>
}
type FileHandle = { createWritable(): Promise<WritableFile> }
export type DirectoryHandle = {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
  entries(): AsyncIterable<[string, unknown]>
  removeEntry(name: string): Promise<void>
  queryPermission?(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(options: { mode: 'readwrite' }): Promise<PermissionState>
}

let currentPageDirectory: DirectoryHandle | null = null
const databaseName = 'zara_candidate_folder'
const directoryKey = 'project_directory'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('handles')) request.result.createObjectStore('handles')
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

async function chooseProjectDirectory(): Promise<DirectoryHandle> {
  if (currentPageDirectory) {
    const permission = currentPageDirectory.requestPermission
      ? await currentPageDirectory.requestPermission({ mode: 'readwrite' }).catch(() => 'denied' as PermissionState)
      : await currentPageDirectory.queryPermission?.({ mode: 'readwrite' }).catch(() => 'denied' as PermissionState)
    if (permission === 'granted') return currentPageDirectory
    currentPageDirectory = null
    throw new Error('Folder access expired. Click Submit application again and select the project folder.')
  }
  const showPicker = (window as Window & {
    showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<DirectoryHandle>
  }).showDirectoryPicker
  if (!showPicker) throw new Error('Automatic folder saving needs Chrome or Edge. Open this site there and submit again.')

  const selected = await showPicker({ mode: 'readwrite' })
  currentPageDirectory = selected
  await rememberDirectory(selected)
  return selected
}

async function nextCandidateNumber(directory: DirectoryHandle): Promise<number> {
  let max = 0
  for await (const [filename] of directory.entries()) {
    const match = /^candidate-(\d+)\.txt$/i.exec(filename)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

export type CandidateApplicationFile = {
  name: string
  email: string
  phone: string
  role: string
  experience: string
  location: string
  about: string
  photo: File
}

export async function saveCandidateApplication(application: CandidateApplicationFile): Promise<string> {
  const root = await chooseProjectDirectory()
  const applicationRoot = await root.getDirectoryHandle('Candidate Applications', { create: true })
  const candidates = await applicationRoot.getDirectoryHandle('Candidates', { create: true })
  const uploads = await applicationRoot.getDirectoryHandle('Uploads', { create: true })
  const number = await nextCandidateNumber(candidates)
  const id = `candidate-${String(number).padStart(6, '0')}`
  const extension = application.photo.type === 'image/png' ? 'png' : application.photo.type === 'image/webp' ? 'webp' : 'jpg'
  const photoName = `${id}.${extension}`
  const photoHandle = await uploads.getFileHandle(photoName, { create: true })
  const photoStream = await photoHandle.createWritable()
  await photoStream.write(application.photo)
  await photoStream.close()

  const text = [
    `Candidate ID: ${id}`,
    `Role: ${application.role}`,
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    `Work experience: ${application.experience}`,
    `Location: ${application.location}`,
    `About: ${application.about}`,
    `Photo: Candidate Applications/Uploads/${photoName}`,
    `Submitted: ${new Date().toISOString()}`,
  ].join('\n') + '\n'

  try {
    const textHandle = await candidates.getFileHandle(`${id}.txt`, { create: true })
    const textStream = await textHandle.createWritable()
    await textStream.write(text)
    await textStream.close()
  } catch (error) {
    await uploads.removeEntry(photoName).catch(() => {})
    throw error
  }
  return id
}

export function saveApplicationPhotoLocally(id: string, photo: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('zara_candidate_local_data', 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('photos')) open.result.createObjectStore('photos')
    }
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const transaction = db.transaction('photos', 'readwrite')
      transaction.objectStore('photos').put(photo, id)
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  })
}
