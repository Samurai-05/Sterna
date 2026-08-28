import type { MapTarget } from './map-target'

export interface RecentSearch extends MapTarget {
  id: string
  kind: 'discovery' | 'poi' | 'place'
  detail: string
}

const maximumRecentSearches = 6

export function loadRecentSearches(userId: string): RecentSearch[] {
  try {
    const stored = window.localStorage.getItem(storageKey(userId))
    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed)
      ? parsed.filter(isRecentSearch).slice(0, maximumRecentSearches)
      : []
  } catch {
    return []
  }
}

export function saveRecentSearch(
  userId: string,
  search: RecentSearch,
): RecentSearch[] {
  const updated = [
    search,
    ...loadRecentSearches(userId).filter((entry) => entry.id !== search.id),
  ].slice(0, maximumRecentSearches)

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(updated))
  } catch {
    // Search history is best effort when storage is unavailable.
  }
  return updated
}

export function clearRecentSearches(userId: string): void {
  try {
    window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Search history is best effort when storage is unavailable.
  }
}

function storageKey(userId: string): string {
  return `sterna.recentSearches.${userId}`
}

function isRecentSearch(value: unknown): value is RecentSearch {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<RecentSearch>
  return (
    typeof candidate.id === 'string' &&
    (candidate.kind === 'discovery' ||
      candidate.kind === 'poi' ||
      candidate.kind === 'place') &&
    typeof candidate.label === 'string' &&
    typeof candidate.detail === 'string' &&
    typeof candidate.zoom === 'number' &&
    Array.isArray(candidate.coordinates) &&
    candidate.coordinates.length === 2 &&
    candidate.coordinates.every(
      (coordinate) =>
        typeof coordinate === 'number' && Number.isFinite(coordinate),
    )
  )
}
