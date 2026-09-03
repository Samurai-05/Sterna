import type { Discovery, DiscoveryCategory, Landmark } from '@/lib/mock-data'

const CACHE_VERSION = 1
const CACHE_PREFIX = `sterna:profile:v${CACHE_VERSION}`
const discoveryCategories = new Set<DiscoveryCategory>([
  'landscape',
  'monument',
  'food',
  'animal',
  'plant',
  'culture',
  'other',
])

export function readCachedDiscoveries(userId: string): Discovery[] | null {
  return readCache(userId, 'discoveries', isDiscoveryArray)
}

export function writeCachedDiscoveries(
  userId: string,
  discoveries: Discovery[],
): void {
  writeCache(userId, 'discoveries', discoveries)
}

export function readCachedPois(userId: string): Landmark[] | null {
  return readCache(userId, 'pois', isLandmarkArray)
}

export function writeCachedPois(userId: string, pois: Landmark[]): void {
  writeCache(userId, 'pois', pois)
}

export function clearProfileCache(userId: string): void {
  if (!userId) return

  try {
    const storage = getStorage()
    if (!storage) return

    storage.removeItem(cacheKey(userId, 'discoveries'))
    storage.removeItem(cacheKey(userId, 'pois'))
  } catch {
    // Profile caching is an optional optimization and must never break logout.
  }
}

type CacheResource = 'discoveries' | 'pois'

function readCache<T>(
  userId: string,
  resource: CacheResource,
  isValid: (value: unknown) => value is T,
): T | null {
  if (!userId) return null

  try {
    const storage = getStorage()
    if (!storage) return null

    const rawValue = storage.getItem(cacheKey(userId, resource))
    if (!rawValue) return null

    const parsed: unknown = JSON.parse(rawValue)
    if (!isRecord(parsed) || parsed.version !== CACHE_VERSION) return null

    return isValid(parsed.data) ? parsed.data : null
  } catch {
    return null
  }
}

function writeCache<T>(userId: string, resource: CacheResource, data: T): void {
  if (!userId) return

  try {
    const storage = getStorage()
    if (!storage) return

    storage.setItem(
      cacheKey(userId, resource),
      JSON.stringify({ version: CACHE_VERSION, data }),
    )
  } catch {
    // Profile caching is an optional optimization and must never break queries.
  }
}

function cacheKey(userId: string, resource: CacheResource): string {
  return `${CACHE_PREFIX}:${encodeURIComponent(userId)}:${resource}`
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isDiscoveryArray(value: unknown): value is Discovery[] {
  return Array.isArray(value) && value.every(isDiscovery)
}

function isDiscovery(value: unknown): value is Discovery {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number' &&
    Number.isFinite(value.id) &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    discoveryCategories.has(value.category as DiscoveryCategory) &&
    typeof value.location === 'string' &&
    typeof value.imageId === 'string' &&
    typeof value.description === 'string' &&
    typeof value.author === 'string' &&
    typeof value.initials === 'string' &&
    typeof value.relativeDate === 'string' &&
    isCoordinatePair(value.coordinates) &&
    typeof value.countryCode === 'string'
  )
}

function isLandmarkArray(value: unknown): value is Landmark[] {
  return Array.isArray(value) && value.every(isLandmark)
}

function isLandmark(value: unknown): value is Landmark {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.city === 'string' &&
    typeof value.country === 'string' &&
    typeof value.imageId === 'string' &&
    (value.imageUrl === undefined || typeof value.imageUrl === 'string') &&
    typeof value.description === 'string' &&
    typeof value.discovered === 'boolean' &&
    isCoordinatePair(value.coordinates)
  )
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === 'number')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
