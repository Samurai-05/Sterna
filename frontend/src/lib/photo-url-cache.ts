import { getPhoto } from '@/lib/api'

type PhotoCacheEntry = {
  promise: Promise<string>
  objectUrl?: string
  references: number
  cleanupTimer?: ReturnType<typeof window.setTimeout>
}

const entries = new Map<string, PhotoCacheEntry>()
const retentionMs = 60_000

export function acquirePhotoUrl(
  accessToken: string,
  imageObjectKey: string,
): Promise<string> {
  const key = cacheKey(accessToken, imageObjectKey)
  let entry = entries.get(key)

  if (!entry) {
    entry = createEntry(accessToken, imageObjectKey)
    entries.set(key, entry)
  }

  entry.references += 1
  if (entry.cleanupTimer) {
    window.clearTimeout(entry.cleanupTimer)
    entry.cleanupTimer = undefined
  }

  return entry.promise
}

export function releasePhotoUrl(
  accessToken: string,
  imageObjectKey: string,
): void {
  const key = cacheKey(accessToken, imageObjectKey)
  const entry = entries.get(key)
  if (!entry) return

  entry.references = Math.max(0, entry.references - 1)
  if (entry.references > 0 || entry.cleanupTimer) return

  entry.cleanupTimer = window.setTimeout(() => {
    if (entry.references > 0) return
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
    entries.delete(key)
  }, retentionMs)
}

export function clearPhotoUrlCache(): void {
  for (const entry of entries.values()) {
    if (entry.cleanupTimer) window.clearTimeout(entry.cleanupTimer)
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
  }
  entries.clear()
}

function createEntry(
  accessToken: string,
  imageObjectKey: string,
): PhotoCacheEntry {
  const entry: PhotoCacheEntry = {
    references: 0,
    promise: Promise.resolve(''),
  }

  entry.promise = getPhoto(accessToken, imageObjectKey).then((blob) => {
    const objectUrl = URL.createObjectURL(blob)
    entry.objectUrl = objectUrl
    return objectUrl
  })

  return entry
}

function cacheKey(accessToken: string, imageObjectKey: string): string {
  return `${accessToken}\n${imageObjectKey}`
}
